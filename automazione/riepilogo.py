#!/usr/bin/env python3
"""Prende il JSON che stampa radar.py e ne ricava due cose:

  1. `dati/riepilogo.json` — quello che la pagina Oggi mostra in cima al lunedi' mattina;
  2. un riassunto in Markdown sullo standard output, che GitHub Actions incolla nella
     pagina del lavoro, cosi' l'esito si legge dal telefono senza aprire il cruscotto.

  riepilogo.py <file-del-radar.json>

Se il file non e' un JSON valido — il giro si e' rotto a meta' — non tocca niente:
meglio il riepilogo della settimana scorsa che un blocco rotto in cima alla pagina.
"""
import datetime
import json
import os
import sys

QUI = os.path.dirname(os.path.realpath(__file__))
BASE = os.environ.get("RADAR_BASE") or os.path.dirname(QUI)
DESTINAZIONE = os.path.join(BASE, "dati", "riepilogo.json")


def scrivi(r, origine):
    r = dict(r)
    r["quando"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    r["origine"] = origine
    os.makedirs(os.path.dirname(DESTINAZIONE), exist_ok=True)
    json.dump(r, open(DESTINAZIONE, "w"), ensure_ascii=False, indent=1)
    return r


def markdown(r):
    ins = r.get("inserzionisti") or {}
    righe = [
        "## Radar settimanale",
        "",
        f"- credito Apify: **{r.get('credito', 'n.d.')}**",
        f"- nuovi in vista: **{r.get('nuovi_in_vista', 0)}** · "
        f"usciti dai portali: **{r.get('tolti_dalla_vista', 0)}** · "
        f"indirizzi completati: **{r.get('indirizzi_completati', 0)}**",
        f"- perlustrazione: {ins.get('privato', 0)} privati · "
        f"{ins.get('da verificare', 0)} da verificare · "
        f"{ins.get('probabile agenzia', 0)} probabili agenzie sotto copertura",
        "",
        "### I primi da chiamare",
        "",
        "| Pri | Indirizzo | Zona | Operazione | Telefono |",
        "|---|---|---|---|---|",
    ]
    for x in (r.get("da_chiamare") or [])[:5]:
        dove = " ".join(p for p in (x.get("via"), x.get("civico")) if p) or "—"
        zona = x.get("quartiere") or x.get("zona") or "—"
        righe.append(f"| {x.get('priorita')} | {dove} | {zona} | "
                     f"{x.get('tipo')} {x.get('prezzo') or '—'} · {x.get('mq') or '—'} mq | "
                     f"{x.get('telefono') or 'non pubblicato'} |")
    for n in r.get("note") or []:
        righe += ["", f"> {n}"]
    return "\n".join(righe)


def main():
    if len(sys.argv) < 2:
        print("uso: riepilogo.py <file-del-radar.json>", file=sys.stderr)
        return 2
    try:
        r = json.load(open(sys.argv[1]))
    except (OSError, json.JSONDecodeError) as e:
        print(f"## Radar settimanale\n\nIl giro non e' arrivato in fondo: {e}")
        return 1
    print(markdown(scrivi(r, os.environ.get("RADAR_ORIGINE", "GitHub Actions"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
