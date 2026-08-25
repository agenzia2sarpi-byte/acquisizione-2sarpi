/* Pagina Trattative — generata dal nucleo condiviso. */

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

let sezione = new URLSearchParams(location.search).get("s") || "lead";
function render() {
  const tab = (k, t) => `<button class="azione ${sezione === k ? "" : "grigia"}" data-az="sez" data-s="${k}">${t}</button>`;
  $("#vista").innerHTML = `<div class="bottoniera nostampa" style="margin:0 0 14px">
      ${tab("lead", "Lead")}${tab("sequenza", "Sequenza 90 giorni")}${tab("mandati", "Mandati e grappoli")}</div>`
    + ({ lead: vistaLead, sequenza: vistaSequenza, mandati: vistaMandati }[sezione])();
  if (sezione === "lead") ["fq","fstato","ffonte","fmunicipio","ftipo"].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener(el.type === "search" ? "input" : "change", () => {
      filtroLead = { q: $("#fq").value, stato: $("#fstato").value, fonte: $("#ffonte").value, municipio: $("#fmunicipio").value, tipo: $("#ftipo").value };
      const pos = id === "fq" ? $("#fq").selectionStart : null;
      render();
      if (pos !== null) { const n = $("#fq"); n.focus(); n.setSelectionRange(pos, pos); }
    });
  });
}
Object.assign(AZIONI, {
  sez: el => { sezione = el.dataset.s; render(); window.scrollTo({ top: 0 }); },
  azzeraFiltri: () => { filtroLead = { q: "", stato: "", fonte: "", municipio: "", tipo: "" }; render(); },
  nuovoLead: () => apriLead(null),
  apriLead: el => apriLead(el.dataset.id),
  eliminaLead: el => { if (confirm("Eliminare questo lead?")) { const id = el.dataset.id; S.lead = S.lead.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
  promuovi: el => {
    const l = S.lead.find(x => x.id === el.dataset.id); if (!l) return;
    S.mandati.push({ id: uid(), indirizzo: l.via, municipio: l.municipio, zona: l.zona, fonte: l.fonte, tipo: l.tipo, prezzo: l.prezzo || l.canone, dataFirma: oggiISO(), esclusiva: true, grappolo: {} });
    l.stato = "Mandato firmato";
    const a = attivitaDi(oggiISO()); a.mandati = num(a.mandati) + 1;
    salva(); chiudiFinestra(); sezione = "mandati"; render();
  },
  fattoSeq: el => { const l = S.lead.find(x => x.id === el.dataset.id); if (!l) return; l.seq = l.seq || {}; l.seq[el.dataset.g] = true; if (l.stato === "Da contattare") l.stato = "In sequenza"; salva(); render(); },
  fattoGrappolo: el => { const m = S.mandati.find(x => x.id === el.dataset.id); if (!m) return; m.grappolo = m.grappolo || {}; m.grappolo[el.dataset.i] = !m.grappolo[el.dataset.i]; salva(); render(); },
  nuovoMandato: () => apriMandato(null),
  apriMandato: el => apriMandato(el.dataset.id),
  eliminaMandato: el => { if (confirm("Eliminare questo mandato?")) { const id = el.dataset.id; S.mandati = S.mandati.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } }
});
avviaPagina(render);
