/* Pagina Annunci — la vetrina del radar, con deduplica fra portali. */

let F = { q: "", tipo: "", portale: "", municipio: "", esito: "", chi: "privati", ordine: "punteggio", soloNuovi: false, soloTel: false, mostraSpariti: false, gruppo: "dafare" };

/* Tre stati che contano davvero, piu' il dettaglio fine nel menu «Esito». */
const GRUPPI = {
  dafare:   { t: "Da fare",    e: ["Da lavorare"] },
  incorso:  { t: "In corso",   e: ["Contattato", "In sequenza", "Appuntamento", "Valutazione fatta"] },
  chiusi:   { t: "Chiusi",     e: ["Mandato", "Scartato", "Non contattare"] },
  tutti:    { t: "Tutti",      e: null }
};
const statoDi = a => a.esito || "Da lavorare";
const gruppoDiEsito = e => Object.keys(GRUPPI).find(k => GRUPPI[k].e && GRUPPI[k].e.includes(e)) || "dafare";

function annunciFiltrati() {
  let l = S.annunci.slice();
  // gli immobili non piu' online non si chiamano: si guardano solo se li chiedi
  if (!F.mostraSpariti) l = l.filter(eOnline);
  if (F.chi === "privati") l = l.filter(a => a.privato !== false);
  if (F.chi === "agenzie") l = l.filter(a => a.privato === false);
  if (F.tipo) l = l.filter(a => a.tipo === F.tipo);
  if (F.portale) l = l.filter(a => a.portale === F.portale);
  if (F.municipio) l = l.filter(a => a.municipio === F.municipio);
  if (F.esito) l = l.filter(a => statoDi(a) === F.esito);
  if (F.gruppo && GRUPPI[F.gruppo] && GRUPPI[F.gruppo].e) l = l.filter(a => GRUPPI[F.gruppo].e.includes(statoDi(a)));
  if (F.soloNuovi) l = l.filter(a => (giorniDa(a.visto) ?? 99) <= 1);
  if (F.soloTel) l = l.filter(a => a.telefono);
  if (F.q) { const q = F.q.toLowerCase(); l = l.filter(a => (a.via + " " + a.titolo + " " + a.quartiere + " " + a.note + " " + a.descrizione).toLowerCase().includes(q)); }
  return l;
}
function gruppiOrdinati() {
  const g = raggruppaAnnunci(annunciFiltrati());
  g.forEach(x => { x.p = punteggioAnnuncio(x.capo, x); });
  const ord = {
    punteggio: (a, b) => b.p.punti - a.p.punti,
    giorni: (a, b) => b.giorniOnline - a.giorniOnline,
    prezzo: (a, b) => num(b.capo.prezzo) - num(a.capo.prezzo),
    recenti: (a, b) => (b.capo.visto || "").localeCompare(a.capo.visto || ""),
    portali: (a, b) => b.portali.length - a.portali.length
  }[F.ordine];
  return g.sort(ord);
}

function cartaAnnuncio(g) {
  const a = g.capo, p = g.p.punti;
  const emq = num(a.mq) ? Math.round(num(a.prezzo) / num(a.mq)) : null;
  const foto = a.foto
    ? `<img src="${esc(a.foto)}" alt="" loading="lazy" onerror="this.closest('.foto').classList.add('senza')">`
    : "";
  const rif = riferimentoEmq(a);
  const sc = rif && emq ? (emq - rif.valore) / rif.valore * 100 : null;
  const tel = (a.telefono || "").replace(/[^\d+]/g, "");
  const fr = freschezza(a);
  return `<div class="annuncio${GRUPPI.chiusi.e.includes(statoDi(a)) || !eOnline(a) ? " chiuso" : ""}">
    <div class="apri" data-az="apriScheda" data-id="${esc(a.id)}">
    <div class="foto${a.foto ? "" : " senza"}">${foto}
      <div class="segno"><b>${esc(a.tipologia || (num(a.locali) ? num(a.locali) + " locali" : "immobile"))}</b><span>${esc(a.quartiere || a.municipio || "Milano")}</span></div>
      <div class="angolo">
        ${eOnline(a) ? (a.privato !== false ? `<span class="badge privato">privato</span>` : `<span class="badge">agenzia</span>`)
                      : `<span class="badge sparito">non piu' online</span>`}
        ${g.portali.length > 1 ? `<span class="badge portali">${g.portali.length} portali</span>` : ""}
      </div>
      <div class="punti">${p}<small>PUNTI</small></div>
    </div>
    <div class="corpo">
      <div class="prezzo">${a.prezzo ? eur(num(a.prezzo)) : "prezzo non indicato"}${a.tipo === "Locazione" ? `<small> /mese</small>` : ""}
        ${emq ? `<small> · ${emq.toLocaleString("it-IT")} €/mq</small>` : ""}</div>
      <div class="indirizzo">${esc(a.via || a.titolo || "indirizzo non indicato")}</div>
      <div class="zona">${esc([a.quartiere, a.municipio].filter(Boolean).join(" · ") || "zona non indicata")}
        ${sc !== null ? ` · <b style="color:${sc > 8 ? "var(--ambra)" : "var(--grigio)"}">${sc > 0 ? "+" : ""}${sc.toFixed(0)}% vs zona</b>` : ""}</div>
      <div class="caratteristiche">
        ${a.mq ? `<span><b>${num(a.mq)}</b> mq</span>` : ""}
        ${a.locali ? `<span><b>${num(a.locali)}</b> locali</span>` : ""}
        ${a.piano ? `<span>piano <b>${esc(a.piano)}</b></span>` : ""}
        <span><b>${g.giorniOnline}</b> gg online</span>
        ${num(a.ribassi) ? `<span style="color:var(--ambra)"><b>${num(a.ribassi)}</b> ribassi</span>` : ""}
      </div>
      <div class="fonti">${g.portali.map(x => `<span class="chip-portale att">${esc(nomePortale(x))}</span>`).join("")}</div>
    </div>
    <div class="contatti-rapidi">
      ${tel ? `<a href="tel:${esc(tel)}" title="${esc(a.telefono)}">Chiama</a>
               <a class="verde" href="https://wa.me/${esc(waNumero(a.telefono))}" target="_blank" rel="noopener">WhatsApp</a>`
            : `<span class="senza-tel">telefono non pubblicato</span>`}
      ${a.url ? `<a class="vuoto" href="${esc(a.url)}" target="_blank" rel="noopener">Scrivi sul portale</a>` : ""}
      <button class="vuoto" data-az="copiaMsg" data-id="${esc(a.id)}">Copia messaggio</button>
    </div>
    <div class="corpo" style="padding-top:0">
      <div style="font-size:11px;color:${fr.cl === "verde" ? "var(--verde)" : fr.cl === "ambra" ? "var(--ambra)" : "var(--grigio)"}">${eOnline(a) ? esc(fr.t) : "sparito dal portale il " + dataIt(a.sparito)}</div>
      ${a.ultimoContatto ? `<div style="font-size:11.5px;color:var(--grigio)">ultimo passo: <b>${esc(statoDi(a))}</b> il ${dataIt(a.ultimoContatto)}${a.operatore ? " · " + esc(a.operatore) : ""}</div>` : ""}
      <div class="passi">
        <button data-az="passo" data-id="${a.id}" data-e="Da lavorare" class="${statoDi(a) === "Da lavorare" ? "att" : ""}">da fare</button>
        <button data-az="passo" data-id="${a.id}" data-e="Contattato" class="${statoDi(a) === "Contattato" ? "att v" : ""}">contattato</button>
        <button data-az="passo" data-id="${a.id}" data-e="Appuntamento" class="${statoDi(a) === "Appuntamento" ? "att v" : ""}">appuntam.</button>
        <button data-az="passo" data-id="${a.id}" data-e="Scartato" class="${statoDi(a) === "Scartato" ? "att r" : ""}">scarta</button>
      </div>
    </div>
  </div>`;
}

function render() {
  const gruppi = gruppiOrdinati();
  const tutti = S.annunci.length;
  const gTutti = raggruppaAnnunci(S.annunci);
  const doppioni = tutti - gTutti.length;
  const privati = S.annunci.filter(a => a.privato !== false).length;
  const daLavorare = gruppi.filter(g => (g.capo.esito || "Da lavorare") === "Da lavorare").length;

  $("#vista").innerHTML = testa("Livello 1 — copertura cittadina", "Annunci",
    `Ogni riga qui sotto e' <b>un immobile, non un annuncio</b>: lo stesso appartamento pubblicato su cinque portali resta una riga sola, con l'elenco dei portali dove compare. Il punteggio ordina la lista: <b>foto storte, testo scarno, prezzo sopra mercato e molti giorni online sono il lead migliore</b>, non il peggiore.`) + `

  <div class="griglia g4" style="margin:0 0 14px">
    <div class="dato"><div class="titolo">Immobili unici</div><div class="valore">${gTutti.length}</div><div class="sotto">da ${tutti} annunci raccolti</div></div>
    <div class="dato ${doppioni ? "verde" : ""}"><div class="titolo">Doppioni tolti</div><div class="valore">${doppioni}</div><div class="sotto">stesso immobile, piu' portali</div></div>
    <div class="dato"><div class="titolo">Da privato</div><div class="valore">${privati}</div><div class="sotto">${tutti ? Math.round(privati / tutti * 100) : 0}% del raccolto</div></div>
    <div class="dato"><div class="titolo">Non piu' online</div><div class="valore">${S.annunci.filter(a => !eOnline(a)).length}</div><div class="sotto">tolti dalle chiamate</div></div>
    <div class="dato"><div class="titolo">Con telefono</div><div class="valore">${S.annunci.filter(a => a.telefono).length}</div><div class="sotto">gli altri si contattano dal portale</div></div>
  </div>

  <div class="stati nostampa">${Object.entries(GRUPPI).map(([k, g]) => {
      const n = g.e ? S.annunci.filter(a => a.privato !== false && g.e.includes(statoDi(a))).length
                    : S.annunci.filter(a => a.privato !== false).length;
      return `<button data-az="gruppo" data-g="${k}" class="${F.gruppo === k ? "att" : ""}">${esc(g.t)} <b>${n}</b></button>`;
    }).join("")}</div>

  <div class="scheda nostampa">
    <div class="bottoniera" style="margin:0 0 12px">
      <button class="azione vuota" data-az="incolla">Incolla un annuncio</button>
      <button class="azione vuota" data-az="nuovoAnnuncio">Inserisci a mano</button>
      <button class="azione" data-az="aggiornaPortali">Aggiorna dai portali</button>
      <button class="azione grigia" data-az="aggiornaFeed">Aggiorna dal radar</button>
      <button class="azione grigia" data-az="importaFile">Importa file</button>
      <button class="azione grigia" data-az="esportaAnnunci">Esporta</button>
      <span class="conteggio">${S.feed.ultimaLettura ? "ultimo radar letto il " + new Date(S.feed.ultimaLettura).toLocaleString("it-IT") : "radar mai letto"}</span>
    </div>
    <div class="filtri">
      ${campo("Cerca", `<input type="search" id="fq" value="${esc(F.q)}" placeholder="via, quartiere, nota…">`)}
      ${campo("Chi pubblica", `<select id="fchi">${opz(["privati", "agenzie", "tutti"], F.chi)}</select>`)}
      ${campo("Tipo", `<select id="ftipo"><option value="">tutti</option>${opz(["Vendita", "Locazione"], F.tipo)}</select>`)}
      ${campo("Portale", `<select id="fportale"><option value="">tutti</option>${PORTALI.map(p => `<option value="${p.id}"${F.portale === p.id ? " selected" : ""}>${esc(p.n)}</option>`).join("")}</select>`)}
      ${campo("Municipio", `<select id="fmunicipio"><option value="">tutti</option>${opz(MUNICIPI, F.municipio)}</select>`)}
      ${campo("Esito", `<select id="fesito"><option value="">tutti</option>${opz(ESITI, F.esito)}</select>`)}
      ${campo("Ordina per", `<select id="fordine">${[["punteggio", "punteggio"], ["giorni", "giorni online"], ["portali", "numero di portali"], ["prezzo", "prezzo"], ["recenti", "visti di recente"]].map(([v, t]) => `<option value="${v}"${F.ordine === v ? " selected" : ""}>${t}</option>`).join("")}</select>`)}
    </div>
    <div class="bottoniera">
      <label style="display:flex;align-items:center;gap:7px;font-size:13px">
        <input type="checkbox" id="fnuovi" ${F.soloNuovi ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--rosso)"> solo novita' di oggi</label>
      <label style="display:flex;align-items:center;gap:7px;font-size:13px">
        <input type="checkbox" id="ftel" ${F.soloTel ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--rosso)"> solo con telefono</label>
      <label style="display:flex;align-items:center;gap:7px;font-size:13px">
        <input type="checkbox" id="fspar" ${F.mostraSpariti ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--grigio)"> mostra anche i spariti</label>
      <button class="azione grigia" data-az="azzeraFiltri">Azzera filtri</button>
      <span class="conteggio">${gruppi.length} immobili nel filtro</span>
    </div>
  </div>

  ${gruppi.length ? `<div class="vetrina">${gruppi.map(cartaAnnuncio).join("")}</div>`
      : tutti ? `<div class="vuoto">Nessun immobile con questi filtri.</div>`
        : `<div class="scheda"><h3>Il radar e' vuoto — ecco come si riempie</h3>
      <p style="font-family:var(--serif);font-size:14.5px">Quattro strade, tutte gratuite e tutte dentro i termini d'uso dei portali. La prima e' quella che userai il 90% delle volte.</p>
      <table><tbody>
      <tr><td><b>1. Il tasto «Prendi annuncio»</b></td><td>Un segnalibro nella barra del browser. Sei su un annuncio di qualsiasi portale, clicchi, e l'immobile finisce qui con foto, prezzo, metratura e recapito gia' compilati. Lo installi dalla pagina <a href="dati.html">Dati</a>: ci vogliono trenta secondi.</td></tr>
      <tr><td><b>2. Incolla un annuncio</b></td><td>Selezioni il testo dell'annuncio, lo incolli qui e i campi si compilano da soli. Funziona anche con Facebook Marketplace e con i gruppi, dove il segnalibro non arriva.</td></tr>
      <tr><td><b>3. Aggiorna dal radar</b></td><td>Le ricerche salvate dei portali ti mandano gli avvisi via email; il radar programmato li legge ogni mattina alle 7:00 e li deposita qui. Le istruzioni per attivarlo sono nella pagina <a href="dati.html">Dati</a>.</td></tr>
      <tr><td><b>4. Importa file</b></td><td>Un CSV o un JSON esportato da un gestionale, o il file di scambio con l'altro dispositivo.</td></tr>
      </tbody></table></div>`}`;

  ["fq", "fchi", "ftipo", "fportale", "fmunicipio", "fesito", "fordine", "fnuovi", "ftel", "fspar"].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener(el.type === "search" ? "input" : "change", () => {
      F = {
        q: $("#fq").value, chi: $("#fchi").value, tipo: $("#ftipo").value, portale: $("#fportale").value,
        municipio: $("#fmunicipio").value, esito: $("#fesito").value, ordine: $("#fordine").value, soloNuovi: $("#fnuovi").checked, soloTel: $("#ftel").checked, mostraSpariti: $("#fspar").checked, gruppo: F.gruppo
      };
      const pos = id === "fq" ? $("#fq").selectionStart : null;
      render();
      if (pos !== null) { const n = $("#fq"); n.focus(); n.setSelectionRange(pos, pos); }
    });
  });
}

/* ---------------- modulo annuncio ---------------- */
function moduloAnnuncio(a) {
  return `<div class="griglia g2">
    ${campo("Via e civico", inp("via", a.via))}
    ${campo("Quartiere", inp("quartiere", a.quartiere))}
    ${campo("Municipio", sel("municipio", MUNICIPI, a.municipio))}
    ${campo("Fascia di zona", sel("zona", ZONE.map(z => z.nome), a.zona))}
    ${campo("Tipo", `<select data-k="tipo">${opz(["Vendita", "Locazione"], a.tipo || "Vendita")}</select>`)}
    ${campo("Tipologia", sel("tipologia", TIPOLOGIE, a.tipologia))}
    ${campo("Prezzo o canone (€)", inp("prezzo", a.prezzo, "number"))}
    ${campo("Metratura (mq)", inp("mq", a.mq, "number"))}
    ${campo("Locali", inp("locali", a.locali, "number"))}
    ${campo("Bagni", inp("bagni", a.bagni, "number"))}
    ${campo("Piano", inp("piano", a.piano))}
    ${campo("Spese condominiali (€/mese)", inp("spese", a.spese, "number"))}
    ${campo("Classe energetica", inp("classeEnergetica", a.classeEnergetica))}
    ${campo("Stato", sel("statoImmobile", STATI_IMMOBILE, a.statoImmobile))}
    ${campo("Portale", `<select data-k="portale">${PORTALI.map(p => `<option value="${p.id}"${a.portale === p.id ? " selected" : ""}>${esc(p.n)}</option>`).join("")}</select>`)}
    ${campo("Riferimento annuncio", inp("riferimento", a.riferimento))}
    ${campo("Pubblicato il", inp("pubblicato", a.pubblicato || oggiISO(), "date"))}
    ${campo("Ribassi gia' applicati", inp("ribassi", a.ribassi, "number"))}
    ${campo("Telefono", inp("telefono", a.telefono, "tel"))}
    ${campo("Email", inp("email", a.email, "email"))}
    ${campo("Chi pubblica", `<select data-k="privato">${opz(["privato", "agenzia"], a.privato === false ? "agenzia" : "privato")}</select>`)}
    ${campo("Qualita' delle foto", `<select data-k="qualitaFoto">${opz(["", "buone", "medie", "scarse"], a.qualitaFoto)}</select>`)}
    ${campo("Cura del testo", `<select data-k="qualitaTesto">${opz(["", "curato", "medio", "scarno"], a.qualitaTesto)}</select>`)}
    ${campo("Esito", `<select data-k="esito">${opz(ESITI, a.esito || "Da lavorare")}</select>`)}
  </div>
  ${campo("Indirizzo dell'annuncio (URL)", inp("url", a.url, "url"))}
  ${campo("Foto di anteprima (URL)", inp("foto", a.foto, "url"))}
  ${campo("Descrizione", `<textarea data-k="descrizione">${esc(a.descrizione || "")}</textarea>`)}
  ${campo("Note tue", `<textarea data-k="note" style="min-height:60px">${esc(a.note || "")}</textarea>`)}`;
}
function apriAnnuncioForm(a, titolo) {
  apriFinestra(titolo || "Annuncio", moduloAnnuncio(a), () => {
    const d = raccogli();
    d.privato = d.privato !== "agenzia";
    const completo = normalizzaAnnuncio(Object.assign({}, a, d), a.origine || "manuale");
    completo.id = a.id || uid();
    const i = S.annunci.findIndex(x => x.id === completo.id);
    if (i >= 0) S.annunci[i] = Object.assign(S.annunci[i], completo); else S.annunci.push(completo);
    salva(); chiudiFinestra(); render();
  });
}

/* ---------------- azioni ---------------- */
Object.assign(AZIONI, {
  apriScheda: el => { location.href = "annuncio.html?id=" + encodeURIComponent(el.dataset.id); },
  copiaMsg: el => {
    const a = S.annunci.find(x => x.id === el.dataset.id); if (!a) return;
    copiaTesto(messaggioPortale(a), "Messaggio copiato. Ora apri l'annuncio e incollalo nel modulo del portale.");
  },
  gruppo: el => { F.gruppo = el.dataset.g; F.esito = ""; render(); window.scrollTo({ top: 0 }); },
  passo: el => {
    const a = S.annunci.find(x => x.id === el.dataset.id); if (!a) return;
    const nuovo = el.dataset.e;
    if (statoDi(a) === nuovo) return;
    a.esito = nuovo; a.ultimoContatto = oggiISO(); a.operatore = S.operatore;
    a.storicoEsiti = (a.storicoEsiti || []).concat([{ data: oggiISO(), esito: nuovo, chi: S.operatore }]);
    // un contatto vero e' un tentativo: entra nei numeri della giornata senza che tu debba ricordartene
    if (nuovo === "Contattato") { const t = attivitaDi(oggiISO()); t.tentativi = num(t.tentativi) + 1; }
    if (nuovo === "Appuntamento") { const t = attivitaDi(oggiISO()); t.contatti = num(t.contatti) + 1; }
    salva(); render();
  },
  azzeraFiltri: () => { F = { q: "", tipo: "", portale: "", municipio: "", esito: "", chi: "privati", ordine: "punteggio", soloNuovi: false, gruppo: "tutti" }; render(); },
  nuovoAnnuncio: () => apriAnnuncioForm({ id: uid(), tipo: "Vendita", privato: true, pubblicato: oggiISO() }, "Nuovo annuncio"),
  incolla: () => {
    apriFinestra("Incolla un annuncio", `
      <p style="font-family:var(--serif);font-size:14.5px">Seleziona il testo dell'annuncio sul portale (o su Facebook), copialo e incollalo qui. Compilo io quello che riesco a riconoscere; il resto lo correggi nel passaggio successivo. Se incolli anche l'indirizzo della pagina, riconosco il portale da solo.</p>
      ${campo("Testo dell'annuncio", `<textarea id="testoIncollato" style="min-height:190px" placeholder="Incolla qui…"></textarea>`)}`,
      () => {
        const t = $("#testoIncollato").value;
        if (!t.trim()) return alert("Non hai incollato niente.");
        const a = normalizzaAnnuncio(leggiTestoAnnuncio(t), "incollato");
        chiudiFinestra();
        setTimeout(() => apriAnnuncioForm(a, "Controlla e salva"), 60);
      }, "Leggi");
  },
  aggiornaFeed: async () => { await aggiornaDalFeed(false); render(); },
  importaFile: () => {
    const i = document.createElement("input"); i.type = "file"; i.accept = ".json,.csv,text/csv,application/json";
    i.onchange = () => {
      const f = i.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        let lista = [];
        const testo = String(r.result);
        try {
          if (f.name.toLowerCase().endsWith(".csv")) lista = daCsv(testo);
          else { const d = JSON.parse(testo); lista = Array.isArray(d) ? d : (d.annunci || []); }
        } catch (e) { return alert("File non leggibile: " + e.message); }
        if (!lista.length) return alert("Nessun annuncio trovato nel file.");
        const e = importaAnnunci(lista, "file");
        alert(`Importati: ${e.nuovi} nuovi, ${e.aggiornati} aggiornati.`);
        render();
      };
      r.readAsText(f);
    };
    i.click();
  },
  esportaAnnunci: () => {
    const b = new Blob([JSON.stringify({ generato: new Date().toISOString(), annunci: S.annunci }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `annunci-2sarpi-${oggiISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
});

function daCsv(testo) {
  const righe = testo.split(/\r?\n/).filter(r => r.trim());
  if (righe.length < 2) return [];
  const sep = (righe[0].match(/;/g) || []).length > (righe[0].match(/,/g) || []).length ? ";" : ",";
  const taglia = r => { const o = []; let c = "", q = false; for (const ch of r) { if (ch === '"') q = !q; else if (ch === sep && !q) { o.push(c); c = ""; } else c += ch; } o.push(c); return o.map(s => s.trim()); };
  const cap = taglia(righe[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ""));
  const alias = { indirizzo: "via", prezzoeuro: "prezzo", canone: "prezzo", superficie: "mq", metratura: "mq", stanze: "locali", vani: "locali", cellulare: "telefono", tel: "telefono", mail: "email", immagine: "foto", anteprima: "foto", link: "url", data: "pubblicato" };
  return righe.slice(1).map(r => {
    const v = taglia(r), o = {};
    cap.forEach((h, i) => { o[alias[h] || h] = v[i]; });
    return o;
  });
}

/* dati in arrivo dal segnalibro: radar.html#a=<base64 del JSON> */
function daSegnalibro() {
  if (!location.hash.startsWith("#a=")) return false;
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(3)))));
    const d = JSON.parse(json);
    history.replaceState(null, "", location.pathname);
    // il testo della pagina riempie i buchi; i campi strutturati del portale hanno la precedenza
    const letto = d.testo ? leggiTestoAnnuncio(d.testo + "\n" + (d.url || "")) : {};
    const unito = Object.assign(letto, Object.fromEntries(Object.entries(d).filter(([k, v]) => v !== "" && v != null && k !== "testo")));
    if (d.descrizione) unito.descrizione = d.descrizione;
    const a = normalizzaAnnuncio(unito, "segnalibro");
    setTimeout(() => apriAnnuncioForm(a, "Arrivato dal portale — controlla e salva"), 120);
    return true;
  } catch (e) { console.warn("segnalibro illeggibile", e); return false; }
}

avviaPagina(render);
daSegnalibro();
aggiornaDalFeed(true).then(e => { if (e && (e.nuovi || e.aggiornati)) render(); });

/* ---------------- raccolta automatica dai portali ---------------- */
Object.assign(AZIONI, {
  aggiornaPortali: () => {
    if (!tokenApify()) return apriFinestra("Serve la chiave Apify",
      `<p style="font-family:var(--serif);font-size:14.5px">La raccolta automatica dai portali passa da Apify, che fa il lavoro sporco al posto tuo. Serve una chiave, si crea una volta sola e si incolla nella pagina <b>Dati</b>. Costa pochi centesimi a raccolta e il piano gratuito basta per cominciare.</p>
       <div class="bottoniera"><a class="azione" href="dati.html" style="text-decoration:none">Vai alla pagina Dati</a></div>`, null);
    apriFinestra("Aggiorna dai portali", `
      <p style="font-family:var(--serif);font-size:14.5px">Scelgo io le ricerche giuste — <b>Milano, solo privati</b> — e scarico gli annunci nuovi. Gli indirizzi mancanti li ricavo dalle coordinate con OpenStreetMap, gratis. I doppioni fra portali li tolgo dopo, come sempre.</p>
      ${SORGENTI.map(s => `<div class="spunta"><input type="checkbox" data-src="${s.id}" checked><div class="testo">${esc(s.n)}</div></div>`).join("")}
      ${campo("Quanti annunci per ricerca", `<input type="number" id="quanti" value="40" min="5" max="200">`)}
      <div class="avviso"><b>Quanto costa</b><span id="stima">circa 0,60 € in tutto</span> — pagati sul tuo credito Apify. Il piano gratuito include 5 $ al mese, che bastano per una raccolta al giorno di questa dimensione.</div>
      <div id="avanz" style="font-family:var(--serif);font-size:14px;color:var(--grigio)"></div>`,
      async () => {
        const scelte = [...document.querySelectorAll("[data-src]")].filter(c => c.checked).map(c => c.dataset.src);
        if (!scelte.length) return alert("Non hai scelto nessuna ricerca.");
        const n = Math.max(5, Math.min(200, num($("#quanti").value) || 40));
        const av = $("#avanz");
        document.querySelector("#finestra [data-az=conferma]").disabled = true;
        try {
          const e = await aggiornaDaiPortali(scelte, n, m => av.textContent = m);
          chiudiFinestra(); render();
          alert(`Fatto: ${e.nuovi} immobili nuovi, ${e.aggiornati} aggiornati, su ${e.letti} annunci letti.`);
        } catch (err) { av.textContent = "Errore: " + err.message; }
        finally { const b = document.querySelector("#finestra [data-az=conferma]"); if (b) b.disabled = false; }
      }, "Raccogli adesso");
  }
});
