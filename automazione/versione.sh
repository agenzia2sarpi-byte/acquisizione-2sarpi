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
print("versione:", V)
PY
