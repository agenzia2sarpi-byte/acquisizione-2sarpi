/* Acquisizione Due Sarpi — archivio annunci: normalizzazione, deduplica fra portali, punteggio, importazione.
   La deduplica non guarda l'URL: guarda l'immobile. Lo stesso appartamento su cinque portali resta una riga sola. */

const PORTALI = [
  { id: "immobiliare", n: "Immobiliare.it", dom: ["immobiliare.it"] },
  { id: "idealista", n: "Idealista", dom: ["idealista.it"] },
  { id: "casa", n: "Casa.it", dom: ["casa.it"] },
  { id: "wikicasa", n: "Wikicasa", dom: ["wikicasa.it"] },
  { id: "subito", n: "Subito", dom: ["subito.it"] },
  { id: "bakeca", n: "Bakeca", dom: ["bakeca.it"] },
  { id: "facebook", n: "Facebook", dom: ["facebook.com", "fb.com"] },
  { id: "zappyrent", n: "Zappyrent", dom: ["zappyrent.com"] },
  { id: "dove", n: "Dove.it", dom: ["dove.it"] },
  { id: "rentola", n: "Rentola", dom: ["rentola.it"] },
  { id: "kijiji", n: "Kijiji", dom: ["kijiji.it"] },
  { id: "altro", n: "Altro", dom: [] }
];
const nomePortale = id => (PORTALI.find(p => p.id === id) || { n: id || "Altro" }).n;
function portaleDaUrl(u) {
  let host = "";
  try { host = new URL(String(u)).hostname.toLowerCase(); }
  catch (e) { host = String(u || "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0]; }
  if (!host) return "altro";
  // confronto sul dominio intero: "wikicasa.it" non deve finire dentro "casa.it"
  for (const p of PORTALI) for (const d of p.dom) if (host === d || host.endsWith("." + d)) return p.id;
  return "altro";
}

const TIPOLOGIE = ["Monolocale", "Bilocale", "Trilocale", "Quadrilocale", "5 locali o piu'", "Attico", "Loft", "Villa", "Altro"];
const STATI_IMMOBILE = ["Nuovo / ristrutturato", "Buono", "Da ristrutturare", "Non indicato"];
/* I quattro stati che Gaetano usa davvero al telefono stanno in cima; gli altri restano
   perche' l'archivio ne e' pieno e cancellarli vorrebbe dire perdere lo storico. */
const ESITI = ["Da lavorare", "Buono", "Mediocre", "Da richiamare", "Nessuna risposta",
  "Non buono", "Scartato", "Contattato", "In sequenza", "Appuntamento", "Valutazione fatta",
  "Mandato", "Non contattare"];

/* ---------------- i due assi di ogni immobile ---------------- */
/* Fino a ieri l'asse era uno solo e ci finivano dentro mescolate due domande diverse: «com'e'
   andata» e «che ne faccio adesso». Ma non si fanno nello stesso momento. La prima si risponde
   col telefono ancora all'orecchio, e dev'essere un tasto solo. La seconda si risponde dopo, a
   mente fredda, e riguarda dove va a finire l'immobile. Tenendole insieme succedeva la cosa
   peggiore: premere «non buono» cancellava l'immobile dalla lista, e quello che era un
   giudizio su una telefonata diventava, senza dirlo, un'eliminazione.

   Da qui in avanti sono due assi separati:
     `esito`     — com'e' andata: buono, mediocre, da richiamare, non risponde, cattivo
     `gestione`  — dove sta adesso: da fare (vuoto), gestito, da rivedere, archiviato

   Un contatto puo' essere buono e non ancora gestito. Uno cattivo puo' essere gestito e
   restare in lista, perche' fra due mesi ci si riprova. E l'unico tasto che toglie davvero un
   immobile dalla vista e' «Archivia»: uno solo, chiamato col suo nome, con una conferma. */

/* Cinque tasti, uno per come finisce davvero una telefonata. In cima i tre di tutti i giorni. */
const GIUDIZI = [
  { e: "Buono",            t: "Buono",        cl: "v", d: "proprietario vero, vale la pena insistere" },
  { e: "Mediocre",         t: "Mediocre",     cl: "a", d: "risponde ma tiepido: si tiene, non e' una priorita'" },
  { e: "Non buono",        t: "Cattivo",      cl: "r", d: "contattato, non porta a niente" },
  { e: "Da richiamare",    t: "Da richiamare", cl: "b", d: "non ora: chiede di essere ripreso piu' avanti" },
  { e: "Nessuna risposta", t: "Non risponde", cl: "",  d: "squillato a vuoto o nessuna replica: si riprova" }
];
/* Tre tasti per l'altro asse. «Da fare» non e' un tasto: e' quello che sono tutti finche'
   nessuno li tocca, e ci si torna ripremendo il tasto acceso. */
const GESTIONI = [
  { g: "gestito",    t: "Gestito",     cl: "v", d: "l'ho lavorato io: gli altri due non ci tornano sopra" },
  { g: "rivedere",   t: "Da rivedere", cl: "a", d: "messo da parte: da riguardare con calma" },
  { g: "archiviato", t: "Archivia",    cl: "r", d: "fuori dalla lista: non rientra a nessun aggiornamento" }
];
const NOMI_GESTIONE = { "": "da fare", gestito: "gestito", rivedere: "da rivedere", archiviato: "archiviato" };
const gestioneDi = a => a.gestione || "";

/* Quello che ha scritto Gaetano non lo riscrive nessun aggiornamento: ne' il radar, ne' un
   file importato, ne' lo stesso annuncio ripubblicato domani. */
const CAMPI_LAVORO = ["id", "esito", "gestione", "rivistoIl", "note", "ultimoContatto",
  "canaleContatto", "operatore", "dataRichiamo", "storicoEsiti", "nonFondere"];

/* ---------------- cosa succede quando si preme un tasto ---------------- */
/* Sta qui, e non dentro le pagine, perche' gli stessi tasti compaiono in tre posti — la
   vetrina degli annunci, la scheda del singolo immobile, la lista di Oggi — e devono
   comportarsi allo stesso identico modo. Quando erano copiati in due punti, uno dei due
   contava i tentativi e l'altro no, e i numeri della giornata non tornavano mai. */

/* Gli esiti dopo i quali la pratica e' chiusa davvero: ha risposto una persona e ha detto la
   sua. «Da richiamare» e «Non risponde» non ci sono apposta — li' il lavoro non e' finito. */
const ESITI_CHE_CHIUDONO = ["Buono", "Mediocre", "Non buono"];
const ESITI_CHE_CONTANO = ["Buono", "Mediocre", "Non buono", "Da richiamare", "Nessuna risposta", "Contattato"];

function applicaGiudizio(a, esito) {
  if (!a || !esito || (a.esito || "Da lavorare") === esito) return false;
  a.esito = esito;
  a.ultimoContatto = oggiISO();
  a.operatore = S.operatore;
  a.nuovo = false;                       // lavorato: non e' piu' una novita'
  a.storicoEsiti = (a.storicoEsiti || []).concat([{ data: oggiISO(), esito, chi: S.operatore }]);
  // il secondo tasto lo preme lui: chi ha parlato col proprietario ha finito, e non deve
  // ricordarsi di dirlo una seconda volta
  if (ESITI_CHE_CHIUDONO.includes(esito)) { a.gestione = "gestito"; a.rivistoIl = oggiISO(); }
  else if (a.gestione === "gestito") { a.gestione = ""; a.rivistoIl = oggiISO(); }
  // un contatto vero e' un tentativo: entra nei numeri della giornata senza doverselo ricordare
  const t = attivitaDi(oggiISO());
  if (ESITI_CHE_CONTANO.includes(esito)) t.tentativi = num(t.tentativi) + 1;
  if (["Buono", "Appuntamento"].includes(esito)) t.contatti = num(t.contatti) + 1;
  return true;
}

/* L'altro asse. Ripremere il tasto gia' acceso riporta l'immobile fra quelli da fare: e' la
   marcia indietro, e dev'esserci, se no nessuno si fida a premere niente. */
function applicaGestione(a, g) {
  if (!a) return false;
  a.gestione = (a.gestione === g) ? "" : g;
  a.rivistoIl = oggiISO();
  if (a.gestione) { a.operatore = a.operatore || S.operatore; a.nuovo = false; }
  return true;
}

/* ---------------- normalizzazione ---------------- */
const senzaAccenti = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PREFISSI = /^(via|viale|v\.le|piazza|p\.zza|piazzale|corso|c\.so|largo|vicolo|strada|ripa|alzaia|bastioni|foro|galleria|passaggio|riva|v\.)\s+/i;
function normalizzaVia(v) {
  return senzaAccenti(String(v || "").toLowerCase())
    .replace(/[.,'`]/g, " ").replace(PREFISSI, "").replace(/\s+/g, " ").trim();
}
function estraiCivico(v) {
  const m = String(v || "").match(/(?:^|[\s,])(\d{1,4})\s*([a-zA-Z]?)\s*$/);
  return m ? (m[1] + (m[2] || "")).toLowerCase() : "";
}
function viaSenzaCivico(v) {
  return normalizzaVia(String(v || "").replace(/(?:^|[\s,])\d{1,4}\s*[a-zA-Z]?\s*$/, ""));
}

/* ---------------- deduplica ---------------- */
function firma(a) {
  return {
    via: viaSenzaCivico(a.via), civico: a.civico || estraiCivico(a.via),
    mq: num(a.mq), locali: num(a.locali), piano: String(a.piano || "").trim().toLowerCase(),
    prezzo: num(a.prezzo), tipo: a.tipo, tel: (a.telefono || "").replace(/\D/g, "").slice(-9)
  };
}
function vicini(x, y, tolleranza) {
  if (!x || !y) return false;
  return Math.abs(x - y) / Math.max(x, y) <= tolleranza;
}
/* 0 = estranei, 1 = stesso immobile. Soglia di fusione: 0.70 */
function somiglianza(a, b) {
  const f = firma(a), g = firma(b);
  if (f.tipo && g.tipo && f.tipo !== g.tipo) return 0;           // vendita non si fonde con affitto
  if (f.tel && g.tel && f.tel === g.tel && vicini(f.mq, g.mq, 0.15)) return 1;  // stesso recapito, stessa metratura
  let p = 0;
  const viaUguale = f.via && g.via && f.via === g.via;
  if (!viaUguale) {
    // vie diverse: si fondono solo se il recapito coincide (gia' gestito sopra)
    return 0;
  }
  p += 0.42;
  if (f.civico && g.civico) p += (f.civico === g.civico) ? 0.20 : -0.30;
  if (vicini(f.mq, g.mq, 0.06)) p += 0.16; else if (f.mq && g.mq) p -= 0.18;
  if (f.locali && g.locali) p += (f.locali === g.locali) ? 0.10 : -0.12;
  if (vicini(f.prezzo, g.prezzo, 0.08)) p += 0.14; else if (f.prezzo && g.prezzo && !vicini(f.prezzo, g.prezzo, 0.25)) p -= 0.15;
  if (f.piano && g.piano) p += (f.piano === g.piano) ? 0.06 : -0.08;
  return Math.max(0, Math.min(1, p));
}
/* Raggruppa in immobili unici. Ritorna [{id, capo, membri:[], portali:[]}] */
function raggruppaAnnunci(lista) {
  const padre = lista.map((_, i) => i);
  const trova = i => padre[i] === i ? i : (padre[i] = trova(padre[i]));
  const unisci = (i, j) => { const a = trova(i), b = trova(j); if (a !== b) padre[b] = a; };
  // indice per via normalizzata: confronta solo chi puo' davvero coincidere
  const indice = {};
  lista.forEach((a, i) => { const k = viaSenzaCivico(a.via) || "?" + i; (indice[k] = indice[k] || []).push(i); });
  Object.values(indice).forEach(gruppo => {
    for (let x = 0; x < gruppo.length; x++)
      for (let y = x + 1; y < gruppo.length; y++)
        if (somiglianza(lista[gruppo[x]], lista[gruppo[y]]) >= 0.70) unisci(gruppo[x], gruppo[y]);
  });
  // fusione per recapito telefonico anche fra vie scritte diversamente
  const perTel = {};
  lista.forEach((a, i) => { const t = (a.telefono || "").replace(/\D/g, "").slice(-9); if (t.length >= 8) (perTel[t] = perTel[t] || []).push(i); });
  Object.values(perTel).forEach(g => {
    for (let x = 0; x < g.length; x++) for (let y = x + 1; y < g.length; y++)
      if (somiglianza(lista[g[x]], lista[g[y]]) >= 0.70) unisci(g[x], g[y]);
  });
  const mappa = {};
  lista.forEach((a, i) => { const r = trova(i); (mappa[r] = mappa[r] || []).push(a); });
  return Object.values(mappa).map(membri => {
    // il capogruppo e' l'annuncio piu' completo, a parita' il piu' vecchio (chi e' online da piu' tempo e' piu' maturo)
    const ordinati = membri.slice().sort((a, b) => completezza(b) - completezza(a) || (a.pubblicato || "").localeCompare(b.pubblicato || ""));
    const capo = ordinati[0];
    return {
      id: capo.id, capo, membri: ordinati,
      portali: [...new Set(membri.map(m => m.portale))],
      giorniOnline: Math.max(...membri.map(m => giorniDa(m.pubblicato) ?? 0)),
      prezzoMin: Math.min(...membri.map(m => num(m.prezzo)).filter(Boolean).concat([Infinity])),
      prezzoMax: Math.max(...membri.map(m => num(m.prezzo)))
    };
  });
}
function completezza(a) {
  let n = 0;
  ["via", "prezzo", "mq", "locali", "piano", "foto", "telefono", "email", "descrizione", "pubblicato"].forEach(k => { if (a[k]) n++; });
  if (a.privato) n += 2;
  return n;
}

/* ---------------- prezzo di riferimento della zona ---------------- */
function emqQuartiere(quartiere, tipo) {
  const v = S.annunci.filter(a => a.quartiere && a.quartiere === quartiere && a.tipo === tipo && num(a.mq) > 15 && num(a.prezzo) > 0)
    .map(a => num(a.prezzo) / num(a.mq)).sort((x, y) => x - y);
  if (v.length < 3) return null;
  return v[Math.floor(v.length / 2)];
}
function riferimentoEmq(a) {
  const q = emqQuartiere(a.quartiere, a.tipo);
  if (q) return { valore: q, fonte: "mediana dell'archivio in " + a.quartiere };
  const z = zonaMedia(a.zona);
  if (z && a.tipo === "Vendita") return { valore: z, fonte: "fascia indicativa " + a.zona };
  return null;
}

/* ---------------- punteggio dell'annuncio ---------------- */
/* Stessa logica del piano: piu' l'annuncio e' messo male e da tanto, piu' vale come lead.
   Sugli annunci del radar il conto e' gia' fatto a monte, dove si vedono cose che qui non
   arrivano — quante volte ricorre lo stesso numero di telefono, quante foto aveva davvero
   l'annuncio, che fascia di mercato e' quell'indirizzo. Il numero mostrato e' uno solo: se
   il radar l'ha calcolato si usa il suo, altrimenti si calcola qui. */
function punteggioAnnuncio(a, gruppo) {
  if (a.priorita !== undefined && a.priorita !== null && a.priorita !== "" && Array.isArray(a.perchePriorita) && a.perchePriorita.length)
    // Number(), non num(): num() toglie i punti perche' li legge come separatori delle
    // migliaia, e un +11.8 diventerebbe un +118.
    return { punti: Math.round(Number(a.priorita)), dettaglio: a.perchePriorita.map(x => [x[0], Number(x[1]) || 0]), fonte: "radar" };
  return punteggioLocale(a, gruppo);
}
function punteggioLocale(a, gruppo) {
  let p = 0; const dett = [];
  const mq = num(a.mq), pr = num(a.prezzo);
  const rif = riferimentoEmq(a);
  if (rif && mq && pr) {
    const sc = ((pr / mq) - rif.valore) / rif.valore * 100;
    const v = Math.max(0, Math.min(25, sc * 1.25));
    p += v; dett.push([`Prezzo ${sc > 0 ? "+" : ""}${sc.toFixed(0)}% rispetto alla zona`, v]);
  } else { p += 8; dett.push(["Prezzo di zona non confrontabile", 8]); }

  const gg = gruppo ? gruppo.giorniOnline : (giorniDa(a.pubblicato) ?? 0);
  const vg = Math.max(0, Math.min(20, gg / 6));
  p += vg; dett.push([`${gg} giorni online`, vg]);

  const vf = ({ scarse: 15, medie: 8, buone: 2 })[a.qualitaFoto] ?? 8;
  p += vf; dett.push([`Foto: ${a.qualitaFoto || "non valutate"}`, vf]);

  const vt = ({ scarno: 10, medio: 5, curato: 1 })[a.qualitaTesto] ?? 5;
  p += vt; dett.push([`Testo: ${a.qualitaTesto || "non valutato"}`, vt]);

  const vr = Math.min(10, num(a.ribassi) * 4);
  p += vr; if (num(a.ribassi)) dett.push([`${a.ribassi} ribassi gia' applicati`, vr]);

  const prov = provvigioneAnnuncio(a);
  const vp = Math.max(0, Math.min(20, prov / 1000));
  p += vp; dett.push([`Provvigione stimata ${eur(prov)}`, vp]);

  if (gruppo && gruppo.portali.length >= 3) { p += 4; dett.push([`Pubblicato su ${gruppo.portali.length} portali: sta facendo fatica`, 4]); }
  if (a.privato === false) { p -= 25; dett.push(["Annuncio di agenzia", -25]); }

  return { punti: Math.round(Math.max(0, Math.min(100, p))), dettaglio: dett };
}
function provvigioneAnnuncio(a) {
  if (a.tipo === "Locazione") return num(a.prezzo) * 12 * 0.10 + num(a.prezzo) * 12 * 0.08;
  return num(a.prezzo) * 0.03;
}

/* ---------------- importazione ---------------- */
/* Fonde per (portale + riferimento) o per URL; altrimenti aggiunge. Ritorna {nuovi, aggiornati}. */
function importaAnnunci(lista, origine) {
  let nuovi = 0, aggiornati = 0, respinti = 0;
  lista.forEach(x => {
    const a = normalizzaAnnuncio(x, origine);
    if (!a.via && !a.url) return;
    // Il filtro permanente, prima di ogni altra cosa: chi e' nell'archivio degli esclusi non
    // rientra — nemmeno con un altro indirizzo web, nemmeno ripubblicato con tre parole
    // cambiate — e chi si riconosce come agenzia adesso non entra affatto.
    if (eEscluso(a)) { respinti++; return; }
    const motivoFuori = motivoAgenzia(a);
    if (motivoFuori) { escludiAnnuncio(a, motivoFuori, "riconoscimento automatico"); respinti++; return; }
    const esiste = S.annunci.find(y =>
      (a.url && y.url === a.url) ||
      (a.portale && a.riferimento && y.portale === a.portale && y.riferimento === a.riferimento));
    if (esiste) {
      const prezzoVecchio = num(esiste.prezzo);
      Object.keys(a).forEach(k => { if (a[k] !== "" && a[k] !== undefined && a[k] !== null && !CAMPI_LAVORO.includes(k)) esiste[k] = a[k]; });
      // un immobile gia' lavorato non torna mai a presentarsi come una novita'
      if (lavorato(esiste)) esiste.nuovo = false;
      if (prezzoVecchio && num(a.prezzo) && num(a.prezzo) < prezzoVecchio) {
        esiste.ribassi = num(esiste.ribassi) + 1;
        esiste.storicoPrezzi = (esiste.storicoPrezzi || []).concat([{ d: oggiISO(), p: prezzoVecchio }]);
      }
      esiste.visto = oggiISO();
      aggiornati++;
    } else { S.annunci.push(a); nuovi++; }
  });
  salva();
  return { nuovi, aggiornati, respinti };
}
/* «Lavorato» vuol dire che qualcuno l'ha gia' guardato in faccia: uno stato diverso da «da
   lavorare», o una telefonata segnata. */
const lavorato = a => (a.esito && a.esito !== "Da lavorare") || !!a.ultimoContatto || !!a.gestione;
function normalizzaAnnuncio(x, origine) {
  const url = x.url || x.link || "";
  const via = x.via || x.indirizzo || "";
  return {
    id: x.id || uid(),
    portale: x.portale || portaleDaUrl(url),
    url, riferimento: x.riferimento || x.ref || "",
    titolo: x.titolo || "",
    via, civico: x.civico || estraiCivico(via),
    quartiere: x.quartiere || "", municipio: x.municipio || "", zona: x.zona || "",
    tipo: x.tipo === "Locazione" || /affitt|locaz|rent/i.test(x.tipo || "") ? "Locazione" : "Vendita",
    tipologia: x.tipologia || "",
    prezzo: num(x.prezzo), mq: num(x.mq), locali: num(x.locali), bagni: num(x.bagni),
    piano: x.piano || "", ascensore: !!x.ascensore, statoImmobile: x.statoImmobile || "",
    classeEnergetica: x.classeEnergetica || "", spese: num(x.spese),
    privato: x.privato === undefined ? true : !!x.privato,
    inserzionista: x.inserzionista || "",
    telefono: x.telefono || "", email: x.email || "",
    foto: x.foto || "", foto2: x.foto2 || "", foto3: x.foto3 || "",
    descrizione: x.descrizione || "",
    pubblicato: (x.pubblicato || oggiISO()).slice(0, 10),
    visto: oggiISO(), origine: origine || "manuale",
    qualitaFoto: x.qualitaFoto || "", qualitaTesto: x.qualitaTesto || "",
    lat: x.lat ?? null, lon: x.lon ?? null, numeroFoto: num(x.numeroFoto),
    nuovo: !!x.nuovo, scoperto: x.scoperto || "",
    sospettoAgenzia: x.sospettoAgenzia ?? null,
    verdettoInserzionista: x.verdettoInserzionista || "",
    motiviAgenzia: x.motiviAgenzia || [],
    qualitaImmobile: x.qualitaImmobile ?? null, percheImmobile: x.percheImmobile || [],
    priorita: x.priorita ?? null, perchePriorita: x.perchePriorita || [],
    ribassi: num(x.ribassi), esito: x.esito || "Da lavorare", note: x.note || "",
    // il lavoro sull'annuncio: chi l'ha sentito, quando, con che esito, e quando richiamare
    ultimoContatto: x.ultimoContatto || "", canaleContatto: x.canaleContatto || "",
    operatore: x.operatore || "", dataRichiamo: x.dataRichiamo || "",
    storicoEsiti: x.storicoEsiti || [],
    fotoSospetto: x.fotoSospetto || "",
    storicoPrezzi: x.storicoPrezzi || []
  };
}

/* ---------------- lettura del testo incollato ---------------- */
/* Funziona sul testo di un annuncio copiato dal portale: estrae quello che riesce, il resto lo correggi a mano. */
function leggiTestoAnnuncio(testo) {
  const t = String(testo || "").replace(/ /g, " ");
  const a = {};
  const url = (t.match(/https?:\/\/[^\s"'<>]+/) || [])[0];
  if (url) { a.url = url; a.portale = portaleDaUrl(url); }

  const prezzo = t.match(/(?:€|EUR)\s*([\d.]{3,})|([\d.]{4,})\s*(?:€|EUR|euro)/i);
  if (prezzo) a.prezzo = num(prezzo[1] || prezzo[2]);
  const canone = t.match(/([\d.]{3,})\s*€?\s*\/?\s*(?:al\s+)?mese/i);
  if (canone) { a.prezzo = num(canone[1]); a.tipo = "Locazione"; }
  if (/affitt|locazion/i.test(t) && !/vendit/i.test(t.slice(0, 200))) a.tipo = "Locazione";

  const mq = t.match(/(\d{2,4})\s*(?:m²|m2|mq\b|metri\s+quadr)/i)
    || t.match(/(?:superficie|metratura)\D{0,12}(\d{2,4})/i);
  if (mq) a.mq = num(mq[1]);
  const loc = t.match(/(\d{1,2})\s*local/i); if (loc) a.locali = num(loc[1]);
  const bag = t.match(/(\d{1,2})\s*bagn/i); if (bag) a.bagni = num(bag[1]);
  const pia = t.match(/piano\s*[:\s]\s*([\w°]+)/i) || t.match(/(\d{1,2})°\s*piano/i);
  if (pia) a.piano = pia[1];
  if (/ascensore/i.test(t) && !/senza ascensore|no ascensore/i.test(t)) a.ascensore = true;

  const ind = t.match(/\b((?:[Vv]ia|[Vv]iale|[Pp]iazza|[Pp]iazzale|[Cc]orso|[Ll]argo|[Vv]icolo|[Aa]lzaia|[Rr]ipa|[Bb]astioni)\s+[A-ZÀ-Üa-zà-ü'’.\- ]{3,45}?(?:,?\s*\d{1,4}[a-zA-Z]?)?)(?=[,\n•|·]|\s{2,}|$)/);
  if (ind) a.via = ind[1].replace(/\s+/g, " ").trim();

  const tel = t.match(/(?:\+39[\s.]?)?((?:3\d{2}|0\d{1,3})[\s.\-]?\d{3}[\s.\-]?\d{3,4})/);
  if (tel) a.telefono = tel[0].trim();
  const mail = t.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/); if (mail) a.email = mail[0];

  const rif = t.match(/(?:rif\.?|riferimento|codice(?:\s+dell'annuncio)?)[\s:]*([A-Za-z0-9\-_\/]{3,20})/i);
  if (rif) a.riferimento = rif[1];

  const cls = t.match(/classe\s+energetica[\s:]*([A-G]\d?\+?)/i); if (cls) a.classeEnergetica = cls[1].toUpperCase();
  const spe = t.match(/spese\s+condominiali[\s:]*€?\s*([\d.]+)/i); if (spe) a.spese = num(spe[1]);

  if (/privato|da privato|no agenzie/i.test(t)) a.privato = true;
  if (/agenzia|immobiliare s\.?r\.?l|studio immobiliare/i.test(t) && !/no agenzie/i.test(t)) a.privato = false;

  a.descrizione = t.slice(0, 1200);
  a.titolo = (t.split("\n").find(r => r.trim().length > 8) || "").trim().slice(0, 120);
  return a;
}

/* ---------------- feed automatico ---------------- */
/* Un file JSON nella stessa cartella del sito, aggiornato dal radar programmato.
   L'applicazione lo scarica e ne unisce il contenuto senza sovrascrivere il tuo lavoro. */
async function aggiornaDalFeed(silenzioso) {
  try {
    const r = await fetch("dati/radar.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("feed non disponibile");
    const d = await r.json();
    if (!d || !Array.isArray(d.annunci)) throw new Error("feed vuoto");
    if (d.id && d.id === S.feed.ultimoId) { if (!silenzioso) alert("Il radar non ha nulla di nuovo dall'ultimo aggiornamento."); return { nuovi: 0, aggiornati: 0 }; }
    await aggiornaEsclusiDalFeed(true);
    if (typeof squadraAttiva === "function" && squadraAttiva()) await sincronizzaSquadra(true);
    const e = importaAnnunci(d.annunci, "radar");
    const s = segnaSpariti(d.spariti || [], d.verificati || []);
    e.spariti = s;
    S.feed = { ultimoId: d.id || null, ultimaLettura: new Date().toISOString(), generato: d.generato || null };
    salva();
    if (!silenzioso) alert(`Radar aggiornato: ${e.nuovi} nuovi, ${e.aggiornati} aggiornati`
      + (e.spariti ? `, ${e.spariti} non piu' online` : "")
      + (e.respinti ? `, ${e.respinti} respinti perche' esclusi o di agenzia.` : "."));
    return e;
  } catch (e) {
    if (!silenzioso) alert("Nessun aggiornamento disponibile dal radar.\n(" + e.message + ")");
    return null;
  }
}

/* ---------------- feed degli amministratori ---------------- */
/* Anche questo file lo riscrive il radar quotidiano. Non tocca mai il tuo lavoro:
   stato della relazione, «dati per primo» e note restano come li hai lasciati. */
async function aggiornaAmministratoriDalFeed(silenzioso) {
  try {
    const r = await fetch("dati/amministratori.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("non disponibile");
    const d = await r.json();
    if (!d || !Array.isArray(d.amministratori)) throw new Error("vuoto");
    S.feedAmm = S.feedAmm || {};
    if (d.id && d.id === S.feedAmm.ultimoId) { if (!silenzioso) alert("Nessun amministratore nuovo."); return { nuovi: 0, aggiornati: 0 }; }
    let nuovi = 0, aggiornati = 0;
    d.amministratori.forEach(x => {
      const tel = (x.telefono || "").replace(/\D/g, "");
      const e = S.amministratori.find(a => a.nome === x.nome || (tel && (a.telefono || "").replace(/\D/g, "") === tel));
      if (e) { ["telefono", "sito", "indirizzo", "via", "cap", "quartiere", "municipio", "voto", "recensioni", "schedaMaps", "fonte"].forEach(k => { if (x[k] !== "" && x[k] != null) e[k] = x[k]; }); aggiornati++; }
      else { S.amministratori.push(Object.assign({ id: uid(), relazione: "Da contattare", passi: 0 }, x)); nuovi++; }
    });
    S.feedAmm = { ultimoId: d.id, ultimaLettura: new Date().toISOString() };
    salva();
    if (!silenzioso) alert(`Amministratori aggiornati: ${nuovi} nuovi, ${aggiornati} aggiornati.`);
    return { nuovi, aggiornati };
  } catch (e) {
    if (!silenzioso) alert("Nessun aggiornamento disponibile sugli amministratori.");
    return null;
  }
}

/* ---------------- il messaggio di primo contatto ---------------- */
/* Va bene sia per il modulo del portale sia per WhatsApp: da' informazione prima di chiedere,
   non usa la parola «esclusiva», non svaluta la scelta di vendere da solo, mette l'opt-out in
   chiaro. Sta dentro i 1000 caratteri di Subito con tutti e tre i mittenti. */
function messaggioPortale(a, gruppo, chi) {
  const io = persona(chi);
  const rif = riferimentoEmq(a);
  const via = (a.via || "").replace(/,?\s*\d+[a-zA-Z]?\s*$/, "") || "zona";
  const P = rif ? Math.round(rif.valore).toLocaleString("it-IT") : null;
  const gg = gruppo ? gruppo.giorniOnline : (giorniDa(a.pubblicato) ?? 0);
  const apertura = `Buongiorno, sono ${io.breve} ${presentazioneDi(chi)}.`;
  const firma = `--\n${firmaDi(chi)}`;

  if (a.tipo === "Locazione") {
    return componiMessaggio([
      { t: apertura },
      { t: `Ho visto che affitta da solo il suo immobile in ${via}. Il primo lavoro è far arrivare le richieste: l'annuncio lo preparo io — foto fatte bene, planimetria, un testo scritto per chi cerca — e lo promuovo a pagamento su portali e social.` },
      { t: `Il secondo, quello che conta, è sceglierle: prima che entri in casa sua verifico chi è, che lavoro fa, quanto guadagna e che garanzie porta. Lei vede due o tre candidati seri invece di quindici curiosi, e chi firma paga.` },
      { opz: true, t: `Lavoro in questa zona da anni e so chi ci cerca casa.` },
      { t: `Se le fa comodo passo a vederlo e le dico cosa cambierei: venti minuti, senza impegno.` },
      { t: `Il recapito l'ho preso dall'annuncio: lo uso solo per questo contatto e, se mi dice di no, non la disturbo più.` },
      { t: firma }
    ]);
  }

  return componiMessaggio([
    { t: apertura },
    { t: `Ho visto il suo annuncio in ${via}. Un immobile non si vende perché è pubblicato, ma perché lo vedono le persone giuste: l'annuncio lo preparo io — foto professionali, planimetria, un testo scritto per chi compra — e lo promuovo a pagamento sui portali e sui social, tutti i giorni.` },
    { t: `Poi filtro le richieste: verifico budget, mutuo e tempi prima di far entrare qualcuno in casa sua. Così lei fa tre visite utili invece di venti inutili, e non perde mesi.` },
    P ? { opz: true, t: `Le chiusure vere della sua zona le ho sotto gli occhi ogni settimana: in questo periodo siamo intorno ai ${P} €/mq.` } : null,
    gg > 45 ? { opz: true, t: `L'annuncio è online da ${gg} giorni: di solito è il momento di rivedere non tanto il prezzo, quanto il modo in cui l'immobile viene presentato.` } : null,
    { t: `Se le fa comodo passo a vederlo e le dico cosa cambierei: venti minuti, senza impegno.` },
    { t: `Il recapito l'ho preso dall'annuncio: lo uso solo per questo contatto e, se mi dice di no, non la disturbo più.` },
    { t: firma }
  ]);
}

/* WhatsApp vuole il numero in formato internazionale, senza «+» e senza spazi. */
function waNumero(tel) {
  let n = String(tel || "").replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^00/, "");
  if (!n) return "";
  if (n.startsWith("39") && n.length >= 11) return n;      // ha gia' il prefisso
  return "39" + n.replace(/^0+/, "");                       // numero italiano nudo
}

/* ---------------- annunci spariti: la fonte a conversione piu' alta ---------------- */
/* Il radar tiene ogni giorno l'elenco degli annunci di agenzia. Quando uno sparisce e non risulta
   venduto, il proprietario e' gia' motivato e gia' deluso: e' il momento esatto in cui chiamare. */
async function aggiornaScadutiDalFeed(silenzioso) {
  try {
    const r = await fetch("dati/scaduti.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("non disponibile");
    const d = await r.json();
    if (!d || !Array.isArray(d.scaduti)) throw new Error("vuoto");
    S.scaduti = S.scaduti || [];
    S.feedScaduti = S.feedScaduti || {};
    let nuovi = 0, aggiornati = 0;
    d.scaduti.forEach(x => {
      const e = S.scaduti.find(y => y.url === x.url);
      if (e) { Object.keys(x).forEach(k => { if (k !== "esito" && k !== "note") e[k] = x[k]; }); aggiornati++; }
      else { S.scaduti.push(Object.assign({ id: uid(), esito: "Da lavorare", note: "" }, x)); nuovi++; }
    });
    S.feedScaduti = { ultimoId: d.id, ultimaLettura: new Date().toISOString() };
    salva();
    if (!silenzioso) alert(`Scaduti: ${nuovi} nuovi, ${aggiornati} aggiornati.`);
    return { nuovi, aggiornati };
  } catch (e) {
    if (!silenzioso) alert("Nessun aggiornamento sugli annunci scaduti.\nIl radar comincia a produrli dopo qualche giorno di osservazione.");
    return null;
  }
}

/* Il messaggio per chi ha ritirato l'annuncio senza vendere. Stessa misura da portale. */
function messaggioScaduto(x, chi) {
  const io = persona(chi);
  const via = (x.via || x.indirizzo || "").replace(/,?\s*\d+[a-zA-Z]?\s*$/, "") || "quella via";
  return componiMessaggio([
    { t: `Buongiorno, sono ${io.breve} ${presentazioneDi(chi)}.` },
    { t: `Ho notato che l'immobile in ${via} non è più online. Se ha venduto, complimenti sinceri e la saluto qui.` },
    { t: `Se invece l'ha ritirato, le lascio un dato: nella grande maggioranza dei casi che vedo il problema non è stato il prezzo, ma il modo in cui l'immobile è stato presentato e a chi è stato mostrato.` },
    num(x.ribassi) ? { opz: true, t: `Nel suo caso l'annuncio ha visto ${num(x.ribassi)} ribassi in ${x.giorniOnline || "diversi"} giorni: è il segnale tipico di un immobile presentato bene ma proposto al pubblico sbagliato.` } : null,
    { t: `Se le va glielo guardo e le dico cosa cambierei: venti minuti, senza impegno. Se preferisce non essere contattato me lo dica pure e non la disturbo oltre.` },
    { t: `--\n${firmaDi(chi)}` }
  ]);
}

/* Le immagini di Subito senza regola di ritaglio rispondono 400: le sistemo all'avvio,
   cosi' anche le schede raccolte prima della correzione tornano a mostrare la foto. */
(function sistemaFoto() {
  const R = "?rule=vertical-mini-card-2x-auto";
  let toccate = 0;
  (S.annunci || []).forEach(a => ["foto", "foto2", "foto3"].forEach(k => {
    if (a[k] && a[k].includes("images.sbito.it") && !a[k].includes("rule=")) { a[k] += R; toccate++; }
  }));
  if (toccate) salva();
})();


/* ---------------- immobili non piu' online ---------------- */
/* Il radar ricontrolla ogni giorno gli annunci gia' in archivio andando sulla loro pagina.
   Quelli che non rispondono piu' arrivano qui e spariscono dalla lista delle chiamate:
   e' il modo per non telefonare a chi ha gia' venduto o gia' affittato. */
function segnaSpariti(urlSpariti, urlVerificati) {
  let n = 0;
  const spariti = new Set(urlSpariti);
  const verificati = new Set(urlVerificati);
  S.annunci.forEach(a => {
    if (verificati.has(a.url)) { a.verificato = oggiISO(); if (a.online === false) { a.online = true; a.sparito = ""; } }
    if (spariti.has(a.url) && a.online !== false) {
      a.online = false; a.sparito = oggiISO(); a.verificato = oggiISO(); n++;
    }
  });
  if (n) salva();
  return n;
}
const eOnline = a => a.online !== false;
/* Quanto e' vecchia l'ultima verifica: sotto le 48 ore il dato e' affidabile. */
function freschezza(a) {
  const g = giorniDa(a.verificato || a.visto);
  if (g === null) return { t: "mai verificato", cl: "ambra" };
  if (g <= 1) return { t: "verificato oggi", cl: "verde" };
  if (g <= 3) return { t: `verificato ${g} giorni fa`, cl: "" };
  return { t: `da riverificare (${g} giorni)`, cl: "ambra" };
}


/* ---------------- la lista «non contattare» ---------------- */
/* Chi ti ha detto di no non deve piu' comparire: non e' una cortesia, e' l'unica cosa
   che ti protegge davvero, e costa zero. Il confronto e' su telefono, email e nome. */
function inOptOut(a) {
  if (!S.optout || !S.optout.length) return false;
  const tel = (a.telefono || "").replace(/\D/g, "").slice(-9);
  const mail = (a.email || "").toLowerCase().trim();
  const nome = (a.inserzionista || "").toLowerCase().trim();
  return S.optout.some(o => {
    const v = String(o.valore || "").trim();
    if (!v) return false;
    const vTel = v.replace(/\D/g, "").slice(-9);
    if (vTel.length >= 8 && tel && vTel === tel) return true;
    const vl = v.toLowerCase();
    if (mail && vl === mail) return true;
    if (nome && vl === nome && nome.length > 3) return true;
    return false;
  });
}
/* Quando aggiungi qualcuno alla lista, sparisce subito da tutto l'archivio. */
function applicaOptOut() {
  let n = 0;
  (S.annunci || []).forEach(a => { if (inOptOut(a) && a.esito !== "Non contattare") { a.esito = "Non contattare"; n++; } });
  (S.scaduti || []).forEach(x => { if (inOptOut(x) && x.esito !== "Non contattare") { x.esito = "Non contattare"; n++; } });
  if (n) salva();
  return n;
}
applicaOptOut();

/* Il filtro permanente sull'archivio che c'e' gia'. Gira una volta a ogni apertura: le regole
   sono arrivate dopo gli annunci, e la prima volta devono ripulire anche il pregresso —
   compreso l'annuncio di via Luca Signorelli, che diceva «Presente Agenzia» in fondo alla
   descrizione e nessuno se n'era accorto. */
applicaEsclusioni();
