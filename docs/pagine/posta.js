/* Pagina Posta — le mail agli amministratori: chi ha ricevuto, chi deve ancora ricevere.

   La regola di questa pagina: **cio' che risulta inviato non si puo' toccare da qui.**
   Le mail partono da GitHub, dalla casella di Ciro, e il registro `dati/posta.json` e'
   il verbale di cio' che e' uscito davvero. Un dispositivo puo' aggiungere quello che
   sa in piu' — «ha risposto», «non scrivergli piu'» — ma non puo' dichiarare spedita
   una mail che nessuno ha spedito. E' la lezione del radar dei professionisti: non
   presentare mai come fatto qualcosa che il sistema non ha verificato. */

let POSTA = null;         // il registro, com'e' uscito dall'automazione
let STUDI = [];           // gli amministratori, per sapere chi non ha ancora un indirizzo
let CARICAMENTO = "";     // cosa dire se i file non arrivano

const OBIETTIVO_GIORNO = 10;

/* Gli stati, in ordine di quanto contano per chi guarda la pagina. */
const STATI = {
  inviata: { et: "Inviata", p: "v" },
  "in coda": { et: "In coda", p: "a" },
  errore: { et: "Non partita", p: "r" },
  mai: { et: "Mai scritto", p: "" },
  escluso: { et: "Non scrivere", p: "r" }
};

async function caricaPosta() {
  CARICAMENTO = "";
  /* Con un tetto di dieci secondi: una rete che non risponde e non fallisce nemmeno —
     la copertura a una tacca, il treno in galleria — lascerebbe la pagina a «sto leggendo»
     per sempre, che a chi guarda somiglia a un blocco. Meglio dire che non si e' letto. */
  const prendi = async (f, chiave) => {
    const taglio = new AbortController();
    const t = setTimeout(() => taglio.abort(), 10000);
    try {
      const r = await fetch(`dati/${f}?t=` + Date.now(), { cache: "no-store", signal: taglio.signal });
      if (!r.ok) throw new Error(f);
      const d = await r.json();
      return chiave ? (d[chiave] || []) : d;
    } finally {
      clearTimeout(t);
    }
  };
  try { POSTA = await prendi("posta.json"); }
  catch (e) { POSTA = null; CARICAMENTO = "Il registro della posta non c'e' ancora: nessuna mail e' mai partita da questo impianto."; }
  try { STUDI = await prendi("amministratori.json", "amministratori"); }
  catch (e) { STUDI = []; }
}

/* Una riga per ogni amministratore che ha un indirizzo, piu' lo stato che gli spetta.
   Chi non ha indirizzo sta in un elenco a parte: non e' «da scrivere», e' «non
   raggiungibile», ed e' un problema diverso che si risolve in un altro modo. */
function righe() {
  const perEmail = new Map();
  const agg = (v, stato) => {
    const e = (v.email || "").toLowerCase();
    if (!e) return;
    const nota = (S.postaNote || {})[e] || {};
    perEmail.set(e, Object.assign({}, v, { email: e, stato, nota }));
  };
  if (POSTA) {
    (POSTA.inviate || []).forEach(v => agg(v, v.stato === "errore" ? "errore" : "inviata"));
    (POSTA.coda || []).forEach(v => agg(v, v.stato === "errore" ? "errore" : "in coda"));
    (POSTA.escluse || []).forEach(v => agg(v, "escluso"));
  }
  STUDI.forEach(s => {
    const e = (s.email || "").toLowerCase();
    if (!e || perEmail.has(e)) return;
    const nota = (S.postaNote || {})[e] || {};
    perEmail.set(e, {
      email: e, nome: s.nome, nomeBreve: s.nome, telefono: s.telefono || "",
      quartiere: s.quartiere || "", municipio: s.municipio || "", sito: s.sito || "",
      stato: (S.optout || []).includes(e) ? "escluso" : "mai", nota
    });
  });
  // l'opt-out deciso sul dispositivo vince su tutto: se Gaetano ha detto di non
  // scrivergli, non deve comparire fra quelli da scrivere nemmeno per un giro
  (S.optout || []).forEach(e => {
    const v = perEmail.get(String(e).toLowerCase());
    if (v && v.stato === "mai") v.stato = "escluso";
  });
  return [...perEmail.values()];
}

function partiteOggi(tutte) {
  const oggi = oggiISO();
  return tutte.filter(v => v.stato === "inviata" && (v.inviata || "").slice(0, 10) === oggi).length;
}

function vistaPosta() {
  if (POSTA === null && !STUDI.length) {
    return testa("La posta", "Mail agli amministratori",
                 CARICAMENTO ? esc(CARICAMENTO) : "Sto leggendo il registro…") +
      (CARICAMENTO
        ? `<div class="avviso rosso"><b>Non ho letto i dati</b>${esc(CARICAMENTO)}
             <br>La pagina funziona lo stesso: premi ↻ in alto a destra per riprovare.</div>`
        : `<div class="vuoto">Un attimo…</div>`);
  }
  const tutte = righe();
  const inviate = tutte.filter(v => v.stato === "inviata");
  const coda = tutte.filter(v => v.stato === "in coda");
  const errori = tutte.filter(v => v.stato === "errore");
  const mai = tutte.filter(v => v.stato === "mai");
  const esclusi = tutte.filter(v => v.stato === "escluso");
  const senzaEmail = STUDI.filter(s => !(s.email || "").trim());
  const oggi = partiteOggi(tutte);
  const autonomia = Math.floor((mai.length + coda.length) / OBIETTIVO_GIORNO);
  const barra = Math.min(100, oggi / OBIETTIVO_GIORNO * 100);

  const rispostoN = tutte.filter(v => (v.nota || {}).esito === "Ha risposto").length;

  /* La fascia in cima risponde alla sola domanda che conta aprendo la pagina:
     oggi sono partite o no? Un numero grande, e sotto perche'. */
  const fascia = `
  <div class="scheda">
    <h3>Oggi <span class="etichetta">obiettivo ${OBIETTIVO_GIORNO} al giorno</span></h3>
    <div style="display:flex;align-items:baseline;gap:10px">
      <span style="font-size:34px;font-weight:800;letter-spacing:-1px;${oggi ? "" : "color:var(--grigio)"}">${oggi}</span>
      <span style="color:var(--grigio)">mail partite oggi su ${OBIETTIVO_GIORNO}${
        POSTA && POSTA.generato ? ` — ultimo giro ${dataIt(POSTA.generato)}` : ""}</span>
    </div>
    <div class="barra"><i class="${barra >= 100 ? "v" : barra > 0 ? "a" : ""}" style="width:${barra}%"></i></div>
    ${oggi === 0 ? `<div class="avviso" style="margin-top:12px"><b>Oggi non e' partito niente</b>${
      coda.length ? `Ci sono ${coda.length} mail pronte in coda: partono al prossimo giro, o subito se l'invio e' acceso.`
      : mai.length ? `La coda e' vuota ma ci sono ${mai.length} studi mai scritti: il prossimo giro la riempie.`
      : `Non ci sono piu' destinatari nuovi con un indirizzo. Serve allargare il censimento degli amministratori.`}</div>` : ""}
  </div>`;

  const conta = (n, et, sotto, colore) => `
    <div class="scheda" style="text-align:center;padding:14px 10px">
      <div style="font-size:30px;font-weight:800;letter-spacing:-1px;${colore ? `color:${colore}` : ""}">${n}</div>
      <div style="font-weight:700;font-size:13px">${et}</div>
      <div style="font-size:11px;color:var(--grigio);line-height:1.35;margin-top:3px">${sotto}</div>
    </div>`;

  const numeri = `<div class="griglia g4" style="gap:10px">
    ${conta(inviate.length, "Gia' scritti", "hanno ricevuto la mail", "var(--verde)")}
    ${conta(coda.length, "In coda", "pronte, non ancora partite", coda.length ? "var(--ambra)" : "")}
    ${conta(mai.length, "Mai scritti", "hanno l'indirizzo, aspettano il turno", "")}
    ${conta(senzaEmail.length, "Senza indirizzo", "nessuna email trovata sul sito", "var(--grigio)")}
  </div>`;

  const autonomiaAvviso = `
  <div class="avviso ${autonomia < 2 ? "rosso" : ""}"><b>Quanto dura la posta</b>
    Con ${mai.length + coda.length} destinatari ancora da scrivere, a ${OBIETTIVO_GIORNO} al giorno
    l'impianto ha <b>${autonomia} giorni</b> di autonomia.
    ${autonomia < 3 ? " Prima che finiscano va allargato il censimento degli amministratori, altrimenti la macchina gira a vuoto." : ""}
  </div>`;

  const riga = v => {
    const s = STATI[v.stato] || STATI.mai;
    const n = v.nota || {};
    return `<tr>
      <td><span class="pallino ${s.p}"></span>
        <b${v.testo ? ` data-az="mostraMail" data-e="${esc(v.email)}" style="cursor:pointer;border-bottom:1px dotted var(--linea)"` : ""}>${esc(v.nomeBreve || v.nome || v.email)}</b>
        <br><small style="color:var(--grigio)">${esc(v.email)}</small></td>
      <td><small>${esc(v.quartiere || "—")}${v.municipio ? `<br>${esc(v.municipio)}` : ""}</small></td>
      <td><small>${v.stato === "inviata" ? dataIt(v.inviata) : s.et}${
        v.stato === "errore" && v.errore ? `<br><span style="color:var(--rosso)">${esc(String(v.errore).slice(0, 60))}</span>` : ""}</small></td>
      <td><select class="mini" data-az="postaEsito" data-e="${esc(v.email)}">
        ${opz(["", "Ha risposto", "Interessato", "Incontro fissato", "Nessuna risposta", "Non interessato"], n.esito || "")}
      </select></td>
      <td style="white-space:nowrap">
        ${v.telefono ? `<a class="mini" href="tel:${esc(String(v.telefono).replace(/\s/g, ""))}">Chiama</a> ` : ""}
        <button class="mini" data-az="postaEscludi" data-e="${esc(v.email)}" title="Non scrivergli piu'">Basta</button>
      </td>
    </tr>`;
  };

  const tabella = (titolo, elenco, vuoto, apertaDiDefault) => !elenco.length
    ? `<div class="scheda"><h3>${titolo} <span class="etichetta">0</span></h3><div class="vuoto">${vuoto}</div></div>`
    : `<div class="scheda"><h3>${titolo} <span class="etichetta">${elenco.length}</span></h3>
        <div class="tabellone"><table>
          <thead><tr><th>Studio</th><th>Zona</th><th>Stato</th><th>Esito</th><th></th></tr></thead>
          <tbody>${elenco.map(riga).join("")}</tbody></table></div></div>`;

  const perData = (a, b) => String(b.inviata || "").localeCompare(String(a.inviata || ""));

  return testa("La posta", "Mail agli amministratori",
    `Un amministratore governa 40-80 stabili e sa prima di chiunque altro chi vende, chi eredita, chi lascia sfitto. <b>Al primo contatto non si chiede: si da'.</b> La mail che parte da qui offre la scheda dei prezzi al mq con l'intestazione del suo studio sopra, e non domanda segnalazioni. Firma <b>Ciro Romaniello</b>, parte da <b>agenzia2sarpi@gmail.com</b>.`)
    + (CARICAMENTO ? `<div class="avviso"><b>Registro assente</b>${esc(CARICAMENTO)}</div>` : "")
    + fascia + numeri + autonomiaAvviso
    + (errori.length ? tabella("Non sono partite — da guardare", errori, "") : "")
    + tabella("In coda, pronte a partire", coda, "Nessuna mail in attesa. Il prossimo giro riempie la coda da solo.")
    + tabella("Gia' scritti", inviate.slice().sort(perData), "Nessuno ha ancora ricevuto niente da questo impianto.")
    + tabella("Mai scritti — hanno l'indirizzo", mai, "Tutti gli studi con un indirizzo sono stati scritti. Per continuare serve allargare il censimento.")
    + (esclusi.length ? tabella("Non scrivere piu'", esclusi, "") : "")
    + (senzaEmail.length ? `<div class="scheda"><h3>Senza indirizzo <span class="etichetta">${senzaEmail.length}</span></h3>
        <p style="color:var(--grigio);font-size:13px;margin:0 0 10px">Questi studi non hanno un'email trovabile sul sito, o un sito non ce l'hanno proprio. Non sono «da scrivere»: sono <b>da chiamare</b>.</p>
        <div class="tabellone"><table><thead><tr><th>Studio</th><th>Zona</th><th>Telefono</th></tr></thead>
        <tbody>${senzaEmail.map(s => `<tr>
          <td>${esc(s.nome)}${s.sito ? `<br><small><a href="${esc(s.sito)}" target="_blank" rel="noopener">sito</a></small>` : ""}</td>
          <td><small>${esc(s.quartiere || "—")}${s.municipio ? `<br>${esc(s.municipio)}` : ""}</small></td>
          <td>${s.telefono ? `<a href="tel:${esc(String(s.telefono).replace(/\s/g, ""))}">${esc(s.telefono)}</a>` : "—"}</td>
        </tr>`).join("")}</tbody></table></div></div>` : "")
    + `<div class="avviso"><b>Come si comporta questa pagina</b>
        Quello che risulta <b>inviato</b> lo dice il registro scritto dall'automazione, non questo dispositivo: da qui non si puo' dichiarare partita una mail che non e' partita. Quello che aggiungi tu — esito, «basta cosi'» — resta su questo dispositivo.
        ${rispostoN ? `<br>Finora <b>${rispostoN}</b> ${rispostoN === 1 ? "studio ha" : "studi hanno"} risposto.` : ""}</div>`;
}

/* La mail com'e' partita davvero, parola per parola. Serve quando uno risponde al
   telefono e Gaetano deve sapere cosa gli e' stato scritto. */
function mostraMail(email) {
  const v = righe().find(x => x.email === email);
  if (!v || !v.testo) return;
  apriFinestra(v.nomeBreve || v.nome || email, `
    <div style="font-size:12px;color:var(--grigio);margin-bottom:8px">
      <b>A:</b> ${esc(v.email)}<br>
      <b>Da:</b> ${esc(v.da || "agenzia2sarpi@gmail.com")} — ${esc(v.mittente || "Ciro Romaniello")}<br>
      <b>Quando:</b> ${v.inviata ? dataIt(v.inviata) + " " + String(v.inviata).slice(11, 16) : "non ancora partita"}
    </div>
    <div class="campo"><span>Oggetto</span><div style="font-weight:700">${esc(v.oggetto || "")}</div></div>
    <div id="testoMail" style="white-space:pre-wrap;font-size:13px;line-height:1.5;border:1px solid var(--linea);border-radius:8px;padding:12px;background:#fff">${esc(v.testo)}</div>
    <div class="bottoniera"><button class="azione grigia" data-az="copia" data-t="testoMail">Copia il testo</button></div>`,
    null);
}

function render() { $("#vista").innerHTML = vistaPosta(); }

Object.assign(AZIONI, {
  mostraMail: el => mostraMail(el.dataset.e),
  postaEsito: el => {
    const e = el.dataset.e;
    S.postaNote = S.postaNote || {};
    S.postaNote[e] = Object.assign(S.postaNote[e] || {}, { esito: el.value, quando: oggiISO() });
    salva(); render();
  },
  postaEscludi: el => {
    const e = el.dataset.e;
    if (!confirm("Non scrivere piu' a " + e + "?\n\nEsce dalla lista e non ci rientra da solo.")) return;
    S.optout = S.optout || [];
    if (!S.optout.includes(e)) S.optout.push(e);
    salva(); render();
  }
});

/* L'ordine conta, ed e' l'errore che ha prodotto una pagina bianca senza vie d'uscita il
   07/09/2026: prima si costruiva la pagina e *poi* si disegnava il guscio, cosi' finche' i
   due file non arrivavano non c'era niente — nemmeno la freccia indietro e il tasto
   aggiorna. E nell'app sulla schermata Home non c'e' la barra del browser: restare senza
   guscio vuol dire restare in trappola, e l'unica uscita e' chiudere l'applicazione.

   Adesso il guscio si disegna per primo, sempre, prima di toccare la rete. I dati arrivano
   dopo e la pagina si ridisegna da sola. Se non arrivano affatto, resta comunque una pagina
   con la navigazione, che dice cos'e' andato storto. */
avviaPagina(render);
caricaPosta()
  .catch(e => { CARICAMENTO = "Non sono riuscito a leggere il registro della posta: " + (e && e.message ? e.message : e); })
  .then(() => render());
