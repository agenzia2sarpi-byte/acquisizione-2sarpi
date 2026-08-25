#!/bin/sh
# Aggiorna la marca di versione su tutti i file: costringe i browser a ricaricare CSS e JS.
cd "$(dirname "$0")/../docs"   # le pagine stanno in docs/, gli script fuori
V=$(date +%Y%m%d%H%M)
python3 - "$V" <<'PY'
import glob, re, sys
V = "v=" + sys.argv[1]
for f in glob.glob("*.html"):
    s = open(f, encoding="utf-8").read()
    s = re.sub(r'(src="(?:js|pagine)/[^"?]+\.js)(\?v=\d+)?"', r'\1?' + V + '"', s)
    s = re.sub(r'(href="css/stile\.css)(\?v=\d+)?"', r'\1?' + V + '"', s)
    open(f, "w", encoding="utf-8").write(s)
# L'app sulla schermata Home dell'iPhone non e' un browser: si tiene le pagine anche per
# giorni e non c'e' modo di dirle «ricarica». Questo file e' il modo con cui l'app scopre
# da sola che ne esiste una versione piu' nuova.
import json, os
os.makedirs("dati", exist_ok=True)
json.dump({"v": sys.argv[1]}, open("dati/versione.json", "w"))
print("versione:", V)
PY
