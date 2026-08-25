/* Pagina Cruscotto — generata dal nucleo condiviso. */

/* ---------------- vista: CRUSCOTTO ---------------- */
function spesaMese() {
  const m = oggiISO().slice(0, 7);
  return S.spesa[m] !== undefined ? num(S.spesa[m]) : T().budget;
}
function vistaKpi() {
  const t = T(), m = oggiISO().slice(0, 7);
  const vM = sommaMese("valutazioni"), maM = sommaMese("mandati"), teM = sommaMese("tentativi"), coM = sommaMese("contatti");
  const mandatiMese = S.mandati.filter(x => (x.dataFirma || "").startsWith(m));
  const nMandati = Math.max(maM, mandatiMese.length);
  const spesa = spesaMese();
  const cpv = vM ? spesa / vM : 0, cpm = nMandati ? spesa / nMandati : 0;
  const tuttiMandati = S.mandati;
  const escl = tuttiMandati.length ? tuttiMandati.filter(x => x.esclusiva).length / tuttiMandati.length * 100 : 0;
  const daGrap = tuttiMandati.length ? tuttiMandati.filter(x => x.daGrappolo).length / tuttiMandati.length * 100 : 0;
  const municipi = new Set(tuttiMandati.map(x => x.municipio).filter(Boolean)).size;
  const gestMese = S.gestione.filter(g => (g.dataInizio || "").startsWith(m)).length;

  const righe = [
    ["Tentativi di contatto proprietario", sommaSettimana("tentativi"), t.tentativiSett, teM, t.tentativiMese, "L'unico numero davvero sotto il tuo controllo"],
    ["Contatti riusciti", sommaSettimana("contatti"), t.contattiSett, coM, t.contattiMese, "Misura la qualita' della lista, non lo sforzo"],
    ["Valutazioni fatte in casa", sommaSettimana("valutazioni"), t.valutazioniSett, vM, t.valutazioniMese, "Il vero motore: se cala, in 6 settimane cala il fatturato"],
    ["Mandati firmati", Math.max(sommaSettimana("mandati"), S.mandati.filter(x => (x.dataFirma || "") >= lunedi(oggiISO())).length), t.mandatiSett, nMandati, t.mandatiMese, "Il risultato"],
    ["Lettere scritte a mano", sommaSettimana("lettere"), Math.round(t.lettereMese / 4), sommaMese("lettere"), t.lettereMese, "L'unica voce che aumenta scendendo di budget"]
  ];
  if (t.contattiFisiciSett) righe.push(["Contatti fisici sul territorio", sommaSettimana("fisici"), t.contattiFisiciSett, sommaMese("fisici"), t.contattiFisiciSett * 4, "Il sostituto diretto del budget che non hai"]);

  const secchi = [
    ["Quota in esclusiva", escl.toFixed(0) + "%", semaforo(escl, 60), "> 60%", "Sotto il 50% stai lavorando per gli altri"],
    ["Costo per valutazione", eur(cpv), cpv ? semaforo(cpv, t.costoValutazione, true) : "a", "< " + eur(t.costoValutazione), `${eur(spesa)} / ${vM || 0} valutazioni`],
    ["Costo per mandato", eur(cpm), cpm ? semaforo(cpm, t.costoMandato, true) : "a", "< " + eur(t.costoMandato), "Contro 8.000-20.000 € di provvigione"],
    ["Mandati arrivati da un grappolo", daGrap.toFixed(0) + "%", semaforo(daGrap, 20), "20-35%", "Sotto il 15% stai lavorando male i 100 metri attorno alle trattative"],
    ["Municipi distinti con un mandato", municipi + " / 9", semaforo(municipi, t.municipi), "≥ " + t.municipi, "Misura se stai davvero coprendo Milano o se ti sei richiuso in un angolo"],
    ["Immobili in gestione, nuovi nel mese", gestMese, semaforo(gestMese, 2), "+2/mese", "La base ricorrente che finanzia la crescita"],
    ["Recensioni Google nuove nel mese", num((S.recensioni || []).filter(r => (r.data || "").startsWith(m)).length), semaforo((S.recensioni || []).filter(r => (r.data || "").startsWith(m)).length, 4), "+4/mese", "Composto: agisce sulla visibilita' per anni, gratis"]
  ];

  const salita = [
    [cpm > 0 && cpm < 250, "Costo per mandato sotto i 250 € (per due mesi consecutivi)"],
    [S.gestione.length >= 12, `Almeno 12 immobili in gestione locativa — ne hai ${S.gestione.length}`],
    [false, "Tempo di risposta ai lead stabilmente sotto i 5 minuti — verificalo con un test fatto da un amico"]
  ];

  return testa("Una sola schermata, ogni venerdi'", "Cruscotto",
    `<b>Se un indicatore resta rosso tre settimane cambi qualcosa; se resta rosso sei settimane chiudi quel canale e sposti il budget.</b> I due campi da cui dipende tutto sono <i>fonte di acquisizione</i> e <i>municipio</i> su ogni mandato: compilati senza eccezioni.`) + `

  <div class="scheda"><h3>Volume <span class="etichetta">piano ${esc(t.etichetta)}</span></h3><div class="tabellone"><table>
    <thead><tr><th>Indicatore</th><th class="num">Settimana</th><th class="num">Obiettivo</th><th class="num">Mese</th><th class="num">Obiettivo</th><th>Perche'</th></tr></thead>
    <tbody>${righe.map(r => {
      const s = semaforo(r[3], r[4]);
      return `<tr><td><span class="pallino ${s}"></span> ${esc(r[0])}</td>
      <td class="num"><b>${Math.round(r[1] * 10) / 10}</b></td><td class="num" style="color:var(--grigio)">${Math.round(r[2] * 10) / 10}</td>
      <td class="num"><b>${Math.round(r[3] * 10) / 10}</b></td><td class="num" style="color:var(--grigio)">${Math.round(r[4] * 10) / 10}</td>
      <td><small style="color:var(--grigio)">${esc(r[5])}</small></td></tr>`;
    }).join("")}</tbody></table></div></div>

  <div class="scheda"><h3>Qualita' ed efficienza</h3>
    <div class="griglia g3">${secchi.map(s => `<div class="dato ${s[2] === "v" ? "verde" : s[2] === "a" ? "ambra" : "rossa"}">
      <div class="titolo">${esc(s[0])}</div><div class="valore">${s[1]}</div>
      <div class="sotto">obiettivo ${esc(s[3])} — ${esc(s[4])}</div></div>`).join("")}</div>
    <div class="griglia g3" style="margin-top:12px">
      ${campo("Spesa effettiva del mese (€)", `<input type="number" id="spesaMese" value="${spesa}">`)}
      ${campo("Recensione Google ricevuta", `<button class="azione vuota" data-az="piuRecensione" style="margin-top:18px">+ 1 recensione</button>`)}
      ${campo("Totale recensioni", `<div style="font-size:23px;font-weight:800;margin-top:12px">${(S.recensioni || []).length} <span style="font-size:12px;color:var(--grigio);font-weight:400">obiettivo 50 in 12 mesi</span></div>`)}
    </div>
  </div>

  <div class="scheda"><h3>Da quali fonti arrivano davvero i mandati</h3>
    ${tuttiMandati.length ? (() => {
      const c = {}; tuttiMandati.forEach(x => { const k = x.fonte || "(non indicata)"; c[k] = (c[k] || 0) + 1; });
      const max = Math.max(...Object.values(c));
      return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
        <div style="margin:0 0 9px"><div style="display:flex;font-size:13px"><span>${esc(k)}</span><b style="margin-left:auto">${v}</b></div>
        <div class="barra"><i style="width:${v / max * 100}%"></i></div></div>`).join("");
    })() : `<div class="vuoto">Dopo 90 giorni saprai quali tre canali su dodici producono l'80% dei tuoi mandati. A quel punto la riallocazione non e' un'opinione, e' aritmetica.</div>`}
  </div>

  <div class="scheda"><h3>Sei pronto per salire a 1.000 €? <span class="etichetta">servono tutte e tre</span></h3>
    ${salita.map(([ok, t]) => `<div class="spunta"><span class="pallino ${ok ? "v" : "r"}" style="margin-top:6px"></span><div class="testo">${esc(t)}</div></div>`).join("")}
    <div class="avviso" style="margin-top:12px"><b>Ma il vero salto non e' il budget</b>E' la seconda persona. Un collaboratore a provvigione raddoppia le ore di contatto — che sono il vero vincolo di tutto il piano. Su un territorio grande come Milano il collo di bottiglia non sono mai gli euro: sono le telefonate che una persona sola riesce a fare in un giorno.</div>
  </div>

  <div class="scheda"><h3>Il budget del piano attivo <span class="etichetta">${eur(t.budget)}/mese · ${esc(t.canali)}</span></h3><div class="tabellone"><table>
    <thead><tr><th>Voce</th><th class="num">€/mese</th><th>Contenuto</th><th>Cosa deve produrre</th></tr></thead>
    <tbody>${t.voci.map(v => `<tr><td><b>${esc(v.v)}</b></td><td class="num">${v.e}</td><td><small>${esc(v.c)}</small></td><td><small style="color:var(--grigio)">${esc(v.p)}</small></td></tr>`).join("")}
    <tr><td><b>Totale</b></td><td class="num"><b>${t.budget}</b></td><td colspan="2"><small><b>Da tenere costante per almeno sei mesi. La costanza vale piu' dell'ottimizzazione.</b></small></td></tr></tbody>
  </table></div></div>`;
}

function render() {
  $("#vista").innerHTML = vistaKpi();
  const sp = document.getElementById("spesaMese");
  if (sp) sp.addEventListener("change", () => { S.spesa[oggiISO().slice(0, 7)] = sp.value; salva(); render(); });
}
Object.assign(AZIONI, {
  piuRecensione: () => { (S.recensioni = S.recensioni || []).push({ id: uid(), data: oggiISO() }); salva(); render(); }
});
avviaPagina(render);
