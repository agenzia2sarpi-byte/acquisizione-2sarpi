#!/usr/bin/env python3
"""L'archivio degli annunci esclusi: chi e' uscito di qui non rientra piu'.

Un annuncio di agenzia non si toglie una volta sola. Lo stesso immobile torna la settimana
dopo con un altro indirizzo web, il titolo cambiato di tre parole, una foto in piu' — e se
il confronto e' sull'URL rientra in lista come se fosse nuovo. Per questo di ogni annuncio
si tiene un mazzo di impronte, e ne basta una che coincida perche' l'annuncio resti fuori:

  url:    l'indirizzo della pagina, senza parametri di tracciamento
  rif:    portale + codice interno dell'annuncio
  tel:    le ultime nove cifre del recapito
  ind:    via, civico, metratura e tipo di operazione
  foto:   l'identificativo della fotografia dentro l'URL dell'immagine
  testo:  i primi 120 caratteri della descrizione, ridotti all'osso
  parole: le parole lunghe della descrizione, in ordine — regge le modifiche piccole

Le impronte sono stringhe leggibili, non numeri: aprendo `esclusi.json` si capisce a occhio
perche' un annuncio e' stato riconosciuto. La stessa logica vive, identica, in
`docs/js/esclusi.js`, perche' il cruscotto sul telefono deve saper riconoscere gli esclusi
anche quando lavora da solo, senza rete.
"""
import datetime
import json
import os
import re

PREFISSI_VIA = re.compile(
    r"^(via|viale|v\.le|piazza|p\.zza|piazzale|corso|c\.so|largo|vicolo|strada|ripa|alzaia|"
    r"bastioni|foro|galleria|passaggio|riva|v\.)\s+", re.I)


def _piatto(s):
    """Tutto minuscolo, senza accenti e senza punteggiatura: due testi che differiscono per
    una virgola o per una maiuscola sono lo stesso testo."""
    s = (s or "").lower()
    for a, b in (("à", "a"), ("è", "e"), ("é", "e"), ("ì", "i"), ("ò", "o"), ("ù", "u")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "", s)


def _parole(s):
    s = (s or "").lower()
    for a, b in (("à", "a"), ("è", "e"), ("é", "e"), ("ì", "i"), ("ò", "o"), ("ù", "u")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9\s]+", " ", s).split()


def _via(v):
    v = re.sub(r"[.,'`]", " ", (v or "").lower())
    v = PREFISSI_VIA.sub("", v.strip())
    v = re.sub(r"(?:^|\s)\d{1,4}\s*[a-z]?\s*$", "", v)      # via il civico in coda
    return re.sub(r"\s+", " ", v).strip()


def _url(u):
    u = (u or "").strip().lower()
    u = re.sub(r"[?#].*$", "", u)                            # fuori i parametri
    u = re.sub(r"^https?://", "", u).rstrip("/")
    return re.sub(r"^www\.", "", u)


def _foto_id(u):
    """Dentro l'indirizzo di una fotografia c'e' quasi sempre un identificativo lungo: e'
    quello che resta uguale quando l'annuncio viene ripubblicato con le stesse immagini."""
    u = re.sub(r"[?#].*$", "", (u or ""))
    pezzi = [p for p in re.split(r"[/_.]", u) if len(p) >= 16 and re.search(r"\d", p)]
    return pezzi[-1].lower() if pezzi else ""


def impronte(a):
    """Il mazzo di impronte di un annuncio. Le stringhe vuote non entrano mai: un campo
    mancante non deve diventare la chiave che esclude mezzo archivio."""
    out = []
    u = _url(a.get("url"))
    if u:
        out.append("url:" + u)

    portale, rif = (a.get("portale") or "").strip().lower(), (a.get("riferimento") or "").strip().lower()
    if portale and rif:
        out.append(f"rif:{portale}:{rif}")

    tel = re.sub(r"\D", "", a.get("telefono") or "")[-9:]
    if len(tel) == 9:
        out.append("tel:" + tel)

    via, mq = _via(a.get("via")), str(a.get("mq") or "").split(".")[0]
    if via and mq and mq != "0":
        civ = _piatto(a.get("civico"))
        tipo = "loc" if (a.get("tipo") or "") == "Locazione" else "ven"
        out.append(f"ind:{via}|{civ}|{mq}|{tipo}")

    for k in ("foto", "foto2", "foto3"):
        f = _foto_id(a.get(k))
        if f:
            out.append("foto:" + f)

    desc = _piatto(a.get("descrizione"))
    if len(desc) >= 60:
        out.append("testo:" + desc[:120])

    lunghe = sorted({p for p in _parole(a.get("descrizione")) if len(p) >= 6})[:25]
    if len(lunghe) >= 8:
        out.append("parole:" + "-".join(lunghe))

    return out


# ---------------------------------------------------------------- l'archivio su disco
def carica(percorso):
    if not os.path.exists(percorso):
        return {"generato": None, "esclusi": []}
    try:
        d = json.load(open(percorso, encoding="utf-8"))
        if not isinstance(d.get("esclusi"), list):
            d["esclusi"] = []
        return d
    except Exception:
        return {"generato": None, "esclusi": []}


def indice(archivio):
    """Da tutte le voci dell'archivio a un solo insieme di impronte, per il confronto veloce."""
    s = set()
    for v in archivio.get("esclusi", []):
        s.update(v.get("impronte") or [])
    return s


def escluso(a, indice_impronte):
    """Ritorna l'impronta che ha fatto scattare il riconoscimento, o stringa vuota."""
    for i in impronte(a):
        if i in indice_impronte:
            return i
    return ""


def registra(archivio, a, motivo, chi="radar", tipo="agenzia"):
    """Mette l'annuncio nell'archivio, o allarga le impronte di una voce gia' presente:
    l'annuncio ripubblicato con foto nuove insegna una foto nuova da riconoscere."""
    nuove = impronte(a)
    if not nuove:
        return False
    for v in archivio["esclusi"]:
        vecchie = set(v.get("impronte") or [])
        if vecchie & set(nuove):
            v["impronte"] = sorted(vecchie | set(nuove))
            v["rivisto"] = datetime.date.today().isoformat()
            v["ricomparse"] = int(v.get("ricomparse") or 0) + 1
            return False
    archivio["esclusi"].append({
        "id": "esc-" + datetime.datetime.now().strftime("%Y%m%d%H%M%S") + "-" + str(len(archivio["esclusi"]) + 1),
        "titolo": (a.get("titolo") or "")[:120],
        "via": " ".join(x for x in ((a.get("via") or ""), str(a.get("civico") or "")) if x).strip(),
        "portale": a.get("portale") or "",
        "url": a.get("url") or "",
        "inserzionista": a.get("inserzionista") or "",
        "telefono": a.get("telefono") or "",
        "motivo": motivo,
        "chi": chi,
        # perche' e' fuori: il cruscotto lo mostra come etichetta, e «agenzia» non e' la
        # stessa cosa di «l'ho chiamato e non portava a niente»
        "tipo": tipo,
        "data": datetime.date.today().isoformat(),
        "ricomparse": 0,
        "impronte": nuove,
    })
    return True


def salva(archivio, percorso):
    archivio["generato"] = datetime.datetime.now().isoformat(timespec="seconds")
    archivio["conteggio"] = len(archivio["esclusi"])
    archivio["id"] = "esclusi-" + datetime.datetime.now().strftime("%Y%m%d%H%M")
    json.dump(archivio, open(percorso, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
