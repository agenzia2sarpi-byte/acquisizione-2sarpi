#!/usr/bin/env python3
"""La posta quotidiana di Agenzia 2 Sarpi: dieci mail al giorno agli amministratori.

  posta.py                      # prepara la coda del giorno, non spedisce niente
  posta.py --invia              # prepara e spedisce davvero
  posta.py --quante 10          # quante ne prepara (di serie: 10)
  posta.py --mittente Ciro      # chi firma (di serie: Ciro)
  posta.py --prova              # mostra la prima mail per intero e si ferma

Chi riceve, e perche' non sono i proprietari. Il radar degli annunci non porta email:
Subito e Idealista non pubblicano l'indirizzo del privato, mettono un modulo di contatto,
e un indirizzo che non c'e' non si inventa. I proprietari privati si chiamano al telefono
— e' quello che il cruscotto fa gia'. Qui si scrive agli **amministratori di condominio**,
che un recapito pubblico ce l'hanno, sul loro sito, messo li' apposta perche' qualcuno
scriva. Un amministratore governa 40-80 stabili e sa prima di chiunque altro chi vende,
chi eredita, chi lascia sfitto: sei relazioni coltivate coprono piu' unita' di mille euro
di pubblicita'.

**Al primo contatto non si chiede niente.** E' la regola scritta nel piano, e questa
macchina la rispetta: la mail non domanda segnalazioni, offre il Rapporto di Via con
l'intestazione dello studio sopra, da girare ai propri condomini. Si da' per primi, tre
volte. Chi chiede al primo colpo si brucia la relazione e non la riapre piu'.

**A ognuno si scrive una volta sola.** Il registro `dati/posta.json` tiene chi ha gia'
ricevuto, quando e cosa: un indirizzo che c'e' dentro non rientra in coda nemmeno se il
censimento lo ripesca con un altro nome. E chi risponde «non scrivetemi piu'» finisce fra
gli esclusi, che e' una porta che si apre solo a mano.

**La coda si distribuisce sui municipi.** Dieci mail tutte allo stesso quadrante fanno
sembrare l'agenzia una che batte una zona sola; dieci sparse su sei municipi raccontano
un'agenzia che lavora su Milano. Percio' la scelta gira sui municipi a turno.

Per spedire servono due cose nell'ambiente, e senza si prepara soltanto:

    POSTA_MITTENTE       agenzia2sarpi@gmail.com
    POSTA_PASSWORD       la password per app di quella casella (16 lettere, non la
                         password di Google: quella non entra in SMTP dal 2022)

Su GitHub Actions arrivano dai secret del repository. Sul Mac, da
`~/.config/acquisizione-ag2/posta.env`.
"""
import argparse
import datetime
import json
import os
import re
import smtplib
import ssl
import sys
import unicodedata
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

QUI = os.path.dirname(os.path.realpath(__file__))
BASE = os.environ.get("RADAR_BASE") or os.path.join(os.path.dirname(QUI), "docs")
AMMINISTRATORI = os.path.join(BASE, "dati", "amministratori.json")
POSTA = os.path.join(BASE, "dati", "posta.json")
CONFIG = os.path.join(os.path.expanduser("~"), ".config", "acquisizione-ag2", "posta.env")

ORA = datetime.datetime.now()
OGGI = ORA.date()
QUANTE = 10
SMTP_HOST, SMTP_PORTA = "smtp.gmail.com", 587

# Gli stessi tre mittenti del cruscotto, con gli stessi recapiti. Se qui e in
# `docs/js/nucleo.js` divergono, un giorno parte una mail firmata da uno col telefono
# di un altro: percio' i campi si chiamano uguali e si copiano da li'.
PERSONE = {
    "Ciro": {"nome": "Ciro Romaniello", "agenzia": "Agenzia 2 Sarpi",
             "telefono": "340 194 0666", "email": "agenzia2sarpi@gmail.com"},
    "Gaetano": {"nome": "Gaetano Romaniello", "agenzia": "Agenzia 2 Sarpi",
                "telefono": "338 38 66 596", "email": "gaetano.romaniello80@gmail.com"},
    "Francoise": {"nome": "Francoise Briend", "agenzia": "UBH Real Estate",
                  "insieme": "Agenzia 2 Sarpi", "telefono": "342 013 7125",
                  "telefono2": "347 099 3663", "email": "f.briend@ubhrealestate.it"},
}


# ---------------------------------------------------------------- il testo della mail

def presentazione(p):
    """«dell'Agenzia 2 Sarpi» per chi ci lavora dentro; per Francoise tutte e due le
    insegne, in quest'ordine, perche' e' l'unico modo corretto di presentarla."""
    if p.get("insieme"):
        return f"di {p['agenzia']}, in collaborazione con l'{p['insieme']}"
    return f"dell'{p['agenzia']}"


def firma(p):
    righe = [p["nome"]]
    righe.append(f"{p['agenzia']} — in collaborazione con {p['insieme']}"
                 if p.get("insieme") else p["agenzia"])
    righe.append(f"Telefono: {p['telefono']} — in alternativa {p['telefono2']}"
                 if p.get("telefono2") else f"Telefono: {p['telefono']}")
    righe.append(f"Email: {p['email']}")
    return "\n".join(righe)


def nome_studio(grezzo):
    """Il nome buono per aprire una mail. Le schede di Google arrivano gonfie di parole
    chiave — «Studio Bassi Amministratore di condominio Milano» — e scriverle per intero
    in apertura suona come una mail generata da un elenco, che e' esattamente quello che
    non deve sembrare."""
    intero = re.sub(r"\s+", " ", (grezzo or "").strip())
    n = re.split(r"\s*[-–—|]\s*", intero)[0].strip()
    # Le parole del mestiere si tolgono dove stanno, senza portarsi via la coda: quando il
    # nome comincia proprio da li' — «Amministrazioni Condominiali Esposito Miriam» — a
    # tagliare fino in fondo non resta niente, e resterebbe il nome gonfio di Google.
    n = re.sub(r"(?i)\bamministra(tore|tori|zione|zioni)\b", " ", n)
    n = re.sub(r"(?i)\b(di\s+)?condomini(o|i|ale|ali)\b", " ", n)
    n = re.sub(r"(?i)\b(stabili|immobili|immobiliare)\b(?=\s*$)", " ", n)
    n = re.sub(r"(?i)\bmilano\b", " ", n)
    n = re.sub(r"(?i)\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?a\.?s\.?|s\.?n\.?c\.?)\b\.?",
               " ", n)
    n = re.sub(r"(?i)^(di|del|dello|della|dei|delle|e)\b\s*", "", n).strip()
    n = re.sub(r"\s+", " ", n).strip(" .,-&")
    # Se di quel nome resta solo una parola del mestiere — «condomini», «Amministrazioni di
    # condominio» — allora quello studio un nome proprio nella scheda di Google non ce
    # l'ha, e inventarglielo e' peggio che stampare quello lungo com'e'.
    GENERICHE = {"studio", "condominio", "condomini", "amministrazione", "amministrazioni",
                 "amministratore", "amministratori", "milano", "casa", "immobili",
                 "stabili", "gestione", "gestioni", "servizi", "di", "e", "il", "la"}
    parole = [x for x in re.split(r"[^\wàèéìòù]+", n.lower()) if x]
    if not parole or all(x in GENERICHE for x in parole):
        return intero
    return n if len(n) >= 3 else intero


def dove(studio):
    """«in zona Bullona, Municipio 8» — la riga che dimostra che la mail non e' un ciclone
    spedito a mille indirizzi uguali. Se non sappiamo dov'e', non si scrive niente:
    meglio una frase in meno che una zona sbagliata."""
    q = (studio.get("quartiere") or "").strip()
    m = (studio.get("municipio") or "").strip()
    if q and m:
        return f"in zona {q}, {m}"
    if q:
        return f"in zona {q}"
    if m:
        return f"nel {m}"
    return ""


def messaggio(studio, p):
    """Oggetto e testo. Un solo paragrafo per idea, righe vuote in mezzo: la mail si legge
    sul telefono, e un muro di testo non lo legge nessuno."""
    nome = nome_studio(studio.get("nome", ""))
    posto = dove(studio)
    apertura = f"sono {p['nome'].split()[0]} {presentazione(p)}."

    dove_frase = (f" Lavoriamo su tutta Milano, compravendite e locazioni, e {posto} "
                  f"ci capita spesso di incrociare i suoi stabili."
                  if posto else
                  " Lavoriamo su tutta Milano, compravendite e locazioni.")

    corpo = f"""Buongiorno,

{apertura} Le scrivo per una cosa sola, e non è per chiederle segnalazioni.

Ogni mese prepariamo una scheda di una pagina sui prezzi reali al metro quadro, via per via: a quanto si è venduto davvero, in quanti giorni, a che canone si è affittato.{dove_frase}

Se le fa comodo, gliela preparo con l'intestazione del suo studio sopra, così la gira ai suoi condomini a suo nome. Non le costa nulla, non c'è pubblicità nostra dentro, e non le chiedo niente in cambio.

Se poi le servisse una valutazione scritta per un assistito, o una presenza in assemblea quando serve un parere immobiliare, ci sono.

Mi basta una riga di risposta con le vie che le interessano di più, e il mese prossimo le arriva.

{firma(p)}

--
Se preferisce non ricevere altre email, risponda con «basta così» e non le scriverò più."""

    oggetto = "Una scheda prezzi per i suoi condomini, con la sua intestazione sopra"
    return oggetto[:120], corpo


def in_html(testo):
    """Gli stessi paragrafi, in HTML. Serve perche' incollando o inoltrando il testo
    semplice gli a capo collassano e la mail arriva come un muro unico — successo per
    davvero, su un'altra casella, e si e' vista la differenza."""
    def scappa(s):
        return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    blocchi = [b.strip() for b in testo.split("\n\n") if b.strip()]
    fuori = []
    for b in blocchi:
        fuori.append("<p style=\"margin:0 0 14px\">"
                     + "<br>".join(scappa(r) for r in b.split("\n")) + "</p>")
    return ("<div style=\"font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"
            "font-size:15px;line-height:1.55;color:#111\">" + "".join(fuori) + "</div>")


# ---------------------------------------------------------------- il registro

def registro_vuoto():
    return {"id": "", "generato": "", "coda": [], "inviate": [], "escluse": []}


def leggi_registro():
    if not os.path.exists(POSTA):
        return registro_vuoto()
    try:
        with open(POSTA, encoding="utf-8") as f:
            d = json.load(f)
    except (ValueError, OSError):
        return registro_vuoto()
    for chiave in ("coda", "inviate", "escluse"):
        if not isinstance(d.get(chiave), list):
            d[chiave] = []
    return d


def scrivi_registro(d):
    d["id"] = "posta-" + ORA.strftime("%Y%m%d%H%M")
    d["generato"] = ORA.isoformat(timespec="seconds")
    d["inCoda"] = len(d["coda"])
    d["totaleInviate"] = len(d["inviate"])
    d["inviateOggi"] = sum(1 for x in d["inviate"]
                           if (x.get("inviata") or "").startswith(OGGI.isoformat()))
    os.makedirs(os.path.dirname(POSTA), exist_ok=True)
    with open(POSTA, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)


def normalizza(e):
    return (e or "").strip().lower()


def gia_toccati(reg):
    """Ogni indirizzo che non deve tornare in coda: spedito, in attesa di partire, o
    uscito per sua richiesta."""
    fuori = set()
    for elenco in ("coda", "inviate", "escluse"):
        for x in reg[elenco]:
            fuori.add(normalizza(x.get("email")))
    fuori.discard("")
    return fuori


# ---------------------------------------------------------------- la coda del giorno

def a_turno_per_municipio(studi):
    """I candidati, girando sui municipi invece di svuotarne uno. Dentro ogni municipio
    prima quelli piu' solidi — voto alto e molte recensioni sono l'unico indizio di
    dimensione che abbiamo, e uno studio grande governa piu' stabili."""
    gruppi = {}
    for s in studi:
        gruppi.setdefault((s.get("municipio") or "zz senza municipio"), []).append(s)
    for m in gruppi:
        gruppi[m].sort(key=lambda s: (-(s.get("voto") or 0) * min((s.get("recensioni") or 0), 200),
                                      -(s.get("recensioni") or 0),
                                      s.get("nome", "")))
    ordine = sorted(gruppi)
    fuori, finito = [], False
    while not finito:
        finito = True
        for m in ordine:
            if gruppi[m]:
                fuori.append(gruppi[m].pop(0))
                finito = False
    return fuori


def prepara(reg, quante, p):
    with open(AMMINISTRATORI, encoding="utf-8") as f:
        studi = json.load(f).get("amministratori", [])
    fuori = gia_toccati(reg)
    candidati = [s for s in studi
                 if normalizza(s.get("email")) and normalizza(s.get("email")) not in fuori]
    nuovi = []
    for s in a_turno_per_municipio(candidati)[:max(0, quante - len(reg["coda"]))]:
        oggetto, testo = messaggio(s, p)
        nuovi.append({
            "email": normalizza(s.get("email")),
            "nome": s.get("nome", ""),
            "nomeBreve": nome_studio(s.get("nome", "")),
            "telefono": s.get("telefono", ""),
            "quartiere": s.get("quartiere", ""),
            "municipio": s.get("municipio", ""),
            "sito": s.get("sito", ""),
            "mittente": p["nome"],
            "da": p["email"],
            "oggetto": oggetto,
            "testo": testo,
            "stato": "in coda",
            "preparata": ORA.isoformat(timespec="seconds"),
        })
    reg["coda"].extend(nuovi)
    return nuovi, len(candidati)


# ---------------------------------------------------------------- la spedizione

def credenziali():
    """Mittente e password, dall'ambiente o dal file sul Mac. Se mancano si prepara
    soltanto: meglio una coda ferma e visibile che un invio a meta'."""
    utente = os.environ.get("POSTA_MITTENTE", "")
    chiave = os.environ.get("POSTA_PASSWORD", "")
    if (not utente or not chiave) and os.path.exists(CONFIG):
        with open(CONFIG, encoding="utf-8") as f:
            for riga in f:
                riga = riga.strip()
                if not riga or riga.startswith("#") or "=" not in riga:
                    continue
                k, _, v = riga.partition("=")
                v = v.strip().strip("\"'")
                if k.strip() == "POSTA_MITTENTE" and not utente:
                    utente = v
                elif k.strip() == "POSTA_PASSWORD" and not chiave:
                    chiave = v
    return utente.strip(), chiave.replace(" ", "").strip()


def verifica_casella(p):
    """Entra nella casella e ne esce, senza spedire niente.

    Serve perche' un codice sbagliato non si vede: la coda si prepara lo stesso, il lavoro
    su GitHub finisce senza errori, e ci si accorge che non e' mai partita una mail solo
    quando qualcuno va a guardare. Meglio saperlo in dieci secondi."""
    utente, chiave = credenziali()
    if not utente or not chiave:
        return {"entrata": False, "perche": "POSTA_MITTENTE o POSTA_PASSWORD non impostate"}
    if normalizza(utente) != normalizza(p["email"]):
        return {"entrata": False, "casella": utente,
                "perche": f"la casella collegata e' {utente} ma la firma e' di {p['nome']} "
                          f"({p['email']})"}
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORTA, timeout=45) as s:
            s.ehlo()
            s.starttls(context=ssl.create_default_context())
            s.login(utente, chiave)
        return {"entrata": True, "casella": utente,
                "perche": "codice giusto: la casella si apre e puo' spedire"}
    except smtplib.SMTPAuthenticationError:
        return {"entrata": False, "casella": utente,
                "perche": "Google rifiuta il codice: la password per app e' sbagliata o revocata"}
    except Exception as e:
        return {"entrata": False, "casella": utente, "perche": str(e)[:200]}


def spedisci(reg, p, limite):
    utente, chiave = credenziali()
    if not utente or not chiave:
        return {"spedite": 0, "errori": [],
                "nota": "POSTA_MITTENTE o POSTA_PASSWORD non impostate: coda preparata, "
                        "niente e' partito"}
    if normalizza(utente) != normalizza(p["email"]):
        return {"spedite": 0, "errori": [],
                "nota": f"la casella collegata e' {utente} ma la firma e' di {p['nome']} "
                        f"({p['email']}): non spedisco sotto un nome che non e' del mittente"}

    spedite, errori = 0, []
    contesto = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORTA, timeout=45) as s:
            s.ehlo()
            s.starttls(context=contesto)
            s.login(utente, chiave)
            for voce in list(reg["coda"]):
                if spedite >= limite:
                    break
                msg = EmailMessage()
                msg["From"] = formataddr((p["nome"] + " — " + p["agenzia"], utente))
                msg["To"] = voce["email"]
                msg["Subject"] = voce["oggetto"]
                msg["Date"] = formatdate(localtime=True)
                msg["Message-ID"] = make_msgid(domain="gmail.com")
                msg["Reply-To"] = utente
                # Il modo pulito per dire «basta»: i client lo mostrano come un tasto,
                # e chi lo usa non deve scrivere una riga per uscire.
                msg["List-Unsubscribe"] = f"<mailto:{utente}?subject=Cancellami>"
                msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
                msg.set_content(voce["testo"])
                msg.add_alternative(in_html(voce["testo"]), subtype="html")
                try:
                    s.send_message(msg)
                except Exception as e:
                    voce["stato"] = "errore"
                    voce["errore"] = str(e)[:200]
                    errori.append({"email": voce["email"], "errore": str(e)[:200]})
                    continue
                voce["stato"] = "inviata"
                voce["inviata"] = datetime.datetime.now().isoformat(timespec="seconds")
                voce.pop("errore", None)
                reg["inviate"].append(voce)
                reg["coda"].remove(voce)
                spedite += 1
    except Exception as e:
        return {"spedite": spedite, "errori": errori,
                "nota": f"la casella non ha aperto: {str(e)[:200]}"}
    return {"spedite": spedite, "errori": errori, "nota": ""}


# ---------------------------------------------------------------- il giro

def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--invia", action="store_true")
    ap.add_argument("--quante", type=int, default=QUANTE)
    ap.add_argument("--mittente", default="Ciro")
    ap.add_argument("--prova", action="store_true")
    ap.add_argument("--verifica", action="store_true",
                    help="entra nella casella e basta: non prepara e non spedisce")
    a = ap.parse_args()

    p = PERSONE.get(a.mittente) or PERSONE["Ciro"]

    if a.verifica:
        print(json.dumps(verifica_casella(p), ensure_ascii=False, indent=1))
        return

    reg = leggi_registro()
    nuovi, disponibili = prepara(reg, a.quante, p)

    if a.prova:
        if reg["coda"]:
            v = reg["coda"][0]
            print(f"Da:      {p['nome']} <{p['email']}>")
            print(f"A:       {v['nome']} <{v['email']}>")
            print(f"Oggetto: {v['oggetto']}\n")
            print(v["testo"])
        else:
            print("Coda vuota: nessun destinatario nuovo disponibile.")
        return

    esito = {"mittente": p["nome"], "da": p["email"],
             "preparate": len(nuovi), "in_coda": len(reg["coda"]),
             "destinatari_disponibili": disponibili,
             "gia_scritti": len(reg["inviate"]), "esclusi": len(reg["escluse"])}

    if a.invia:
        esito.update(spedisci(reg, p, a.quante))
    else:
        esito["nota"] = "coda preparata, non spedita (serve --invia)"

    scrivi_registro(reg)
    esito["giorni_di_autonomia"] = round(disponibili / max(a.quante, 1), 1)
    print(json.dumps(esito, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
