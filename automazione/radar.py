#!/usr/bin/env python3
"""Raccoglitore del radar di Agenzia 2 Sarpi, per quando gli strumenti MCP di Apify
non arrivano alla sessione. Passa dall'API ufficiale di Apify (mai dai portali).

  radar.py                 # credito, raccolta, verifica, scrittura dei file
  radar.py --solo-credito  # guarda solo quanto e' stato consumato
  radar.py --solo-verifica # nessuna raccolta nuova, solo il giro di verifica
  radar.py --prova         # nessuna chiamata di rete: prova la fusione a vuoto

  radar.py --nuovi 60 --verifiche 60 --giorni 14
                           # volumi del giro settimanale (di serie sono quelli del giro
                           # quotidiano: 20 nuovi, 20 verifiche, archivio a 10 giorni)
"""
import json, os, re, subprocess, sys, time, datetime, urllib.request, urllib.parse, tempfile

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import analisi

# realpath, non abspath: sul Mac lo script si chiama da un collegamento dentro la skill,
# e va risolto fin dentro il repository — altrimenti la cartella «dati» non si trova.
QUI = os.path.dirname(os.path.realpath(__file__))
BASE = os.environ.get("RADAR_BASE") or os.path.join(os.path.dirname(QUI), "docs")
# il sito sta in docs/ — fuori ci sono gli script, che GitHub Pages non pubblica
RADAR = os.path.join(BASE, "dati", "radar.json")
APIFY = os.path.join(QUI, "apify.sh")
ATTORE = "emastra/subito-it-immobili"
CAMPI = ("page_url,title,type,description,price,publication_date,advertiser,location,features,images,"
         "isPrivateAdvertiser")
RITAGLIO = "?rule=vertical-mini-card-2x-auto"
TETTO_MESE, NUOVI, VERIFICHE, GIORNI = 4.20, 20, 20, 10
COSTO_PEZZO = 0.006          # ~0,005 $ per annuncio, con un filo di margine
LOTTO_VERIFICA = 20          # la chiamata sincrona di Apify scade a 300 s: si va a lotti
OGGI = datetime.date.today()
UA = "Radar-Agenzia2Sarpi/1.0 (gaetano.romaniello80@gmail.com)"

TIPI = r"via|viale|v\.le|piazza|p\.zza|piazzale|corso|c\.so|largo|vicolo|foro|bastioni|ripa|alzaia"
CHIAVE = re.compile(rf"\b({TIPI})\b", re.I)
SEPARA = re.compile(r"[.,;:|()\[\]/\n\r]|\s[-–]\s")
LEGA = {"degli", "delle", "della", "dello", "dei", "del", "di", "da", "de", "d'", "san", "santa", "sant'"}
FERMA = {"milano", "zona", "zone", "metro", "mm", "m1", "m2", "m3", "m4", "m5", "fermata", "angolo", "adiacenze",
         "adiacente", "vicino", "presso", "fronte", "appartamento", "appartamenti", "proprietario", "proprietaria",
         "offre", "offresi", "libero", "libera", "vendesi", "affittasi", "affitto", "affitta", "vendita", "vendo",
         "bilocale", "trilocale", "monolocale", "quadrilocale", "attico", "loft", "stanza", "camera", "posto",
         "situato", "situata", "ideale", "disponibile", "ristrutturato", "ristrutturata", "arredato", "arredata",
         "luminoso", "luminosa", "ampio", "ampia", "grazioso", "graziosa", "nuovo", "piano", "mq", "euro", "no",
         "si", "in", "a", "al", "il", "la", "lo", "un", "una", "con", "per", "e"}
PAROLA = re.compile(r"[A-Za-zÀ-ÿ'’]+|\d{1,4}[a-zA-Z]?")
TELEFONO = re.compile(r"\b(3\d{2}[\s./-]?\d{3}[\s./-]?\d{3,4}|0\d{1,3}[\s./-]?\d{6,8})\b")
AFFITTO = re.compile(r"affitt|locaz|canone\s+mensil|al\s+mese|/mese", re.I)
# chi lo scrive nell'annuncio non va chiamato: e' una volonta' dichiarata, non un ostacolo da aggirare
NOAGENZIE = re.compile(r"no\s*agenzi|niente\s+agenzi|senza\s+agenzi|non\s+voglio\s+essere\s+contattat"
                       r"|no\s+telemarketing|astenersi\s+agenzi|solo\s+privati", re.I)


def dal_testo_telefono(testo):
    """Il campo del recapito e' vuoto nella maggior parte degli annunci, ma il numero
    e' quasi sempre scritto dentro la descrizione."""
    for m in TELEFONO.finditer(testo or ""):
        n = re.sub(r"\D", "", m.group(1))
        if len(n) >= 9 and not n.startswith("00"):
            return n
    return ""


def _pulisci(t):
    return (t or "").replace("’", "'").strip()


def dal_testo(testo):
    """La via col civico presa dal testo dell'annuncio: e' il dato migliore che esista.
    Si ferma alla fine della frase, cosi' non si porta dietro la frase dopo."""
    for pezzo in SEPARA.split(_pulisci(testo)):
        m = CHIAVE.search(pezzo)
        if not m:
            continue
        # «in zona via Rizzoli» indica il quartiere, non l'indirizzo: la' vincono le coordinate
        riferimento = bool(re.search(r"\b(zona|zone|pressi|vicin[oa]|adiacen\w*|fronte|angolo|davanti)\s*$",
                                     pezzo[:m.start()], re.I))
        tipo = m.group(1).lower().replace("v.le", "viale").replace("p.zza", "piazza").replace("c.so", "corso")
        resto = PAROLA.findall(pezzo[m.end():])
        nome, civico = [], ""
        for t in resto:
            if t[0].isdigit():
                if nome and len(re.sub(r"\D", "", t)) <= 3:
                    civico = t
                break
            b = t.lower()
            if b in FERMA or (b in LEGA and not nome):
                break
            if b in LEGA:
                nome.append(b)
                continue
            if len(t) == 1:
                break
            if not t[0].isupper() and nome:
                break
            nome.append(t.capitalize())
            if len([x for x in nome if x.lower() not in LEGA]) >= 3:
                break
        if nome:
            return (tipo.capitalize() + " " + " ".join(nome)).strip(), ("" if riferimento else civico), riferimento
    return "", "", False


def _nome(via):
    """Le parole vere del nome: servono a capire se testo e coordinate parlano della stessa strada."""
    return {p.lower() for p in re.sub(rf"^({TIPI})\s+", "", via or "", flags=re.I).split()} - LEGA


def stessa_strada(a, b):
    na, nb = _nome(a), _nome(b)
    return bool(na and nb and na & nb)


def urla(msg):
    print(msg, file=sys.stderr)


def opzione(argv, nome, difetto):
    """--nuovi 60 oppure --nuovi=60. Se manca o non e' un numero, resta il valore di serie."""
    for i, a in enumerate(argv):
        if a == nome and i + 1 < len(argv):
            grezzo = argv[i + 1]
        elif a.startswith(nome + "="):
            grezzo = a.split("=", 1)[1]
        else:
            continue
        try:
            return max(0, int(grezzo))
        except ValueError:
            urla(f"  {nome}: «{grezzo}» non e' un numero, tengo {difetto}")
    return difetto


def tetto_chiamata(pezzi):
    """Il tetto della singola chiamata deve crescere col volume, se no Apify tronca."""
    return round(max(0.15, pezzi * COSTO_PEZZO + 0.05), 2)


def apify(*args):
    r = subprocess.run([APIFY, *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip() or f"apify.sh uscita {r.returncode}")
    try:
        dati = json.loads(r.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"risposta non leggibile da Apify: {r.stdout[:300]}")
    # Apify risponde 200 anche quando rifiuta: l'errore e' dentro il corpo. Senza questo
    # controllo il codice tira dritto e si schianta piu' avanti con un messaggio che non
    # dice niente — ed e' esattamente cosa e' successo al primo giro su GitHub.
    if isinstance(dati, dict) and dati.get("error"):
        e = dati["error"]
        if isinstance(e, dict):
            raise RuntimeError(f"Apify rifiuta: {e.get('type', '?')} — {e.get('message', '')}".strip(" —"))
        raise RuntimeError(f"Apify rifiuta: {e}")
    return dati


def credito():
    d = apify("credito").get("data", {})
    speso = float(d.get("current", {}).get("monthlyUsageUsd", 0) or 0)
    tetto = float(d.get("limits", {}).get("maxMonthlyUsageUsd", 5) or 5)
    return speso, tetto


def chiama(input_dict, tetto_usd):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(input_dict, f)
        p = f.name
    try:
        out = apify("raccogli", ATTORE, p, str(tetto_usd), CAMPI)
        if not isinstance(out, list):
            raise RuntimeError(f"Apify doveva mandare un elenco e ha mandato "
                               f"{type(out).__name__}: {str(out)[:300]}")
        return out
    finally:
        os.unlink(p)


# ---------------- indirizzo ----------------
_ultimo = [0.0]


def nominatim(percorso, params):
    attesa = 1.05 - (time.time() - _ultimo[0])
    if attesa > 0:
        time.sleep(attesa)
    _ultimo[0] = time.time()
    url = f"https://nominatim.openstreetmap.org/{percorso}?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except Exception as e:
        urla(f"  nominatim muto: {e}")
        return None


def coordinate_di(via, civico):
    """Quando l'annuncio non porta le coordinate, la via del testo basta a chiederle:
    senza un punto sulla mappa non si ricava ne' il quartiere ne' la fascia di mercato."""
    if not via:
        return None, None
    q = f"{via} {civico}, Milano, Italia" if civico else f"{via}, Milano, Italia"
    d = nominatim("search", {"format": "jsonv2", "limit": "1", "countrycodes": "it", "q": q})
    if not d:
        return None, None
    try:
        return float(d[0]["lat"]), float(d[0]["lon"])
    except (KeyError, IndexError, ValueError, TypeError):
        return None, None


def dalle_coordinate(lat, lon):
    d = nominatim("reverse", {"format": "jsonv2", "zoom": "18", "addressdetails": "1", "lat": lat, "lon": lon})
    if not d:
        return "", "", "", ""
    a = d.get("address", {})
    civ = a.get("house_number", "") or ""
    if not re.fullmatch(r"\d{1,4}[a-zA-Z]?", civ):
        civ = ""
    quart = a.get("neighbourhood") or a.get("suburb") or a.get("quarter") or ""
    muni = a.get("city_district") or ""
    if quart.lower().startswith("municipio"):
        muni, quart = quart, ""
    m = re.search(r"(\d+)", muni or "")
    return a.get("road", "") or "", civ, quart, (f"Municipio {m.group(1)}" if m else "")


# ---------------- mappatura ----------------
def num(v):
    try:
        return float(str(v).replace(".", "").replace(",", ".").replace("€", "").strip())
    except Exception:
        return None


def scava(d, percorso):
    cur = d
    for p in percorso.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(p)
    return cur


def esiste_a_milano(via):
    """Quando testo e coordinate litigano, chiede a Nominatim se la via del testo esiste davvero:
    negli annunci i nomi di strada si sbagliano di frequente."""
    d = nominatim("search", {"format": "jsonv2", "limit": "1", "countrycodes": "it",
                             "q": f"{via}, Milano, Italia"})
    return bool(d)


def da_tenere(it):
    """Il filtro onlyPrivate lascia passare qualche azienda, e la ricerca «Milano» qualche
    comune della provincia: qui si buttano."""
    tipo_ins = (scava(it, "advertiser.type") or "").lower()
    if tipo_ins and tipo_ins != "privato":
        return False, f"inserzionista {tipo_ins}"
    if it.get("isPrivateAdvertiser") is False:
        return False, "inserzionista non privato"
    citta = (scava(it, "location.city") or "").strip().lower()
    if citta and citta != "milano":
        return False, f"fuori Milano ({citta})"
    return True, ""


def mappa(it):
    url = it.get("page_url") or ""
    f = it.get("features") or {}

    def car(nome, chiave="value"):
        v = f.get(nome)
        return (v or {}).get(chiave) if isinstance(v, dict) else v

    titolo = it.get("title") or ""
    desc = (it.get("description") or "")
    via, civico, riferimento = dal_testo(titolo + ". " + desc)
    quart = muni = ""
    lat, lon = scava(it, "location.coordinates.latitude"), scava(it, "location.coordinates.longitude")
    if not (lat and lon) and via:
        # l'indirizzo del testo vale piu' delle coordinate, ma le coordinate servono lo stesso:
        # sono loro a dire in che quartiere e in che fascia di mercato siamo
        lat, lon = coordinate_di(via, civico)
    if lat and lon:
        rvia, rciv, quart, muni = dalle_coordinate(lat, lon)
        if rvia and (not via or riferimento or stessa_strada(rvia, via)):
            # niente dal testo, oppure il testo dava solo la zona, oppure e' la stessa
            # strada scritta male: le coordinate la scrivono per esteso
            via, civico = rvia, (civico or rciv)
        elif rvia and via and not esiste_a_milano(via):
            via, civico = rvia, rciv       # la via del testo non esiste: era un errore di battitura
    tutte_foto = [(u + RITAGLIO if "images.sbito.it" in u and "?" not in u else u)
                  for u in (it.get("images") or []) if isinstance(u, str)]
    foto = tutte_foto[:3]
    prezzo = num(scava(it, "price.value"))
    # l'elenco «vendita» di Subito e' pieno di affitti postati male: il prezzo non mente
    tipo = "Locazione" if (prezzo and prezzo < 15000) or AFFITTO.search(titolo + " " + desc) else "Vendita"
    asc = car("elevator")
    return {
        "url": url, "portale": "subito", "riferimento": (re.search(r"(\d+)\.htm", url) or [None, ""])[1],
        "titolo": titolo, "via": via, "civico": civico, "quartiere": quart, "municipio": muni,
        "tipo": tipo, "tipologia": "", "prezzo": prezzo,
        "mq": num(car("size_sqm")), "locali": num(car("rooms")), "bagni": num(car("bathrooms")),
        "piano": str(car("floor") or ""), "ascensore": (None if asc is None else bool(asc)),
        "zona": "", "lat": lat, "lon": lon,
        "spese": "", "classeEnergetica": car("energy_class") or "", "statoImmobile": car("building_condition") or "",
        "telefono": (scava(it, "advertiser.phone_number") or dal_testo_telefono(titolo + " " + desc)), "email": "",
        "inserzionista": scava(it, "advertiser.name") or "",
        "foto": foto[0] if foto else "", "foto2": foto[1] if len(foto) > 1 else "", "foto3": foto[2] if len(foto) > 2 else "",
        "numeroFoto": len(tutte_foto),
        "descrizione": desc[:900], "pubblicato": (scava(it, "publication_date.date") or "")[:10],
        "privato": True, "verificatoIl": OGGI.isoformat(),
        "noAgenzie": bool(NOAGENZIE.search(titolo + " " + desc)),
    }


# ---------------- fusione ----------------
def eta(a):
    try:
        return (OGGI - datetime.date.fromisoformat((a.get("pubblicato") or "")[:10])).days
    except Exception:
        return 0


def fondi(vecchi, nuovi):
    per_url = {a["url"]: a for a in vecchi}
    for a in per_url.values():
        a["nuovo"] = False          # nuovo vuol dire «comparso in questo giro», non «recente»
    aggiunti = ribassati = 0
    for n in nuovi:
        if not n["url"]:
            continue
        v = per_url.get(n["url"])
        if not v:
            n["nuovo"] = True
            n["scoperto"] = OGGI.isoformat()
            per_url[n["url"]] = n
            aggiunti += 1
            continue
        v["nuovo"] = False
        p_new, p_old = n.get("prezzo"), v.get("prezzo")
        if p_new and p_old and p_new != p_old:
            if p_new < p_old:
                v["ribassi"] = int(v.get("ribassi") or 0) + 1
                ribassati += 1
            v["prezzo"] = p_new
        v["verificatoIl"] = OGGI.isoformat()
    return per_url, aggiunti, ribassati


def completa_indirizzi(annunci, tetto=40):
    """Gli annunci raccolti prima che il radar imparasse a segnarsi le coordinate non hanno
    ne' quartiere ne' fascia di mercato. Nominatim e' gratuito e va a una richiesta al secondo:
    un tot per giro, e in due o tre passaggi l'archivio e' completo."""
    fatti = 0
    for a in annunci:
        if fatti >= tetto:
            break
        if a.get("quartiere") and a.get("municipio"):
            continue
        # un indirizzo che Nominatim non ha saputo dire non lo sapra' nemmeno domani:
        # si riprova fra un mese, non a ogni giro
        tentato = a.get("indirizzoTentato")
        if tentato and (OGGI - datetime.date.fromisoformat(tentato)).days < 30:
            continue

        lat, lon = a.get("lat"), a.get("lon")
        if not (lat and lon) and a.get("via"):
            lat, lon = coordinate_di(a.get("via"), a.get("civico"))
        if not (lat and lon):
            # niente via: resta la zona detta a parole dentro l'annuncio
            q = analisi.quartiere_dal_testo(f"{a.get('titolo') or ''} {a.get('descrizione') or ''}")
            if q:
                a["quartiere"] = a.get("quartiere") or q
                a["quartiereFonte"] = "nominato nel testo dell'annuncio"
                lat, lon = coordinate_di(q, "")
            if not (lat and lon):
                a["indirizzoTentato"] = OGGI.isoformat()
                fatti += 1
                continue
        a["lat"], a["lon"] = lat, lon

        rvia, rciv, quart, muni = dalle_coordinate(lat, lon)
        if quart and not a.get("quartiere"):
            a["quartiere"] = quart
        if muni and not a.get("municipio"):
            a["municipio"] = muni
        if rciv and not a.get("civico"):
            a["civico"] = rciv
        a["indirizzoTentato"] = OGGI.isoformat()
        a["zona"] = ""          # si ricalcola nella perlustrazione, ora che c'e' il quartiere
        fatti += 1
    return fatti


def perlustra(annunci, storici=()):
    """Il secondo tempo del radar: qui non si raccoglie piu' niente, si guarda meglio quello
    che c'e'. Per ogni immobile: la fascia di mercato, com'e' presentato, se dall'altra parte
    c'e' davvero un proprietario, e quanto vale la telefonata."""
    per_tel, per_nome = analisi.indici(list(annunci) + list(storici))
    mediane = analisi.mediane_quartiere(annunci)
    conta = {"privato": 0, "da verificare": 0, "probabile agenzia": 0}
    for a in annunci:
        if not a.get("scoperto"):
            # gli annunci entrati prima che il radar tenesse il conto: la data di pubblicazione
            # e' la cosa piu' vicina al vero, e serve al cruscotto per non chiamarli «novita'»
            a["scoperto"] = (a.get("pubblicato") or "")[:10] or OGGI.isoformat()
        if not a.get("via"):
            a["civico"] = ""        # un civico senza la via non e' un indirizzo, e' un numero
        if not a.get("zona"):
            a["zona"], a["zonaFonte"] = analisi.zona_di(a.get("quartiere"), a.get("municipio"),
                                                        a.get("lat"), a.get("lon"))
        a["qualitaFoto"] = analisi.qualita_foto(a)
        a["qualitaTesto"] = analisi.qualita_testo(a)

        sosp, verdetto, motivi = analisi.vetting(a, per_tel, per_nome)
        a["sospettoAgenzia"], a["verdettoInserzionista"], a["motiviAgenzia"] = sosp, verdetto, motivi
        # solo quando il quadro e' netto si toglie dai privati: nel dubbio resta in lista,
        # segnalato, e decide Gaetano al telefono in trenta secondi
        a["privato"] = verdetto != "probabile agenzia"
        conta[verdetto] += 1

        a["qualitaImmobile"], a["percheImmobile"] = analisi.qualita_immobile(a)
        a["priorita"], a["perchePriorita"] = analisi.priorita(
            a, mediane, eta(a), portali=1, sospetto=sosp)
    return conta, len(mediane)


def scrivi(d, annunci):
    d["annunci"] = annunci
    d["conteggio"] = len(annunci)
    d["id"] = "radar-" + datetime.datetime.now().strftime("%Y%m%d%H%M")
    d["generato"] = datetime.datetime.now().isoformat(timespec="seconds")
    json.dump(d, open(RADAR, "w"), ensure_ascii=False, indent=1)


def stampa(rep, eta_fn):
    _riduci_da_chiamare(rep, eta_fn)
    print(json.dumps(rep, ensure_ascii=False, indent=2))


def main():
    argv = sys.argv[1:]
    arg = set(argv)
    nuovi_max = opzione(argv, "--nuovi", NUOVI)
    verifiche_max = opzione(argv, "--verifiche", VERIFICHE)
    giorni_max = opzione(argv, "--giorni", GIORNI)
    indirizzi_max = opzione(argv, "--indirizzi", 40)
    d = json.load(open(RADAR))
    annunci = d.get("annunci", [])
    rep = {"raccolti": 0, "aggiunti": 0, "ribassati": 0, "verificati": [], "spariti_nuovi": [], "potati": 0, "note": []}

    if "--solo-perlustra" in arg:
        rep["indirizzi_completati"] = completa_indirizzi(annunci, indirizzi_max)
        rep["inserzionisti"], rep["quartieri_con_mediana"] = perlustra(annunci, d.get("usciti", []))
        rep["nuovi_in_vista"] = sum(1 for a in annunci if a.get("nuovo"))
        rep["da_chiamare"] = sorted([a for a in annunci if a.get("privato") and not a.get("noAgenzie")],
                                    key=lambda a: -(a.get("priorita") or 0))[:10]
        rep["note"].append("solo perlustrazione: nessuna raccolta, nessuna verifica")
        scrivi(d, annunci)
        stampa(rep, eta)
        return 0

    if "--prova" not in arg:
        try:
            speso, tetto = credito()
        except Exception as e:
            rep["note"].append(f"Apify non risponde, radar.json lasciato com'e': {e}")
            print(json.dumps(rep, ensure_ascii=False, indent=2))
            return 3
        rep["credito"] = f"{speso:.2f} $ consumati su {tetto:.2f} $"
        if speso > TETTO_MESE:
            rep["note"].append(f"credito agli sgoccioli ({speso:.2f} $ su {tetto:.2f} $): niente raccolta, si riparte al rinnovo")
            print(json.dumps(rep, ensure_ascii=False, indent=2))
            return 0
        quota = nuovi_max // 2 if speso > tetto * 0.7 else nuovi_max
        if quota < nuovi_max:
            rep["note"].append("oltre il 70% del credito: volume dimezzato per oggi")

        nuovi = []
        if "--solo-verifica" not in arg and "--solo-credito" not in arg:
            for tipo, u in (("Vendita", "https://www.subito.it/annunci-lombardia/vendita/appartamenti/milano/milano/"),
                            ("Locazione", "https://www.subito.it/annunci-lombardia/affitto/appartamenti/milano/milano/")):
                try:
                    items = chiama({"startUrls": [u], "onlyPrivate": True, "maxResultItems": quota // 2},
                                   tetto_chiamata(quota // 2))
                    tenuti = []
                    for i in items:
                        ok, perche = da_tenere(i)
                        if ok:
                            tenuti.append(mappa(i))
                        else:
                            urla(f"    scartato ({perche}): {i.get('title')}")
                    urla(f"  {tipo}: {len(items)} raccolti, {len(tenuti)} tenuti")
                    nuovi += tenuti
                except Exception as e:
                    rep["note"].append(f"raccolta {tipo} non riuscita: {e}")
        rep["raccolti"] = len(nuovi)
        per_url, rep["aggiunti"], rep["ribassati"] = fondi(annunci, [n for n in nuovi if n.get("privato")])

        if "--solo-credito" not in arg:
            da_verificare = sorted([a for a in per_url.values() if a["url"] not in {n["url"] for n in nuovi}],
                                   key=lambda a: (a.get("verificatoIl") or "", a.get("pubblicato") or ""))[:verifiche_max]
            for i in range(0, len(da_verificare), LOTTO_VERIFICA):
                lotto = da_verificare[i:i + LOTTO_VERIFICA]
                try:
                    vivi = {it.get("page_url") for it in chiama(
                        {"startUrls": [a["url"] for a in lotto], "maxResultItems": len(lotto)},
                        tetto_chiamata(len(lotto)))}
                    for a in lotto:
                        a["verificatoIl"] = OGGI.isoformat()
                        (rep["verificati"] if a["url"] in vivi else rep["spariti_nuovi"]).append(a["url"])
                except Exception as e:
                    rep["note"].append(f"verifica del lotto {i // LOTTO_VERIFICA + 1} non riuscita: {e}")

        if rep["aggiunti"] or rep["raccolti"]:
            prima = len(per_url)
            per_url = {u: a for u, a in per_url.items() if eta(a) <= giorni_max}
            rep["potati"] = prima - len(per_url)

        # Chi non e' piu' in pubblicita' esce dalla vista: non si chiama un immobile gia' venduto.
        # Non si butta pero': fra sei mesi quel proprietario e' un lead di nuovo, e allora
        # l'archivio «usciti» e' l'unico posto dove ritrovarlo.
        fuori = set(rep["spariti_nuovi"]) | set(d.get("spariti", []))
        usciti = {u["url"]: u for u in d.get("usciti", [])}
        tolti = 0
        for u in list(per_url):
            if u in fuori:
                a = per_url.pop(u)
                a["uscitoIl"] = a.get("uscitoIl") or OGGI.isoformat()
                a["nuovo"] = False
                usciti[u] = a
                tolti += 1
        rep["tolti_dalla_vista"] = tolti
        usciti = {u: a for u, a in usciti.items()
                  if (OGGI - datetime.date.fromisoformat(a.get("uscitoIl", OGGI.isoformat()))).days <= 180}
        d["usciti"] = list(usciti.values())

        annunci = list(per_url.values())
        rep["indirizzi_completati"] = completa_indirizzi(annunci, indirizzi_max)
        rep["inserzionisti"], rep["quartieri_con_mediana"] = perlustra(annunci, d.get("usciti", []))
        rep["nuovi_in_vista"] = sum(1 for a in annunci if a.get("nuovo"))
        rep["da_chiamare"] = sorted(
            [a for a in annunci if a.get("privato") and not a.get("noAgenzie")],
            key=lambda a: -(a.get("priorita") or 0))[:10]
    else:
        rep["note"].append("prova a vuoto: nessuna chiamata di rete")
        rep["inserzionisti"], rep["quartieri_con_mediana"] = perlustra(annunci)
        rep["da_chiamare"] = sorted([a for a in annunci if a.get("privato") and not a.get("noAgenzie")],
                                    key=lambda a: -(a.get("priorita") or 0))[:10]

    d["verificati"] = sorted(set(rep["verificati"]))
    d["spariti"] = sorted(set(d.get("spariti", [])) | set(rep["spariti_nuovi"]))
    if "--prova" not in arg and "--solo-credito" not in arg:
        scrivi(d, annunci)
    else:
        d["annunci"] = annunci
    stampa(rep, eta)
    return 0


def _riduci_da_chiamare(rep, eta):
    rep["da_chiamare"] = [{"priorita": a.get("priorita"), "via": a.get("via"), "civico": a.get("civico"),
                           "quartiere": a.get("quartiere"), "zona": a.get("zona"),
                           "prezzo": a.get("prezzo"), "mq": a.get("mq"), "tipo": a.get("tipo"),
                           "giorni": eta(a), "telefono": a.get("telefono"),
                           "qualitaImmobile": a.get("qualitaImmobile"),
                           "inserzionista": a.get("verdettoInserzionista"),
                           "perche": [v for v, _ in sorted(a.get("perchePriorita") or [],
                                                           key=lambda x: -x[1])[:3]],
                           "url": a.get("url")}
                          for a in rep.get("da_chiamare", [])]


if __name__ == "__main__":
    sys.exit(main())
