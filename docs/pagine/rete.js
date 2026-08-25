/* Pagina Rete dei venti — generata dal nucleo condiviso. */

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

function render() { $("#vista").innerHTML = vistaRete(); }
Object.assign(AZIONI, {
  nuovaRete: () => apriRete(null),
  apriRete: el => apriRete(el.dataset.id),
  eliminaRete: el => { if (confirm("Eliminare?")) { const id = el.dataset.id; S.rete = S.rete.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
  reteDato: el => { const r = S.rete.find(x => x.id === el.dataset.id); r.dati = r.dati || [false, false, false]; r.dati[el.dataset.i] = el.checked; salva(); },
  reteIncontro: el => { const r = S.rete.find(x => x.id === el.dataset.id); r.incontro = el.checked; salva(); render(); }
});
avviaPagina(render);
