#!/usr/bin/env python3
"""I cinque da chiamare, mandati a Ciro su iMessage dal numero di Gaetano.

  messaggi.py --prova            # scrive il messaggio a schermo e non manda niente
  messaggi.py --invia            # lo manda davvero a Ciro
  messaggi.py --invia --a 3383866596   # lo manda a un altro numero (per provare su di se')
  messaggi.py --quanti 5         # quanti annunci mettere dentro (di serie: 5)

Perche' iMessage e non un servizio di SMS. Ciro ha un iPhone, e il Mac di Gaetano ha un
account iMessage attivo: il messaggio parte **dal numero di Gaetano**, come se lo avesse
scritto lui. Nessun servizio a pagamento, nessun mittente sconosciuto che finisce fra lo
spam, nessun account nuovo da aprire. In cambio c'e' un vincolo solo: **il Mac dev'essere
acceso**. Se e' spento il messaggio non parte, e riparte al primo giro utile.

Da dove arrivano gli annunci. Non dal file sul disco ma **dal sito pubblicato**, che e' il
posto dove il radar deposita il suo giro ogni mattina anche a Mac spento. Cosi' il Mac non
deve avere il repository aggiornato per mandare la lista giusta: se la rete non c'e', si
ripiega sul file locale e lo si dice.

Chi entra nel messaggio: solo privati, solo con un telefono pubblicato, solo se l'annuncio
e' ancora online, e solo se non e' gia' stato mandato. Il registro di cio' che e' partito
sta in `~/.config/acquisizione-ag2/messaggi.json` — fuori dal repository, perche' sono
numeri di telefono di persone e non hanno niente da fare su un sito pubblico.

Non c'e' nessuna deduplica sul lavoro fatto: questo script sa cosa ha **mandato**, non sa
cosa Ciro ha **chiamato**. E' una differenza che va rispettata, non nascosta — chi legge il
messaggio decide, e il cruscotto resta la fonte di cio' che e' stato lavorato davvero.
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

SITO = "https://agenzia2sarpi-byte.github.io/acquisizione-2sarpi/dati/radar.json"
QUI = os.path.dirname(os.path.realpath(__file__))
LOCALE = os.path.join(os.path.dirname(QUI), "docs", "dati", "radar.json")
REGISTRO = os.path.join(os.path.expanduser("~"), ".config", "acquisizione-ag2", "messaggi.json")

CIRO = "+393401940666"
QUANTI = 5
ORA = datetime.datetime.now()


# ---------------------------------------------------------------- gli annunci

def annunci():
    """Gli annunci del giro di stamattina. Prima dal sito, che e' sempre aggiornato;
    se la rete manca, dal file sul disco, dicendolo."""
    try:
        richiesta = urllib.request.Request(
            SITO + "?t=" + ORA.strftime("%Y%m%d%H%M"),
            headers={"User-Agent": "Radar-Agenzia2Sarpi/1.0", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(richiesta, timeout=25) as r:
            return json.loads(r.read().decode("utf-8")), "sito"
    except Exception:
        pass
    try:
        with open(LOCALE, encoding="utf-8") as f:
            return json.load(f), "file locale (rete assente)"
    except Exception:
        return {"annunci": []}, "nessuna fonte"


def leggi_registro():
    try:
        with open(REGISTRO, encoding="utf-8") as f:
            d = json.load(f)
        if not isinstance(d.get("mandati"), dict):
            d["mandati"] = {}
        return d
    except Exception:
        return {"mandati": {}, "invii": []}


def scrivi_registro(d):
    os.makedirs(os.path.dirname(REGISTRO), exist_ok=True)
    with open(REGISTRO, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    os.chmod(REGISTRO, 0o600)   # ci sono dentro numeri di persone


# Quello che a Ciro non si manda. Non e' un giudizio sull'immobile: e' che una vendita a
# reddito e un usufrutto non sono acquisizioni ordinarie — il proprietario non vende casa
# sua, vende un investimento o un diritto — e la telefonata parte da un discorso diverso.
# Frasi intere e non parole sciolte, apposta: «inquilino» da solo compare negli affitti in
# modo del tutto innocente («cerco inquilino serio») e da solo butterebbe via annunci buoni.
FUORI = re.compile(
    r"a\s+reddito"
    r"|reddito\s+garantito"
    r"|nuda\s+propriet"
    r"|usufrutt"
    r"|gi[aà]\s+(?:affittat|locat)"
    r"|attualmente\s+(?:affittat|locat)"
    r"|con\s+inquilin"
    r"|inquilin\w*\s+in\s+essere"
    r"|contratto\s+in\s+essere"
    r"|cedol\w*\s+in\s+corso",
    re.I)


def da_scartare(a):
    """(vero, motivo) se l'annuncio non deve andare a Ciro."""
    testo = f"{a.get('titolo') or ''} {a.get('descrizione') or ''}"
    m = FUORI.search(testo)
    return (True, m.group(0).strip()) if m else (False, "")


def scegli(dati, reg, quanti):
    """I migliori ancora da mandare. L'ordine e' quello che il radar ha gia' calcolato:
    il punteggio tiene conto di prezzo fuori mercato, giorni online, foto scarse e
    provvigione stimata, e rifarlo qui vorrebbe dire tenerne due versioni diverse."""
    fuori = reg["mandati"]
    buoni = [a for a in dati.get("annunci", [])
             if a.get("telefono")
             and a.get("privato") is not False
             and not a.get("noAgenzie")
             and a.get("url") not in fuori
             and not da_scartare(a)[0]]
    buoni.sort(key=lambda a: -(a.get("priorita") or 0))
    return buoni[:quanti]


# ---------------------------------------------------------------- il testo

def telefono_leggibile(grezzo):
    """«3457998411» diventa «+39 345 799 8411». iOS riconosce e rende toccabile tutte e due
    le forme, ma quella spaziata si legge a colpo d'occhio — e chi la legge sta guidando o
    ha il telefono in una mano sola."""
    cifre = re.sub(r"\D", "", str(grezzo or ""))
    if cifre.startswith("39") and len(cifre) > 10:
        cifre = cifre[2:]
    if len(cifre) == 10:
        return f"+39 {cifre[:3]} {cifre[3:6]} {cifre[6:]}"
    return "+39 " + cifre if cifre else ""


def soldi(v, locazione):
    if not v:
        return ""
    n = f"{int(v):,}".replace(",", ".")
    return f"{n} €/mese" if locazione else f"{n} €"


def voce(i, a):
    locazione = (a.get("tipo") or "").lower().startswith("loc")
    indirizzo = " ".join(x for x in [a.get("via"), a.get("civico")] if x).strip()
    if not indirizzo:
        indirizzo = a.get("titolo") or "indirizzo non indicato"
    # Solo il quartiere vero, o al massimo il municipio. Il campo «zona» e' la fascia di
    # mercato («Fascia media urbana», «Centro storico e semicentro di pregio»): serve al
    # punteggio, ma scritta dietro un indirizzo sembra un posto e non lo e'.
    zona = (a.get("quartiere") or "").strip() or (a.get("municipio") or "").strip()

    # Il nome c'e' solo quando Subito lo mostra. Non si inventa e non si mette un «Gentile
    # proprietario» al posto suo: Ciro deve sapere se sta chiamando qualcuno di cui conosce
    # il nome o no, prima di aprire bocca.
    nome = (a.get("inserzionista") or "").strip()
    testa = f"{nome} — {indirizzo}" if nome else indirizzo
    if zona:
        testa += f", {zona}"

    dettagli = [("AFFITTO" if locazione else "VENDITA") + " " + soldi(a.get("prezzo"), locazione)]
    if a.get("mq"):
        dettagli.append(f"{int(a['mq'])} mq")
    if a.get("locali"):
        n = int(a["locali"])
        dettagli.append(f"{n} locale" if n == 1 else f"{n} locali")

    righe = [f"{i}) {testa}",
             "   " + " · ".join(x for x in dettagli if x.strip()),
             "   " + telefono_leggibile(a.get("telefono"))]
    if a.get("url"):
        # una riga vuota fra numero e link: attaccati, il dito ne prende uno per l'altro,
        # e chi voleva chiamare si ritrova il browser aperto
        righe.append("")
        righe.append("   " + a["url"])
    return "\n".join(righe)


def messaggio(scelti, fonte):
    quanti = len(scelti)
    testa = (f"Papà, chiama queste {quanti} persone per acquisizione. È importante.\n"
             if quanti != 1 else
             "Papà, chiama questa persona per acquisizione. È importante.\n")
    corpo = "\n\n".join(voce(i + 1, a) for i, a in enumerate(scelti))
    coda = "\n\nSono privati, annunci di oggi. Il numero è già cliccabile: tocca e chiama."
    if fonte.startswith("file locale"):
        coda += "\n(lista dal Mac: la rete non rispondeva, potrebbe non essere di stamattina)"
    return testa + "\n" + corpo + coda


# ---------------------------------------------------------------- l'invio

def manda(testo, numero):
    """Messages, dall'account iMessage del Mac. Lo script si scrive su un file invece di
    passarlo con -e: un messaggio di cinque annunci ha a capo, accenti e apostrofi, e
    infilarlo dentro una riga di shell e' il modo piu' sicuro di romperlo."""
    fuggito = testo.replace("\\", "\\\\").replace('"', '\\"')
    script = (
        'tell application "Messages"\n'
        '  set servizio to 1st account whose service type = iMessage\n'
        f'  send "{fuggito}" to participant "{numero}" of servizio\n'
        'end tell\n')
    with tempfile.NamedTemporaryFile("w", suffix=".applescript",
                                     delete=False, encoding="utf-8") as f:
        f.write(script)
        percorso = f.name
    try:
        esito = subprocess.run(["osascript", percorso], capture_output=True,
                               text=True, timeout=60)
    finally:
        os.unlink(percorso)
    if esito.returncode != 0:
        return False, (esito.stderr or "").strip()[:300]
    return True, ""


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--invia", action="store_true")
    ap.add_argument("--prova", action="store_true")
    ap.add_argument("--quanti", type=int, default=QUANTI)
    ap.add_argument("--a", default=CIRO, help="numero del destinatario")
    # Una prova mandata a se' stessi non deve bruciare i cinque annunci: se li segnasse
    # come mandati, a Ciro arriverebbero i cinque dopo, e la prova avrebbe cambiato
    # proprio la cosa che doveva solo mostrare.
    ap.add_argument("--non-registrare", action="store_true")
    a = ap.parse_args()

    dati, fonte = annunci()
    reg = leggi_registro()
    scelti = scegli(dati, reg, a.quanti)

    if not scelti:
        esito = {"mandati": 0, "fonte": fonte,
                 "nota": "nessun annuncio nuovo con un telefono da mandare: "
                         "o sono gia' stati mandati tutti, o il radar non ne ha di nuovi"}
        print(json.dumps(esito, ensure_ascii=False, indent=1))
        return

    testo = messaggio(scelti, fonte)

    if a.prova or not a.invia:
        print(f"— a: {a.a} — fonte: {fonte} — {len(scelti)} annunci —\n")
        print(testo)
        print(f"\n— {len(testo)} caratteri. Non e' partito niente: serve --invia.")
        return

    ok, errore = manda(testo, a.a)
    if ok and not a.non_registrare:
        quando = ORA.isoformat(timespec="seconds")
        for x in scelti:
            reg["mandati"][x["url"]] = quando
        reg.setdefault("invii", []).append(
            {"quando": quando, "a": a.a, "quanti": len(scelti),
             "url": [x["url"] for x in scelti]})
        scrivi_registro(reg)
    print(json.dumps({"mandati": len(scelti) if ok else 0, "a": a.a, "fonte": fonte,
                      "riuscito": ok, "errore": errore,
                      "gia_mandati_in_tutto": len(reg["mandati"])},
                     ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
