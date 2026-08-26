/* Pagina Strumenti — generata dal nucleo condiviso. */

/* ---------------- vista: RAPPORTO DI VIA ---------------- */
function vistaRapporto() {
  const r = S.rapporto || (S.rapporto = { via: "", periodo: "ultimi 12 mesi", comparabili: [{}, {}, {}] });
  const c = r.comparabili || (r.comparabili = [{}, {}, {}]);
  const cmp = i => `<div class="griglia g4">
    ${campo("Indirizzo " + (i + 1), `<input data-r="c${i}.ind" value="${esc(c[i].ind || "")}">`)}
    ${campo("Mq", `<input type="number" data-r="c${i}.mq" value="${esc(c[i].mq || "")}">`)}
    ${campo("Prezzo di chiusura", `<input type="number" data-r="c${i}.prezzo" value="${esc(c[i].prezzo || "")}">`)}
    ${campo("Giorni sul mercato", `<input type="number" data-r="c${i}.giorni" value="${esc(c[i].giorni || "")}">`)}
  </div>`;

  return testa("Il documento che costruisce l'autorita'", "Rapporto di Via",
    `Un A4 fronte-retro su <b>una via specifica</b>. Nessuna pubblicita', solo il tuo riquadro di contatto in fondo. Tre usi: distribuzione commissionata sul grappolo, copia singola per un lead, e — il piu' potente — <b>girato all'amministratore con la sua intestazione sopra</b>. Le affermazioni di prezzo devono poggiare su fonti che puoi mostrare: un dato sbagliato demolisce l'autorita' in un colpo.`) + `

  <div class="scheda nostampa"><h3>Compila</h3>
    <div class="griglia g3">
      ${campo("Via", `<input data-r="via" value="${esc(r.via || "")}">`)}
      ${campo("Municipio", `<select data-r="municipio"><option value=""></option>${opz(MUNICIPI, r.municipio)}</select>`)}
      ${campo("Periodo", `<input data-r="periodo" value="${esc(r.periodo || "")}">`)}
      ${campo("Prezzo medio di chiusura (€/mq)", `<input type="number" data-r="emq" value="${esc(r.emq || "")}">`)}
      ${campo("Immobili venduti", `<input type="number" data-r="venduti" value="${esc(r.venduti || "")}">`)}
      ${campo("Giorni medi di vendita", `<input type="number" data-r="giorni" value="${esc(r.giorni || "")}">`)}
      ${campo("Immobili affittati", `<input type="number" data-r="affittati" value="${esc(r.affittati || "")}">`)}
      ${campo("Canone medio (€/mese)", `<input type="number" data-r="canone" value="${esc(r.canone || "")}">`)}
      ${campo("Variazione sul periodo precedente (%)", `<input type="number" data-r="var" value="${esc(r.var || "")}">`)}
    </div>
    <h3 style="margin-top:14px">Le tre comparabili documentate</h3>
    ${cmp(0)}${cmp(1)}${cmp(2)}
    ${campo("Intestazione di cortesia (facoltativa — il nome dell'amministratore)", `<input data-r="intestatario" value="${esc(r.intestatario || "")}" placeholder="es. Studio Bianchi — Amministrazioni condominiali">`)}
    ${campo("Fonte dei dati (obbligatoria: deve essere mostrabile)", `<input data-r="fonte" value="${esc(r.fonte || "quotazioni OMI e archivio interno Agenzia 2 Sarpi")}">`)}
    <div class="bottoniera">
      <button class="azione" data-az="stampaRapporto">Stampa o salva in PDF</button>
      <button class="azione vuota" data-az="anteprima">Aggiorna l'anteprima</button>
    </div>
  </div>

  <div class="foglio" id="foglioRapporto">
    <div class="testata">
      ${r.intestatario ? `<div style="font-family:var(--sans);font-size:12px;font-weight:700;margin:0 0 8px">${esc(r.intestatario)}</div>` : ""}
      <div class="occ">Rapporto di Via · ${esc(r.municipio || "Milano")} · ${esc(r.periodo || "")}</div>
      <h1>${esc(r.via || "Via …")}</h1>
      <p style="font-size:14px;color:#555;margin:0">I dati reali di questa strada, raccolti e verificati. Nessuna offerta, nessun impegno.</p>
    </div>
    <table style="margin:0 0 18px"><tbody>
      <tr><td><b>Prezzo medio di chiusura</b></td><td class="num"><b>${r.emq ? num(r.emq).toLocaleString("it-IT") + " €/mq" : "—"}</b></td></tr>
      <tr><td>Immobili venduti nel periodo</td><td class="num">${esc(r.venduti || "—")}</td></tr>
      <tr><td>Tempo medio di vendita</td><td class="num">${r.giorni ? esc(r.giorni) + " giorni" : "—"}</td></tr>
      <tr><td>Immobili affittati nel periodo</td><td class="num">${esc(r.affittati || "—")}</td></tr>
      <tr><td>Canone medio</td><td class="num">${r.canone ? eur(num(r.canone)) + "/mese" : "—"}</td></tr>
      <tr><td>Variazione sul periodo precedente</td><td class="num">${r.var ? (num(r.var) > 0 ? "+" : "") + esc(r.var) + "%" : "—"}</td></tr>
    </tbody></table>
    <h3 style="font-family:var(--sans);font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#B01F1F">Tre comparabili documentate</h3>
    <table><thead><tr><th>Indirizzo</th><th class="num">Mq</th><th class="num">Chiusura</th><th class="num">€/mq</th><th class="num">Giorni</th></tr></thead>
    <tbody>${c.map(x => `<tr><td>${esc(x.ind || "—")}</td><td class="num">${esc(x.mq || "—")}</td>
      <td class="num">${x.prezzo ? eur(num(x.prezzo)) : "—"}</td>
      <td class="num">${x.prezzo && x.mq ? Math.round(num(x.prezzo) / num(x.mq)).toLocaleString("it-IT") : "—"}</td>
      <td class="num">${esc(x.giorni || "—")}</td></tr>`).join("")}</tbody></table>
    <p style="font-size:11px;color:#777;margin:14px 0 0">Fonte: ${esc(r.fonte || "—")}. Valori indicativi riferiti al periodo dichiarato: non costituiscono una valutazione dell'immobile ne' una proposta contrattuale.</p>
    <div class="firma">
      <b>Agenzia 2 Sarpi</b> — ${esc(persona(S.operatore).nome)} · ${esc(persona(S.operatore).telefono)}${persona(S.operatore).telefono2 ? " / " + esc(persona(S.operatore).telefono2) : ""}<br>
      ${esc(persona(S.operatore).email)}<br>
      Valutazione scritta di un immobile in questa via: gratuita, consegnata a mano entro 48 ore, senza impegno.
    </div>
  </div>`;
}

/* ---------------- vista: SCRIPT ---------------- */
function vistaScript() {
  const c = S.scriptCampi || (S.scriptCampi = { X: "", P: "", Y: "", Z: "", N: "", C: "1200", R: "", TEL: "" });
  // il numero non e' un campo da ricordarsi: e' quello di chi e' selezionato in alto
  if (!c.TEL || Object.values(PERSONE).some(p => p.telefono === c.TEL)) c.TEL = persona(S.operatore).telefono;
  const sostituisci = t => t
    .replaceAll("[X]", c.X || "[via]").replaceAll("[P]", c.P || "[€/mq]").replaceAll("[Y]", c.Y || "[giorni]")
    .replaceAll("[Z]", c.Z || "[%]").replaceAll("[N]", c.N || "[nome]").replaceAll("[C]", c.C || "[canone]")
    .replaceAll("[R]", c.R || "[risparmio]").replaceAll("[TEL]", c.TEL || persona(S.operatore).telefono);

  return testa("Costa zero e vale tutto", "Script e modelli",
    `Preferisci sempre <b>il canale che il proprietario ha pubblicato</b>: e' piu' difendibile sul piano normativo e converte meglio — arrivi come qualcuno che ha letto, non come qualcuno che ha comprato una lista. Compila i campi qui sotto e i modelli si riempiono da soli.`) + `

  <div class="scheda nostampa"><h3>Campi della trattativa</h3><div class="griglia g4">
    ${campo("[X] Via", `<input data-s="X" value="${esc(c.X)}">`)}
    ${campo("[P] €/mq della via", `<input data-s="P" value="${esc(c.P)}">`)}
    ${campo("[Y] Giorni medi", `<input data-s="Y" value="${esc(c.Y)}">`)}
    ${campo("[Z] % sopra mercato", `<input data-s="Z" value="${esc(c.Z)}">`)}
    ${campo("[N] Nome o numero", `<input data-s="N" value="${esc(c.N)}">`)}
    ${campo("[C] Canone mensile", `<input data-s="C" value="${esc(c.C)}">`)}
    ${campo("[R] Risparmio annuo", `<input data-s="R" value="${esc(c.R)}">`)}
    ${campo("[TEL] Telefono", `<input data-s="TEL" value="${esc(c.TEL)}">`)}
  </div></div>

  ${SCRIPT.map(s => `<details class="blocco"><summary>${esc(s.t)}</summary><div class="corpo">
    ${s.nota ? `<p style="font-family:var(--sans);font-size:12.5px;color:var(--grigio)">${esc(s.nota)}</p>` : ""}
    <div class="copiabile" id="sc-${s.id}">${esc(sostituisci(s.x))}</div>
    <div class="bottoniera nostampa"><button class="azione vuota" data-az="copia" data-t="sc-${s.id}">Copia</button></div>
  </div></details>`).join("")}

  <div class="avviso"><b>Prima di ogni chiamata a freddo</b>Il Registro Pubblico delle Opposizioni si applica anche alle numerazioni mobili. Pubblicare un recapito per ricevere offerte di acquisto non equivale a un consenso per ricevere proposte commerciali di servizi: primo contatto sul canale che il proprietario ha pubblicato, telefono solo dopo una risposta o previa verifica nel Registro.</div>`;
}

let sezione = new URLSearchParams(location.search).get("s") || "rapporto";
function render() {
  const tab = (k, t) => `<button class="azione ${sezione === k ? "" : "grigia"}" data-az="sez" data-s="${k}">${t}</button>`;
  $("#vista").innerHTML = `<div class="bottoniera nostampa" style="margin:0 0 14px">${tab("rapporto", "Rapporto di Via")}${tab("script", "Script e modelli")}</div>`
    + ({ rapporto: vistaRapporto, script: vistaScript }[sezione])();
}
function aggiornaScript() {
  const c = S.scriptCampi;
  const sost = t => t.replaceAll("[X]", c.X || "[via]").replaceAll("[P]", c.P || "[€/mq]").replaceAll("[Y]", c.Y || "[giorni]")
    .replaceAll("[Z]", c.Z || "[%]").replaceAll("[N]", c.N || "[nome]").replaceAll("[C]", c.C || "[canone]")
    .replaceAll("[R]", c.R || "[risparmio]").replaceAll("[TEL]", c.TEL || "[telefono]");
  SCRIPT.forEach(s => { const el = document.getElementById("sc-" + s.id); if (el) el.textContent = sost(s.x); });
}
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.dataset.s) { S.scriptCampi[t.dataset.s] = t.value; if (t.dataset.s === "TEL") S.telefono = t.value; salva(); aggiornaScript(); }
  if (t.dataset.r) {
    const k = t.dataset.r;
    if (k.startsWith("c")) { const [ci, campo] = k.split("."); S.rapporto.comparabili[+ci[1]][campo] = t.value; }
    else S.rapporto[k] = t.value;
    salva();
  }
});
document.addEventListener("change", ev => {
  if (ev.target.dataset && ev.target.dataset.r && sezione === "rapporto") { const y = window.scrollY; render(); window.scrollTo(0, y); }
});
Object.assign(AZIONI, {
  sez: el => { sezione = el.dataset.s; render(); window.scrollTo({ top: 0 }); },
  stampaRapporto: () => window.print(),
  anteprima: () => { const y = window.scrollY; render(); window.scrollTo(0, y); }
});
avviaPagina(render);
