#!/usr/bin/env python3
"""Il censimento degli studi di amministrazione condominiale di Milano.

  studi.py --zone 4              # quattro zone nuove, scelte a rotazione
  studi.py --zona Navigli        # una zona precisa
  studi.py --prova               # dice dove andrebbe, senza chiamare Apify

Perche' a zone e non «Milano» e basta. Google Places risponde con al massimo un centinaio
di schede per ricerca, e su una citta' intera restituisce sempre le stesse: i primi della
lista. Girando per zone la copertura si allarga invece di ripetersi, ed e' il motivo per cui
la rotazione e' scritta nel file e non decisa a mano ogni volta.

Cosa non si tocca mai, dei record gia' presenti: `relazione`, `passi` e `note` sono il
lavoro di Gaetano sugli studi che ha gia' sentito, e un censimento che li sovrascrivesse
cancellerebbe l'unica cosa che il censimento non sa produrre.

Il municipio si ricava da Nominatim, che e' gratuito e chiede in cambio una richiesta al
secondo e un User-Agent dichiarato. Serve alla posta: le dieci mail del giorno girano sui
municipi per non battere sempre lo stesso quadrante, e uno studio senza municipio finisce
in fondo al mazzo.
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

QUI = os.path.dirname(os.path.realpath(__file__))
BASE = os.environ.get("RADAR_BASE") or os.path.join(os.path.dirname(QUI), "docs")
AMMINISTRATORI = os.path.join(BASE, "dati", "amministratori.json")
APIFY = os.path.join(QUI, "apify.sh")

ATTORE = "compass/crawler-google-places"
CAMPI = "title,street,postalCode,phoneUnformatted,website,url,totalScore,reviewsCount,neighborhood,city"
PER_ZONA = 60
TETTO_ZONA = 0.70          # rete di sicurezza per singola chiamata
UA = "Radar-Agenzia2Sarpi/1.0 (gaetano.romaniello80@gmail.com)"
MAX_NOMINATIM = 45         # una richiesta al secondo: oltre, il giro diventa lunghissimo
ORA = datetime.datetime.now()

# Le zone, in ordine di resa attesa: prima dove ci sono piu' studi, poi la periferia.
ZONE = ["Centro", "Porta Romana", "Navigli", "Isola", "Citta Studi", "Sempione",
        "Bicocca", "Lorenteggio", "Affori", "Barona", "Gratosoglio", "Lambrate",
        "Bovisa", "San Siro", "Corvetto", "Niguarda", "Baggio", "Quarto Oggiaro",
        "Precotto", "Vigentino", "Loreto", "Wagner", "Ticinese", "Greco",
        "Gorla", "Forlanini", "Giambellino", "Dergano"]


def solo_cifre(t):
    return re.sub(r"\D", "", str(t or ""))


def raccogli_zona(zona):
    """Le schede di una zona, dall'attore di Apify. Se la zona non risponde non si ferma
    il giro: si passa alla prossima e lo si scrive nel riepilogo."""
    ingresso = {
        "searchStringsArray": ["amministratore di condominio"],
        "locationQuery": f"{zona}, Milano, Italia",
        "maxCrawledPlacesPerSearch": PER_ZONA,
        "language": "it",
        "skipClosedPlaces": True,
        "maxReviews": 0,
        "maxImages": 0,
    }
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(ingresso, f)
        percorso = f.name
    try:
        esito = subprocess.run(
            [APIFY, "raccogli", ATTORE, percorso, str(TETTO_ZONA), CAMPI],
            capture_output=True, text=True, timeout=340)
    finally:
        os.unlink(percorso)
    if esito.returncode != 0:
        return [], (esito.stderr or "").strip().splitlines()[-1:] or ["errore sconosciuto"]
    try:
        return json.loads(esito.stdout or "[]"), []
    except ValueError:
        return [], ["risposta illeggibile da Apify"]


def municipio_di(via):
    """Il municipio, da Nominatim. Una richiesta al secondo, come chiedono loro."""
    if not via:
        return "", ""
    q = urllib.parse.urlencode({"q": f"{via}, Milano, Italia", "format": "jsonv2",
                                "addressdetails": 1, "limit": 1})
    try:
        r = urllib.request.Request("https://nominatim.openstreetmap.org/search?" + q,
                                   headers={"User-Agent": UA})
        with urllib.request.urlopen(r, timeout=20) as f:
            d = json.loads(f.read().decode("utf-8"))
    except Exception:
        return "", ""
    if not d:
        return "", ""
    ind = d[0].get("address", {})
    quartiere = ind.get("neighbourhood") or ind.get("suburb") or ""
    municipio = ind.get("city_district") or ""
    m = re.search(r"(\d+)", municipio)
    municipio = f"Municipio {m.group(1)}" if m else ""
    # Nominatim a volte infila «Municipio 7» dentro suburb: li' e' un municipio, non un quartiere
    if quartiere.lower().startswith("municipio"):
        m2 = re.search(r"(\d+)", quartiere)
        if m2 and not municipio:
            municipio = f"Municipio {m2.group(1)}"
        quartiere = ""
    return quartiere, municipio


def in_scheda(g, zona):
    via = (g.get("street") or "").strip()
    return {
        "nome": (g.get("title") or "").strip(),
        "indirizzo": ", ".join(x for x in [via, (g.get("postalCode") or "").strip(),
                                           (g.get("city") or "Milano").strip()] if x),
        "via": via,
        "cap": (g.get("postalCode") or "").strip(),
        "telefono": (g.get("phoneUnformatted") or "").strip(),
        "sito": (g.get("website") or "").strip(),
        "quartiere": (g.get("neighborhood") or "").strip(),
        "municipio": "",
        "voto": g.get("totalScore"),
        "recensioni": g.get("reviewsCount"),
        "schedaMaps": (g.get("url") or "").strip(),
        "fonte": f"Google Places — {zona}",
    }


def fondi(esistenti, nuovi):
    """Unione per nome o per telefono. Chi c'e' gia' si aggiorna solo nei campi del
    censimento; il lavoro di Gaetano — relazione, passi, note, e l'email gia' trovata —
    resta dov'e'."""
    SUOI = ("relazione", "passi", "note", "email", "emailAltre", "emailCercata")
    per_nome = {(x.get("nome") or "").strip().lower(): x for x in esistenti}
    per_tel = {solo_cifre(x.get("telefono")): x for x in esistenti if solo_cifre(x.get("telefono"))}
    aggiunti, aggiornati = [], 0
    for n in nuovi:
        if not n["nome"]:
            continue
        chiave_n = n["nome"].strip().lower()
        chiave_t = solo_cifre(n["telefono"])
        vecchio = per_nome.get(chiave_n) or (per_tel.get(chiave_t) if chiave_t else None)
        if vecchio:
            for k, v in n.items():
                if k in SUOI or not v:
                    continue
                if not vecchio.get(k):
                    vecchio[k] = v
            aggiornati += 1
            continue
        esistenti.append(n)
        per_nome[chiave_n] = n
        if chiave_t:
            per_tel[chiave_t] = n
        aggiunti.append(n)
    return aggiunti, aggiornati


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--zone", type=int, default=4)
    ap.add_argument("--zona", action="append", default=None)
    ap.add_argument("--prova", action="store_true")
    a = ap.parse_args()

    with open(AMMINISTRATORI, encoding="utf-8") as f:
        dati = json.load(f)
    studi = dati.get("amministratori", [])

    # le zone gia' battute stanno scritte nella provenienza dei record: si riparte da quelle
    # che non compaiono, cosi' la copertura si allarga invece di ripetersi
    fatte = {(x.get("fonte") or "").split("—")[-1].strip() for x in studi}
    da_fare = a.zona or [z for z in ZONE if z not in fatte][:max(1, a.zone)]

    esito = {"zone": da_fare, "gia_battute": sorted(x for x in fatte if x),
             "studi_prima": len(studi), "aggiunti": 0, "aggiornati": 0, "problemi": []}
    if a.prova:
        print(json.dumps(esito, ensure_ascii=False, indent=1))
        return

    tutti_nuovi = []
    for z in da_fare:
        schede, problemi = raccogli_zona(z)
        if problemi:
            esito["problemi"].append({"zona": z, "perche": problemi})
        tutti_nuovi.extend(in_scheda(g, z) for g in schede if (g.get("title") or "").strip())
        print(f"  {z}: {len(schede)} schede", file=sys.stderr)

    aggiunti, aggiornati = fondi(studi, tutti_nuovi)
    esito["aggiunti"], esito["aggiornati"] = len(aggiunti), aggiornati

    # il municipio solo per i nuovi e solo per chi non ce l'ha: Nominatim va a una richiesta
    # al secondo, e ripassare tutto l'archivio a ogni giro non aggiungerebbe niente
    senza = [x for x in aggiunti if not x.get("municipio") and x.get("via")][:MAX_NOMINATIM]
    for x in senza:
        q, m = municipio_di(x["via"])
        if m:
            x["municipio"] = m
        if q and not x.get("quartiere"):
            x["quartiere"] = q
        time.sleep(1.1)
    esito["municipi_risolti"] = sum(1 for x in senza if x.get("municipio"))

    dati["amministratori"] = studi
    dati["conteggio"] = len(studi)
    dati["conEmail"] = sum(1 for x in studi if x.get("email"))
    dati["generato"] = ORA.isoformat(timespec="seconds")
    dati["id"] = "amministratori-" + ORA.strftime("%Y%m%d%H%M")
    with open(AMMINISTRATORI, "w", encoding="utf-8") as f:
        json.dump(dati, f, ensure_ascii=False, indent=1)

    esito["studi_dopo"] = len(studi)
    print(json.dumps(esito, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
