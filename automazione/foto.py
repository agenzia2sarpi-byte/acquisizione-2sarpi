#!/usr/bin/env python3
"""Il watermark sulle fotografie: la firma che l'agenzia lascia anche quando il testo tace.

L'annuncio di via Luca Signorelli e' l'esempio che ha insegnato la regola. La descrizione
diceva «Presente Agenzia», d'accordo — ma prima ancora lo dicevano le foto, con una scritta
bianca traslucida in mezzo alla cucina. Un proprietario non mette il proprio marchio sulle
foto di casa sua: se c'e' un marchio, c'e' un ufficio dietro.

Come si legge una scritta traslucida: non si legge, se la si guarda com'e'. Il watermark ha
poco contrasto e sta sopra una fotografia piena di roba. Il modo che funziona e' togliere la
fotografia e tenere quello che ci sta sopra: si sfoca forte l'immagine — la sfocatura tiene
lo sfondo e perde la scritta — e si sottrae la sfocatura dall'originale. Quel che resta e'
quasi solo il sovrapposto. Da li' l'OCR legge.

Due segnali, e basta uno:

  lessico   nella scritta compaiono parole da agenzia, un sito o una email
  ripetuto  la stessa scritta e' impressa su piu' scatti: un marchio, per definizione

Quando il marchio si legge forte ma su una fotografia sola, non si butta via niente: puo'
essere l'insegna di un negozio dalla finestra — in prova e' successo, «PRADA» su una vetrina
di via Mincio. In quel caso l'annuncio resta, con il dubbio scritto sulla scheda e un tasto
per farlo uscire per sempre se l'occhio conferma.

Sulla regola d'oro del radar — mai raccogliere dai portali con richieste diritte, si passa
dall'API ufficiale — qui non si raccoglie niente: l'indirizzo della fotografia e' un dato che
il radar ha gia' in mano, arrivato dall'API. Si scarica solo l'immagine, dal CDN pubblico che
la serve, una al secondo, e non si tiene su disco: si tiene soltanto cosa c'era scritto.
"""
import csv
import io
import json
import os
import re
import subprocess
import time
import urllib.request

TIMEOUT = 20
CONF_TESTO = 55        # sotto questa soglia l'OCR sta tirando a indovinare
CONF_MARCHIO = 90      # sopra questa, quella scritta c'e' davvero
PAUSA = 1.0                      # una richiesta al secondo, come per gli indirizzi
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"

# Le parole che, lette dentro una fotografia, dicono che quella foto e' di un ufficio.
LESSICO_FOTO = re.compile(
    r"immobiliar|real\s*estate|realty|agenzi|tecnocasa|re\s*/?\s*max|remax|gabetti|toscano|"
    r"grimaldi|frimm|professionecasa|engel|volkers|century\s*2?1?|gruppo|holding|"
    r"studio\s+immobil|mediazion|intermediazion|consulenz\s+immobil|"
    r"s\.?r\.?l\b|s\.?a\.?s\b|s\.?n\.?c\b|s\.?p\.?a\b|partita\s*iva|p\.?\s*iva", re.I)
SITO = re.compile(r"\bwww\.[a-z0-9-]{3,}|[a-z0-9-]{3,}\.(it|com|eu|net)\b", re.I)
EMAIL = re.compile(r"[a-z0-9._%-]{3,}@[a-z0-9.-]{3,}\.[a-z]{2,}", re.I)

# Rumore tipico dell'OCR su una fotografia: lettere sparse, sigle di due caratteri, parole
# che non sono parole. Un marchio vero e' alfabetico e lungo almeno tre lettere.
TOKEN = re.compile(r"[A-Za-z][A-Za-z&'.-]{2,}")
SCARTA = {"the", "and", "per", "con", "del", "della", "che", "non", "una", "uno", "sul",
          "via", "casa", "img", "jpg", "png", "foto", "image", "dsc", "hdr"}
# Le scritte che si leggono spesso sulle fotografie e che NON sono l'insegna di un'agenzia.
# Questa lista e' nata da una prova sull'archivio vero, ed e' costata sette esclusioni
# sbagliate prima di esistere: il marchio del portale in un angolo, il cartello «AFFITTO»
# appeso alla finestra da un proprietario — che e' il privato piu' privato che ci sia — e la
# marca della cucina nella foto della cucina. Buttare fuori questi vuol dire buttare fuori
# esattamente le persone che cerchiamo.
NON_SONO_MARCHI = {
    # i portali, che il proprio marchio se lo mettono da soli
    "subito", "subitoit", "idealista", "immobiliareit", "casait", "wikicasa", "bakeca",
    "kijiji", "facebook", "marketplace", "zappyrent", "rentola",
    # quello che c'e' scritto sui cartelli e nei titoli, in italiano
    "affitto", "affittasi", "affittarsi", "vendesi", "vendita", "venduto", "privato",
    "privati", "libero", "arredato", "trattativa", "riservata", "occasione", "nuovo",
    "ristrutturato", "bilocale", "trilocale", "monolocale", "appartamento", "attico",
    "camera", "cucina", "bagno", "salone", "terrazzo", "balcone", "cantina", "garage",
    "milano", "italia", "euro", "mese", "anno", "info", "tel", "cell", "mail", "whatsapp",
    # elettrodomestici e arredo che finiscono in quadro nella foto della cucina
    "nobil", "nobilia", "veneta", "scavolini", "ikea", "bosch", "samsung", "whirlpool",
    "candy", "beko", "aeg", "smeg", "ariston", "indesit", "electrolux", "lg", "sony",
    # marche che stanno in casa della gente
    "prada", "gucci", "nike", "adidas", "apple", "coca", "cola", "nutella", "barilla",
}


def disponibile():
    """Il lettore serve due cose che non ci sono dappertutto: Pillow per aprire l'immagine e
    tesseract per leggerla. Sul Mac di Gaetano ci sono; sul corridore di GitHub Actions, che fa
    lo stesso giro ogni lunedi', no — e li' il controllo si salta in silenzio, senza scaricare
    una sola fotografia per poi buttarla. Il resto del filtro (testo, nome, recapiti) regge da
    solo: e' quello che ha preso via Luca Signorelli."""
    global _PRONTO
    if _PRONTO is None:
        try:
            import PIL.Image  # noqa: F401
            subprocess.run(["tesseract", "--version"], capture_output=True, timeout=10)
            _PRONTO = True
        except Exception:
            _PRONTO = False
    return _PRONTO


_PRONTO = None


def _scarica(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def _parole(img, psm):
    """Non basta sapere *cosa* ha letto l'OCR: serve sapere quanto ci crede. Su una fotografia
    di una cucina l'OCR legge sempre qualcosa — maniglie che sembrano lettere, riflessi che
    sembrano parole — ma ci crede poco. Un marchio stampato sopra ci crede tanto. La
    confidenza e' l'unica cosa che separa un watermark dal rumore."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    try:
        r = subprocess.run(["tesseract", "stdin", "stdout", "-l", "ita+eng", "--psm", str(psm), "tsv"],
                           input=buf.getvalue(), capture_output=True, timeout=45)
    except Exception:
        return []
    out = []
    for riga in csv.DictReader(io.StringIO(r.stdout.decode("utf-8", "ignore")), delimiter="\t"):
        testo = (riga.get("text") or "").strip()
        try:
            conf = float(riga.get("conf") or -1)
        except ValueError:
            conf = -1
        if testo and conf >= 0:
            out.append((testo, conf))
    return out


def leggi_immagine(dati):
    """Da byte a due cose: il testo di cui l'OCR e' ragionevolmente sicuro, e i «marchi» —
    le scritte di cui e' sicurissimo, che stanno in mezzo alla fotografia e che quasi mai
    sono parte di una stanza."""
    try:
        from PIL import Image, ImageChops, ImageFilter, ImageOps
    except ImportError:
        return "", []
    try:
        im = Image.open(io.BytesIO(dati)).convert("L")
    except Exception:
        return "", []
    if im.width < 120 or im.height < 120:
        return "", []

    testo, marchi = [], set()
    # Il watermark sta quasi sempre al centro, ogni tanto in una fascia bassa.
    for alto, basso in ((0.28, 0.78), (0.60, 1.00)):
        box = im.crop((0, int(im.height * alto), im.width, int(im.height * basso)))
        if box.height < 40:
            continue
        scala = min(4, max(2, 1400 // max(box.width, 1)))
        grande = box.resize((box.width * scala, box.height * scala), Image.LANCZOS)
        # si toglie la fotografia e resta quello che ci sta sopra
        sfondo = grande.filter(ImageFilter.GaussianBlur(28))
        resto = ImageOps.autocontrast(ImageChops.subtract(grande, sfondo, scale=1, offset=128), cutoff=1)
        for psm in (11, 12):
            for parola, conf in _parole(resto, psm):
                if conf >= CONF_TESTO:
                    testo.append(parola)
                pulita = re.sub(r"[^A-Za-z]", "", parola)
                if conf >= CONF_MARCHIO and len(pulita) >= 2:
                    marchi.add(pulita.lower())
    return " ".join(testo), sorted(marchi)


def verdetto(letture):
    """`letture` sono le coppie (testo, marchi) delle singole fotografie. Ritorna
    (motivo_di_esclusione, marchio_sospetto). Il primo e' un fatto e fa uscire l'annuncio;
    il secondo e' un dubbio e finisce sulla scheda, perche' lo decida un occhio."""
    testi = [t for t, _ in letture if t]
    unito = " ".join(testi)
    marchi = [set(m) for _, m in letture]

    # Niente numeri di telefono: su una fotografia l'OCR trova cifre dappertutto — un forno,
    # un citofono, un calendario — e «396 618 121» era il rumore di una parete, non un
    # recapito. Le parole di mestiere e gli indirizzi web, invece, non se li inventa.
    for regola, come in ((LESSICO_FOTO, "un marchio d'agenzia"), (SITO, "un sito"),
                         (EMAIL, "un'email")):
        m = regola.search(unito)
        if m:
            return f"sulle fotografie compare {come} («{m.group(0).strip()}»)", ""

    # Una scritta che l'OCR legge forte e chiara su piu' fotografie diverse non e' un
    # dettaglio della stanza: e' stata stampata sopra. Quello e' un watermark.
    def plausibile(t):
        return len(t) >= 3 and t not in SCARTA and t not in NON_SONO_MARCHI

    ripetuti = {t for i, a in enumerate(marchi) for b in marchi[i + 1:] for t in (a & b)}
    ripetuti = {t for t in ripetuti if plausibile(t)}
    if ripetuti:
        marchio = sorted(ripetuti, key=len, reverse=True)[0]
        return f"la stessa scritta «{marchio.upper()}» e' impressa su piu' fotografie: e' un watermark", ""

    # Su una fotografia sola non si butta via niente. Provato sull'archivio vero: escludere
    # ogni scritta letta una volta sola faceva uscire sette immobili, e cinque erano privati —
    # il cartello «AFFITTO» alla finestra, la marca della cucina, una borsa su una sedia.
    # Il dubbio finisce sulla scheda con un tasto per confermarlo: due secondi d'occhio, e
    # quello che l'occhio conferma esce per sempre.
    soli = {t for m in marchi for t in m if plausibile(t)}
    if soli:
        return "", sorted(soli, key=len, reverse=True)[0].upper()
    return "", ""


# ---------------------------------------------------------------- la memoria delle letture
def carica_cache(percorso):
    try:
        d = json.load(open(percorso, encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def salva_cache(cache, percorso):
    os.makedirs(os.path.dirname(percorso), exist_ok=True)
    if len(cache) > 3000:          # non cresce all'infinito
        cache = dict(list(cache.items())[-3000:])
    json.dump(cache, open(percorso, "w", encoding="utf-8"), ensure_ascii=False, indent=0)


def controlla(a, cache, urla=lambda s: None):
    """Legge le fotografie di un annuncio. Le letture gia' fatte non si rifanno: la stessa
    fotografia da' sempre lo stesso risultato, e ogni scaricamento e' un secondo di attesa."""
    urls = [a.get(k) for k in ("foto", "foto2", "foto3") if a.get(k)]
    if not urls or not disponibile():
        return "", "", 0
    letture, scaricate = [], 0
    for u in urls[:3]:
        chiave = re.sub(r"[?#].*$", "", u)
        if chiave in cache:
            v = cache[chiave]
            letture.append((v.get("t") or "", v.get("m") or []))
            continue
        try:
            testo, marchi = leggi_immagine(_scarica(u))
            scaricate += 1
        except Exception as e:
            urla(f"    fotografia non leggibile: {e}")
            testo, marchi = "", []
        cache[chiave] = {"t": testo, "m": marchi}
        letture.append((testo, marchi))
        time.sleep(PAUSA)
    motivo, sospetto = verdetto(letture)
    return motivo, sospetto, scaricate
