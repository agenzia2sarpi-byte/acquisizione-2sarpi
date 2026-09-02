/* Acquisizione 2 Sarpi — il quaderno condiviso: chi ha in mano quale immobile.

   Il cruscotto vive dentro il dispositivo, e va benissimo cosi': niente account, niente
   password, i dati dei proprietari non passano da nessuna parte. Ma su una cosa il dispositivo
   da solo non basta. Se Ciro chiama un numero stamattina, il telefono di Gaetano non lo sa, e
   nel pomeriggio quel numero lo chiama di nuovo. E' il modo piu' veloce per bruciare un
   contatto e per sembrare un'agenzia disorganizzata.

   Allora qui passa **solo quello che serve per non pestarsi i piedi**: per ogni immobile,
   com'e' finita, se qualcuno ce l'ha in mano, chi l'ha lavorato, quando, e la nota. Nient'altro. L'annuncio — foto,
   prezzo, descrizione, recapito del proprietario — resta dov'e' sempre stato, sul dispositivo.

   Come fa a riconoscere lo stesso immobile senza mandare l'indirizzo. Le impronte le calcola
   `esclusi.js` (via + metratura, telefono, codice del portale, foto, testo), e prima di
   partire ognuna viene cifrata con la chiave della squadra: quello che arriva al server e'
   `a3f9...`, non `tel:3492610219`. Chi legge la tabella non ci trova dentro il numero di
   telefono di nessuno. Gli altri due dispositivi lo riconoscono lo stesso, perche' rifanno lo
   stesso calcolo con la stessa chiave.

   La chiave della squadra sta solo sui tre dispositivi, e si mette una volta dalla pagina
   Dati. Senza quella, con la sola chiave pubblica scritta qui sotto, dal server non si tira
   fuori niente: la tabella e' chiusa e si passa da tre funzioni che la chiave la chiedono. */

const SQUADRA = {
  url: "https://qyhyuvrtrhrjhfxvaboc.supabase.co",
  // Chiave pubblica del progetto: e' fatta per stare nel codice di un sito, da sola non apre
  // niente. Quella che apre e' la chiave della squadra, che qui dentro non c'e'.
  pubblica: "sb_publishable__fTPhMRi_cxNM8rLpYP53w_y2EmTyCp"
};

const chiaveSquadra = () => (S.squadra && S.squadra.chiave) || "";
const squadraAttiva = () => !!chiaveSquadra();

function statoSquadra() {
  if (!S.squadra) S.squadra = { chiave: "", ultimaLettura: null, ultimoErrore: "" };
  return S.squadra;
}

/* ---------------- le impronte, cifrate prima di uscire ---------------- */
/* SHA-256 di «chiave:impronta». Serve una pagina servita in https — su GitHub Pages e in
   locale lo e'; se un giorno non lo fosse, `crypto.subtle` non c'e' e il quaderno resta
   spento invece di mandare in chiaro roba che non deve uscire. */
const _cacheImpronte = new Map();
async function cifraImpronta(i) {
  const k = chiaveSquadra();
  const memo = k + "|" + i;
  if (_cacheImpronte.has(memo)) return _cacheImpronte.get(memo);
  if (!crypto || !crypto.subtle) throw new Error("cifratura non disponibile su questa pagina");
  const dati = new TextEncoder().encode(k + ":" + i);
  const b = await crypto.subtle.digest("SHA-256", dati);
  const hex = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  _cacheImpronte.set(memo, hex);
  return hex;
}
const cifraImpronte = async lista => Promise.all(lista.map(cifraImpronta));

/* ---------------- la linea col server ---------------- */
async function chiamaSquadra(funzione, corpo) {
  const r = await fetch(`${SQUADRA.url}/rest/v1/rpc/${funzione}`, {
    method: "POST",
    headers: {
      "apikey": SQUADRA.pubblica,
      "Authorization": "Bearer " + SQUADRA.pubblica,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(Object.assign({ chiave: chiaveSquadra() }, corpo))
  });
  const testo = await r.text();
  if (!r.ok) {
    let m = testo;
    try { m = JSON.parse(testo).message || testo; } catch (e) { }
    throw new Error(m);
  }
  return testo ? JSON.parse(testo) : null;
}

/* ---------------- da qui al quaderno ---------------- */
/* Cosa si manda su: gli immobili gia' lavorati, e quelli usciti dalla lista. Chi e' ancora
   «da lavorare» non interessa a nessuno — sarebbe soltanto rumore. */
async function vociDaMandare() {
  const voci = [];
  for (const a of (S.annunci || [])) {
    if (!lavorato(a)) continue;
    voci.push({
      impronte: await cifraImpronte(improntaAnnuncio(a)),
      stato: a.esito || "Da lavorare", gestione: a.gestione || "", fuori: false, tipo: "in corso",
      chi: a.operatore || "", quando: a.ultimoContatto || null,
      canale: a.canaleContatto || "", richiamo: a.dataRichiamo || "",
      nota: a.note || "", etichetta: [a.via, a.civico].filter(Boolean).join(" ") || a.titolo || "",
      aggiornato: new Date().toISOString()
    });
  }
  for (const v of (S.esclusi || [])) {
    voci.push({
      impronte: await cifraImpronte(v.impronte || []),
      stato: v.esito || (v.tipo === "lavorato" ? "Non buono" : "Scartato"),
      gestione: "archiviato", fuori: true, tipo: v.tipo || "agenzia",
      chi: v.chi || "", quando: v.contattatoIl || v.data || null,
      canale: "", richiamo: "", nota: v.nota || "",
      etichetta: v.via || v.titolo || "", motivo: v.motivo || "",
      aggiornato: new Date((v.rivisto || v.data || oggiISO()) + "T12:00:00").toISOString()
    });
  }
  return voci;
}

/* Cosa si porta giu': le decisioni degli altri due. Un immobile che qualcuno ha chiuso esce
   anche da qui; uno che qualcuno ha preso in mano prende il suo nome. Il lavoro locale non
   viene sovrascritto alla cieca: vince la modifica piu' recente, e a parita' vince quello
   che c'e' gia' sul dispositivo. */
function applicaVoce(v, perImpronta) {
  const chiavi = v.impronte || [];
  const a = (S.annunci || []).find(x => (perImpronta.get(x.id) || []).some(i => chiavi.includes(i)));
  if (v.fuori) {
    if (a) {
      // l'ha chiuso un altro: esce di qui, con scritto chi e perche'
      escludiAnnuncio(a, v.motivo || `${v.stato} — ${v.chi || "un altro dispositivo"}${v.quando ? " il " + dataIt(v.quando) : ""}`,
        v.chi || "", v.tipo || "lavorato");
      S.annunci = S.annunci.filter(x => x.id !== a.id);
      return "chiuso";
    }
    return "";
  }
  if (!a) return "";
  const mio = a.ultimoContatto || "";
  const suo = v.quando || "";
  if (mio && suo && mio > suo) return "";        // il mio e' piu' fresco, tengo il mio
  const cambia = a.esito !== v.stato || a.operatore !== v.chi || (a.gestione || "") !== (v.gestione || "");
  a.esito = v.stato || a.esito;
  // il secondo asse puo' legittimamente tornare vuoto — «rimesso fra quelli da fare» e' una
  // decisione come le altre — quindi qui non si usa il solito «||»
  if (v.gestione !== undefined && v.gestione !== null) a.gestione = v.gestione;
  a.operatore = v.chi || a.operatore;
  a.ultimoContatto = v.quando || a.ultimoContatto;
  a.canaleContatto = v.canale || a.canaleContatto;
  a.dataRichiamo = v.richiamo || a.dataRichiamo;
  if (v.nota && !a.note) a.note = v.nota;
  a.nuovo = false;
  return cambia ? "aggiornato" : "";
}

/* Il giro completo: prima si manda, poi si legge. In quest'ordine, cosi' se due dispositivi
   partono insieme nessuno dei due si porta a casa una versione piu' vecchia della propria. */
async function sincronizzaSquadra(silenzioso) {
  const st = statoSquadra();
  if (!squadraAttiva()) {
    if (!silenzioso) alert("Il quaderno condiviso non e' acceso su questo dispositivo.\nSi accende dalla pagina Dati, con la chiave della squadra.");
    return null;
  }
  try {
    const voci = await vociDaMandare();
    if (voci.length) await chiamaSquadra("ag2_scrivi", { voci });

    const arrivate = await chiamaSquadra("ag2_leggi", { da: st.ultimaLettura || "1970-01-01T00:00:00Z" }) || [];
    // le impronte dei miei annunci, cifrate una volta sola per tutto il giro
    const perImpronta = new Map();
    for (const a of (S.annunci || [])) perImpronta.set(a.id, await cifraImpronte(improntaAnnuncio(a)));

    let chiusi = 0, aggiornati = 0;
    arrivate.forEach(v => {
      const esito = applicaVoce(v, perImpronta);
      if (esito === "chiuso") chiusi++; else if (esito === "aggiornato") aggiornati++;
    });

    st.ultimaLettura = new Date().toISOString();
    st.ultimoErrore = "";
    salva();
    if (!silenzioso) {
      alert(chiusi || aggiornati
        ? `Quaderno della squadra: ${aggiornati} immobili hanno preso il nome di chi li segue, ${chiusi} sono usciti perche' li ha gia' chiusi qualcun altro.`
        : "Quaderno della squadra: nessuna novita' dagli altri dispositivi.");
    }
    return { chiusi, aggiornati, mandate: voci.length };
  } catch (e) {
    st.ultimoErrore = e.message || String(e);
    salva();
    if (!silenzioso) alert("Il quaderno della squadra non risponde.\n(" + st.ultimoErrore + ")");
    return null;
  }
}

/* Rimettere in lista deve valere per tutti e tre, se no domani il quaderno lo riporta fuori. */
async function rimettiNellaSquadra(voce) {
  if (!squadraAttiva() || !voce || !(voce.impronte || []).length) return;
  try {
    await chiamaSquadra("ag2_rimetti", { impronte_v: await cifraImpronte(voce.impronte) });
  } catch (e) {
    alert("Rimesso in lista qui, ma il quaderno della squadra non ha risposto: sugli altri dispositivi resta fuori.\n(" + e.message + ")");
  }
}

/* La prova che la chiave e' quella giusta, quando la si mette. */
async function provaChiaveSquadra(chiave) {
  const st = statoSquadra();
  const prima = st.chiave;
  st.chiave = String(chiave || "").trim().toUpperCase();
  try {
    await chiamaSquadra("ag2_leggi", { da: "2999-01-01T00:00:00Z" });
    st.ultimoErrore = ""; salva();
    return true;
  } catch (e) {
    st.chiave = prima; st.ultimoErrore = e.message || String(e); salva();
    return false;
  }
}
