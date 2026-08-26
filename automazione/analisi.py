#!/usr/bin/env python3
"""Perlustrazione e punteggio degli annunci del radar di Agenzia 2 Sarpi.

Tre lavori, tutti fatti sui dati che il raccoglitore ha gia' in mano:

  1. `zona_di`          la fascia di mercato dell'indirizzo, quando il quartiere non basta
  2. `vetting`          privato vero o agenzia sotto copertura
  3. `priorita`         quanto vale la telefonata, 0-100, con il perche' voce per voce

Nessuna chiamata di rete: qui dentro si ragiona soltanto. Chi raccoglie e' radar.py.
"""
import math
import re
from collections import Counter

DUOMO = (45.46420, 9.19000)

# Le stesse cinque fasce del cruscotto (js/contenuti.js): i nomi devono coincidere
# alla lettera, se no `zonaMedia` non trova la fascia e il confronto col mercato salta.
FASCE = ["Centro storico e semicentro di pregio", "Semicentro consolidato",
         "Fascia media urbana", "Fascia accessibile", "Periferia esterna"]

# Quartieri che la distanza dal Duomo classificherebbe male: Brera e' a un passo ma vale
# il doppio, Bicocca e' vicina e non e' pregio. Solo i casi che sbagliano davvero.
QUARTIERI_PREGIO = ("brera", "quadrilatero", "montenapoleone", "magenta", "castello",
                    "guastalla", "porta venezia", "porta nuova", "cinque giornate",
                    "san babila", "duomo", "sant'ambrogio", "conciliazione", "pagano",
                    "wagner", "washington", "solari", "porta romana", "quadronno")
QUARTIERI_SEMICENTRO = ("isola", "navigli", "porta genova", "ticinese", "sempione", "arco della pace",
                        "citta studi", "città studi", "loreto", "buenos aires", "lambrate", "bocconi",
                        "ripamonti", "farini", "maciachini", "fiera", "de angeli", "bande nere")
QUARTIERI_PERIFERIA = ("quarto oggiaro", "gratosoglio", "baggio", "corvetto", "rogoredo", "bruzzano",
                       "comasina", "affori", "niguarda", "precotto", "san siro", "lorenteggio",
                       "barona", "gallaratese", "quinto romano", "figino", "muggiano", "chiaravalle",
                       "ponte lambro", "santa giulia", "bisceglie", "trenno", "musocco")

# I nomi con cui a Milano si dice dove si abita. Quando l'annuncio non da' la via — e capita
# a un terzo degli annunci di privati — la zona detta a parole e' l'unica cosa che resta, ed e'
# meglio di niente: dice il municipio, la fascia di prezzo e da dove partire per la lettera.
QUARTIERI_MILANO = [
    "Quadrilatero", "Brera", "Duomo", "San Babila", "Cordusio", "Missori", "Sant'Ambrogio",
    "Cadorna", "Magenta", "Conciliazione", "Pagano", "Wagner", "De Angeli", "Washington",
    "Solari", "Tortona", "Navigli", "Porta Genova", "Ticinese", "Darsena", "Porta Romana",
    "Quadronno", "Crocetta", "Bocconi", "Ripamonti", "Vigentino", "Corvetto", "Rogoredo",
    "Santa Giulia", "Forlanini", "Mecenate", "Ortica", "Lambrate", "Citta Studi", "Città Studi",
    "Piola", "Loreto", "Nolo", "Pasteur", "Turro", "Gorla", "Precotto", "Sesto Marelli",
    "Bicocca", "Niguarda", "Maciachini", "Dergano", "Bovisa", "Affori", "Comasina", "Bruzzano",
    "Isola", "Garibaldi", "Porta Nuova", "Farini", "Cenisio", "Sarpi", "Chinatown", "Bullona",
    "Sempione", "Arco della Pace", "Fiera", "City Life", "CityLife", "Portello", "Certosa",
    "Villapizzone", "Quarto Oggiaro", "Musocco", "Gallaratese", "San Siro", "Lotto", "QT8",
    "Bande Nere", "Primaticcio", "Inganni", "Bisceglie", "Baggio", "Lorenteggio", "Giambellino",
    "Barona", "Famagosta", "Romolo", "Gratosoglio", "Chiesa Rossa", "Abbiategrasso", "Missaglia",
    "Porta Venezia", "Buenos Aires", "Lima", "Repubblica", "Centrale", "Sondrio", "Zara",
    "Udine", "Cimiano", "Crescenzago", "Adriano", "Ponte Lambro", "Morivione", "Lodi", "Brenta",
]
_QMAP = [(re.compile(r"\b" + re.escape(q).replace(r"\ ", r"\s+") + r"\b", re.I), q)
         for q in sorted(QUARTIERI_MILANO, key=len, reverse=True)]


def quartiere_dal_testo(testo):
    """La zona detta a parole dentro l'annuncio: «zona Sarpi», «adiacenze Citta Studi».
    Non e' un indirizzo e non va spacciata per tale — e' il quartiere, ed e' gia' molto."""
    for regola, nome in _QMAP:
        if regola.search(testo or ""):
            return nome
    return ""


# ---------------------------------------------------------------- agenzia sotto copertura
# Il mestiere si sente dalle parole. Nessuna di queste, da sola, condanna: contano insieme.
SPIE_TESTO = [
    (re.compile(r"\b(ns\.?\s*rif|rif\.?\s*(interno|agenzia|ag\.)|codice\s+immobile)\b", re.I), 18, "usa un riferimento interno da gestionale"),
    (re.compile(r"\b(la\s+nostra\s+agenzia|il\s+nostro\s+ufficio|i\s+nostri\s+uffici|nostro\s+portafoglio|la\s+nostra\s+societa)\b", re.I), 30, "parla al plurale come un ufficio"),
    (re.compile(r"\b(agente|consulente)\s+immobiliare\b", re.I), 30, "si presenta come consulente immobiliare"),
    (re.compile(r"\b(provvigion|commission[ei]\s+(di\s+)?agenzia|spese\s+di\s+agenzia)\b", re.I), 25, "nomina le provvigioni"),
    (re.compile(r"\b(in\s+esclusiva|mandato\s+in\s+esclusiva|incarico\s+in\s+esclusiva)\b", re.I), 22, "parla di incarico in esclusiva"),
    (re.compile(r"\b(visite?\s+(solo\s+)?su\s+appuntamento|previo\s+appuntamento|appuntamenti\s+in\s+sede)\b", re.I), 12, "riceve su appuntamento in sede"),
    (re.compile(r"\b(trattativa\s+riservata|prezzo\s+riservato)\b", re.I), 10, "formula da annuncio professionale"),
    (re.compile(r"\b(p\.?\s*iva|partita\s+iva|s\.?r\.?l\.?|s\.?a\.?s\.?|s\.?n\.?c\.?|s\.?p\.?a\.?)\b", re.I), 28, "cita una forma societaria o la partita IVA"),
    (re.compile(r"\b(immobiliare|real\s+estate|realty|home\s+staging|property)\b", re.I), 20, "usa il lessico dell'agenzia"),
    (re.compile(r"\b(planimetri[ae]\s+(disponibil|in\s+uffici)|dossier\s+immobiliare|scheda\s+tecnica\s+completa)\b", re.I), 14, "offre materiale da ufficio"),
    (re.compile(r"\b(mutuo|finanziamento)\s+(al\s+)?100%|consulenza\s+(mutu|creditizi)", re.I), 16, "propone servizi di mutuo"),
    (re.compile(r"www\.[a-z0-9-]+\.[a-z]{2,}|https?://(?!www\.subito)", re.I), 16, "rimanda a un sito proprio"),
    (re.compile(r"\bcomposto\s+da\s*:|\bcosi'?\s+composto\b|\bl'?immobile\s+si\s+compone\b", re.I), 8, "descrizione strutturata da scheda"),
    (re.compile(r"\bAPE\b|attestato\s+di\s+prestazione", re.I), 8, "cita l'APE con la sigla tecnica"),
]
NOME_SOCIETA = re.compile(r"immobiliar|real\s*estate|realty|agenzia|studio|group|gruppo|holding|"
                          r"s\.?r\.?l|s\.?a\.?s|s\.?n\.?c|s\.?p\.?a|tecnocasa|remax|re/?max|"
                          r"grimaldi|toscano|gabetti|frimm|professionecasa|engel|century\s*21|"
                          r"\bcase\b|\bhome\b|\bhouse\b|\bliving\b|\bdomus\b|\bdimore\b|"
                          r"abitare|residence|properties|property|costruzion|\bedil|ristrutturazion|"
                          r"intermediazion|mediazion|consulenz|servizi\s+immobil|&", re.I)
EMAIL_LIBERA = re.compile(r"@(gmail|libero|hotmail|outlook|yahoo|virgilio|icloud|alice|tiscali|tin|fastwebnet|live|msn)\.", re.I)
# Chi lo scrive lo dichiara: e' il segnale piu' forte in direzione opposta.
DICHIARA_PRIVATO = re.compile(r"\b(sono\s+il\s+propriet|siamo\s+i\s+propriet|vendo\s+direttamente|"
                              r"affitto\s+direttamente|privato\s+vende|privato\s+affitta|"
                              r"da\s+privato|no\s+agenzi|niente\s+agenzi|senza\s+agenzi|"
                              r"astenersi\s+agenzi|solo\s+privati|nessuna\s+provvigione|"
                              r"senza\s+provvigion|no\s+intermediari)\b", re.I)

SOGLIA_SOSPETTO, SOGLIA_AGENZIA = 25, 60
# La soglia oltre la quale l'immobile esce e basta. Prima era 60 — sotto, l'annuncio restava
# in lista col cartellino «da verificare», perche' al telefono si capisce in dieci secondi.
# Non va bene: quei dieci secondi sono di Gaetano, e la lista deve essere di privati. Dal
# 26 agosto 2026 esce chiunque suoni anche solo un campanello: il costo di perdere un privato
# incerto e' molto piu' basso del costo di una telefonata a un concorrente.
SOGLIA_FUORI = SOGLIA_SOSPETTO

# ---------------------------------------------------------------- agenzia dichiarata: si scarta
# Le spie qui sopra pesano e si sommano. Queste no: qui l'annuncio *dice* che dietro c'e'
# un'agenzia, e allora non e' piu' un giudizio a punti — e' un fatto, e l'immobile esce.
# Il caso che ha insegnato la regola: «Presente Agenzia» in fondo alla descrizione di via
# Luca Signorelli, con il watermark sulle foto, e zero punti di sospetto perche' nessuna
# delle spie a punti guarda la parola «agenzia» da sola.
AGENZIA_DICHIARATA = re.compile(
    # Che l'agenzia ci sia, lo dice l'annuncio stesso
    r"present[ei]\s+agenzi|"                        # «Presente Agenzia»
    r"presenza\s+(di\s+)?agenzi|"
    r"\bcon\s+agenzi|\btramite\s+agenzi|\bvia\s+agenzi|"
    r"gestit[oa]\s+(da|dall'?)\s*agenzi|"
    r"seguit[oa]\s+(da|dall'?)\s*agenzi|"
    r"incaric[oa]\s+(ad?|all'?)\s*agenzi|"
    r"annuncio\s+(pubblicato|gestito)\s+da\s+agenzi|"
    r"a\s+cura\s+(del|della|dell'?)\s*(nostr[ao]\s+)?(agenzi|studio\s+immobiliar)|"
    r"agenzia\s+immobiliar|immobiliare\s+s\.?r\.?l|"
    r"\bagenzia\s+di\s+riferimento|\bnostra\s+agenzi|"
    # Chi fa il mestiere, comunque si chiami
    r"\bagente\s+immobiliar|\bconsulente\s+immobiliar|"
    r"\bintermediari[oa]\b|\bintermediazion|\bprocacciator|\bmediator[ei]\b|"
    r"mediazione\s+(immobiliar|creditizi)|"
    # Il modo di parlare di un ufficio, non di chi vende casa sua
    r"la\s+nostra\s+agenzia|il\s+nostro\s+ufficio|i\s+nostri\s+uffici|nostro\s+portafoglio|"
    r"\bns\.?\s*rif\b|rif\.?\s*(interno|agenzia|ag\.)|codice\s+immobile|"
    r"in\s+esclusiva|mandato\s+in\s+esclusiva|incarico\s+in\s+esclusiva|"
    r"provvigion[ei]\s+(di\s+)?agenzi|spese\s+di\s+agenzi|commission[ei]\s+(di\s+)?agenzi|"
    r"visite?\s+(solo\s+)?su\s+appuntamento|appuntamenti\s+in\s+sede|"
    # Una forma societaria o una partita IVA in fondo a un annuncio di privato non esiste
    r"\bp\.?\s*iva\b|partita\s+iva|\bs\.?r\.?l\.?s?\b|\bs\.?a\.?s\.?\b|\bs\.?n\.?c\.?\b|"
    # Le insegne che si incontrano piu' spesso a Milano
    r"\btecnocasa\b|\bre\s*/?\s*max\b|\bremax\b|\bgabetti\b|\bgrimaldi\b|\bfrimm\b|"
    r"professionecasa|engel\s*&?\s*volkers|century\s*21|\btoscano\b|\btempocasa\b|"
    r"\bpirelli\s*&|\bcoldwell\b|\bsotheby|\bimmobiliare\.it\s+agenzi",
    re.I)


def agenzia_dichiarata(a):
    """L'annuncio dichiara — nel titolo, nella descrizione o nel nome di chi pubblica — che
    dietro c'e' un'agenzia. Ritorna il motivo, o stringa vuota. Chi scrive «no agenzie» sta
    dicendo il contrario e non va confuso: quel controllo viene prima di tutti gli altri."""
    testo = _testo(a)
    nome = (a.get("inserzionista") or "").strip()
    if DICHIARA_PRIVATO.search(testo):
        return ""
    m = AGENZIA_DICHIARATA.search(testo)
    if m:
        frase = re.sub(r"\s+", " ", m.group(0)).strip()
        return f"l'annuncio dichiara l'agenzia («{frase}»)"
    if nome and NOME_SOCIETA.search(nome):
        return f"chi pubblica si chiama «{nome}»: e' il nome di un'attivita', non di una persona"
    if a.get("privato") is False:
        return "il portale lo classifica come annuncio di agenzia"
    email = a.get("email") or ""
    if email and not EMAIL_LIBERA.search(email) and re.search(r"immobiliar|realestate|real-estate|casa|home|dimore|properties", email, re.I):
        return f"email su dominio da agenzia ({email})"
    return ""

# ---------------------------------------------------------------- qualita' dell'immobile
BALCONE = re.compile(r"\bbalcon|terrazz|verand|loggia\b", re.I)
POSTO_AUTO = re.compile(r"\bbox\b|posto\s+auto|garage|autorimessa", re.I)
CANTINA = re.compile(r"\bcantina|solaio\b", re.I)
DA_RIFARE = re.compile(r"da\s+ristruttur|da\s+rimoderna|da\s+sistemar|necessita\s+di\s+lavor|"
                       r"grezzo|da\s+riattare", re.I)
RIFATTO = re.compile(r"\bristruttur(ato|ata)\b|nuova?\s+costruzion|di\s+recente\s+costruzione|"
                     r"appena\s+rifatt|completamente\s+rinnovat|finiture\s+di\s+pregio|"
                     r"mai\s+abitato", re.I)
PIANO_ALTO = re.compile(r"^\s*(\d{1,2})")
PIANO_TERRA = re.compile(r"terra|rialz|seminterr|piano\s*t\b", re.I)


def _n(v):
    try:
        f = float(v)
        return f if f == f else None       # scarta i NaN
    except (TypeError, ValueError):
        return None


def _testo(a):
    return f"{a.get('titolo') or ''} {a.get('descrizione') or ''}"


def _tel(a):
    return re.sub(r"\D", "", a.get("telefono") or "")


# ================================================================ 1. la zona
def _distanza_km(lat, lon):
    dlat = math.radians(lat - DUOMO[0])
    dlon = math.radians(lon - DUOMO[1])
    x = (math.sin(dlat / 2) ** 2 + math.cos(math.radians(DUOMO[0])) *
         math.cos(math.radians(lat)) * math.sin(dlon / 2) ** 2)
    return 6371.0 * 2 * math.asin(math.sqrt(x))


def zona_di(quartiere="", municipio="", lat=None, lon=None):
    """La fascia di mercato dell'indirizzo. Prima il nome del quartiere, che sa cose che la
    geometria non sa; poi la distanza dal Duomo; se non c'e' niente, stringa vuota — mai un
    valore inventato, perche' da qui esce il confronto col prezzo di mercato."""
    q = (quartiere or "").lower()
    if any(k in q for k in QUARTIERI_PREGIO):
        return FASCE[0], "quartiere di pregio"
    if any(k in q for k in QUARTIERI_PERIFERIA):
        return FASCE[4], "quartiere di periferia esterna"
    if any(k in q for k in QUARTIERI_SEMICENTRO):
        return FASCE[1], "semicentro riconosciuto"
    lat, lon = _n(lat), _n(lon)
    if lat and lon:
        d = _distanza_km(lat, lon)
        for limite, fascia in ((1.6, FASCE[0]), (3.2, FASCE[1]), (5.0, FASCE[2]), (7.5, FASCE[3])):
            if d <= limite:
                return fascia, f"{d:.1f} km dal Duomo"
        return FASCE[4], f"{d:.1f} km dal Duomo"
    if municipio == "Municipio 1":
        return FASCE[0], "Municipio 1"
    if municipio in ("Municipio 3", "Municipio 4", "Municipio 8", "Municipio 9"):
        return FASCE[2], municipio
    if municipio:
        return FASCE[3], municipio
    return "", ""


# ================================================================ 2. privato o agenzia
def qualita_foto(a):
    n = len([x for x in (a.get("foto"), a.get("foto2"), a.get("foto3")) if x])
    tot = _n(a.get("numeroFoto")) or n
    if tot >= 3:
        return "buone" if tot >= 8 else "medie"
    return "scarse"


def qualita_testo(a):
    d = (a.get("descrizione") or "").strip()
    if len(d) < 220:
        return "scarno"
    if len(d) < 600:
        return "medio"
    return "curato"


def vetting(a, per_telefono=None, per_nome=None):
    """Perlustrazione dell'inserzionista: privato vero, o agenzia che si e' messa il cappotto
    del privato? Restituisce (sospetto 0-100, verdetto, motivi).

    `per_telefono` e `per_nome` sono i conteggi su tutto l'archivio: chi pubblica lo stesso
    numero su piu' immobili non e' un proprietario, e questo e' il segnale piu' pesante di tutti.
    """
    testo = _testo(a)
    # Prima di ogni conteggio: se l'annuncio dichiara l'agenzia, non c'e' niente da pesare.
    dichiarata = agenzia_dichiarata(a)
    if dichiarata:
        return 100, "probabile agenzia", [dichiarata]

    punti, motivi = 0, []

    tel = _tel(a)
    if tel and per_telefono:
        n = per_telefono.get(tel, 0)
        if n >= 4:
            punti += 45; motivi.append(f"lo stesso numero compare su {n} annunci")
        elif n == 3:
            punti += 32; motivi.append("lo stesso numero compare su 3 annunci")
        elif n == 2:
            punti += 20; motivi.append("lo stesso numero compare su 2 annunci")

    nome = (a.get("inserzionista") or "").strip()
    if nome and per_nome:
        n = per_nome.get(nome.lower(), 0)
        if n >= 3:
            punti += 25; motivi.append(f"«{nome}» pubblica {n} immobili")
        elif n == 2:
            punti += 14; motivi.append(f"«{nome}» pubblica 2 immobili")
    if nome and NOME_SOCIETA.search(nome):
        punti += 35; motivi.append(f"il nome «{nome}» e' quello di un'attivita'")

    for regola, peso, perche in SPIE_TESTO:
        if regola.search(testo):
            punti += peso; motivi.append(perche)

    email = a.get("email") or ""
    if email and not EMAIL_LIBERA.search(email):
        punti += 18; motivi.append("email su dominio proprio, non su una casella gratuita")

    if len(a.get("descrizione") or "") > 1500:
        punti += 6; motivi.append("descrizione molto lunga e compilata")
    # servizio fotografico: dieci scatti e un testo curato non li fa quasi mai un proprietario
    if (_n(a.get("numeroFoto")) or 0) >= 10 and len(a.get("descrizione") or "") > 500:
        punti += 12; motivi.append("servizio fotografico e testo da professionista")

    # Il contrappeso: chi si dichiara proprietario, di solito, lo e'.
    if DICHIARA_PRIVATO.search(testo):
        punti -= 35; motivi.append("si dichiara proprietario o rifiuta le agenzie")
    if a.get("privato") is True and not nome:
        punti -= 5

    punti = max(0, min(100, punti))
    verdetto = ("probabile agenzia" if punti >= SOGLIA_FUORI else "privato")
    return punti, verdetto, motivi[:6]


def indici(annunci):
    """I due conteggi che servono al vetting, calcolati una volta sola su tutto l'archivio."""
    tel = Counter(t for t in (_tel(a) for a in annunci) if len(t) >= 9)
    nomi = Counter((a.get("inserzionista") or "").strip().lower()
                   for a in annunci if (a.get("inserzionista") or "").strip())
    return tel, nomi


# ================================================================ 3. qualita' dell'immobile
def qualita_immobile(a):
    """Quanto e' vendibile questo immobile, 0-100. Non e' il valore del lead: e' il valore
    del mandato una volta preso. Un mandato su una cosa che non si vende non e' un risultato."""
    p, motivi = 50, []
    mq, loc, bagni = _n(a.get("mq")), _n(a.get("locali")), _n(a.get("bagni"))
    prezzo = _n(a.get("prezzo"))
    locazione = (a.get("tipo") == "Locazione")
    testo = _testo(a)

    banda = (35, 90) if locazione else (50, 120)
    if mq:
        if banda[0] <= mq <= banda[1]:
            p += 14; motivi.append(f"{mq:.0f} mq: taglio molto richiesto")
        elif mq < banda[0] * 0.6:
            p -= 10; motivi.append(f"{mq:.0f} mq: taglio piccolo, mercato stretto")
        elif mq > banda[1] * 1.8:
            p -= 6; motivi.append(f"{mq:.0f} mq: taglio grande, acquirenti pochi")
    if loc and 2 <= loc <= 4:
        p += 8; motivi.append(f"{loc:.0f} locali: la domanda sta qui")
    if bagni and bagni >= 2:
        p += 7; motivi.append("due o piu' bagni")

    piano = str(a.get("piano") or "")
    m = PIANO_ALTO.search(piano)
    np = int(m.group(1)) if m else None
    asc = a.get("ascensore")
    if PIANO_TERRA.search(piano):
        p -= 8; motivi.append("piano terra o rialzato")
    elif np and np >= 3 and asc is False:
        p -= 14; motivi.append(f"{np}° piano senza ascensore")
    elif asc is True:
        p += 7; motivi.append("con ascensore")

    if RIFATTO.search(testo) or (a.get("statoImmobile") or "").lower() in ("ristrutturato", "nuovo", "ottimo"):
        p += 12; motivi.append("ristrutturato o nuovo")
    elif DA_RIFARE.search(testo) or (a.get("statoImmobile") or "").lower() in ("da ristrutturare",):
        p -= 10; motivi.append("da ristrutturare")

    ce = (a.get("classeEnergetica") or "").upper()[:1]
    if ce in ("A", "B", "C"):
        p += 8; motivi.append(f"classe energetica {a.get('classeEnergetica')}")
    elif ce in ("F", "G"):
        p -= 5; motivi.append(f"classe energetica {a.get('classeEnergetica')}")

    if BALCONE.search(testo):
        p += 6; motivi.append("balcone o terrazzo")
    if POSTO_AUTO.search(testo):
        p += 6; motivi.append("box o posto auto")
    if CANTINA.search(testo):
        p += 2

    if prezzo and not locazione:
        if 150_000 <= prezzo <= 900_000:
            p += 6; motivi.append("prezzo nella fascia piu' liquida")
        elif prezzo > 1_500_000:
            p -= 4; motivi.append("fascia alta: tempi lunghi")

    return max(0, min(100, round(p))), motivi[:6]


# ================================================================ 4. la priorita' di chiamata
def riferimento_emq(a, mediane):
    """Il €/mq di confronto: prima la mediana vera del quartiere, poi la fascia indicativa.
    Se non c'e' ne' l'una ne' l'altra si torna None e il punteggio lo dice, invece di inventare."""
    from_med = mediane.get((a.get("quartiere") or "", a.get("tipo") or ""))
    if from_med:
        return from_med, f"mediana dell'archivio in {a.get('quartiere')}"
    fasce = {"Centro storico e semicentro di pregio": 10500, "Semicentro consolidato": 7000,
             "Fascia media urbana": 5250, "Fascia accessibile": 3750, "Periferia esterna": 2500}
    z = fasce.get(a.get("zona") or "")
    if z and a.get("tipo") != "Locazione":
        return z, f"fascia indicativa {a.get('zona')}"
    return None, ""


def mediane_quartiere(annunci, minimo=3):
    """Mediana €/mq per (quartiere, tipo). E' l'asset di cui parla il piano: si costruisce
    da sola man mano che l'archivio cresce, e da li' in poi il confronto e' vero."""
    gruppi = {}
    for a in annunci:
        mq, pr = _n(a.get("mq")), _n(a.get("prezzo"))
        q = a.get("quartiere") or ""
        if q and mq and mq > 15 and pr and pr > 0 and not prezzo_dubbio(a):
            gruppi.setdefault((q, a.get("tipo") or ""), []).append(pr / mq)
    out = {}
    for k, v in gruppi.items():
        if len(v) >= minimo:
            v.sort()
            out[k] = v[len(v) // 2]
    return out


# Fuori da queste forchette il prezzo dell'annuncio non e' un prezzo: e' un errore di
# battitura, un canone annuo scritto come mensile, o un «trattabile» buttato li'.
# Non si scarta l'immobile — si smette di far finta che quel numero valga qualcosa.
PLAUSIBILE = {"Locazione": (250, 9000), "Vendita": (30_000, 8_000_000)}


def prezzo_dubbio(a):
    pr = _n(a.get("prezzo"))
    if not pr:
        return True
    lo, hi = PLAUSIBILE.get(a.get("tipo") or "Vendita", PLAUSIBILE["Vendita"])
    return not (lo <= pr <= hi)


def provvigione(a):
    pr = _n(a.get("prezzo")) or 0
    if prezzo_dubbio(a):
        return 0.0
    if a.get("tipo") == "Locazione":
        return pr * 12 * 0.18          # intermediazione + gestione del primo anno
    return pr * 0.03


def priorita(a, mediane, giorni_online, portali=1, sospetto=0):
    """Quanto vale la telefonata, 0-100, col perche' voce per voce.

    Segue il piano — «un annuncio con foto storte, testo di due righe e prezzo del 15% sopra
    mercato in una zona a ticket alto e' il lead migliore in assoluto» — e ci aggiunge le due
    cose che il piano da' per scontate e qui vanno misurate: che l'immobile sia vendibile
    davvero, e che dall'altra parte ci sia un proprietario e non un collega travestito.
    """
    p, perche = 0.0, []
    mq, pr = _n(a.get("mq")), _n(a.get("prezzo"))

    dubbio = prezzo_dubbio(a)
    rif, fonte = riferimento_emq(a, mediane)
    if dubbio:
        perche.append(["Prezzo non attendibile: da verificare al telefono", 0])
    if rif and mq and pr and mq > 0 and not dubbio:
        sc = ((pr / mq) - rif) / rif * 100
        v = max(-6.0, min(20.0, sc * 1.0))
        p += v
        perche.append([f"Prezzo {sc:+.0f}% rispetto alla zona ({fonte})", round(v, 1)])
    else:
        p += 6; perche.append(["Prezzo di zona non confrontabile", 6])

    v = max(0.0, min(18.0, giorni_online / 5.0))
    p += v; perche.append([f"{giorni_online} giorni online", round(v, 1)])

    v = {"scarse": 12, "medie": 6, "buone": 1}.get(a.get("qualitaFoto") or "", 6)
    p += v; perche.append([f"Foto: {a.get('qualitaFoto') or 'non valutate'}", v])

    v = {"scarno": 8, "medio": 4, "curato": 1}.get(a.get("qualitaTesto") or "", 4)
    p += v; perche.append([f"Testo: {a.get('qualitaTesto') or 'non valutato'}", v])

    rib = _n(a.get("ribassi")) or 0
    if rib:
        v = min(8.0, rib * 4); p += v; perche.append([f"{rib:.0f} ribassi gia' applicati", v])

    prov = provvigione(a)
    if prov:
        v = max(0.0, min(20.0, prov / 900.0))
        p += v; perche.append([f"Provvigione stimata {prov:,.0f} €".replace(",", "."), round(v, 1)])

    qi, _ = qualita_immobile(a)
    v = (qi - 50) / 50.0 * 14.0
    p += v; perche.append([f"Qualita' dell'immobile {qi}/100", round(v, 1)])

    if a.get("telefono"):
        p += 5; perche.append(["Telefono pubblicato", 5])
    elif not a.get("email"):
        p -= 8; perche.append(["Nessun recapito diretto", -8])

    if portali >= 3:
        p += 4; perche.append([f"Su {portali} portali: sta facendo fatica", 4])

    if sospetto >= SOGLIA_SOSPETTO:
        v = -(sospetto / 100.0) * 45.0
        p += v
        perche.append(["Sospetto agenzia sotto copertura" if sospetto < SOGLIA_AGENZIA
                       else "Probabile agenzia, non un proprietario", round(v, 1)])
    if a.get("noAgenzie"):
        p -= 30; perche.append(["Ha scritto «no agenzie»: non si chiama", -30])

    return max(0, min(100, round(p))), perche
