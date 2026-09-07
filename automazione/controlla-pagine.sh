#!/bin/zsh
# Ogni pagina del cruscotto, con i suoi script uniti nell'ordine in cui li carica il browser.
#
# Perche' esiste. Il 07/09/2026 la pagina Posta si apriva bianca: niente contenuto, niente
# guscio, niente freccia indietro — e nell'app sulla schermata Home non c'e' nemmeno la barra
# del browser, quindi l'unica uscita era chiudere l'applicazione. La causa non era un dato
# mancante ne' la rete: `pagine/posta.js` dichiarava `const STATI`, e `STATI` esisteva gia' in
# `js/contenuti.js`, che si carica prima. Due `const` con lo stesso nome nello stesso ambito
# globale non sono un avviso: sono un errore di sintassi, e il browser **scarta tutto il file**
# senza eseguirne una riga.
#
# Il punto che rende questo guasto cattivo: `node --check pagine/posta.js` da solo dice che va
# benissimo, perche' il file *e'* valido. Il conflitto nasce solo quando i file stanno insieme,
# ed e' esattamente quello che il browser fa e che nessun controllo sul singolo file vede.
#
#   automazione/controlla-pagine.sh
#
# Esce con 1 se almeno una pagina e' rotta, cosi' si puo' mettere davanti a una pubblicazione.

cd "$(dirname "$0")/../docs" || exit 2
esito=0

for html in *.html; do
  [ "$html" = "404.html" ] && continue
  files=$(grep -o 'src="[^"]*\.js[^"]*"' "$html" | sed 's/src="//;s/"//' | sed 's/?.*//')
  [ -z "$files" ] && continue

  unione=$(mktemp /tmp/unione-XXXXXX.js)
  for f in ${(f)files}; do
    if [ -f "$f" ]; then
      cat "$f" >> "$unione"
      echo "" >> "$unione"
    else
      printf "  MANCA    %s  ->  script assente: %s\n" "$html" "$f"
      esito=1
    fi
  done

  if out=$(node --check "$unione" 2>&1); then
    printf "  ok       %s\n" "$html"
  else
    printf "  ROTTA    %s  ->  %s\n" "$html" "$(echo "$out" | grep -E 'Error' | head -1)"
    esito=1
  fi
  rm -f "$unione"
done

[ $esito -eq 0 ] && echo "tutte le pagine si caricano senza conflitti fra script"
exit $esito
