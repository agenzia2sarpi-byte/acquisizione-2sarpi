/* Pagina Metodo — generata dal nucleo condiviso. */

/* ---------------- vista: PIANO 90 GIORNI ---------------- */
function vistaPiano90() {
  const p = PIANO90[S.piano];
  let meseCorrente = "";
  const fatte = Object.keys(S.piano90).filter(k => k.startsWith(S.piano + "|") && S.piano90[k]).length;
  const tot = p.reduce((s, x) => s + x.v.length, 0);
  return testa("Dal primo giorno alla riallocazione", "Piano a 90 giorni",
    S.piano === "500"
      ? `Differenza chiave rispetto al piano da 1.000 €: <b>la pubblicita' si accende alla settimana 5, non alla 4</b>. Prima devono funzionare la pagina di valutazione, il PDF automatico e la risposta entro 5 minuti. Accendere Meta senza quelli, con 180 € al mese, e' buttarli.`
      : `Mese 1 costruire la macchina, mese 2 fare volume, mese 3 selezionare e raddoppiare. <b>Tutto quello che c'e' in questo piano serve a rendere l'ora d'oro il piu' produttiva possibile.</b>`) + `
  <div class="scheda"><h3>Avanzamento <span class="etichetta">piano ${esc(T().etichetta)}</span></h3>
    <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:28px;font-weight:800">${fatte}</span><span style="color:var(--grigio)">di ${tot} voci completate</span></div>
    <div class="barra"><i class="${fatte === tot ? "v" : "a"}" style="width:${fatte / tot * 100}%"></i></div>
  </div>
  ${p.map((s, si) => {
      const nuovo = s.m !== meseCorrente; meseCorrente = s.m;
      return (nuovo ? `<h3 style="margin:20px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:var(--rosso)">${esc(s.m)}</h3>` : "") +
        `<div class="scheda"><h3>${esc(s.s)}</h3>${s.v.map((v, vi) => {
          const k = `${S.piano}|${si}|${vi}`;
          return `<div class="spunta ${S.piano90[k] ? "fatto" : ""}">
            <input type="checkbox" data-az="p90" data-k90="${k}" ${S.piano90[k] ? "checked" : ""}>
            <div class="testo">${esc(v)}</div></div>`;
        }).join("")}</div>`;
    }).join("")}`;
}

/* ---------------- vista: PLAYBOOK ---------------- */
function vistaPlaybook() {
  return testa("Il metodo, per intero", "Playbook",
    `Le sezioni dei due piani operativi, consultabili. Dove i due budget divergono, la differenza e' indicata dentro la sezione. <b>Nessuna zona di riferimento:</b> il piano copre Milano intera e concentra l'attivita' fisica solo attorno agli immobili effettivamente in mandato.`) + `
  <div class="scheda"><h3>Le fonti, ordinate per costo</h3><div class="tabellone"><table>
    <thead><tr><th>Fonte</th><th>Costo</th><th>Quando</th><th>Resa attesa</th></tr></thead>
    <tbody>${FONTI.map(f => `<tr><td>${esc(f.n)}</td><td><small>${esc(f.costo)}</small></td><td><small>${esc(f.quando)}</small></td><td><small style="color:var(--grigio)">${esc(f.resa)}</small></td></tr>`).join("")}</tbody>
  </table></div></div>
  <div class="scheda"><h3>Fasce indicative di prezzo <span class="etichetta">da aggiornare con le quotazioni OMI correnti</span></h3><div class="tabellone"><table>
    <thead><tr><th>Fascia</th><th class="num">€/mq</th><th class="num">Esempio 70 mq</th><th class="num">Provvigione 3%</th></tr></thead>
    <tbody>${ZONE.map(z => { const p = (z.min + z.max) / 2 * 70; return `<tr><td>${esc(z.nome)}</td>
      <td class="num">${z.min.toLocaleString("it-IT")}–${z.max.toLocaleString("it-IT")}</td>
      <td class="num">~${eur(p)}</td><td class="num">~${eur(p * .03)}</td></tr>`; }).join("")}</tbody>
  </table></div>
  <div class="avviso" style="margin-top:10px"><b>Da verificare</b>Fasce indicative da usare per ragionare, non da citare ai clienti. Prima di metterle in comunicazione, aggiornale con le quotazioni OMI correnti e con lo storico delle tue chiusure, zona per zona.</div></div>
  ${PLAYBOOK.map(s => `<details class="blocco"><summary><span class="num">${s.n}</span> ${esc(s.t)}</summary><div class="corpo">${s.c}</div></details>`).join("")}`;
}

/* ---------------- vista: CONFORMITA' ---------------- */
function vistaConformita() {
  const tot = CONFORMITA.reduce((s, g) => s + g.v.length, 0);
  const fatte = CONFORMITA.reduce((s, g) => s + g.v.filter(v => S.conformita[v.id]).length, 0);
  return testa("Non ha una versione economica", "Conformita'",
    `Sono i quattro punti su cui le agenzie prendono sanzioni reali, e tre riguardano proprio le attivita' di acquisizione. <b>Da fare prima di partire:</b> un'ora con il consulente privacy e una con il commercialista. Costa poco e mette al riparo una macchina che, se funziona, girera' per anni.`) + `
  <div class="scheda"><h3>Stato</h3>
    <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:28px;font-weight:800">${fatte}</span><span style="color:var(--grigio)">di ${tot} adempimenti in ordine</span></div>
    <div class="barra"><i class="${fatte === tot ? "v" : fatte > tot / 2 ? "a" : ""}" style="width:${fatte / tot * 100}%"></i></div>
  </div>
  ${CONFORMITA.map(g => `<div class="scheda"><h3>${esc(g.g)}</h3>
    ${g.v.map(v => `<div class="spunta ${S.conformita[v.id] ? "fatto" : ""}">
      <input type="checkbox" data-az="conf" data-cid="${v.id}" ${S.conformita[v.id] ? "checked" : ""}>
      <div class="testo">${esc(v.t)}${v.n ? `<small>${esc(v.n)}</small>` : ""}</div></div>`).join("")}
  </div>`).join("")}
  <div class="scheda"><h3>Lista «non contattare» <span class="etichetta">${S.optout.length} voci</span></h3>
    <p style="font-family:var(--serif);font-size:14px">Opt-out immediato, permanente e valido su tutti i canali. L'automazione la controlla prima di ogni invio, senza eccezioni. Con migliaia di contatti cittadini in circolo, questo controllo non e' un'opzione.</p>
    <div class="griglia g2">
      ${campo("Aggiungi (telefono, email o nome)", `<input id="ooVal" placeholder="es. 333 1234567">`)}
      ${campo("", `<button class="azione" data-az="addOptout" style="margin-top:18px">Aggiungi alla lista</button>`)}
    </div>
    ${S.optout.length ? `<div class="tabellone"><table><thead><tr><th>Voce</th><th>Inserita</th><th></th></tr></thead>
      <tbody>${S.optout.map(o => `<tr><td><b>${esc(o.valore)}</b></td><td><small>${dataIt(o.data)}</small></td>
      <td><button class="azione grigia" data-az="delOptout" data-id="${o.id}" style="padding:3px 9px;font-size:12px">togli</button></td></tr>`).join("")}</tbody></table></div>` : ""}
  </div>`;
}

let sezione = new URLSearchParams(location.search).get("s") || "piano90";
function render() {
  const tab = (k, t) => `<button class="azione ${sezione === k ? "" : "grigia"}" data-az="sez" data-s="${k}">${t}</button>`;
  $("#vista").innerHTML = `<div class="bottoniera nostampa" style="margin:0 0 14px">${tab("piano90", "Piano a 90 giorni")}${tab("playbook", "Playbook")}${tab("conformita", "Conformita'")}</div>`
    + ({ piano90: vistaPiano90, playbook: vistaPlaybook, conformita: vistaConformita }[sezione])();
}
Object.assign(AZIONI, {
  sez: el => { sezione = el.dataset.s; render(); window.scrollTo({ top: 0 }); },
  p90: el => { const k = el.dataset.k90; S.piano90[k] = !S.piano90[k]; salva(); render(); },
  conf: el => { const k = el.dataset.cid; S.conformita[k] = !S.conformita[k]; salva(); render(); },
  addOptout: () => { const v = document.getElementById("ooVal").value.trim(); if (!v) return; S.optout.push({ id: uid(), valore: v, data: oggiISO() }); salva(); render(); },
  delOptout: el => { const id = el.dataset.id; S.optout = S.optout.filter(o => o.id !== id); salva(); render(); }
});
avviaPagina(render);
