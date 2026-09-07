#!/usr/bin/env python3
"""Le email degli amministratori, prese dal loro sito.

Il radar degli annunci non porta email e non e' un guasto: Subito e Idealista non
pubblicano l'indirizzo del privato, mettono un modulo di contatto. Percio' la posta
non puo' partire da li'. Gli amministratori di condominio invece un sito ce l'hanno,
e in fondo alla pagina «Contatti» c'e' l'indirizzo dello studio: e' un recapito
aziendale pubblicato apposta per essere scritto.

  indirizzi.py            # cerca solo per gli studi che non hanno ancora un'email
  indirizzi.py --tutti    # rifa' il giro su tutti, anche su chi ce l'ha gia'
  indirizzi.py --prova    # nessuna chiamata di rete: dice solo su chi andrebbe

Cosa si scarta, e perche' e' la parte che conta piu' della raccolta:

  le PEC          una posta certificata serve alle diffide e ai bilanci, non a una
                  proposta di collaborazione. Scriverci e' maleducato prima ancora
                  che inutile: molte rifiutano la posta ordinaria e rimbalzano.
  i segnaposto    i temi dei siti lasciano in giro `info@email.com`, `john@doe.com`,
                  `lorem@ipsum.it`, `info@mysite.com`. Sembrano indirizzi e non lo sono:
                  spedirci significa perdere una mail e sporcare la reputazione del
                  mittente con un rimbalzo.
  i domini altrui gli indirizzi di chi ha fatto il sito, dei plugin, dei social.

Fra quelli che restano si sceglie **uno solo**, con quest'ordine di preferenza: la
casella di segreteria sul dominio dello studio, poi qualunque altra sul suo dominio,
poi le caselle gratuite (gmail, libero) che i piccoli studi usano davvero. Un solo
destinatario per studio: scrivere a tre caselle dello stesso ufficio non raddoppia le
risposte, raddoppia il fastidio.

La data della ricerca resta scritta accanto all'esito. Uno studio senza email non si
ricontrolla ogni giorno: si riprova dopo trenta giorni, perche' un sito che oggi non
mostra l'indirizzo difficilmente lo mostra domani.
"""
import concurrent.futures as cf
import datetime
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request

QUI = os.path.dirname(os.path.realpath(__file__))
BASE = os.environ.get("RADAR_BASE") or os.path.join(os.path.dirname(QUI), "docs")
AMMINISTRATORI = os.path.join(BASE, "dati", "amministratori.json")

OGGI = datetime.date.today()
RIPROVA_DOPO = 30                 # giorni prima di ritentare uno studio senza email
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")
ATTESA = 12
PAGINE_PER_STUDIO = 3             # la home piu' due pagine che sanno di contatti

RE_MAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
RE_CONTATTI = re.compile(r"contatt|dove-siamo|chi-siamo|about|lo-studio|recapiti", re.I)

# Posta certificata: si riconosce dal dominio o dal pezzo di nome. Non e' un indirizzo
# a cui si manda una proposta commerciale.
PEC = ("@pec.", ".pec.", "@legalmail.it", "@registerpec.it", "@geopec.it", "@pec.it",
       "postacertificata", "@ingpec.eu", "@arubapec.it", "@sicurezzapostale.it",
       "@cert.", "@postecert.it", "@pecimprese.it", "@epap.sicurezzapostale.it")

# Quello che i temi dei siti si dimenticano dentro: sembrano email, non lo sono.
SEGNAPOSTO = ("@email.com", "@doe.com", "@ipsum.it", "@mysite.com", "@dominio.com",
              "@example.com", "@example.org", "@yourdomain", "@domain.com", "@sito.it",
              "@tuosito", "@nomesito", "@test.com", "@localhost", "@sentry.io",
              "@wixpress.com", "@sample.com", "@mail.com", "lorem@", "john@", "jane@",
              "utente@", "nome@", "tuonome@", "indirizzo@", "abc@", "xyz@")

# Domini di chi costruisce siti, di chi manda newsletter, dei social: non sono lo studio.
FORNITORI = ("wordpress", "wix.com", "wixpress", "wixsite", "squarespace", "godaddy",
             "aruba.it", "register.it", "shopify", "mailchimp", "sendgrid", "hubspot",
             "facebook.com", "google.com", "gstatic", "cloudflare", "jquery", "bootstrap",
             "fontawesome", "adobe.com", "w3.org", "schema.org", "youtube.com",
             "instagram.com", "linkedin.com", "sentry", "cdn.", "googleapis", "jsdelivr")

# Estensioni di file: `logo@2x.png` passa per un'email a chi guarda solo la chiocciola.
FILE = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js", ".ico", ".woff")

# Caselle di segreteria, in ordine di quanto e' probabile che qualcuno le legga.
PREFERITI = ("info", "segreteria", "amministrazione", "studio", "posta", "mail",
             "contatti", "ufficio", "condominio", "direzione", "amm")

# Caselle gratuite: i piccoli studi le usano davvero, ma vengono dopo il dominio proprio.
GRATUITE = ("gmail.com", "libero.it", "virgilio.it", "alice.it", "tin.it", "hotmail.it",
            "hotmail.com", "outlook.it", "outlook.com", "yahoo.it", "yahoo.com",
            "tiscali.it", "fastwebnet.it", "icloud.com", "live.it", "email.it", "inwind.it")

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE   # molti studi hanno certificati scaduti: il sito resta pubblico


def scarica(url, attesa=ATTESA):
    """La pagina, o stringa vuota. Un sito che non risponde non e' un errore del giro:
    e' uno studio in meno, e il giro deve continuare."""
    try:
        richiesta = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "it-IT,it;q=0.9",
        })
        with urllib.request.urlopen(richiesta, timeout=attesa, context=CTX) as risposta:
            grezzo = risposta.read(400_000)
        tipo = risposta.headers.get_content_charset() or "utf-8"
        return grezzo.decode(tipo, "ignore")
    except Exception:
        return ""


def pulisci(indirizzo):
    """L'indirizzo normalizzato, o None se non e' un indirizzo a cui si scrive."""
    e = urllib.parse.unquote(indirizzo).strip().strip(".,;:<>()[]\"'").lower()
    e = e.split("?")[0]
    if not RE_MAIL.fullmatch(e) or len(e) > 80:
        return None
    if any(p in e for p in PEC):
        return None
    if any(p in e for p in SEGNAPOSTO):
        return None
    if any(p in e for p in FORNITORI):
        return None
    if any(e.endswith(p) for p in FILE):
        return None
    # `info@studio-carretta.itpec` — coda appiccicata da un mailto scritto male
    if re.search(r"\.(it|com|net|org|eu)[a-z]{2,}$", e):
        return None
    # `605a7baede844d278b89dc95ae0a9123@...` — davanti alla chiocciola non c'e' un nome,
    # c'e' l'identificativo di un servizio. Nessuno legge quella casella.
    casella = e.split("@")[0]
    if re.fullmatch(r"[0-9a-f]{16,}", casella) or re.fullmatch(r"[0-9a-f-]{32,}", casella):
        return None
    return e


def raccogli(html):
    """Gli indirizzi buoni della pagina. I `mailto:` valgono piu' del testo — chi li
    scrive li ha messi apposta perche' qualcuno ci clicchi sopra."""
    dichiarati, sparsi = set(), set()
    for grezzo in re.findall(r"mailto:([^\"'>?\s]+)", html):
        e = pulisci(grezzo)
        if e:
            dichiarati.add(e)
    # qualche sito scrive «info [at] studio [dot] it» per nascondersi dai raccoglitori
    disteso = re.sub(r"\s*[\[\(]\s*(at|chiocciola)\s*[\]\)]\s*", "@", html, flags=re.I)
    disteso = re.sub(r"\s*[\[\(]\s*(dot|punto)\s*[\]\)]\s*", ".", disteso, flags=re.I)
    for grezzo in RE_MAIL.findall(disteso):
        e = pulisci(grezzo)
        if e:
            sparsi.add(e)
    return dichiarati, sparsi


def scegli(dichiarati, sparsi, sito):
    """Una sola email per studio. Prima il dominio dello studio, dentro quello le
    caselle di segreteria; poi le caselle gratuite; e a parita' vince un `mailto:`."""
    tutte = dichiarati | sparsi
    if not tutte:
        return "", []
    dominio = ""
    try:
        dominio = urllib.parse.urlparse(sito).netloc.lower().replace("www.", "")
    except Exception:
        pass

    def peso(e):
        casella, _, host = e.partition("@")
        proprio = bool(dominio) and (host == dominio or host.endswith("." + dominio)
                                     or dominio.endswith("." + host))
        gratuita = host in GRATUITE
        posto = PREFERITI.index(casella) if casella in PREFERITI else len(PREFERITI)
        # piu' basso e' meglio: prima il dominio proprio, poi il gratuito, poi il resto
        return (0 if proprio else (1 if gratuita else 2),
                posto,
                0 if e in dichiarati else 1,
                len(e))

    ordinate = sorted(tutte, key=peso)
    return ordinate[0], ordinate[1:6]


def da_ricontrollare(studio, tutti):
    """Uno studio si guarda se non ha un sito da guardare, no; se ha gia' un'email, solo
    con --tutti; se l'abbiamo cercata da poco senza trovarla, si aspetta."""
    if not (studio.get("sito") or "").strip():
        return False
    if studio.get("email") and not tutti:
        return False
    cercata = studio.get("emailCercata")
    if cercata and not tutti:
        try:
            quando = datetime.date.fromisoformat(cercata[:10])
            if (OGGI - quando).days < RIPROVA_DOPO:
                return False
        except ValueError:
            pass
    return True


def esamina(studio):
    """(studio, email scelta, altre viste). Guarda la home e, se ci sono, un paio di
    pagine di contatti: e' li' che l'indirizzo sta scritto per esteso."""
    sito = (studio.get("sito") or "").strip()
    if not sito.startswith("http"):
        sito = "http://" + sito
    dichiarati, sparsi = set(), set()
    html = scarica(sito)
    if html:
        a, b = raccogli(html)
        dichiarati |= a
        sparsi |= b
        radice = urllib.parse.urlparse(sito).netloc
        viste = set()
        for href in re.findall(r"href=[\"']([^\"']+)[\"']", html):
            if len(viste) >= PAGINE_PER_STUDIO - 1:
                break
            if not RE_CONTATTI.search(href):
                continue
            pagina = urllib.parse.urljoin(sito, href.split("#")[0])
            if urllib.parse.urlparse(pagina).netloc != radice or pagina in viste:
                continue
            viste.add(pagina)
            a, b = raccogli(scarica(pagina))
            dichiarati |= a
            sparsi |= b
    scelta, altre = scegli(dichiarati, sparsi, sito)
    return studio, scelta, altre


def main():
    tutti = "--tutti" in sys.argv
    prova = "--prova" in sys.argv

    with open(AMMINISTRATORI, encoding="utf-8") as f:
        dati = json.load(f)
    studi = dati.get("amministratori", [])
    lavoro = [s for s in studi if da_ricontrollare(s, tutti)]

    esito = {"studi": len(studi), "guardati": len(lavoro), "trovate": 0, "gia_presenti":
             sum(1 for s in studi if s.get("email")), "senza_sito":
             sum(1 for s in studi if not (s.get("sito") or "").strip()), "nuove": []}

    if prova:
        esito["nota"] = "prova a vuoto: nessuna chiamata di rete"
        print(json.dumps(esito, ensure_ascii=False, indent=1))
        return

    if lavoro:
        with cf.ThreadPoolExecutor(max_workers=8) as pool:
            for studio, scelta, altre in pool.map(esamina, lavoro):
                studio["emailCercata"] = OGGI.isoformat()
                if scelta:
                    studio["email"] = scelta
                    if altre:
                        studio["emailAltre"] = altre
                    esito["trovate"] += 1
                    esito["nuove"].append({"nome": studio.get("nome", ""), "email": scelta})

    dati["conteggio"] = len(studi)
    dati["conEmail"] = sum(1 for s in studi if s.get("email"))
    dati["generato"] = datetime.datetime.now().isoformat(timespec="seconds")
    with open(AMMINISTRATORI, "w", encoding="utf-8") as f:
        json.dump(dati, f, ensure_ascii=False, indent=1)

    esito["con_email_ora"] = dati["conEmail"]
    print(json.dumps(esito, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
