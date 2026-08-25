# automazione/

Il motore del radar. Gli stessi file girano in due posti:

- sul Mac di Gaetano, richiamati dalla skill `radar-acquisizione-2sarpi`
  (in `~/.claude/skills/.../bin` ci sono dei collegamenti, non delle copie);
- su GitHub Actions, ogni lunedi', anche a Mac spento.

| File | A cosa serve |
|---|---|
| `radar.py` | il giro: credito, raccolta, verifica, indirizzi, perlustrazione, punteggi |
| `analisi.py` | il ragionamento: fascia di mercato, privato o agenzia, qualita', priorita' |
| `apify.sh` | l'unico punto che parla con Apify — mai coi portali direttamente |
| `riepilogo.py` | l'esito del giro, per la pagina Oggi e per la scheda di Actions |

La chiave Apify non e' qui e non ci sara' mai: sul Mac sta in
`~/.config/acquisizione-ag2/apify.env`, su GitHub e' il secret `APIFY_TOKEN`.
