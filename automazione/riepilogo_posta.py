#!/usr/bin/env python3
"""L'esito del giro di posta, in markdown, per la scheda del lavoro su GitHub.

Sta in un file suo e non dentro lo YAML perche' un blocco Python annidato dentro un
workflow e' codice che nessuno rilegge mai e che si rompe per uno spazio di indentazione.

    riepilogo_posta.py /tmp/posta.json >> "$GITHUB_STEP_SUMMARY"
"""
import json
import sys

print("### Posta agli amministratori\n")

try:
    with open(sys.argv[1], encoding="utf-8") as f:
        d = json.load(f)
except Exception as e:
    print(f"Il giro non ha lasciato un esito leggibile: `{e}`")
    raise SystemExit(0)

spedite = d.get("spedite")
if spedite is None:
    print("- **niente e' partito**: la coda e' stata solo preparata")
else:
    print(f"- spedite in questo giro: **{spedite}**")

print(f"- in coda, pronte a partire: {d.get('in_coda', 0)}")
print(f"- studi gia' scritti in tutto: {d.get('gia_scritti', 0)}")
print(f"- destinatari ancora disponibili: {d.get('destinatari_disponibili', 0)}"
      f" (~{d.get('giorni_di_autonomia', 0)} giorni di autonomia)")

if d.get("nota"):
    print(f"- nota: {d['nota']}")

errori = d.get("errori") or []
if errori:
    print(f"\n**{len(errori)} non sono partite:**\n")
    for e in errori:
        print(f"- `{e.get('email','?')}` — {e.get('errore','')}")

if d.get("destinatari_disponibili", 0) < 20:
    print("\n> I destinatari stanno finendo. Senza allargare il censimento degli"
          " amministratori la posta si ferma da sola nel giro di pochi giorni.")
