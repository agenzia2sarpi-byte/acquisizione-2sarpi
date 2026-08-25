/* Pagina Scaduti — gli immobili spariti dai portali senza risultare venduti.
   E' la fonte con il tasso di conversione piu' alto dell'intero piano: spesso 1 mandato ogni 8-10 contatti. */

let FS = { q: "", municipio: "", esito: "", ordine: "giorni" };

function scadutiFiltrati() {
  let l = (S.scaduti || []).slice();
  if (FS.municipio) l = l.filter(x => x.municipio === FS.municipio);
  if (FS.esito) l = l.filter(x => (x.esito || "Da lavorare") === FS.esito);
  if (FS.q) { const q = FS.q.toLowerCase(); l = l.filter(x => JSON.stringify(x).toLowerCase().includes(q)); }
  const ord = {
    giorni: (a, b) => num(b.giorniOnline) - num(a.giorniOnline),
    ribassi: (a, b) => num(b.ribassi) - num(a.ribassi),
    recenti: (a, b) => (b.sparito || "").localeCompare(a.sparito || ""),
    prezzo: (a, b) => num(b.prezzoUltimo) - num(a.prezzoUltimo)
  }[FS.ordine];
  return l.sort(ord);
}

/* Quanto e' probabile che sia un ritiro e non una vendita: piu' ribassi e piu' giorni online,
   piu' e' probabile che l'immobile sia stato semplicemente tolto. */
function indizioRitiro(x) {
  let p = 30;
  const dett = [];
  const gg = num(x.giorniOnline), rib = num(x.ribassi);
  if (gg > 180) { p += 30; dett.push("online da oltre sei mesi"); }
  else if (gg > 90) { p += 20; dett.push("online da oltre tre mesi"); }
  else if (gg > 45) { p += 10; dett.push("online da oltre un mese e mezzo"); }
  if (rib >= 3) { p += 25; dett.push(rib + " ribassi"); }
  else if (rib >= 1) { p += 12; dett.push(rib + (rib === 1 ? " ribasso" : " ribassi")); }
  if (x.riapparso) { p += 15; dett.push("gia' sparito e ricomparso in passato"); }
  return { p: Math.min(95, p), dett };
}

function cartaScaduto(x) {
  const r = indizioRitiro(x);
  const emq = num(x.mq) ? Math.round(num(x.prezzoUltimo) / num(x.mq)) : null;
  const calo = num(x.prezzoIniziale) && num(x.prezzoUltimo) && num(x.prezzoIniziale) > num(x.prezzoUltimo)
    ? (num(x.prezzoIniziale) - num(x.prezzoUltimo)) / num(x.prezzoIniziale) * 100 : null;
  return `<div class="annuncio${(x.esito === "Scartato" || x.esito === "Non contattare") ? " chiuso" : ""}">
    <div class="foto${x.foto ? "" : " senza"}">
      ${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy" onerror="this.closest('.foto').classList.add('senza')">` : ""}
      <div class="segno"><b>${esc(x.tipologia || "immobile")}</b><span>${esc(x.quartiere || x.municipio || "Milano")}</span></div>
      <div class="angolo"><span class="badge privato">scaduto</span>
        ${calo ? `<span class="badge portali">−${calo.toFixed(0)}%</span>` : ""}</div>
      <div class="punti">${r.p}<small>RITIRO</small></div>
    </div>
    <div class="corpo">
      <div class="prezzo">${x.prezzoUltimo ? eur(num(x.prezzoUltimo)) : "prezzo non noto"}
        ${emq ? `<small> · ${emq.toLocaleString("it-IT")} €/mq</small>` : ""}</div>
      <div class="indirizzo">${esc(x.indirizzo || x.via || "indirizzo non indicato")}</div>
      <div class="zona">${esc([x.quartiere, x.municipio].filter(Boolean).join(" · ") || "zona non indicata")}</div>
      <div class="caratteristiche">
        ${x.mq ? `<span><b>${num(x.mq)}</b> mq</span>` : ""}
        ${x.locali ? `<span><b>${num(x.locali)}</b> locali</span>` : ""}
        <span><b>${num(x.giorniOnline)}</b> gg online</span>
        ${num(x.ribassi) ? `<span style="color:var(--ambra)"><b>${num(x.ribassi)}</b> ribassi</span>` : ""}
      </div>
      <div style="font-size:11.5px;color:var(--grigio)">
        Sparito il <b>${dataIt(x.sparito)}</b>${x.agenzia ? ` · era di <b>${esc(x.agenzia)}</b>` : ""}</div>
      ${r.dett.length ? `<div style="font-size:11.5px;color:var(--ambra)">${esc(r.dett.join(" · "))}</div>` : ""}
    </div>
    <div class="contatti-rapidi">
      <button data-az="copiaScaduto" data-id="${esc(x.id)}">Copia messaggio</button>
      ${x.url ? `<a class="vuoto" href="${esc(x.url)}" target="_blank" rel="noopener">Vedi l'annuncio</a>` : ""}
      <button class="vuoto" data-az="cercaCatasto" data-id="${esc(x.id)}">Cerca il proprietario</button>
    </div>
    <div class="corpo" style="padding-top:0">
      <div class="passi">
        <button data-az="passoS" data-id="${esc(x.id)}" data-e="Da lavorare" class="${(x.esito || "Da lavorare") === "Da lavorare" ? "att" : ""}">da fare</button>
        <button data-az="passoS" data-id="${esc(x.id)}" data-e="Contattato" class="${x.esito === "Contattato" ? "att v" : ""}">contattato</button>
        <button data-az="passoS" data-id="${esc(x.id)}" data-e="Appuntamento" class="${x.esito === "Appuntamento" ? "att v" : ""}">appuntam.</button>
        <button data-az="passoS" data-id="${esc(x.id)}" data-e="Scartato" class="${x.esito === "Scartato" ? "att r" : ""}">scarta</button>
      </div>
    </div>
  </div>`;
}

function render() {
  const l = scadutiFiltrati();
  const tot = (S.scaduti || []).length;
  const daFare = (S.scaduti || []).filter(x => (x.esito || "Da lavorare") === "Da lavorare").length;
  const caldi = (S.scaduti || []).filter(x => indizioRitiro(x).p >= 65).length;

  $("#vista").innerHTML = testa("Il miglior rapporto sforzo/resa del piano", "Annunci scaduti",
    `Immobili apparsi mesi fa e poi spariti <b>senza essere venduti</b>. Proprietari <b>gia' motivati, gia' passati per un'agenzia, gia' delusi</b>: arrivi nel momento esatto in cui l'esclusiva del collega e' scaduta. Il piano lo dice senza mezzi termini: <b>spesso un mandato ogni 8-10 contatti</b>, il tasso di conversione piu' alto in assoluto — e costa zero, perche' lo produce il tuo archivio.`) + `

  <div class="griglia g4" style="margin:0 0 14px">
    <div class="dato"><div class="titolo">Immobili spariti</div><div class="valore">${tot}</div><div class="sotto">osservati e non piu' online</div></div>
    <div class="dato ${caldi ? "ambra" : ""}"><div class="titolo">Ritiro probabile</div><div class="valore">${caldi}</div><div class="sotto">molti giorni online o piu' ribassi</div></div>
    <div class="dato ${daFare ? "ambra" : "verde"}"><div class="titolo">Da lavorare</div><div class="valore">${daFare}</div><div class="sotto">a 1 su 9, valgono ~${Math.round(daFare / 9)} mandati</div></div>
    <div class="dato"><div class="titolo">Ultimo controllo</div><div class="valore" style="font-size:15px;padding-top:7px">${S.feedScaduti && S.feedScaduti.ultimaLettura ? new Date(S.feedScaduti.ultimaLettura).toLocaleDateString("it-IT") : "—"}</div></div>
  </div>

  ${tot ? `<div class="scheda nostampa">
    <div class="filtri">
      ${campo("Cerca", `<input type="search" id="sq" value="${esc(FS.q)}" placeholder="via, agenzia, nota…">`)}
      ${campo("Municipio", `<select id="smun"><option value="">tutti</option>${opz(MUNICIPI, FS.municipio)}</select>`)}
      ${campo("Esito", `<select id="ses"><option value="">tutti</option>${opz(ESITI, FS.esito)}</select>`)}
      ${campo("Ordina per", `<select id="sord">${[["giorni", "giorni online"], ["ribassi", "ribassi"], ["recenti", "spariti di recente"], ["prezzo", "prezzo"]].map(([v, t]) => `<option value="${v}"${FS.ordine === v ? " selected" : ""}>${t}</option>`).join("")}</select>`)}
    </div>
    <div class="bottoniera">
      <button class="azione grigia" data-az="aggiornaScaduti">Aggiorna</button>
      <span class="conteggio">${l.length} nel filtro</span>
    </div>
  </div>

  <div class="vetrina">${l.map(cartaScaduto).join("")}</div>` : `

  <div class="scheda"><h3>Il radar sta accumulando lo storico</h3>
    <p style="font-family:var(--serif);font-size:14.5px">Questa lista non si puo' scaricare da nessuna parte: <b>si costruisce osservando</b>. Ogni mattina il radar registra quali immobili sono online sui portali; quando uno sparisce e non risulta venduto, compare qui con la data e con tutta la sua storia di prezzo.</p>
    <p style="font-family:var(--serif);font-size:14.5px">Servono <b>una decina di giorni</b> perche' cominci a produrre nomi, e diventa piu' ricca ogni settimana che passa. E' esattamente l'asset di cui parla il piano: «l'archivio storico degli annunci e' l'unico asset che un'agenzia senza sede puo' accumulare, e dopo sei mesi vale piu' di una vetrina».</p>
    <div class="avviso"><b>Perche' vale la pena aspettare</b>Gli immobili spariti sono l'unica fonte in cui arrivi <i>dopo</i> che qualcun altro ha fallito. Il proprietario ha gia' provato con un'agenzia, ha gia' abbassato il prezzo, e ha gia' capito che il problema esiste. Non devi convincerlo che serve aiuto: quello lo sa gia'.</div>
  </div>`}

  <div class="scheda"><h3>Come si lavora questa lista</h3>
    <table><tbody>
      <tr><td><b>1. Non dare per scontato il ritiro</b></td><td>Alcuni hanno venduto davvero. Il messaggio parte proprio da li': «Se ha venduto, complimenti sinceri e la saluto qui». E' onesto, e chi ha ritirato risponde.</td></tr>
      <tr><td><b>2. Parti da chi ha piu' ribassi</b></td><td>Tre ribassi in dodici mesi sono la firma di un immobile presentato male, non prezzato male. E' l'argomento su cui hai qualcosa da dire.</td></tr>
      <tr><td><b>3. Il proprietario non e' nell'annuncio</b></td><td>Era un'agenzia: il recapito e' il loro. Il proprietario si raggiunge con la visura sull'indirizzo, o con la lettera scritta a mano al civico — che a questo budget e' la mossa migliore.</td></tr>
      <tr><td><b>4. Apri il grappolo lo stesso</b></td><td>Anche se non chiudi, quell'indirizzo entra nel censimento condomini e nel Rapporto di Via: il lavoro non si butta mai.</td></tr>
    </tbody></table>
  </div>`;

  ["sq", "smun", "ses", "sord"].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener(el.type === "search" ? "input" : "change", () => {
      FS = { q: $("#sq").value, municipio: $("#smun").value, esito: $("#ses").value, ordine: $("#sord").value };
      const pos = id === "sq" ? $("#sq").selectionStart : null;
      render();
      if (pos !== null) { const n = $("#sq"); n.focus(); n.setSelectionRange(pos, pos); }
    });
  });
}

Object.assign(AZIONI, {
  aggiornaScaduti: async () => { await aggiornaScadutiDalFeed(false); render(); },
  copiaScaduto: el => {
    const x = (S.scaduti || []).find(y => y.id === el.dataset.id); if (!x) return;
    copiaTesto(messaggioScaduto(x), "Messaggio copiato. Se hai il recapito chiama, altrimenti spediscilo scritto a mano al civico.");
  },
  cercaCatasto: el => {
    const x = (S.scaduti || []).find(y => y.id === el.dataset.id); if (!x) return;
    apriFinestra("Risalire al proprietario", `
      <p style="font-family:var(--serif);font-size:14.5px">L'annuncio era di un'agenzia, quindi il recapito che vedi e' il loro. Per arrivare al proprietario di <b>${esc(x.indirizzo || x.via || "")}</b> ci sono tre strade, in ordine di costo:</p>
      <table><tbody>
        <tr><td><b>La lettera al civico</b></td><td>Busta bianca, indirizzo a mano, francobollo vero, sei righe. Costa 1,50 € e apre quasi il 100% delle volte. A questo budget e' la mossa migliore, e non richiede sapere il nome.</td></tr>
        <tr><td><b>La visura catastale</b></td><td>Per indirizzo, tramite Agenzia delle Entrate o un servizio abilitato. Pochi euro, ti da' il nome. Va usata per una finalita' legittima e documentata: annotala nel registro dei trattamenti.</td></tr>
        <tr><td><b>L'amministratore</b></td><td>Se quel civico e' gia' nel tuo censimento, l'amministratore sa chi e' il proprietario e spesso perche' non ha venduto. E' la strada piu' veloce, se la relazione c'e'.</td></tr>
      </tbody></table>
      ${x.municipio ? `<p style="font-size:13px;color:var(--grigio);margin-top:10px">Questo immobile e' in ${esc(x.municipio)}: controlla nella pagina Amministratori se hai gia' qualcuno che copre quella zona.</p>` : ""}`, null);
  },
  passoS: el => {
    const x = (S.scaduti || []).find(y => y.id === el.dataset.id); if (!x) return;
    x.esito = el.dataset.e; x.ultimoContatto = oggiISO(); x.operatore = S.operatore;
    if (el.dataset.e === "Contattato") { const t = attivitaDi(oggiISO()); t.tentativi = num(t.tentativi) + 1; }
    if (el.dataset.e === "Appuntamento") { const t = attivitaDi(oggiISO()); t.contatti = num(t.contatti) + 1; }
    salva(); render();
  }
});

avviaPagina(render);
aggiornaScadutiDalFeed(true).then(e => { if (e && (e.nuovi || e.aggiornati)) render(); });
