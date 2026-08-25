#!/usr/bin/env bash
# Ripiego HTTP per il radar di Agenzia 2 Sarpi, quando gli strumenti MCP di Apify
# non arrivano alla sessione (succede nelle esecuzioni programmate: l'estensione
# vive nell'app Claude, non qui). Parla con l'API ufficiale di Apify — non fa
# scraping diretto dei portali, che resta vietato.
#
#   apify.sh credito
#   apify.sh raccogli <attore> <file-input.json> <tetto-usd> [campi]
#
# L'attore si scrive con la barra: emastra/subito-it-immobili
set -e
# Due modi di avere la chiave: il file sul Mac di Gaetano, oppure la variabile
# d'ambiente — che e' quella che usa GitHub Actions, dove il file non esiste.
ENV_FILE="${APIFY_ENV_FILE:-$HOME/.config/acquisizione-ag2/apify.env}"

if [ -z "$APIFY_TOKEN" ] && [ -f "$ENV_FILE" ]; then
  APIFY_TOKEN="$(grep -E '^APIFY_TOKEN=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d ' "'"'"'')"
fi
case "$APIFY_TOKEN" in
  apify_api_*) ;;
  "")  echo "ERRORE: manca la chiave Apify." >&2
       echo "Sul Mac: doppio clic su «Chiave Apify.command» sulla Scrivania, te la chiede lui." >&2
       echo "Su GitHub Actions: manca il secret APIFY_TOKEN nel repository." >&2
       exit 3 ;;
  *)   echo "ERRORE: in $ENV_FILE non c'e' una chiave ma il testo «$APIFY_TOKEN»." >&2
       echo "Fai doppio clic su «Chiave Apify.command» sulla Scrivania per rimetterla a posto." >&2
       exit 3 ;;
esac

case "$1" in
  credito)
    curl -sS --max-time 30 -H "Authorization: Bearer $APIFY_TOKEN" "https://api.apify.com/v2/users/me/limits"
    ;;
  raccogli)
    # La barra dell'attore diventa una tilde: emastra/subito-it-immobili -> emastra~subito-it-immobili.
    # Con `tr` e non con la sostituzione della shell: bash, in certe versioni, espande la tilde
    # dentro la sostituzione e ne esce un indirizzo senza senso. Su Ubuntu succedeva, sul Mac no,
    # e il giro falliva solo su GitHub con un «page-not-found» che non spiegava niente.
    attore="$(printf '%s' "$2" | tr '/' '~')"; input="$3"; tetto="${4:-0.25}"; campi="$5"
    [ -f "$input" ] || { echo "ERRORE: input non trovato: $input" >&2; exit 4; }
    url="https://api.apify.com/v2/acts/$attore/run-sync-get-dataset-items?maxTotalChargeUsd=$tetto&timeout=300&format=json&clean=true"
    [ -n "$campi" ] && url="$url&fields=$campi"
    echo "apify: POST ${url%%\?*}" >&2      # nel log resta l'indirizzo, mai la chiave
    curl -sS --max-time 330 -X POST -H "Authorization: Bearer $APIFY_TOKEN" \
      -H 'Content-Type: application/json' --data-binary "@$input" "$url"
    ;;
  *)
    echo "uso: apify.sh credito | apify.sh raccogli <attore> <input.json> <tetto-usd> [campi]" >&2
    exit 2
    ;;
esac
