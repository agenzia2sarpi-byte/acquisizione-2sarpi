/* Acquisizione 2 Sarpi — cruscotto, strumenti e riferimento. */

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
    ["Mandati firmati", sommaSettimana("mandati"), t.mandatiSett, nMandati, t.mandatiMese, "Il risultato"],
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
      <b>Agenzia 2 Sarpi</b> — Gaetano Romaniello · ${esc(S.telefono || "")}<br>
      Valutazione scritta di un immobile in questa via: gratuita, consegnata a mano entro 48 ore, senza impegno.
    </div>
  </div>`;
}

/* ---------------- vista: SCRIPT ---------------- */
function vistaScript() {
  const c = S.scriptCampi || (S.scriptCampi = { X: "", P: "", Y: "", Z: "", N: "", C: "1200", R: "", TEL: S.telefono });
  const sostituisci = t => t
    .replaceAll("[X]", c.X || "[via]").replaceAll("[P]", c.P || "[€/mq]").replaceAll("[Y]", c.Y || "[giorni]")
    .replaceAll("[Z]", c.Z || "[%]").replaceAll("[N]", c.N || "[nome]").replaceAll("[C]", c.C || "[canone]")
    .replaceAll("[R]", c.R || "[risparmio]").replaceAll("[TEL]", c.TEL || S.telefono || "[telefono]");

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

/* ---------------- vista: DATI E INSTALLAZIONE ---------------- */
function vistaDati() {
  return testa("Nessun account, nessuna password", "Dati e installazione",
    `Tutto vive dentro questo dispositivo. Per lavorare in due — tu e tuo padre, su quattro dispositivi — <b>esporta un file dal dispositivo che ha lavorato e importalo sull'altro scegliendo «unisci»</b>: le schede si fondono, la piu' recente vince. Il file si tiene nella cartella iCloud condivisa.`) + `

  <div class="scheda"><h3>Il tuo profilo</h3><div class="griglia g3">
    ${campo("Chi sta lavorando", `<select data-d="operatore">${opz(S.operatori, S.operatore)}</select>`)}
    ${campo("Telefono in calce ai materiali", `<input data-d="telefono" value="${esc(S.telefono)}">`)}
    ${campo("Nomi degli operatori (separati da virgola)", `<input data-d="operatoriTxt" value="${esc(S.operatori.join(", "))}">`)}
  </div></div>

  <div class="scheda"><h3>Copia di sicurezza e scambio fra dispositivi</h3>
    <div class="bottoniera">
      <button class="azione" data-az="esporta">Esporta un file</button>
      <button class="azione vuota" data-az="importaUnisci">Importa e unisci</button>
      <button class="azione grigia" data-az="importaSostituisci">Importa e sostituisci</button>
    </div>
    <p style="font-size:12.5px;color:var(--grigio);margin:10px 0 0">
      Ultimo salvataggio: ${S.aggiornato ? new Date(S.aggiornato).toLocaleString("it-IT") : "—"} ·
      ${S.lead.length} lead, ${S.mandati.length} mandati, ${S.rete.length} contatti di rete, ${S.gestione.length} immobili in gestione, ${S.attivita.length} giornate registrate.
    </p>
    <div class="avviso" style="margin-top:12px"><b>Regola di igiene</b>Esporta una copia ogni venerdi', quando aggiorni il cruscotto, e tienila nella cartella condivisa su iCloud. Svuotare la cronologia del browser cancella i dati di questa applicazione: la copia e' l'unica rete di sicurezza.</div>
    <div class="bottoniera"><button class="azione grigia" data-az="azzeraTutto">Azzera tutti i dati</button></div>
  </div>

  <div class="scheda"><h3>Metterla sull'iPhone <span class="etichetta">icona sulla schermata Home</span></h3>
    <ol style="font-family:var(--serif);font-size:14.5px;padding-left:20px;line-height:1.7">
      <li>Apri questo indirizzo <b>con Safari</b> (non Chrome: solo Safari puo' aggiungere alla Home).</li>
      <li>Tocca il tasto <b>Condividi</b> in basso — il quadrato con la freccia.</li>
      <li>Scorri e scegli <b>«Aggiungi a Home»</b>.</li>
      <li>Il nome proposto e' gia' <b>2S Acquisizione</b> e l'icona rossa e' gia' quella giusta. Tocca <b>Aggiungi</b>.</li>
    </ol>
    <p style="font-size:13px;color:var(--grigio)">Da quel momento si apre a tutto schermo, senza barra del browser, come un'applicazione. Stessa procedura sull'iPhone di tuo padre.</p>
  </div>

  <div class="scheda"><h3>Metterla sul Dock del MacBook</h3>
    <ol style="font-family:var(--serif);font-size:14.5px;padding-left:20px;line-height:1.7">
      <li>Apri l'indirizzo <b>con Safari</b>.</li>
      <li>Menu <b>File → Aggiungi al Dock…</b> (su macOS Sonoma e successivi).</li>
      <li>Conferma: l'icona rossa <b>2S</b> compare nel Dock e resta li'. Trascinala dove vuoi.</li>
    </ol>
    <p style="font-size:13px;color:var(--grigio)">In alternativa, nella cartella del progetto trovi <b>Acquisizione 2 Sarpi.app</b>: trascinala nel Dock e apre direttamente questa pagina.</p>
  </div>

  <div class="scheda"><h3>Cosa costa questo sistema</h3>
    <table><tbody>
      <tr><td>Applicazione, icone, hosting</td><td class="num"><b>0 €</b></td></tr>
      <tr><td>Account, licenze, abbonamenti</td><td class="num"><b>0 €</b></td></tr>
      <tr><td>Manutenzione</td><td class="num"><b>0 €</b></td></tr>
    </tbody></table>
    <p style="font-size:13px;color:var(--grigio);margin-top:8px">Il budget del piano (${eur(T().budget)}/mese) e' interamente marketing e strumenti operativi: nessun euro se ne va in questa infrastruttura.</p>
  </div>`;
}

/* ---------------- input delle viste ---------------- */
function suInput(ev) {
  const t = ev.target;
  if (t.dataset.s) { S.scriptCampi[t.dataset.s] = t.value; if (t.dataset.s === "TEL") S.telefono = t.value; salva(); aggiornaScript(); }
  if (t.dataset.r) {
    const k = t.dataset.r;
    if (k.startsWith("c")) { const [ci, campo] = k.split("."); S.rapporto.comparabili[+ci[1]][campo] = t.value; }
    else S.rapporto[k] = t.value;
    salva();
  }
  if (t.id === "spesaMese") { S.spesa[oggiISO().slice(0, 7)] = t.value; salva(); }
  if (t.dataset.d) {
    if (t.dataset.d === "operatoriTxt") { S.operatori = t.value.split(",").map(x => x.trim()).filter(Boolean); $("#selOperatore").innerHTML = opz(S.operatori, S.operatore); }
    else { S[t.dataset.d] = t.value; if (t.dataset.d === "operatore") $("#selOperatore").value = t.value; }
    salva();
  }
}
function aggiornaScript() {
  const c = S.scriptCampi;
  const sost = t => t.replaceAll("[X]", c.X || "[via]").replaceAll("[P]", c.P || "[€/mq]").replaceAll("[Y]", c.Y || "[giorni]")
    .replaceAll("[Z]", c.Z || "[%]").replaceAll("[N]", c.N || "[nome]").replaceAll("[C]", c.C || "[canone]")
    .replaceAll("[R]", c.R || "[risparmio]").replaceAll("[TEL]", c.TEL || "[telefono]");
  SCRIPT.forEach(s => { const el = document.getElementById("sc-" + s.id); if (el) el.textContent = sost(s.x); });
}
/* L'anteprima del foglio si aggiorna quando esci da un campo, per non perdere il cursore mentre scrivi. */
document.addEventListener("change", ev => {
  if (ev.target.dataset && ev.target.dataset.r && vista === "rapporto") {
    const sc = window.scrollY; render(); window.scrollTo(0, sc);
  }
});

/* ---------------- azioni delle viste ---------------- */
window.AZIONI_EXTRA = Object.assign(window.AZIONI_EXTRA || {}, {
  copia: el => {
    const n = document.getElementById(el.dataset.t);
    const testo = n ? n.textContent : "";
    const fallback = () => {
      const a = document.createElement("textarea"); a.value = testo; document.body.appendChild(a); a.select();
      try { document.execCommand("copy"); } catch (e) { }
      a.remove(); alert("Copiato negli appunti.");
    };
    if (navigator.clipboard) navigator.clipboard.writeText(testo).then(() => alert("Copiato negli appunti."), fallback);
    else fallback();
  },
  p90: el => { const k = el.dataset.k90; S.piano90[k] = !S.piano90[k]; salva(); render(); },
  conf: el => { const k = el.dataset.cid; S.conformita[k] = !S.conformita[k]; salva(); render(); },
  piuRecensione: () => { (S.recensioni = S.recensioni || []).push({ id: uid(), data: oggiISO() }); salva(); render(); },
  addOptout: () => {
    const v = document.getElementById("ooVal").value.trim(); if (!v) return;
    S.optout.push({ id: uid(), valore: v, data: oggiISO() }); salva(); render();
  },
  delOptout: el => { const id = el.dataset.id; S.optout = S.optout.filter(o => o.id !== id); salva(); render(); },
  anteprima: () => render(),
  stampaRapporto: () => window.print(),
  esporta: () => {
    const b = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `acquisizione-2sarpi-${oggiISO()}-${(S.operatore || "").replace(/\W/g, "")}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  importaUnisci: () => scegliFile(true),
  importaSostituisci: () => scegliFile(false),
  azzeraTutto: () => {
    if (!confirm("Cancella tutti i dati di questo dispositivo. Hai esportato una copia?")) return;
    if (!confirm("Confermi definitivamente?")) return;
    S = JSON.parse(JSON.stringify(VUOTO)); salva(); avvia();
  }
});

function scegliFile(unisci) {
  const i = document.createElement("input"); i.type = "file"; i.accept = ".json,application/json";
  i.onchange = () => {
    const f = i.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let d; try { d = JSON.parse(r.result); } catch (e) { return alert("File non leggibile."); }
      if (!d || !Array.isArray(d.lead)) return alert("Non sembra un file di questa applicazione.");
      if (!unisci) { S = Object.assign(JSON.parse(JSON.stringify(VUOTO)), d); }
      else {
        ["lead", "mandati", "rete", "gestione", "optout", "recensioni"].forEach(k => {
          const mappa = new Map((S[k] || []).map(x => [x.id, x]));
          (d[k] || []).forEach(x => mappa.set(x.id, Object.assign(mappa.get(x.id) || {}, x)));
          S[k] = [...mappa.values()];
        });
        const ma = new Map((S.attivita || []).map(x => [x.data, x]));
        (d.attivita || []).forEach(x => {
          const e = ma.get(x.data);
          if (!e) ma.set(x.data, x);
          else CONTATORI.forEach(c => e[c.k] = Math.max(num(e[c.k]), num(x[c.k])));
        });
        S.attivita = [...ma.values()];
        Object.assign(S.conformita, d.conformita || {});
        Object.assign(S.piano90, d.piano90 || {});
        Object.assign(S.spesa, d.spesa || {});
      }
      salva(); avvia();
      alert(unisci ? "Dati uniti." : "Dati sostituiti.");
    };
    r.readAsText(f);
  };
  i.click();
}
