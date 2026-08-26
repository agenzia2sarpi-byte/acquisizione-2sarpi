/* Acquisizione 2 Sarpi — l'archivio degli esclusi, dalla parte del cruscotto.

   Il radar toglie gli annunci di agenzia prima ancora di scriverli nel file. Ma il cruscotto
   non riceve solo dal radar: riceve dal segnalibro, dal testo incollato, da un CSV, e riceve
   soprattutto le decisioni di Gaetano — «questo e' un'agenzia, sparisci». Quelle decisioni
   vivono qui dentro, su questo dispositivo, e valgono per sempre: un annuncio scartato non
   torna al prossimo aggiornamento nemmeno se il portale lo ripubblica con un altro indirizzo.

   Le impronte sono le stesse identiche che calcola `automazione/esclusi.py`, carattere per
   carattere: solo cosi' l'elenco che arriva dal radar viene capito anche qui. Se un giorno si
   tocca una delle due, si toccano tutte e due. */

const PREFISSI_VIA_ESC = /^(via|viale|v\.le|piazza|p\.zza|piazzale|corso|c\.so|largo|vicolo|strada|ripa|alzaia|bastioni|foro|galleria|passaggio|riva|v\.)\s+/i;

function _piatto(s) {
  s = String(s ?? "").toLowerCase();
  [["à", "a"], ["è", "e"], ["é", "e"], ["ì", "i"], ["ò", "o"], ["ù", "u"]].forEach(([a, b]) => { s = s.split(a).join(b); });
  return s.replace(/[^a-z0-9]+/g, "");
}
function _paroleEsc(s) {
  s = String(s ?? "").toLowerCase();
  [["à", "a"], ["è", "e"], ["é", "e"], ["ì", "i"], ["ò", "o"], ["ù", "u"]].forEach(([a, b]) => { s = s.split(a).join(b); });
  return s.replace(/[^a-z0-9\s]+/g, " ").split(/\s+/).filter(Boolean);
}
function _viaEsc(v) {
  v = String(v ?? "").toLowerCase().replace(/[.,'`]/g, " ");
  v = v.trim().replace(PREFISSI_VIA_ESC, "");
  v = v.replace(/(?:^|\s)\d{1,4}\s*[a-z]?\s*$/, "");
  return v.replace(/\s+/g, " ").trim();
}
function _urlEsc(u) {
  return String(u ?? "").trim().toLowerCase()
    .replace(/[?#].*$/, "").replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/^www\./, "");
}
function _fotoId(u) {
  const pulita = String(u ?? "").replace(/[?#].*$/, "");
  const pezzi = pulita.split(/[/_.]/).filter(p => p.length >= 16 && /\d/.test(p));
  return pezzi.length ? pezzi[pezzi.length - 1].toLowerCase() : "";
}

/* Il mazzo di impronte di un annuncio: ne basta una che coincida. */
function improntaAnnuncio(a) {
  const out = [];
  const u = _urlEsc(a.url);
  if (u) out.push("url:" + u);

  const portale = String(a.portale || "").trim().toLowerCase();
  const rif = String(a.riferimento || "").trim().toLowerCase();
  if (portale && rif) out.push(`rif:${portale}:${rif}`);

  const tel = String(a.telefono || "").replace(/\D/g, "").slice(-9);
  if (tel.length === 9) out.push("tel:" + tel);

  const via = _viaEsc(a.via), mq = String(a.mq ?? "").split(".")[0];
  if (via && mq && mq !== "0") {
    const tipo = a.tipo === "Locazione" ? "loc" : "ven";
    out.push(`ind:${via}|${_piatto(a.civico)}|${mq}|${tipo}`);
  }

  ["foto", "foto2", "foto3"].forEach(k => { const f = _fotoId(a[k]); if (f) out.push("foto:" + f); });

  const desc = _piatto(a.descrizione);
  if (desc.length >= 60) out.push("testo:" + desc.slice(0, 120));

  const lunghe = [...new Set(_paroleEsc(a.descrizione).filter(p => p.length >= 6))].sort().slice(0, 25);
  if (lunghe.length >= 8) out.push("parole:" + lunghe.join("-"));

  return out;
}

/* ---------------- l'archivio su questo dispositivo ---------------- */
function archivioEsclusi() {
  if (!Array.isArray(S.esclusi)) S.esclusi = [];
  return S.esclusi;
}
let _indiceEsclusi = null;
function indiceEsclusi() {
  if (_indiceEsclusi) return _indiceEsclusi;
  _indiceEsclusi = new Set();
  archivioEsclusi().forEach(v => (v.impronte || []).forEach(i => _indiceEsclusi.add(i)));
  return _indiceEsclusi;
}
const scordaIndiceEsclusi = () => { _indiceEsclusi = null; };

/* Ritorna l'impronta che ha fatto scattare il riconoscimento, o stringa vuota. */
function eEscluso(a) {
  const idx = indiceEsclusi();
  for (const i of improntaAnnuncio(a)) if (idx.has(i)) return i;
  return "";
}

/* Mette l'annuncio nell'archivio — o allarga le impronte di una voce gia' presente, che e'
   quello che succede quando lo stesso immobile ricompare con foto nuove: da domani si
   riconosce anche da quelle. */
function escludiAnnuncio(a, motivo, chi) {
  const nuove = improntaAnnuncio(a);
  if (!nuove.length) return false;
  const arch = archivioEsclusi();
  for (const v of arch) {
    const vecchie = new Set(v.impronte || []);
    if (nuove.some(i => vecchie.has(i))) {
      nuove.forEach(i => vecchie.add(i));
      v.impronte = [...vecchie].sort();
      v.rivisto = oggiISO();
      v.ricomparse = (v.ricomparse || 0) + 1;
      scordaIndiceEsclusi(); salva();
      return false;
    }
  }
  arch.push({
    id: uid(),
    titolo: String(a.titolo || "").slice(0, 120),
    via: [a.via, a.civico].filter(Boolean).join(" "),
    portale: a.portale || "", url: a.url || "",
    inserzionista: a.inserzionista || "", telefono: a.telefono || "",
    motivo: motivo || "escluso a mano", chi: chi || S.operatore || "",
    data: oggiISO(), ricomparse: 0, impronte: nuove
  });
  scordaIndiceEsclusi(); salva();
  return true;
}

/* Il rientro, quando l'esclusione era sbagliata. Serve: una regola senza marcia indietro
   e' una regola che dopo tre settimane nessuno si fida piu' ad applicare. */
function riammettiEscluso(id) {
  S.esclusi = archivioEsclusi().filter(v => v.id !== id);
  scordaIndiceEsclusi(); salva();
}

/* ---------------- il riconoscimento automatico, qui nel cruscotto ---------------- */
/* Le stesse parole che guarda `automazione/analisi.py`. Serve anche qui perche' un annuncio
   puo' entrare senza passare dal radar: incollato a mano, preso col segnalibro, letto da un
   CSV. La regola dev'essere la stessa da qualunque porta entri. */
const DICHIARA_PRIVATO_JS = /(sono\s+il\s+propriet|siamo\s+i\s+propriet|vendo\s+direttamente|affitto\s+direttamente|privato\s+vende|privato\s+affitta|da\s+privato|no\s+agenzi|niente\s+agenzi|senza\s+agenzi|astenersi\s+agenzi|solo\s+privati|nessuna\s+provvigione|senza\s+provvigion|no\s+intermediari)/i;
const AGENZIA_DICHIARATA_JS = /present[ei]\s+agenzi|presenza\s+(di\s+)?agenzi|\bcon\s+agenzi|\btramite\s+agenzi|\bvia\s+agenzi|gestit[oa]\s+(da|dall'?)\s*agenzi|seguit[oa]\s+(da|dall'?)\s*agenzi|incaric[oa]\s+(ad?|all'?)\s*agenzi|annuncio\s+(pubblicato|gestito)\s+da\s+agenzi|a\s+cura\s+(del|della|dell'?)\s*(nostr[ao]\s+)?(agenzi|studio\s+immobiliar)|agenzia\s+immobiliar|immobiliare\s+s\.?r\.?l|\bagenzia\s+di\s+riferimento|\bnostra\s+agenzi|\bagente\s+immobiliar|\bconsulente\s+immobiliar|\bintermediari[oa]\b|\bintermediazion|\bprocacciator|\bmediator[ei]\b|mediazione\s+(immobiliar|creditizi)|la\s+nostra\s+agenzia|il\s+nostro\s+ufficio|i\s+nostri\s+uffici|nostro\s+portafoglio|\bns\.?\s*rif\b|rif\.?\s*(interno|agenzia|ag\.)|codice\s+immobile|in\s+esclusiva|mandato\s+in\s+esclusiva|incarico\s+in\s+esclusiva|provvigion[ei]\s+(di\s+)?agenzi|spese\s+di\s+agenzi|commission[ei]\s+(di\s+)?agenzi|visite?\s+(solo\s+)?su\s+appuntamento|appuntamenti\s+in\s+sede|\bp\.?\s*iva\b|partita\s+iva|\bs\.?r\.?l\.?s?\b|\bs\.?a\.?s\.?\b|\bs\.?n\.?c\.?\b|\btecnocasa\b|\bre\s*\/?\s*max\b|\bremax\b|\bgabetti\b|\bgrimaldi\b|\bfrimm\b|professionecasa|engel\s*&?\s*volkers|century\s*21|\btoscano\b|\btempocasa\b|\bpirelli\s*&|\bcoldwell\b|\bsotheby|\bimmobiliare\.it\s+agenzi/i;
const NOME_SOCIETA_JS = /immobiliar|real\s*estate|realty|agenzia|studio|group|gruppo|holding|s\.?r\.?l|s\.?a\.?s|s\.?n\.?c|s\.?p\.?a|tecnocasa|remax|re\/?max|grimaldi|toscano|gabetti|frimm|professionecasa|engel|century\s*21|\bcase\b|\bhome\b|\bhouse\b|\bliving\b|\bdomus\b|\bdimore\b|abitare|residence|properties|property|costruzion|\bedil|ristrutturazion|intermediazion|mediazion|consulenz|servizi\s+immobil|&/i;
const SOGLIA_FUORI_JS = 25;   // la stessa soglia di automazione/analisi.py
const EMAIL_LIBERA_JS = /@(gmail|libero|hotmail|outlook|yahoo|virgilio|icloud|alice|tiscali|tin|fastwebnet|live|msn)\./i;

/* Ritorna il motivo per cui questo annuncio e' di un'agenzia, o stringa vuota. */
function motivoAgenzia(a) {
  const testo = `${a.titolo || ""} ${a.descrizione || ""}`;
  // chi scrive «no agenzie» sta dicendo l'opposto: viene prima di tutto il resto
  if (DICHIARA_PRIVATO_JS.test(testo)) return "";
  const m = AGENZIA_DICHIARATA_JS.exec(testo);
  if (m) return `l'annuncio dichiara l'agenzia («${m[0].replace(/\s+/g, " ").trim()}»)`;
  const nome = String(a.inserzionista || "").trim();
  if (nome && NOME_SOCIETA_JS.test(nome)) return `chi pubblica si chiama «${nome}»: e' il nome di un'attivita', non di una persona`;
  if (a.privato === false) return "il portale lo classifica come annuncio di agenzia";
  // Qualunque campanello suoni, l'immobile esce. Non esiste piu' il «da verificare» che
  // resta in lista: quei dieci secondi al telefono sono di Gaetano, e la lista dev'essere
  // di privati. Se l'esclusione era sbagliata si rimette in lista dalla pagina Dati.
  if (a.verdettoInserzionista === "probabile agenzia" || a.verdettoInserzionista === "da verificare")
    return (a.motiviAgenzia || []).join(" · ") || "perlustrazione: sospetto di agenzia";
  if (Number(a.sospettoAgenzia) >= SOGLIA_FUORI_JS)
    return `indice di sospetto ${Number(a.sospettoAgenzia)}/100${(a.motiviAgenzia || []).length ? " — " + a.motiviAgenzia.join(" · ") : ""}`;
  if (a.fotoSospetto) return `sulle fotografie e' impressa la scritta «${a.fotoSospetto}»: ha l'aria di un marchio`;
  const mail = a.email || "";
  if (mail && !EMAIL_LIBERA_JS.test(mail) && /immobiliar|realestate|real-estate|casa|home|dimore|properties/i.test(mail))
    return `email su dominio da agenzia (${mail})`;
  return "";
}

/* ---------------- la pulizia dell'archivio gia' in casa ---------------- */
/* Gira all'avvio. Toglie dagli annunci chi e' nell'elenco degli esclusi e chi si riconosce
   come agenzia adesso, con le regole di adesso — perche' le regole sono arrivate dopo gli
   annunci, e la prima volta che girano devono ripulire anche il pregresso. */
function applicaEsclusioni() {
  const prima = (S.annunci || []).length;
  if (!prima) return { tolti: 0, nuoviEsclusi: 0 };
  let nuoviEsclusi = 0;
  const tenuti = [];
  (S.annunci || []).forEach(a => {
    if (eEscluso(a)) return;                       // gia' fuori: non rientra
    const motivo = a.esito === "Scartato" ? "scartato a mano" : motivoAgenzia(a);
    if (motivo) {
      if (escludiAnnuncio(a, motivo, a.esito === "Scartato" ? (a.operatore || "") : "riconoscimento automatico")) nuoviEsclusi++;
      return;
    }
    tenuti.push(a);
  });
  const tolti = prima - tenuti.length;
  if (tolti) { S.annunci = tenuti; salva(); }
  return { tolti, nuoviEsclusi };
}

/* L'elenco che il radar pubblica: le esclusioni decise sul Mac devono valere anche sul
   telefono, e viceversa non si puo' — ma almeno da una parte il travaso c'e'. */
async function aggiornaEsclusiDalFeed(silenzioso) {
  try {
    const r = await fetch("dati/esclusi.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("non disponibile");
    const d = await r.json();
    if (!d || !Array.isArray(d.esclusi)) throw new Error("vuoto");
    const arch = archivioEsclusi();
    const visti = new Set(arch.flatMap(v => v.impronte || []));
    let nuovi = 0;
    d.esclusi.forEach(v => {
      const imp = v.impronte || [];
      if (!imp.length || imp.some(i => visti.has(i))) return;
      arch.push(Object.assign({}, v, { id: v.id || uid() }));
      imp.forEach(i => visti.add(i));
      nuovi++;
    });
    if (nuovi) { scordaIndiceEsclusi(); salva(); }
    if (!silenzioso && !nuovi) alert("Nessuna nuova esclusione dal radar.");
    return { nuovi };
  } catch (e) {
    if (!silenzioso) alert("Elenco degli esclusi non disponibile.");
    return null;
  }
}
