/* Pagina Amministratori e condomini — il censimento per via e civico, raggruppato per amministratore,
   con il calcolo di quanto vale davvero ciascuna relazione. */

const ASSOCIAZIONI = ["ANACI", "ANAMMI", "UNAI", "Confedilizia / ARAI", "ALAC", "Nessuna / non nota"];
const FONTI_CENSIMENTO = ["Targa nell'androne", "Annuncio immobiliare", "Assemblea", "Elenco associativo", "Visura / registro imprese", "Segnalazione", "Altro"];
const RELAZIONE = ["Da contattare", "Primo contatto fatto", "Primo dato consegnato", "Secondo dato consegnato", "Terzo dato consegnato", "Reciprocita' attiva", "Chiusa"];

/* Parametri economici — ordini di grandezza da tarare sui tuoi numeri reali. */
const PAR = () => Object.assign({
  provVendita: 11100,     // provvigione media su una compravendita in fascia media (70 mq, 3%)
  canoneMedio: 1200,      // canone medio mensile
  rotVendita: 2.0,        // % di unita' che cambiano proprietario in un anno
  rotLocazione: 6.0,      // % di unita' che cambiano inquilino in un anno
  intercetto: 25,         // % di quelle operazioni che riesci davvero a intercettare con una relazione viva
  quotaGestione: 8        // % del canone annuo per la gestione ricorrente
}, S.parCondomini || {});

function provLocazione(p) { return p.canoneMedio * 12 * 0.10 + p.canoneMedio * 12 * (p.quotaGestione / 100); }

function valoreAmministratore(unita, p) {
  p = p || PAR();
  const venditeAnno = unita * p.rotVendita / 100;
  const locazioniAnno = unita * p.rotLocazione / 100;
  const q = p.intercetto / 100;
  return {
    unita, venditeAnno, locazioniAnno,
    venditeIntercettate: venditeAnno * q, locazioniIntercettate: locazioniAnno * q,
    ricaviVendita: venditeAnno * q * p.provVendita,
    ricaviLocazione: locazioniAnno * q * provLocazione(p),
    get totale() { return this.ricaviVendita + this.ricaviLocazione; }
  };
}

function condominiDi(idAmm) { return S.condomini.filter(c => c.amministratoreId === idAmm); }
function unitaDi(idAmm) { return condominiDi(idAmm).reduce((s, c) => s + num(c.unita), 0); }
function municipiDi(idAmm) { return [...new Set(condominiDi(idAmm).map(c => c.municipio).filter(Boolean))]; }

/* Candidati: ogni via+civico che compare negli annunci e non e' ancora censito. */
function candidatiDaAnnunci() {
  const visti = new Set(S.condomini.map(c => (viaSenzaCivico(c.via) + "|" + (c.civico || "")).trim()));
  const mappa = {};
  S.annunci.forEach(a => {
    const v = viaSenzaCivico(a.via), civ = a.civico || estraiCivico(a.via);
    if (!v) return;
    const k = (v + "|" + civ).trim();
    if (visti.has(k)) return;
    if (!mappa[k]) mappa[k] = { via: (a.via || "").replace(/\s+/g, " ").trim(), civico: civ, municipio: a.municipio, quartiere: a.quartiere, n: 0 };
    mappa[k].n++;
  });
  return Object.values(mappa).sort((a, b) => b.n - a.n);
}

function render() {
  const p = PAR();
  const amm = S.amministratori.slice().sort((a, b) => unitaDi(b.id) - unitaDi(a.id));
  const unitaTot = S.condomini.reduce((s, c) => s + num(c.unita), 0);
  const valoreTot = valoreAmministratore(unitaTot, p);
  const municipiCoperti = [...new Set(S.condomini.map(c => c.municipio).filter(Boolean))].length;
  const candidati = candidatiDaAnnunci();

  $("#vista").innerHTML = testa("Il moltiplicatore piu' forte", "Amministratori e condomini",
    `Un solo amministratore gestisce 40-80 stabili <b>sparsi su piu' zone</b>, e sa tutto: chi ha ereditato, chi e' moroso, chi ha lasciato sfitto, chi litiga per una divisione. Con sei amministratori ben coltivati copri piu' unita', e in piu' quadranti di Milano, di quante ne raggiungerebbe mille euro di pubblicita'. Questa pagina serve a sapere <b>quanto vale ciascuno</b> prima di decidere quanto tempo dedicargli.`) + `

  <div class="griglia g4" style="margin:0 0 14px">
    <div class="dato"><div class="titolo">Amministratori censiti</div><div class="valore">${amm.length}</div><div class="sotto">obiettivo dal piano: 6 coltivati</div></div>
    <div class="dato"><div class="titolo">Condomini mappati</div><div class="valore">${S.condomini.length}</div><div class="sotto">${unitaTot} unita' totali</div></div>
    <div class="dato ${municipiCoperti >= 4 ? "verde" : "ambra"}"><div class="titolo">Municipi coperti</div><div class="valore">${municipiCoperti} / 9</div><div class="sotto">la rete deve essere distribuita</div></div>
    <div class="dato verde"><div class="titolo">Valore atteso annuo</div><div class="valore">${eur(valoreTot.totale)}</div><div class="sotto">su tutto il parco censito</div></div>
  </div>

  <div class="scheda nostampa"><div class="bottoniera" style="margin:0">
    <button class="azione" data-az="cercaAmministratori">Cerca amministratori a Milano</button>
    <button class="azione vuota" data-az="nuovoAmm">+ Amministratore</button>
    <button class="azione vuota" data-az="nuovoCondominio">+ Condominio</button>
    ${candidati.length ? `<button class="azione grigia" data-az="daAnnunci">Prendi ${candidati.length} indirizzi dagli annunci</button>` : ""}
    <button class="azione grigia" data-az="parametri">Parametri del calcolo</button>
    <button class="azione grigia" data-az="aggiornaAmm">Aggiorna dal radar</button>
    <button class="azione grigia" data-az="esportaCensimento">Esporta</button>
  </div></div>

  ${amm.length ? amm.map(a => schedaAmministratore(a, p)).join("") : `<div class="scheda">
    <h3>Il censimento e' vuoto — da dove si parte</h3>
    <p style="font-family:var(--serif);font-size:14.5px">Non esiste in Italia un registro pubblico dei condomini con il nome dell'amministratore: nessuno lo puo' scaricare, e chi promette di farlo sta vendendo un elenco copiato. Si costruisce, e si costruisce in fretta se lo fai mentre lavori. Sono cinque fonti, in ordine di resa:</p>
    <table><tbody>
      <tr><td><b>1. Le targhe negli androni</b></td><td>La fonte piu' ricca e piu' trascurata. Ogni volta che fai un sopralluogo o una visita, fotografi la targa: nome dello studio, telefono, spesso la PEC. Dieci minuti in piu' per uscita, e in tre mesi hai una mappa che nessun concorrente ha.</td></tr>
      <tr><td><b>2. Gli elenchi delle associazioni</b></td><td>ANACI, ANAMMI, UNAI, Confedilizia pubblicano gli iscritti per provincia. Sono dati professionali pubblici: ti danno il nome dello studio e i recapiti, non i condomini. Il collegamento stabile-amministratore lo aggiungi tu.</td></tr>
      <tr><td><b>3. Gli annunci del radar</b></td><td>Ogni annuncio ti regala una via e un civico. Il tasto qui sopra li porta dentro come condomini candidati: ti resta solo da attribuire l'amministratore.</td></tr>
      <tr><td><b>4. Le assemblee</b></td><td>Quando ti invitano a dare un parere immobiliare, esci con il nome dell'amministratore, il numero di unita' e spesso due o tre situazioni gia' mature.</td></tr>
      <tr><td><b>5. Visure e registro imprese</b></td><td>Per risalire a partita IVA, PEC e sede di uno studio che hai gia' individuato.</td></tr>
    </tbody></table>
    <div class="avviso" style="margin-top:12px"><b>Regola di igiene sui dati</b>Registri qui recapiti professionali di studi, non dati di persone fisiche private. Vale comunque l'informativa e vale l'opt-out: se uno studio ti chiede di non essere piu' contattato, finisce nella lista «non contattare» e sparisce da qui.</div>
  </div>`}

  <div class="scheda"><h3>Quanto vale una segnalazione, e come si riconosce</h3>
    <div class="griglia g3">
      <div class="dato"><div class="titolo">Una compravendita intercettata</div><div class="valore">${eur(p.provVendita)}</div><div class="sotto">provvigione media in fascia media</div></div>
      <div class="dato"><div class="titolo">Una locazione intercettata</div><div class="valore">${eur(provLocazione(p))}</div><div class="sotto">intermediazione + gestione, primo anno</div></div>
      <div class="dato"><div class="titolo">Ogni anno successivo</div><div class="valore">${eur(p.canoneMedio * 12 * p.quotaGestione / 100)}</div><div class="sotto">solo gestione ricorrente</div></div>
    </div>
    <p style="font-family:var(--serif);font-size:14.5px;margin-top:12px">Questi sono i numeri che devi avere in testa quando decidi quanto tempo e quanto valore mettere dentro una relazione. <b>Un amministratore da 60 unita' vale, in valore atteso, ${eur(valoreAmministratore(60, p).totale)} l'anno</b>: giustifica ampiamente un caffe' al mese, un Rapporto di Via personalizzato ogni mese e una valutazione gratuita quando serve.</p>
    <div class="avviso rosso"><b>Il punto legale, da non sbagliare</b>
      In Italia il diritto alla provvigione di mediazione spetta <b>solo a chi e' regolarmente iscritto</b>. Pagare una percentuale di provvigione a un segnalatore non abilitato e' prassi diffusa ma giuridicamente esposta: puo' compromettere il tuo stesso diritto alla provvigione nei confronti del cliente, oltre a creare problemi fiscali. Vale anche — e soprattutto — con gli amministratori di condominio, che hanno per di piu' obblighi propri verso i condomini.
      <br><br>La strada solida e' quella del piano: <b>reciprocita' e servizi resi, non percentuali</b>. Se in un caso specifico vuoi comunque prevedere un compenso, deve essere il corrispettivo di un servizio reale, distinto dalla mediazione, regolato da un contratto scritto e fatturato — e lo schema va fatto scrivere dal tuo consulente <i>prima</i> di partire, non dopo la prima segnalazione.
    </div>
    <h4 style="margin-top:14px;font-size:14px">Cosa consegni al posto di una percentuale</h4>
    <table><tbody>
      <tr><td><b>Rapporto di Via con la sua intestazione</b></td><td>Ogni mese, gratis, da girare ai suoi condomini a suo nome. Costo per te: una manciata di copie. Valore per lui: fa bella figura con chi lo paga. <b>E' la mossa singola piu' efficace di tutta la rete.</b></td></tr>
      <tr><td><b>Valutazione gratuita per un suo assistito</b></td><td>Scritta, consegnata a mano entro 48 ore. Gli risolve una richiesta che riceve di continuo e non sa dove mandare.</td></tr>
      <tr><td><b>Presenza a un'assemblea</b></td><td>Quando serve un parere immobiliare — una divisione, una stima, una vendita contestata. Gratuita, e ti mette in una stanza con quaranta proprietari.</td></tr>
      <tr><td><b>Un cliente che mandi tu</b></td><td>Un proprietario che cerca un amministratore serio. E' l'unica moneta che vale davvero, ed e' perfettamente lecita.</td></tr>
    </tbody></table>
  </div>`;
}

function schedaAmministratore(a, p) {
  const cond = condominiDi(a.id), u = unitaDi(a.id), v = valoreAmministratore(u, p), mun = municipiDi(a.id);
  const passi = num(a.passi);
  return `<div class="scheda">
    <h3><span data-az="apriAmm" data-id="${a.id}" style="cursor:pointer;text-decoration:underline;text-decoration-color:var(--linea)">${esc(a.nome || "(senza nome)")}</span>
      ${a.associazione ? `<span class="tag blu">${esc(a.associazione)}</span>` : ""}
      <span class="etichetta">${cond.length} condomini · ${u} unita' · ${mun.length} municipi</span></h3>
    <div class="griglia g4" style="margin:0 0 10px">
      <div class="dato"><div class="titolo">Valore atteso annuo</div><div class="valore">${eur(v.totale)}</div>
        <div class="sotto">${v.venditeIntercettate.toFixed(1)} vendite + ${v.locazioniIntercettate.toFixed(1)} locazioni</div></div>
      <div class="dato"><div class="titolo">Operazioni nel parco</div><div class="valore">${(v.venditeAnno + v.locazioniAnno).toFixed(1)}</div><div class="sotto">all'anno, prima di intercettarle</div></div>
      <div class="dato ${passi >= 3 ? "verde" : "ambra"}"><div class="titolo">Dai per primo</div><div class="valore">${passi} / 3</div>
        <div class="sotto">${passi >= 3 ? "puoi chiedere" : "non chiedere ancora"}</div></div>
      <div class="dato"><div class="titolo">Relazione</div><div class="valore" style="font-size:14px;font-weight:700;line-height:1.3;padding-top:6px">${esc(a.relazione || "Da contattare")}</div></div>
    </div>
    <div style="font-size:12.5px;color:var(--grigio);margin:0 0 8px">
      ${[a.referente, a.telefono, a.email, mun.join(", ")].filter(Boolean).map(esc).join(" · ") || "nessun recapito registrato"}
    </div>
    ${cond.length ? `<div class="tabellone"><table>
      <thead><tr><th>Via e civico</th><th>Quartiere</th><th>Municipio</th><th class="num">Unita'</th><th>Fonte</th><th></th></tr></thead>
      <tbody>${cond.map(c => `<tr>
        <td><b>${esc(c.via)}${c.civico ? " " + esc(c.civico) : ""}</b></td>
        <td><small>${esc(c.quartiere || "—")}</small></td><td><small>${esc(c.municipio || "—")}</small></td>
        <td class="num">${c.unita || "—"}</td><td><small>${esc(c.fonte || "—")}</small></td>
        <td><a href="#" data-az="apriCond" data-id="${c.id}">modifica</a></td></tr>`).join("")}</tbody>
    </table></div>` : `<p style="font-size:13px;color:var(--grigio)">Nessun condominio collegato. Aggiungine uno per far comparire il valore reale della relazione.</p>`}
    <div class="bottoniera nostampa">
      <button class="azione vuota" data-az="condPer" data-id="${a.id}">+ Condominio a questo amministratore</button>
      <button class="azione grigia" data-az="passoAvanti" data-id="${a.id}">Registra un «dato per primo»</button>
    </div>
  </div>`;
}

/* ---------------- moduli ---------------- */
function apriAmm(id) {
  const a = id ? S.amministratori.find(x => x.id === id) : { id: uid(), relazione: "Da contattare", passi: 0 };
  apriFinestra(id ? "Amministratore" : "Nuovo amministratore", `<div class="griglia g2">
    ${campo("Studio o nome", inp("nome", a.nome))}
    ${campo("Referente", inp("referente", a.referente))}
    ${campo("Telefono", inp("telefono", a.telefono, "tel"))}
    ${campo("Email", inp("email", a.email, "email"))}
    ${campo("PEC", inp("pec", a.pec))}
    ${campo("Associazione", sel("associazione", ASSOCIAZIONI, a.associazione))}
    ${campo("Stato della relazione", `<select data-k="relazione">${opz(RELAZIONE, a.relazione || "Da contattare")}</select>`)}
    ${campo("«Dati per primo» consegnati (0-3)", inp("passi", a.passi, "number"))}
    ${campo("Prossimo contatto", inp("prossimo", a.prossimo, "date"))}
  </div>${campo("Note", `<textarea data-k="note">${esc(a.note || "")}</textarea>`)}
  ${id ? `<div class="bottoniera"><button class="azione grigia" data-az="eliminaAmm" data-id="${a.id}">Elimina</button></div>` : ""}`,
    () => {
      Object.assign(a, raccogli());
      if (!id) S.amministratori.push(a);
      salva(); chiudiFinestra(); render();
    });
}
function apriCond(id, idAmm, pre) {
  const c = id ? S.condomini.find(x => x.id === id) : Object.assign({ id: uid(), amministratoreId: idAmm || "", fonte: "Targa nell'androne" }, pre || {});
  apriFinestra(id ? "Condominio" : "Nuovo condominio", `<div class="griglia g2">
    ${campo("Via", inp("via", c.via))}
    ${campo("Civico", inp("civico", c.civico))}
    ${campo("Quartiere", inp("quartiere", c.quartiere))}
    ${campo("Municipio", sel("municipio", MUNICIPI, c.municipio))}
    ${campo("Numero di unita'", inp("unita", c.unita, "number"))}
    ${campo("Amministratore", `<select data-k="amministratoreId"><option value="">— non attribuito —</option>${S.amministratori.map(a => `<option value="${a.id}"${c.amministratoreId === a.id ? " selected" : ""}>${esc(a.nome)}</option>`).join("")}</select>`)}
    ${campo("Fonte del dato", sel("fonte", FONTI_CENSIMENTO, c.fonte))}
    ${campo("Rilevato il", inp("rilevato", c.rilevato || oggiISO(), "date"))}
  </div>${campo("Note", `<textarea data-k="note">${esc(c.note || "")}</textarea>`)}
  ${id ? `<div class="bottoniera"><button class="azione grigia" data-az="eliminaCond" data-id="${c.id}">Elimina</button></div>` : ""}`,
    () => {
      Object.assign(c, raccogli());
      if (!id) S.condomini.push(c);
      salva(); chiudiFinestra(); render();
    });
}

Object.assign(AZIONI, {
  aggiornaAmm: async () => { await aggiornaAmministratoriDalFeed(false); render(); },
  nuovoAmm: () => apriAmm(null),
  apriAmm: el => apriAmm(el.dataset.id),
  eliminaAmm: el => {
    if (!confirm("Eliminare l'amministratore? I condomini collegati restano, senza attribuzione.")) return;
    const id = el.dataset.id;
    S.condomini.forEach(c => { if (c.amministratoreId === id) c.amministratoreId = ""; });
    S.amministratori = S.amministratori.filter(x => x.id !== id);
    salva(); chiudiFinestra(); render();
  },
  nuovoCondominio: () => apriCond(null),
  apriCond: el => apriCond(el.dataset.id),
  condPer: el => apriCond(null, el.dataset.id),
  eliminaCond: el => { S.condomini = S.condomini.filter(x => x.id !== el.dataset.id); salva(); chiudiFinestra(); render(); },
  passoAvanti: el => {
    const a = S.amministratori.find(x => x.id === el.dataset.id);
    a.passi = Math.min(3, num(a.passi) + 1);
    a.relazione = ["Primo contatto fatto", "Primo dato consegnato", "Secondo dato consegnato", "Terzo dato consegnato"][a.passi] || a.relazione;
    if (a.passi >= 3) a.relazione = "Reciprocita' attiva";
    const att = attivitaDi(oggiISO()); att.fisici = num(att.fisici) + 1;
    salva(); render();
  },
  daAnnunci: () => {
    const c = candidatiDaAnnunci();
    apriFinestra("Indirizzi trovati negli annunci", `
      <p style="font-family:var(--serif);font-size:14.5px">Ogni annuncio del radar ti regala una via e un civico. Questi ${c.length} indirizzi non sono ancora nel censimento. Portarli dentro non costa niente: l'attribuzione all'amministratore la fai quando la scopri.</p>
      <div class="tabellone" style="max-height:340px;overflow:auto"><table>
        <thead><tr><th>Indirizzo</th><th>Municipio</th><th class="num">Annunci</th></tr></thead>
        <tbody>${c.slice(0, 200).map(x => `<tr><td>${esc(x.via)}</td><td><small>${esc(x.municipio || "—")}</small></td><td class="num">${x.n}</td></tr>`).join("")}</tbody>
      </table></div>`,
      () => {
        c.forEach(x => S.condomini.push({
          id: uid(), via: x.via.replace(/,?\s*\d+[a-zA-Z]?\s*$/, "").trim(), civico: x.civico,
          quartiere: x.quartiere, municipio: x.municipio, amministratoreId: "",
          fonte: "Annuncio immobiliare", rilevato: oggiISO(), unita: ""
        }));
        salva(); chiudiFinestra(); render();
      }, `Aggiungi tutti (${c.length})`);
  },
  parametri: () => {
    const p = PAR();
    apriFinestra("Parametri del calcolo", `
      <p style="font-family:var(--serif);font-size:14.5px">Sono ordini di grandezza per ragionare, non verita'. Sostituiscili con i tuoi numeri reali appena li hai: le percentuali di rotazione, in particolare, cambiano molto fra centro e periferia.</p>
      <div class="griglia g2">
        ${campo("Provvigione media su una compravendita (€)", inp("provVendita", p.provVendita, "number"))}
        ${campo("Canone medio mensile (€)", inp("canoneMedio", p.canoneMedio, "number"))}
        ${campo("Quota di gestione locativa (%)", inp("quotaGestione", p.quotaGestione, "number"))}
        ${campo("Unita' che si vendono in un anno (%)", inp("rotVendita", p.rotVendita, "number", 'step="0.1"'))}
        ${campo("Unita' che cambiano inquilino in un anno (%)", inp("rotLocazione", p.rotLocazione, "number", 'step="0.1"'))}
        ${campo("Quota che riesci a intercettare (%)", inp("intercetto", p.intercetto, "number"))}
      </div>`,
      () => { const d = raccogli(); S.parCondomini = {}; Object.keys(d).forEach(k => S.parCondomini[k] = num(d[k])); salva(); chiudiFinestra(); render(); });
  },
  esportaCensimento: () => {
    const righe = [["amministratore", "referente", "telefono", "email", "via", "civico", "quartiere", "municipio", "unita", "fonte"]];
    S.condomini.forEach(c => {
      const a = S.amministratori.find(x => x.id === c.amministratoreId) || {};
      righe.push([a.nome || "", a.referente || "", a.telefono || "", a.email || "", c.via || "", c.civico || "", c.quartiere || "", c.municipio || "", c.unita || "", c.fonte || ""]);
    });
    const csv = righe.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const b = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `censimento-condomini-${oggiISO()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
});

avviaPagina(render);
aggiornaAmministratoriDalFeed(true).then(e => { if (e && (e.nuovi || e.aggiornati)) render(); });

/* ---------------- raccolta automatica degli amministratori ---------------- */
Object.assign(AZIONI, {
  cercaAmministratori: () => {
    if (!tokenApify()) return apriFinestra("Serve la chiave Apify",
      `<p style="font-family:var(--serif);font-size:14.5px">Il censimento automatico degli studi di amministrazione passa da Apify. Serve una chiave, si crea una volta sola e si incolla nella pagina <b>Dati</b>.</p>
       <div class="bottoniera"><a class="azione" href="dati.html" style="text-decoration:none">Vai alla pagina Dati</a></div>`, null);
    apriFinestra("Cerca amministratori a Milano", `
      <p style="font-family:var(--serif);font-size:14.5px">Cerco gli studi di amministrazione condominiale zona per zona e ne prendo <b>nome, indirizzo, telefono e sito</b>. Sono schede pubbliche di attivita': dati d'impresa, non di persone. L'attribuzione dei singoli stabili resta il tuo lavoro sul campo — quella non e' pubblica per nessuno.</p>
      <div class="griglia g3">${ZONE_RICERCA.map((z, i) => `<label class="spunta" style="border:0;padding:3px 0"><input type="checkbox" data-zona="${esc(z)}" ${i < 6 ? "checked" : ""}><span class="testo">${esc(z)}</span></label>`).join("")}</div>
      ${campo("Quanti studi per zona", `<input type="number" id="perZona" value="12" min="3" max="60">`)}
      <div class="avviso"><b>Quanto costa</b>Circa 0,01 € per studio trovato, sul tuo credito Apify.</div>
      <div id="avanz2" style="font-family:var(--serif);font-size:14px;color:var(--grigio)"></div>`,
      async () => {
        const zone = [...document.querySelectorAll("[data-zona]")].filter(c => c.checked).map(c => c.dataset.zona);
        if (!zone.length) return alert("Non hai scelto nessuna zona.");
        const n = Math.max(3, Math.min(60, num($("#perZona").value) || 12));
        const av = $("#avanz2");
        document.querySelector("#finestra [data-az=conferma]").disabled = true;
        try {
          const e = await raccogliAmministratori(zone, n, m => av.textContent = m);
          chiudiFinestra(); render();
          alert(`Trovati ${e.nuovi} studi nuovi, ${e.aggiornati} aggiornati.`);
        } catch (err) { av.textContent = "Errore: " + err.message; }
        finally { const b = document.querySelector("#finestra [data-az=conferma]"); if (b) b.disabled = false; }
      }, "Cerca adesso");
  }
});
