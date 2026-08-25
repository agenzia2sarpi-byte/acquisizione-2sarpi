/* Acquisizione 2 Sarpi — nucleo condiviso da tutte le pagine.
   Stato, salvataggio, utilita', navigazione, finestre. Nessun server: tutto in localStorage. */

const CHIAVE = "ag2sarpi.acquisizione.v1";

const VUOTO = {
  v: 2, piano: "500", operatore: "Gaetano",
  operatori: ["Gaetano", "Ciro"],
  telefono: "340 000 0000",
  lead: [], mandati: [], rete: [], gestione: [], attivita: [], optout: [],
  annunci: [], amministratori: [], condomini: [],
  conformita: {}, piano90: {}, recensioni: [], spesa: {},
  feed: { ultimoId: null, ultimaLettura: null },
  aggiornato: null
};

function carica() {
  try {
    const g = JSON.parse(localStorage.getItem(CHIAVE));
    if (g && typeof g === "object") {
      const s = Object.assign(JSON.parse(JSON.stringify(VUOTO)), g);
      s.operatori = (s.operatori || []).map(n => n === "Papa'" || n === "Papà" ? "Ciro" : n);
      if (s.operatore === "Papa'" || s.operatore === "Papà") s.operatore = "Ciro";
      ["annunci", "amministratori", "condomini"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
      if (!s.feed) s.feed = { ultimoId: null, ultimaLettura: null };
      return s;
    }
  } catch (e) { console.warn("dati illeggibili", e); }
  return JSON.parse(JSON.stringify(VUOTO));
}
let S = carica();
let tSalva;
function salva() {
  S.aggiornato = new Date().toISOString();
  try { localStorage.setItem(CHIAVE, JSON.stringify(S)); }
  catch (e) { alert("Memoria del dispositivo piena: esporta un file dalla pagina Dati e poi archivia gli annunci vecchi."); }
  const el = document.getElementById("salvato");
  if (!el) return;
  el.classList.add("on"); clearTimeout(tSalva);
  tSalva = setTimeout(() => el.classList.remove("on"), 1100);
}

/* ---------------- utilita' ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const oggiISO = () => new Date().toISOString().slice(0, 10);
const num = v => { const n = parseFloat(String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "")); return isFinite(n) ? n : 0; };
const eur = n => (Math.round(n) || 0).toLocaleString("it-IT") + " €";
const dataIt = s => s ? new Date(String(s).slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
const giorniDa = s => s ? Math.floor((new Date(oggiISO()) - new Date(String(s).slice(0, 10))) / 86400000) : null;
const piu = (d, g) => { const x = new Date(String(d).slice(0, 10) + "T12:00:00"); x.setDate(x.getDate() + g); return x.toISOString().slice(0, 10); };
const T = () => TARGET[S.piano];
const opz = (arr, sel) => arr.map(o => `<option value="${esc(o)}"${o === sel ? " selected" : ""}>${esc(o)}</option>`).join("");
const campo = (et, html) => `<label class="campo"><span>${et}</span>${html}</label>`;
const inp = (k, v, t = "text", extra = "") => `<input type="${t}" data-k="${k}" value="${esc(v ?? "")}" ${extra}>`;
const sel = (k, arr, v) => `<select data-k="${k}"><option value=""></option>${opz(arr, v)}</select>`;
const testa = (occhiello, titolo, guida) =>
  `<div class="intestazione"><span class="occhiello">${occhiello}</span><h2>${titolo}</h2></div>` +
  (guida ? `<div class="guida">${guida}</div>` : "");
function semaforo(v, obiettivo, inverso = false) {
  if (!obiettivo) return "v";
  const r = inverso ? obiettivo / (v || obiettivo) : v / obiettivo;
  return r >= 1 ? "v" : r >= 0.7 ? "a" : "r";
}

/* ---------------- calcoli sui lead ---------------- */
function provvigione(l) {
  if (l.tipo === "Locazione") return num(l.canone) * 12 * 0.10 + num(l.canone) * 12 * 0.08;
  return num(l.prezzo) * 0.03;
}
function scostamento(l) {
  const zm = zonaMedia(l.zona), mq = num(l.mq), pr = num(l.prezzo);
  if (!zm || !mq || !pr) return null;
  return ((pr / mq) - zm) / zm * 100;
}
function punteggio(l) {
  let p = 0;
  const sc = scostamento(l);
  p += sc === null ? 8 : Math.max(0, Math.min(25, sc * 1.25));
  p += Math.max(0, Math.min(20, num(l.giorniOnline) / 6));
  p += ({ scarse: 15, medie: 8, buone: 2 })[l.foto] ?? 8;
  p += ({ scarno: 10, medio: 5, curato: 1 })[l.testo] ?? 5;
  p += Math.min(10, num(l.ribassi) * 4);
  p += Math.max(0, Math.min(20, provvigione(l) / 1000));
  return Math.round(Math.max(0, Math.min(100, p)));
}

/* ---------------- registro attivita' ---------------- */
const CONTATORI = [
  { k: "tentativi", t: "Tentativi di contatto", s: "chiamate, messaggi sui portali, lettere" },
  { k: "contatti", t: "Contatti riusciti", s: "ti ha risposto davvero una persona" },
  { k: "valutazioni", t: "Valutazioni in casa", s: "il vero motore del fatturato" },
  { k: "mandati", t: "Mandati firmati", s: "il risultato" },
  { k: "lettere", t: "Lettere a mano spedite", s: "obiettivo mensile dal piano" },
  { k: "fisici", t: "Contatti fisici sul territorio", s: "consegne a mano, open house, incontri" }
];
function attivitaDi(data) {
  let a = S.attivita.find(x => x.data === data);
  if (!a) { a = { data, tentativi: 0, contatti: 0, valutazioni: 0, mandati: 0, lettere: 0, fisici: 0 }; S.attivita.push(a); }
  return a;
}
function lunedi(d) { const x = new Date(d + "T12:00:00"); const g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g); return x.toISOString().slice(0, 10); }
function somma(da, a, k) { return S.attivita.filter(x => x.data >= da && x.data <= a).reduce((s, x) => s + num(x[k]), 0); }
function sommaSettimana(k) { return somma(lunedi(oggiISO()), oggiISO(), k); }
function sommaMese(k) { const m = oggiISO().slice(0, 7); return S.attivita.filter(x => (x.data || "").startsWith(m)).reduce((s, x) => s + num(x[k]), 0); }

/* ---------------- scadenze ---------------- */
function scadenzeSequenza() {
  const out = [];
  S.lead.forEach(l => {
    if (!l.dataPrimoContatto || ["Mandato firmato", "Perso", "Non contattare"].includes(l.stato)) return;
    l.seq = l.seq || {};
    for (const p of SEQUENZA) {
      if (l.seq[p.g]) continue;
      out.push({ lead: l, passo: p, data: piu(l.dataPrimoContatto, p.g) });
      break;
    }
  });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
function scadenzeGrappolo() {
  const out = [];
  S.mandati.forEach(m => {
    if (!m.dataFirma) return;
    const voci = grappoloVoci(S.piano);
    m.grappolo = m.grappolo || {};
    voci.forEach((v, i) => {
      if (m.grappolo[i]) return;
      const g = v.g === "chiusura" ? 60 : parseInt(String(v.g).split("-")[0], 10);
      out.push({ mandato: m, voce: v, idx: i, data: piu(m.dataFirma, g) });
    });
  });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

/* ---------------- finestra ---------------- */
function apriFinestra(titolo, corpo, onSalva, testoBottone = "Salva") {
  let velo = $("#velo");
  if (!velo) {
    velo = document.createElement("div"); velo.id = "velo"; velo.className = "velo";
    velo.innerHTML = `<div class="finestra" id="finestra"></div>`;
    document.body.appendChild(velo);
    velo.addEventListener("click", e => { if (e.target.id === "velo") chiudiFinestra(); });
  }
  const f = $("#finestra");
  f.innerHTML = `<div class="capo"><h3>${esc(titolo)}</h3><button data-az="chiudi">&times;</button></div>
    <div id="corpoFinestra">${corpo}</div>
    <div class="bottoniera" style="margin-top:16px">
      ${onSalva ? `<button class="azione" data-az="conferma">${esc(testoBottone)}</button>` : ""}
      <button class="azione grigia" data-az="chiudi">Chiudi</button>
    </div>`;
  velo.classList.add("on"); f._onSalva = onSalva; f.scrollTop = 0;
}
function chiudiFinestra() { const v = $("#velo"); if (v) { v.classList.remove("on"); $("#finestra")._onSalva = null; } }
function raccogli() {
  const o = {};
  $("#corpoFinestra").querySelectorAll("[data-k]").forEach(e => { o[e.dataset.k] = e.type === "checkbox" ? e.checked : e.value; });
  return o;
}
function copiaTesto(testo, messaggio = "Copiato negli appunti.") {
  const fallback = () => {
    const a = document.createElement("textarea"); a.value = testo; document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); } catch (e) { } a.remove(); alert(messaggio);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(testo).then(() => alert(messaggio), fallback);
  else fallback();
}

/* ---------------- guscio e navigazione ---------------- */
const PAGINE = [
  { f: "index.html", t: "Oggi" },
  { f: "radar.html", t: "Annunci" },
  { f: "scaduti.html", t: "Scaduti" },
  { f: "condomini.html", t: "Amministratori" },
  { sep: 1 },
  { f: "pipeline.html", t: "Trattative" },
  { f: "rete.html", t: "Rete dei 20" },
  { f: "gestione.html", t: "Gestione locativa" },
  { sep: 1 },
  { f: "cruscotto.html", t: "Cruscotto" },
  { f: "strumenti.html", t: "Strumenti" },
  { sep: 1 },
  { f: "metodo.html", t: "Metodo" },
  { f: "dati.html", t: "Dati" }
];
function guscio() {
  const qui = (location.pathname.split("/").pop() || "index.html");
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="top">
      <div class="barra"></div>
      <div class="riga">
        <button class="tondo" id="btIndietro" title="Torna indietro" aria-label="Torna indietro">‹</button>
        <a class="marchio" href="index.html">
          <div class="logo">2S</div>
          <div class="txt"><b>Acquisizione 2 Sarpi</b><span>Milano citta'</span></div>
        </a>
        <div class="spinta">
          <span id="salvato">salvato</span>
          <button class="tondo" id="btAggiorna" title="Aggiorna i dati" aria-label="Aggiorna">↻</button>
          <select class="mini" id="selOperatore" title="Chi sta lavorando"></select>
          <select class="mini" id="selPiano" title="Piano attivo">
            <option value="500">Piano 500 €</option>
            <option value="1000">Piano 1.000 €</option>
          </select>
        </div>
      </div>
    </header>
    <nav class="tabs"><div class="interno">${PAGINE.map(p => p.sep ? `<span class="sep"></span>`
      : `<a href="${p.f}" class="${p.f === qui || (qui === "annuncio.html" && p.f === "radar.html") ? "attivo" : ""}">${esc(p.t)}</a>`).join("")}</div></nav>`);
  $("#selPiano").value = S.piano;
  $("#selOperatore").innerHTML = opz(S.operatori, S.operatore);
  $("#selPiano").addEventListener("change", e => { S.piano = e.target.value; salva(); if (typeof render === "function") render(); });
  $("#selOperatore").addEventListener("change", e => { S.operatore = e.target.value; salva(); });
  $("#btIndietro").addEventListener("click", indietro);
  $("#btAggiorna").addEventListener("click", aggiornaAdesso);
  const att = document.querySelector("nav.tabs a.attivo");
  if (att) att.scrollIntoView({ inline: "center", block: "nearest" });
}
function piedino() {
  document.querySelector("main").insertAdjacentHTML("beforeend", `<div class="piedino nostampa">
    Agenzia 2 Sarpi · Piano operativo di acquisizione · Milano citta' · revisione 5<br>
    I dati restano su questo dispositivo. Nessun account, nessuna password, nessun server.</div>`);
}

/* ---------------- azioni comuni ---------------- */
const AZIONI = {
  chiudi: chiudiFinestra,
  conferma: () => { const f = $("#finestra"); if (f && f._onSalva) f._onSalva(); },
  copia: el => copiaTesto((document.getElementById(el.dataset.t) || {}).textContent || ""),
  stampa: () => window.print()
};
document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-az]");
  if (!el) return;
  const f = AZIONI[el.dataset.az];
  if (!f) return;
  if (el.tagName !== "INPUT") ev.preventDefault();
  f(el, ev);
});

/* ---------------- gesti sul telefono ---------------- */
/* Aggiunto a mano perche' l'app sulla schermata Home non ha la barra di Safari:
   niente freccia indietro e niente swipe dal bordo. Qui lo swipe verso destra
   torna indietro, quello verso sinistra va avanti. Su una finestra aperta il
   verso destra la chiude, che e' quello che il pollice si aspetta. */
const SWIPE = { minimo: 72, rapporto: 2, tempoMax: 700 };

function scorreDaSolo(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 4) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
  }
  return false;
}

function segnaleGesto(verso) {
  let s = $("#gesto");
  if (!s) { s = document.createElement("div"); s.id = "gesto"; s.className = "gesto"; document.body.appendChild(s); }
  s.textContent = verso === "indietro" ? "‹" : "›";
  s.className = "gesto " + (verso === "indietro" ? "sx" : "dx");
  requestAnimationFrame(() => s.classList.add("on"));
  clearTimeout(s._t);
  s._t = setTimeout(() => s.classList.remove("on"), 320);
}

function indietro() {
  const v = $("#velo");
  if (v && v.classList.contains("on")) { chiudiFinestra(); return; }
  segnaleGesto("indietro");
  const qui = location.pathname.split("/").pop() || "index.html";
  const daDentro = document.referrer && document.referrer.indexOf(location.origin) === 0;
  if (daDentro) history.back();
  else if (qui !== "index.html") location.href = "index.html";
}

/* Il pulsante «aggiorna»: rilegge il radar pubblicato e ridisegna la pagina. Se il file non
   risponde — o se siamo su una pagina che il radar non alimenta — ricarica e basta, saltando
   la cache del browser, che e' quello che uno si aspetta premendo una freccia circolare. */
async function aggiornaAdesso() {
  const b = $("#btAggiorna");
  if (!b || b.classList.contains("gira")) return;
  b.classList.add("gira");
  try {
    if (typeof aggiornaDalFeed === "function") {
      const e = await aggiornaDalFeed(true);
      if (e) {
        if (typeof render === "function") render();
        esito(b, e.nuovi || e.aggiornati || e.spariti ? "fatto" : "gia' aggiornato");
        return;
      }
    }
    location.href = location.pathname + "?r=" + Date.now();
  } catch (_) {
    location.href = location.pathname + "?r=" + Date.now();
  } finally {
    b.classList.remove("gira");
  }
}
function esito(b, testo) {
  const s = $("#salvato");
  if (!s) return;
  s.textContent = testo; s.classList.add("on");
  clearTimeout(s._t); s._t = setTimeout(() => { s.classList.remove("on"); s.textContent = "salvato"; }, 1800);
}

function avanti() {
  const v = $("#velo");
  if (v && v.classList.contains("on")) return;
  segnaleGesto("avanti");
  history.forward();
}

function attivaGesti() {
  if (!("ontouchstart" in window) || window._gestiAttivi) return;
  window._gestiAttivi = true;
  let x0 = 0, y0 = 0, t0 = 0, valido = false;
  document.addEventListener("touchstart", e => {
    valido = false;
    if (e.touches.length !== 1) return;
    const b = e.target;
    if (b.closest("input, textarea, select, [contenteditable]")) return;
    if (scorreDaSolo(b)) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); valido = true;
  }, { passive: true });
  document.addEventListener("touchend", e => {
    if (!valido || e.changedTouches.length !== 1) return;
    valido = false;
    if (Date.now() - t0 > SWIPE.tempoMax) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) < SWIPE.minimo || Math.abs(dx) < Math.abs(dy) * SWIPE.rapporto) return;
    if (dx > 0) indietro(); else avanti();
  }, { passive: true });
}

/* avvio comune: ogni pagina chiama avviaPagina() */
function avviaPagina(renderFn) {
  guscio();
  window.render = () => { renderFn(); };
  render();
  piedino();
  attivaGesti();
}
