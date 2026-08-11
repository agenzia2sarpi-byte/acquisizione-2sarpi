/* Acquisizione 2 Sarpi — motore dell'applicazione.
   Nessun server, nessun account: tutto vive nel localStorage del dispositivo. */

const CHIAVE = "ag2sarpi.acquisizione.v1";

const VUOTO = {
  v: 1, piano: "500", operatore: "Gaetano",
  operatori: ["Gaetano", "Ciro"],
  telefono: "340 000 0000",
  lead: [], mandati: [], rete: [], gestione: [], attivita: [], optout: [],
  conformita: {}, piano90: {}, recensioni: [], spesa: {},
  aggiornato: null
};

let S = carica();
let vista = "oggi";

function carica() {
  try {
    const g = JSON.parse(localStorage.getItem(CHIAVE));
    if (g && typeof g === "object") {
      const s = Object.assign(JSON.parse(JSON.stringify(VUOTO)), g);
      // i nomi degli operatori sono Gaetano e Ciro
      s.operatori = (s.operatori || []).map(n => n === "Papa'" || n === "Papà" ? "Ciro" : n);
      if (s.operatore === "Papa'" || s.operatore === "Papà") s.operatore = "Ciro";
      return s;
    }
  } catch (e) { console.warn("dati illeggibili", e); }
  return JSON.parse(JSON.stringify(VUOTO));
}
let tSalva;
function salva() {
  S.aggiornato = new Date().toISOString();
  localStorage.setItem(CHIAVE, JSON.stringify(S));
  const el = document.getElementById("salvato");
  el.classList.add("on"); clearTimeout(tSalva);
  tSalva = setTimeout(() => el.classList.remove("on"), 1100);
}

/* ---------------- utilita' ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const oggiISO = () => new Date().toISOString().slice(0, 10);
const num = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
const eur = n => (Math.round(n) || 0).toLocaleString("it-IT") + " €";
const dataIt = s => s ? new Date(s + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "—";
const giorniDa = s => s ? Math.floor((new Date(oggiISO()) - new Date(s)) / 86400000) : null;
const piu = (d, g) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + g); return x.toISOString().slice(0, 10); };
const T = () => TARGET[S.piano];
const opz = (arr, sel) => arr.map(o => `<option value="${esc(o)}"${o === sel ? " selected" : ""}>${esc(o)}</option>`).join("");
const campo = (et, html) => `<label class="campo"><span>${et}</span>${html}</label>`;
const inp = (k, v, t = "text", extra = "") => `<input type="${t}" data-k="${k}" value="${esc(v ?? "")}" ${extra}>`;
const sel = (k, arr, v) => `<select data-k="${k}"><option value=""></option>${opz(arr, v)}</select>`;

/* semaforo: 1 = verde, .7 = ambra, sotto = rosso */
function semaforo(v, obiettivo, inverso = false) {
  if (!obiettivo) return "v";
  const r = inverso ? obiettivo / (v || obiettivo) : v / obiettivo;
  return r >= 1 ? "v" : r >= 0.7 ? "a" : "r";
}

/* ---------------- calcoli del piano ---------------- */
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
const classePunteggio = p => p >= 70 ? "verde" : p >= 45 ? "ambra" : "";

/* registro attivita' del giorno */
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
      break; // solo il prossimo passo aperto
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
  const f = $("#finestra");
  f.innerHTML = `<div class="capo"><h3>${esc(titolo)}</h3><button data-az="chiudi">&times;</button></div>
    <div id="corpoFinestra">${corpo}</div>
    <div class="bottoniera" style="margin-top:16px">
      ${onSalva ? `<button class="azione" data-az="conferma">${esc(testoBottone)}</button>` : ""}
      <button class="azione grigia" data-az="chiudi">Chiudi</button>
    </div>`;
  $("#velo").classList.add("on");
  f._onSalva = onSalva;
  f.scrollTop = 0;
}
function chiudiFinestra() { $("#velo").classList.remove("on"); $("#finestra")._onSalva = null; }
function raccogli() {
  const o = {};
  $("#corpoFinestra").querySelectorAll("[data-k]").forEach(e => {
    o[e.dataset.k] = e.type === "checkbox" ? e.checked : e.value;
  });
  return o;
}

/* ---------------- navigazione ---------------- */
const TABS = [
  { k: "oggi", t: "Oggi" }, { k: "lead", t: "Radar lead" }, { k: "sequenza", t: "Sequenza 90gg" },
  { k: "mandati", t: "Mandati e grappoli" }, { k: "rete", t: "Rete dei 20" }, { k: "gestione", t: "Gestione locativa" },
  { sep: 1 },
  { k: "kpi", t: "Cruscotto" }, { k: "rapporto", t: "Rapporto di Via" }, { k: "script", t: "Script" },
  { sep: 1 },
  { k: "piano90", t: "Piano 90 giorni" }, { k: "playbook", t: "Playbook" }, { k: "conformita", t: "Conformita'" },
  { sep: 1 },
  { k: "dati", t: "Dati e installazione" }
];
function costruisciNav() {
  $("#navTabs").innerHTML = TABS.map(t => t.sep ? `<span class="sep"></span>`
    : `<button data-vista="${t.k}" class="${t.k === vista ? "attivo" : ""}">${esc(t.t)}</button>`).join("");
}
function vaiA(k) {
  vista = k;
  document.querySelectorAll("section.vista").forEach(s => s.classList.toggle("attiva", s.id === "v-" + k));
  costruisciNav();
  render();
  window.scrollTo({ top: 0 });
}

/* ---------------- render ---------------- */
function render() {
  const f = {
    oggi: vistaOggi, lead: vistaLead, sequenza: vistaSequenza, mandati: vistaMandati,
    rete: vistaRete, gestione: vistaGestione, kpi: vistaKpi, rapporto: vistaRapporto,
    script: vistaScript, piano90: vistaPiano90, playbook: vistaPlaybook,
    conformita: vistaConformita, dati: vistaDati
  }[vista];
  if (f) $("#v-" + vista).innerHTML = f();
}
const testa = (occhiello, titolo, guida) =>
  `<div class="intestazione"><span class="occhiello">${occhiello}</span><h2>${titolo}</h2></div>` +
  (guida ? `<div class="guida">${guida}</div>` : "");

/* ---------------- vista: OGGI ---------------- */
function vistaOggi() {
  const t = T(), a = attivitaDi(oggiISO());
  const seq = scadenzeSequenza().filter(x => x.data <= oggiISO());
  const gra = scadenzeGrappolo().filter(x => x.data <= oggiISO());
  const reteDaFare = S.rete.filter(r => !r.incontro).length;
  const tentGiorno = Math.round(t.tentativiSett / 5);

  const contatori = CONTATORI.map(c => `
    <div class="contatore">
      <button data-az="meno" data-c="${c.k}">−</button>
      <div class="n">${num(a[c.k])}</div>
      <div class="et"><b>${c.t}</b><br><span style="color:var(--grigio)">${c.s}</span></div>
      <button class="piu" data-az="piu" data-c="${c.k}">+</button>
    </div>`).join("");

  const barraTent = Math.min(100, num(a.tentativi) / tentGiorno * 100);

  return testa("La giornata", "Oggi — " + new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }),
    `<b>L'ora d'oro, 9:30–11:00, cinque giorni su sette, telefono in mano e porta chiusa.</b> Con 1.000 € al mese saltarla ti costa dei risultati. Con 500 €, saltarla azzera il piano — perche' non c'e' budget che compensi.`) + `

  <div class="scheda">
    <h3>Tentativi di contatto di oggi <span class="etichetta">obiettivo ${tentGiorno}/giorno · ${t.tentativiSett}/settimana</span></h3>
    <div style="display:flex;align-items:baseline;gap:10px">
      <span style="font-size:34px;font-weight:800;letter-spacing:-1px">${num(a.tentativi)}</span>
      <span style="color:var(--grigio)">su ${tentGiorno} — settimana: ${sommaSettimana("tentativi")} / ${t.tentativiSett}</span>
    </div>
    <div class="barra"><i class="${barraTent >= 100 ? "v" : barraTent >= 70 ? "a" : ""}" style="width:${barraTent}%"></i></div>
    <div class="griglia g2" style="margin-top:12px">${contatori}</div>
    <div class="bottoniera"><span style="font-size:12px;color:var(--grigio)">Registrato a nome di <b>${esc(S.operatore)}</b>. I contatori sono del giorno; il cruscotto somma settimana e mese.</span></div>
  </div>

  <div class="griglia g2">
    <div class="scheda">
      <h3>Da fare adesso <span class="etichetta">${seq.length + gra.length} scadenze</span></h3>
      ${seq.length || gra.length ? `
        ${seq.map(x => `<div class="spunta">
          <input type="checkbox" data-az="fattoSeq" data-id="${x.lead.id}" data-g="${x.passo.g}">
          <div class="testo"><b>${esc(x.lead.nome || x.lead.via || "Lead")}</b> — giorno ${x.passo.g}: ${esc(x.passo.contenuto)}
          <small>${esc(x.passo.canale)} · previsto ${dataIt(x.data)} ${x.data < oggiISO() ? "· <b style='color:var(--rosso)'>in ritardo</b>" : ""}</small></div>
        </div>`).join("")}
        ${gra.map(x => `<div class="spunta">
          <input type="checkbox" data-az="fattoGrappolo" data-id="${x.mandato.id}" data-i="${x.idx}">
          <div class="testo"><b>Grappolo — ${esc(x.mandato.indirizzo || "mandato")}</b>: ${esc(x.voce.t)}
          <small>giorno ${esc(x.voce.g)} · ${esc(x.voce.chi)}</small></div>
        </div>`).join("")}
      ` : `<div class="vuoto">Nessuna scadenza aperta. Se e' davvero cosi', l'ora d'oro va usata sul radar: apri <b>Radar lead</b> e aggiungi i privati di oggi.</div>`}
    </div>

    <div>
      <div class="scheda">
        <h3>L'agenda della giornata</h3>
        <table><tbody>${AGENDA.map(f => `<tr>
          <td style="white-space:nowrap;font-weight:700;${f.oro ? "color:var(--rosso)" : ""}">${esc(f.fascia)}</td>
          <td>${f.oro ? "<b>" : ""}${esc(f.cosa)}${f.oro ? "</b>" : ""}<br><small style="color:var(--grigio)">${esc(f.perche)}</small></td>
        </tr>`).join("")}</tbody></table>
        <div class="avviso" style="margin:12px 0 0"><b>Accorgimento logistico</b>Non accettare mai due sopralluoghi in quadranti opposti nello stesso pomeriggio. Raggruppa per macro-area: chi non lo fa perde il 20% del proprio tempo utile.</div>
      </div>
      <div class="scheda">
        <h3>Le cinque cose che non si toccano</h3>
        ${INTOCCABILI.map((v, i) => `<div class="spunta"><span style="color:var(--rosso);font-weight:800">${i + 1}</span><div class="testo">${esc(v)}</div></div>`).join("")}
      </div>
    </div>
  </div>

  <div class="scheda">
    <h3>Stato del sistema</h3>
    <div class="griglia g4">
      <div class="dato"><div class="titolo">Lead in sequenza</div><div class="valore">${S.lead.filter(l => l.stato === "In sequenza" || l.stato === "Da contattare").length}</div></div>
      <div class="dato"><div class="titolo">Mandati attivi</div><div class="valore">${S.mandati.length}</div></div>
      <div class="dato"><div class="titolo">Immobili in gestione</div><div class="valore">${S.gestione.length}</div><div class="sotto">obiettivo +2/mese</div></div>
      <div class="dato ${reteDaFare > 0 ? "ambra" : "verde"}"><div class="titolo">Rete da incontrare</div><div class="valore">${reteDaFare}</div><div class="sotto">su ${S.rete.length} inseriti / 20</div></div>
    </div>
  </div>`;
}

/* ---------------- vista: RADAR LEAD ---------------- */
let filtroLead = { q: "", stato: "", fonte: "", municipio: "", tipo: "" };
function vistaLead() {
  let l = S.lead.slice();
  const f = filtroLead;
  if (f.q) { const q = f.q.toLowerCase(); l = l.filter(x => JSON.stringify(x).toLowerCase().includes(q)); }
  ["stato", "fonte", "municipio", "tipo"].forEach(k => { if (f[k]) l = l.filter(x => x[k] === f[k]); });
  l.sort((a, b) => punteggio(b) - punteggio(a));

  return testa("Livello 1 — copertura cittadina", "Radar lead",
    `Il punteggio decide cosa fai e cosa lasci: riceverai piu' lead di quanti puoi lavorarne. <b>Un annuncio con foto storte, testo di due righe e prezzo del 15% sopra mercato in una zona a ticket alto e' il tuo lead migliore in assoluto.</b>`) + `

  <div class="scheda nostampa">
    <div class="griglia g3">
      ${campo("Cerca", `<input type="search" id="fq" value="${esc(f.q)}" placeholder="via, nome, nota…">`)}
      ${campo("Stato", `<select id="fstato"><option value="">tutti</option>${opz(STATI, f.stato)}</select>`)}
      ${campo("Fonte", `<select id="ffonte"><option value="">tutte</option>${opz(NOMI_FONTI, f.fonte)}</select>`)}
      ${campo("Municipio", `<select id="fmunicipio"><option value="">tutti</option>${opz(MUNICIPI, f.municipio)}</select>`)}
      ${campo("Tipo", `<select id="ftipo"><option value="">tutti</option>${opz(TIPI, f.tipo)}</select>`)}
    </div>
    <div class="bottoniera">
      <button class="azione" data-az="nuovoLead">+ Nuovo lead</button>
      <button class="azione grigia" data-az="azzeraFiltri">Azzera filtri</button>
      <span style="align-self:center;font-size:12px;color:var(--grigio)">${l.length} di ${S.lead.length}</span>
    </div>
  </div>

  ${l.length ? l.map(x => rigaLead(x)).join("") : `<div class="vuoto">Nessun lead. Il radar quotidiano ti consegna 15-25 nomi la mattina: inseriscili qui e comincia dall'alto.</div>`}`;
}
function rigaLead(x) {
  const p = punteggio(x), sc = scostamento(x), pv = provvigione(x);
  const gg = giorniDa(x.dataPrimoContatto);
  return `<div class="riga-lead" data-az="apriLead" data-id="${x.id}">
    <div class="capo">
      <div style="min-width:0;flex:1">
        <b>${esc(x.nome || "(senza nome)")}</b>
        <div class="meta">${esc(x.via || "—")}${x.municipio ? " · " + esc(x.municipio) : ""}${x.zona ? " · " + esc(x.zona) : ""}</div>
        <div>
          <span class="tag ${x.stato === "Mandato firmato" ? "verde" : x.stato === "Perso" || x.stato === "Non contattare" ? "" : "rosso"}">${esc(x.stato || "Da contattare")}</span>
          ${x.tipo ? `<span class="tag">${esc(x.tipo)}</span>` : ""}
          ${x.giorniOnline ? `<span class="tag ${num(x.giorniOnline) > 60 ? "ambra" : ""}">${esc(x.giorniOnline)} gg online</span>` : ""}
          ${sc !== null ? `<span class="tag ${sc > 8 ? "ambra" : ""}">${sc > 0 ? "+" : ""}${sc.toFixed(0)}% vs zona</span>` : ""}
          ${pv ? `<span class="tag">${eur(pv)} stimati</span>` : ""}
          ${gg !== null ? `<span class="tag">in sequenza da ${gg} gg</span>` : ""}
        </div>
      </div>
      <div class="punteggio"><b style="color:${p >= 70 ? "var(--verde)" : p >= 45 ? "var(--ambra)" : "var(--grigio)"}">${p}</b><span>punti</span></div>
    </div>
  </div>`;
}
function moduloLead(x) {
  return `<div class="griglia g2">
    ${campo("Nome del proprietario", inp("nome", x.nome))}
    ${campo("Telefono", inp("telefono", x.telefono, "tel"))}
    ${campo("Email", inp("email", x.email, "email"))}
    ${campo("Via e civico", inp("via", x.via))}
    ${campo("Municipio", sel("municipio", MUNICIPI, x.municipio))}
    ${campo("Fascia di zona", sel("zona", ZONE.map(z => z.nome), x.zona))}
    ${campo("Fonte di acquisizione", sel("fonte", NOMI_FONTI, x.fonte))}
    ${campo("Tipo", sel("tipo", TIPI, x.tipo))}
    ${campo("Metratura (mq)", inp("mq", x.mq, "number"))}
    ${campo("Prezzo richiesto (€)", inp("prezzo", x.prezzo, "number"))}
    ${campo("Canone richiesto (€/mese)", inp("canone", x.canone, "number"))}
    ${campo("Giorni online", inp("giorniOnline", x.giorniOnline, "number"))}
    ${campo("Ribassi gia' applicati", inp("ribassi", x.ribassi, "number"))}
    ${campo("Qualita' delle foto", `<select data-k="foto">${opz(["buone", "medie", "scarse"], x.foto || "medie")}</select>`)}
    ${campo("Cura del testo", `<select data-k="testo">${opz(["curato", "medio", "scarno"], x.testo || "medio")}</select>`)}
    ${campo("Stato", `<select data-k="stato">${opz(STATI, x.stato || "Da contattare")}</select>`)}
    ${campo("Data del primo contatto", inp("dataPrimoContatto", x.dataPrimoContatto || oggiISO(), "date"))}
  </div>
  ${campo("Note", `<textarea data-k="note">${esc(x.note || "")}</textarea>`)}
  <div class="avviso"><b>Compila sempre fonte e municipio</b>Sono i due campi da cui dipende tutta la riallocazione del budget dopo 90 giorni. Senza, il cruscotto non ti dice niente.</div>`;
}
function apriLead(id) {
  const x = id ? S.lead.find(l => l.id === id) : { id: uid(), stato: "Da contattare", dataPrimoContatto: oggiISO(), seq: {} };
  apriFinestra(id ? "Scheda lead" : "Nuovo lead",
    moduloLead(x) + (id ? `<div class="bottoniera"><button class="azione vuota" data-az="promuovi" data-id="${x.id}">Trasforma in mandato</button><button class="azione grigia" data-az="eliminaLead" data-id="${x.id}">Elimina</button></div>` : ""),
    () => {
      Object.assign(x, raccogli());
      if (!id) S.lead.push(x);
      salva(); chiudiFinestra(); render();
    });
}

/* ---------------- vista: SEQUENZA ---------------- */
function vistaSequenza() {
  const s = scadenzeSequenza();
  const scadute = s.filter(x => x.data < oggiISO());
  const oggi = s.filter(x => x.data === oggiISO());
  const dopo = s.filter(x => x.data > oggiISO());
  const gruppo = (tit, arr, cl) => arr.length ? `<div class="scheda"><h3>${tit} <span class="etichetta">${arr.length}</span></h3>
    ${arr.map(x => `<div class="spunta">
      <input type="checkbox" data-az="fattoSeq" data-id="${x.lead.id}" data-g="${x.passo.g}">
      <div class="testo"><b>${esc(x.lead.nome || "(senza nome)")}</b> · ${esc(x.lead.via || "")}
        <br>Giorno ${x.passo.g} — ${esc(x.passo.canale)}: ${esc(x.passo.contenuto)}
        <small>previsto ${dataIt(x.data)}${cl ? " · <b style='color:var(--rosso)'>in ritardo</b>" : ""}</small></div>
    </div>`).join("")}</div>` : "";

  return testa("Il follow-up che non muore", "Sequenza a 90 giorni",
    `L'80% dei mandati da privato si chiude fra il quarto e il dodicesimo contatto, e a mano non ci arriva nessuno. <b>Il giorno 90 ha la conversione piu' alta dell'intera sequenza</b>: e' quando l'entusiasmo iniziale del privato e' finito e il tuo nome e' l'unico che si e' fatto vivo con costanza per tre mesi senza mai insistere.`) + `
  ${gruppo("In ritardo", scadute, true)}
  ${gruppo("Oggi", oggi)}
  ${dopo.length ? `<div class="scheda"><h3>In arrivo</h3><div class="tabellone"><table>
    <thead><tr><th>Quando</th><th>Chi</th><th>Giorno</th><th>Canale</th><th>Contenuto</th></tr></thead>
    <tbody>${dopo.slice(0, 40).map(x => `<tr><td>${dataIt(x.data)}</td><td>${esc(x.lead.nome || "—")}<br><small style="color:var(--grigio)">${esc(x.lead.via || "")}</small></td>
      <td class="num">${x.passo.g}</td><td>${esc(x.passo.canale)}</td><td>${esc(x.passo.contenuto)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
  ${!s.length ? `<div class="vuoto">Nessuna sequenza aperta. Ogni lead con una data di primo contatto entra automaticamente nella cadenza.</div>` : ""}
  <div class="scheda"><h3>La cadenza, per intero</h3><div class="tabellone"><table>
    <thead><tr><th class="num">Giorno</th><th>Canale</th><th>Contenuto</th></tr></thead>
    <tbody>${SEQUENZA.map(p => `<tr><td class="num">${p.g}</td><td>${esc(p.canale)}</td><td>${esc(p.contenuto)}</td></tr>`).join("")}</tbody>
  </table></div></div>`;
}

/* ---------------- vista: MANDATI E GRAPPOLI ---------------- */
function vistaMandati() {
  const voci = grappoloVoci(S.piano);
  return testa("Livello 2 — presidio temporaneo", "Mandati e grappoli",
    `Non presidi le zone: presidi le trattative. Ogni immobile che prendi in mandato apre un presidio di <b>60 giorni nel raggio di 100 metri</b>, lanciato dal telefono il giorno stesso della firma. Con ${T().mandatiMese} mandati al mese sono <b>${T().grappoliAnno} grappoli l'anno</b>, ciascuno da una decina di minuti di lavoro tuo.`) + `
  <div class="bottoniera nostampa" style="margin:0 0 12px"><button class="azione" data-az="nuovoMandato">+ Nuovo mandato</button></div>
  ${S.mandati.length ? S.mandati.slice().sort((a, b) => (b.dataFirma || "").localeCompare(a.dataFirma || "")).map(m => {
      m.grappolo = m.grappolo || {};
      const gg = giorniDa(m.dataFirma);
      const fatti = voci.filter((v, i) => m.grappolo[i]).length;
      return `<div class="scheda">
      <h3><span data-az="apriMandato" data-id="${m.id}" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--linea)">${esc(m.indirizzo || "(senza indirizzo)")}</span>
        <span class="etichetta">${esc(m.municipio || "—")} · ${esc(m.fonte || "fonte non indicata")}</span>
        ${m.esclusiva ? `<span class="tag verde">esclusiva</span>` : `<span class="tag ambra">non esclusiva</span>`}
        ${m.daGrappolo ? `<span class="tag">nato da un grappolo</span>` : ""}
      </h3>
      <div style="font-size:12.5px;color:var(--grigio);margin:0 0 8px">Firmato ${dataIt(m.dataFirma)}${gg !== null ? ` · ${gg} giorni fa${gg <= 60 ? ` · presidio attivo, ${60 - gg} giorni residui` : " · presidio chiuso"}` : ""} · grappolo ${fatti}/${voci.length}</div>
      <div class="barra"><i class="${fatti === voci.length ? "v" : fatti > 1 ? "a" : ""}" style="width:${fatti / voci.length * 100}%"></i></div>
      <div style="margin-top:8px">${voci.map((v, i) => `<div class="spunta ${m.grappolo[i] ? "fatto" : ""}">
        <input type="checkbox" data-az="fattoGrappolo" data-id="${m.id}" data-i="${i}" ${m.grappolo[i] ? "checked" : ""}>
        <div class="testo"><b>Giorno ${esc(v.g)}</b> — ${esc(v.t)}<small>${esc(v.chi)}${m.dataFirma && v.g !== "chiusura" ? " · previsto " + dataIt(piu(m.dataFirma, parseInt(String(v.g).split("-")[0], 10))) : ""}</small></div>
      </div>`).join("")}</div>
    </div>`;
    }).join("") : `<div class="vuoto">Nessun mandato. Alla prima firma, il grappolo parte lo stesso giorno — senza eccezioni.</div>`}
  <div class="avviso"><b>Se il proprietario non concede l'open house</b>Sostituiscilo con due sessioni di visite raggruppate nello stesso pomeriggio: l'effetto sui vicini e' simile e il costo e' zero.</div>`;
}
function apriMandato(id) {
  const m = id ? S.mandati.find(x => x.id === id) : { id: uid(), dataFirma: oggiISO(), grappolo: {}, esclusiva: true };
  apriFinestra(id ? "Mandato" : "Nuovo mandato", `<div class="griglia g2">
    ${campo("Indirizzo", inp("indirizzo", m.indirizzo))}
    ${campo("Municipio", sel("municipio", MUNICIPI, m.municipio))}
    ${campo("Fascia di zona", sel("zona", ZONE.map(z => z.nome), m.zona))}
    ${campo("Fonte di acquisizione", sel("fonte", NOMI_FONTI, m.fonte))}
    ${campo("Tipo", sel("tipo", TIPI, m.tipo))}
    ${campo("Prezzo / canone", inp("prezzo", m.prezzo, "number"))}
    ${campo("Data della firma", inp("dataFirma", m.dataFirma, "date"))}
    ${campo("In esclusiva", `<select data-k="esclusiva">${opz(["si", "no"], m.esclusiva === false ? "no" : "si")}</select>`)}
    ${campo("Nato da un grappolo", `<select data-k="daGrappolo">${opz(["no", "si"], m.daGrappolo ? "si" : "no")}</select>`)}
  </div>${campo("Note", `<textarea data-k="note">${esc(m.note || "")}</textarea>`)}
  ${id ? `<div class="bottoniera"><button class="azione grigia" data-az="eliminaMandato" data-id="${m.id}">Elimina</button></div>` : ""}`,
    () => {
      const d = raccogli();
      d.esclusiva = d.esclusiva === "si"; d.daGrappolo = d.daGrappolo === "si";
      Object.assign(m, d);
      if (!id) S.mandati.push(m);
      salva(); chiudiFinestra(); render();
    });
}

/* ---------------- vista: RETE ---------------- */
function vistaRete() {
  const perCat = c => S.rete.filter(r => r.categoria === c).length;
  const totQuota = RETE_CATEGORIE.reduce((s, c) => s + c.quota, 0);
  return testa("Il moltiplicatore cittadino", "La rete dei venti",
    `Venti professionisti scelti in municipi diversi coprono fisicamente piu' citta' di qualsiasi volantinaggio — e a differenza di un volantino sono persone che parlano di te. <b>La regola: dai per primo, tre volte.</b> Al quarto contatto la reciprocita' arriva da sola, e arriva da loro.`) + `

  <div class="scheda"><h3>Composizione <span class="etichetta">${S.rete.length} / ${totQuota}</span></h3>
    <div class="tabellone"><table><thead><tr><th>Categoria</th><th class="num">Inseriti</th><th class="num">Quota</th><th>Perche'</th></tr></thead>
    <tbody>${RETE_CATEGORIE.map(c => { const n = perCat(c.n); return `<tr>
      <td><span class="pallino ${n >= c.quota ? "v" : n > 0 ? "a" : "r"}"></span> ${esc(c.n)}</td>
      <td class="num">${n}</td><td class="num">${c.quota}</td><td><small style="color:var(--grigio)">${esc(c.nota)}</small></td></tr>`; }).join("")}</tbody></table></div>
    <div class="bottoniera"><button class="azione" data-az="nuovaRete">+ Aggiungi contatto</button></div>
  </div>

  <div class="scheda"><h3>Cosa consegni nei primi tre contatti</h3>
    ${RETE_DARE.map((d, i) => `<div class="spunta"><span style="color:var(--rosso);font-weight:800">${i + 1}</span><div class="testo">${esc(d)}</div></div>`).join("")}
    <div class="avviso" style="margin-top:12px"><b>La mossa singola piu' efficace</b>Il Rapporto di Via con l'intestazione dell'amministratore sopra: gli dai qualcosa che lo fa fare bella figura coi suoi condomini ogni mese, gratis, al costo di una manciata di copie in piu'.</div>
  </div>

  ${S.rete.length ? `<div class="scheda"><h3>I contatti</h3><div class="tabellone"><table>
    <thead><tr><th>Nome</th><th>Categoria</th><th>Municipio</th><th>Dato 1</th><th>Dato 2</th><th>Dato 3</th><th>Incontro</th></tr></thead>
    <tbody>${S.rete.map(r => `<tr>
      <td><b data-az="apriRete" data-id="${r.id}" style="cursor:pointer;border-bottom:1px dotted var(--linea)">${esc(r.nome)}</b>${r.telefono ? `<br><small style="color:var(--grigio)">${esc(r.telefono)}</small>` : ""}</td>
      <td><small>${esc(r.categoria || "—")}</small></td><td><small>${esc(r.municipio || "—")}</small></td>
      ${[0, 1, 2].map(i => `<td><input type="checkbox" data-az="reteDato" data-id="${r.id}" data-i="${i}" ${(r.dati || [])[i] ? "checked" : ""} style="width:19px;height:19px;accent-color:var(--rosso)"></td>`).join("")}
      <td><input type="checkbox" data-az="reteIncontro" data-id="${r.id}" ${r.incontro ? "checked" : ""} style="width:19px;height:19px;accent-color:var(--verde)"></td>
    </tr>`).join("")}</tbody></table></div></div>` : `<div class="vuoto">Nessun contatto in rete. Obiettivo: un incontro vero con ciascuno entro 90 giorni, uno ogni tre giorni lavorativi, in agenda.</div>`}

  <div class="avviso"><b>Punto legale da non sbagliare</b>Il diritto alla provvigione di mediazione spetta solo a chi e' regolarmente iscritto. Pagare percentuali a segnalatori non abilitati e' prassi diffusa ma giuridicamente esposta: puo' compromettere il tuo stesso diritto alla provvigione. Struttura la rete su reciprocita' e servizi resi, non su percentuali.</div>`;
}
function apriRete(id) {
  const r = id ? S.rete.find(x => x.id === id) : { id: uid(), dati: [false, false, false] };
  apriFinestra(id ? "Contatto di rete" : "Nuovo contatto di rete", `<div class="griglia g2">
    ${campo("Nome", inp("nome", r.nome))}
    ${campo("Categoria", sel("categoria", RETE_CATEGORIE.map(c => c.n), r.categoria))}
    ${campo("Municipio prevalente", sel("municipio", MUNICIPI, r.municipio))}
    ${campo("Telefono", inp("telefono", r.telefono, "tel"))}
    ${campo("Email", inp("email", r.email, "email"))}
    ${campo("Prossimo incontro", inp("prossimo", r.prossimo, "date"))}
  </div>${campo("Note", `<textarea data-k="note">${esc(r.note || "")}</textarea>`)}
  ${id ? `<div class="bottoniera"><button class="azione grigia" data-az="eliminaRete" data-id="${r.id}">Elimina</button></div>` : ""}`,
    () => { Object.assign(r, raccogli()); if (!id) S.rete.push(r); salva(); chiudiFinestra(); render(); });
}

/* ---------------- vista: GESTIONE LOCATIVA ---------------- */
const CONTRATTI = ["Concordato 3+2", "Libero 4+4", "Transitorio", "Studenti universitari", "Breve"];
function vistaGestione() {
  const ric = S.gestione.reduce((s, g) => s + num(g.canone) * 12 * (num(g.perc) || 8) / 100, 0);
  const mese = oggiISO().slice(0, 7);
  const nuoviMese = S.gestione.filter(g => (g.dataInizio || "").startsWith(mese)).length;
  return testa("Il motore finanziario", "Gestione locativa",
    `<b>+2 immobili in gestione al mese.</b> A 24 immobili gestiti sono circa 27.000 € l'anno di ricavi ricorrenti — oltre quattro volte il budget pubblicitario annuo — e statisticamente 2-4 mandati di vendita l'anno che arrivano da soli, a costo di acquisizione zero.`) + `

  <div class="griglia g3">
    <div class="dato"><div class="titolo">Immobili in gestione</div><div class="valore">${S.gestione.length}</div><div class="sotto">soglia per salire a 1.000 €: 12</div></div>
    <div class="dato ${nuoviMese >= 2 ? "verde" : "ambra"}"><div class="titolo">Nuovi questo mese</div><div class="valore">${nuoviMese}</div><div class="sotto">obiettivo +2/mese</div></div>
    <div class="dato"><div class="titolo">Ricavo ricorrente annuo</div><div class="valore">${eur(ric)}</div><div class="sotto">${ric >= T().budget * 12 ? "copre l'intero budget annuo" : "budget annuo: " + eur(T().budget * 12)}</div></div>
  </div>

  <div class="scheda" style="margin-top:12px">
    <h3>Calcolatore del canone concordato <span class="etichetta">il gancio fiscale</span></h3>
    <div class="griglia g3">
      ${campo("Canone mensile (€)", `<input type="number" id="ccCanone" value="1200">`)}
      ${campo("IMU risparmiata stimata (€/anno)", `<input type="number" id="ccImu" value="0">`)}
      ${campo("", `<button class="azione" data-az="calcolaConcordato" style="margin-top:18px">Calcola</button>`)}
    </div>
    <div id="ccEsito"></div>
    <div class="avviso" style="margin-top:10px"><b>Da verificare</b>Aliquote, requisiti e valori dell'accordo territoriale milanese cambiano nel tempo e variano per fascia di zona. Fai confermare i numeri correnti dal commercialista prima di metterli in comunicazione, e aggiornali una volta l'anno.</div>
  </div>

  <div class="bottoniera nostampa"><button class="azione" data-az="nuovaGestione">+ Immobile in gestione</button></div>

  ${S.gestione.length ? `<div class="scheda" style="margin-top:12px"><div class="tabellone"><table>
    <thead><tr><th>Immobile</th><th>Contratto</th><th class="num">Canone</th><th class="num">%</th><th class="num">Ricorrente/anno</th><th>Rivalutazione</th></tr></thead>
    <tbody>${S.gestione.map(g => {
      const gg = giorniDa(g.ultimaRivalutazione || g.dataInizio);
      const scad = gg !== null && gg > 180;
      return `<tr>
      <td><b data-az="apriGestione" data-id="${g.id}" style="cursor:pointer;border-bottom:1px dotted var(--linea)">${esc(g.indirizzo || "—")}</b><br><small style="color:var(--grigio)">${esc(g.municipio || "")}</small></td>
      <td><small>${esc(g.tipoContratto || "—")}</small></td>
      <td class="num">${eur(num(g.canone))}</td><td class="num">${num(g.perc) || 8}%</td>
      <td class="num">${eur(num(g.canone) * 12 * (num(g.perc) || 8) / 100)}</td>
      <td>${scad ? `<span class="tag ambra">da rivalutare</span>` : `<small>${dataIt(g.ultimaRivalutazione || g.dataInizio)}</small>`}</td></tr>`;
    }).join("")}</tbody></table></div></div>` : `<div class="vuoto">Nessun immobile in gestione. E' l'unica entrata prevedibile che un'agenzia immobiliare possa avere: sono i soldi che ti permettono di non spegnere la pubblicita' nei mesi vuoti.</div>`}

  <div class="scheda"><h3>Il pacchetto «gestione chiavi in mano» — 8-10% del canone annuo</h3>
    <div class="griglia g2">
      ${[["Selezione inquilino", "Verifica documentale reddituale, controllo affidabilita', referenze del precedente locatore. Il proprietario paga soprattutto per non sbagliare persona."],
        ["Canone garantito", "Polizza di garanzia locativa tramite partner assicurativo. E' l'argomento che vince la diffidenza dei proprietari prudenti e, soprattutto, di quelli lontani."],
        ["Burocrazia completa", "Contratto, registrazione telematica, cedolare, attestazione concordato, adempimenti annuali, disdette. Il proprietario non tocca niente."],
        ["Verbali fotografici", "Consegna e riconsegna documentate voce per voce. Elimina la causa numero uno di lite sul deposito cauzionale."],
        ["Manutenzione", "Rete di artigiani, interventi entro 48 ore, preventivi autorizzati sopra soglia. Fidelizza e rifornisce la rete di segnalatori."],
        ["Report semestrale", "Incassi, spese, stato dell'immobile e <b>valore di mercato aggiornato</b>. E' il seme del futuro mandato di vendita."]]
        .map(([t, d]) => `<div class="dato"><div class="titolo">${t}</div><div style="font-family:var(--serif);font-size:14px;margin-top:5px">${d}</div></div>`).join("")}
    </div>
  </div>

  <div class="scheda"><h3>Le quattro nicchie di Milano</h3>
    <table><tbody>
      <tr><td><b>Studenti e fuorisede</b></td><td>Rotazione alta, commissioni ripetute sullo stesso immobile, forte stagionalita' estiva da anticipare in primavera.</td></tr>
      <tr><td><b>Giovani professionisti e coppie</b></td><td>Il volume. Ticket 900-1.600 €, decisione rapida, alta sensibilita' alla qualita' dell'annuncio.</td></tr>
      <tr><td><b>Expat e trasferimenti aziendali</b></td><td>Il segmento a maggior valore: canoni alti, contratti spesso garantiti dall'azienda, rinnovi frequenti. Si raggiunge con relazioni — agenzie di relocation e uffici HR — non con budget.</td></tr>
      <tr><td><b>Ex host di affitti brevi</b></td><td>Gia' abituati a pagare un servizio di gestione: la conversazione parte avanti. Il piu' redditizio, perche' entrano direttamente nella gestione.</td></tr>
    </tbody></table>
  </div>`;
}
function apriGestione(id) {
  const g = id ? S.gestione.find(x => x.id === id) : { id: uid(), dataInizio: oggiISO(), perc: 8, tipoContratto: "Concordato 3+2" };
  apriFinestra(id ? "Immobile in gestione" : "Nuovo immobile in gestione", `<div class="griglia g2">
    ${campo("Indirizzo", inp("indirizzo", g.indirizzo))}
    ${campo("Municipio", sel("municipio", MUNICIPI, g.municipio))}
    ${campo("Tipo di contratto", sel("tipoContratto", CONTRATTI, g.tipoContratto))}
    ${campo("Canone mensile (€)", inp("canone", g.canone, "number"))}
    ${campo("Percentuale di gestione (%)", inp("perc", g.perc, "number"))}
    ${campo("Inizio gestione", inp("dataInizio", g.dataInizio, "date"))}
    ${campo("Ultima rivalutazione", inp("ultimaRivalutazione", g.ultimaRivalutazione, "date"))}
  </div>${campo("Note", `<textarea data-k="note">${esc(g.note || "")}</textarea>`)}
  ${id ? `<div class="bottoniera"><button class="azione grigia" data-az="eliminaGestione" data-id="${g.id}">Elimina</button></div>` : ""}`,
    () => { Object.assign(g, raccogli()); if (!id) S.gestione.push(g); salva(); chiudiFinestra(); render(); });
}

/* ---------------- eventi ---------------- */
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-vista]");
  if (b) return vaiA(b.dataset.vista);
  const el = ev.target.closest("[data-az]");
  if (!el) return;
  const az = el.dataset.az, id = el.dataset.id;
  const azioni = {
    chiudi: chiudiFinestra,
    conferma: () => { const f = $("#finestra")._onSalva; if (f) f(); },
    piu: () => { const a = attivitaDi(oggiISO()); a[el.dataset.c] = num(a[el.dataset.c]) + 1; salva(); render(); },
    meno: () => { const a = attivitaDi(oggiISO()); a[el.dataset.c] = Math.max(0, num(a[el.dataset.c]) - 1); salva(); render(); },
    nuovoLead: () => apriLead(null),
    apriLead: () => apriLead(id),
    eliminaLead: () => { if (confirm("Eliminare questo lead?")) { S.lead = S.lead.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
    promuovi: () => {
      const l = S.lead.find(x => x.id === id); if (!l) return;
      S.mandati.push({ id: uid(), indirizzo: l.via, municipio: l.municipio, zona: l.zona, fonte: l.fonte, tipo: l.tipo, prezzo: l.prezzo || l.canone, dataFirma: oggiISO(), esclusiva: true, grappolo: {} });
      l.stato = "Mandato firmato"; salva(); chiudiFinestra(); vaiA("mandati");
    },
    fattoSeq: () => { const l = S.lead.find(x => x.id === id); if (!l) return; l.seq = l.seq || {}; l.seq[el.dataset.g] = true; if (l.stato === "Da contattare") l.stato = "In sequenza"; salva(); render(); },
    fattoGrappolo: () => { const m = S.mandati.find(x => x.id === id); if (!m) return; m.grappolo = m.grappolo || {}; m.grappolo[el.dataset.i] = !m.grappolo[el.dataset.i]; salva(); render(); },
    nuovoMandato: () => apriMandato(null), apriMandato: () => apriMandato(id),
    eliminaMandato: () => { if (confirm("Eliminare questo mandato?")) { S.mandati = S.mandati.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
    nuovaRete: () => apriRete(null), apriRete: () => apriRete(id),
    eliminaRete: () => { if (confirm("Eliminare?")) { S.rete = S.rete.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
    reteDato: () => { const r = S.rete.find(x => x.id === id); r.dati = r.dati || [false, false, false]; r.dati[el.dataset.i] = el.checked; salva(); },
    reteIncontro: () => { const r = S.rete.find(x => x.id === id); r.incontro = el.checked; salva(); render(); },
    nuovaGestione: () => apriGestione(null), apriGestione: () => apriGestione(id),
    eliminaGestione: () => { if (confirm("Eliminare?")) { S.gestione = S.gestione.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
    calcolaConcordato: () => {
      const c = num($("#ccCanone").value), imu = num($("#ccImu").value);
      const annuo = c * 12, t21 = annuo * 0.21, t10 = annuo * 0.10;
      $("#ccEsito").innerHTML = `<div class="griglia g3" style="margin-top:10px">
        <div class="dato"><div class="titolo">Cedolare 21% (libero)</div><div class="valore">${eur(t21)}</div><div class="sotto">imposta annua</div></div>
        <div class="dato"><div class="titolo">Cedolare 10% (concordato)</div><div class="valore">${eur(t10)}</div><div class="sotto">imposta annua</div></div>
        <div class="dato verde"><div class="titolo">Risparmio annuo</div><div class="valore">${eur(t21 - t10 + imu)}</div><div class="sotto">${imu ? "incluse riduzioni IMU" : "IMU esclusa"} · ogni anno</div></div>
      </div>
      <div class="copiabile" style="margin-top:10px">Su un canone di ${eur(c)} al mese, il contratto a canone concordato 3+2 nel Comune di Milano le fa risparmiare circa ${eur(t21 - t10 + imu)} l'anno di sole imposte — ogni anno, a fronte di un canone leggermente piu' basso. L'attestazione di rispondenza la gestisco io per lei.</div>`;
    },
    ...(window.AZIONI_EXTRA || {})
  };
  if (azioni[az]) { if (el.tagName !== "INPUT") ev.preventDefault(); azioni[az](el); }
});

document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.id && t.id.startsWith("f") && ["fq", "fstato", "ffonte", "fmunicipio", "ftipo"].includes(t.id)) {
    filtroLead = { q: $("#fq").value, stato: $("#fstato").value, fonte: $("#ffonte").value, municipio: $("#fmunicipio").value, tipo: $("#ftipo").value };
    const c = document.activeElement === $("#fq") ? $("#fq").selectionStart : null;
    render();
    if (c !== null) { const n = $("#fq"); n.focus(); n.setSelectionRange(c, c); }
  }
  if (typeof suInput === "function") suInput(ev);
});

$("#velo").addEventListener("click", e => { if (e.target.id === "velo") chiudiFinestra(); });
$("#selPiano").addEventListener("change", e => { S.piano = e.target.value; salva(); render(); });
$("#selOperatore").addEventListener("change", e => { S.operatore = e.target.value; salva(); });

/* azzera filtri */
window.AZIONI_EXTRA = Object.assign(window.AZIONI_EXTRA || {}, {
  azzeraFiltri: () => { filtroLead = { q: "", stato: "", fonte: "", municipio: "", tipo: "" }; render(); }
});

/* ---------------- avvio ---------------- */
function avvia() {
  $("#selPiano").value = S.piano;
  $("#selOperatore").innerHTML = opz(S.operatori, S.operatore);
  costruisciNav();
  vaiA("oggi");
}
avvia();
