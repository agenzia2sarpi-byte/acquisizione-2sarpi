/* Pagina Dati — copie di sicurezza, scambio fra dispositivi, installazione, alimentazione del radar. */

const SITO = location.origin + location.pathname.replace(/[^/]*$/, "");

const SEGNALIBRO = `javascript:(function(){
var q=function(s){var e=document.querySelector(s);return e?(e.getAttribute('content')||e.textContent||''):''};
var d={url:location.href,titolo:document.title};
try{
 var n=[];document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){
  try{var j=JSON.parse(s.textContent);n=n.concat(Array.isArray(j)?j:(j['@graph']||[j]))}catch(e){}});
 n.forEach(function(o){ if(!o||typeof o!=='object')return;
  var of=o.offers&&(Array.isArray(o.offers)?o.offers[0]:o.offers);
  if(of&&of.price)d.prezzo=of.price; if(o.price)d.prezzo=o.price;
  var a=o.address||(o.itemOffered&&o.itemOffered.address);
  if(a&&typeof a==='object'){d.via=[a.streetAddress,a.addressLocality].filter(Boolean).join(', ');}
  if(o.floorSize)d.mq=o.floorSize.value||o.floorSize;
  if(o.numberOfRooms)d.locali=o.numberOfRooms.value||o.numberOfRooms;
  if(o.telephone)d.telefono=o.telephone; if(o.email)d.email=o.email;
  if(o.image)d.foto=(typeof o.image==='string')?o.image:(o.image.url||o.image[0]);
  if(o.datePosted)d.pubblicato=o.datePosted;
 });
}catch(e){}
if(!d.foto)d.foto=q('meta[property="og:image"]');
if(!d.descrizione)d.descrizione=q('meta[property="og:description"]');
d.testo=(document.body.innerText||'').replace(/\\n{3,}/g,'\\n\\n').slice(0,3500);
var b=btoa(unescape(encodeURIComponent(JSON.stringify(d))));
window.open('${SITO}radar.html#a='+encodeURIComponent(b),'_blank');
})();`.replace(/\n/g, "");

function render() {
  $("#vista").innerHTML = testa("Nessun account, nessuna password", "Dati, radar e installazione",
    `Tutto vive dentro questo dispositivo. Per lavorare in tre — tu, Ciro e Francoise — <b>esporta un file dal dispositivo che ha lavorato e importalo sull'altro scegliendo «unisci»</b>: le schede si fondono, nessuno sovrascrive il lavoro dell'altro. Il file si tiene nella cartella iCloud condivisa.`) + `

  <div class="scheda"><h3>Chi scrive <span class="etichetta">mittente, firma e recapiti</span></h3>
    <p style="font-family:var(--serif);font-size:14.5px">Il nome scelto in alto a destra non e' un'etichetta: e' <b>il mittente</b>. Da li' escono l'insegna, la firma, il telefono e l'email di ogni messaggio, e non si mescolano mai — Francoise scrive per <b>UBH Real Estate, in collaborazione con Agenzia 2 Sarpi</b>. Cambiando persona, il testo si riscrive per intero — non resta attaccato il numero di nessun altro.</p>
    <div class="griglia g3">
      ${NOMI_PERSONE.map(n => { const p = PERSONE[n]; const att = S.operatore === n; return `
        <div class="dato${att ? " verde" : ""}" style="text-align:left">
          <div class="titolo">${esc(n)}${att ? " · selezionata/o" : ""}</div>
          <div style="font-family:var(--serif);font-size:14px;line-height:1.6;margin:4px 0 0">
            <b>${esc(p.nome)}</b><br>
            <span style="color:var(--grigio)">${esc(p.agenzia)}${p.insieme ? "<br>in collaborazione con " + esc(p.insieme) : ""}</span><br>
            ${esc(p.telefono)}${p.telefono2 ? `<br><span style="color:var(--grigio)">in alternativa ${esc(p.telefono2)}</span>` : ""}<br>
            <span style="overflow-wrap:anywhere">${esc(p.email)}</span>
          </div>
          ${att ? "" : `<button class="azione vuota" style="margin:8px 0 0" data-az="scegliPersona" data-n="${esc(n)}">Scrivi a nome di ${esc(p.breve)}</button>`}
        </div>`; }).join("")}
    </div>
    <div class="copiabile" id="anteprimaFirma" style="margin:12px 0 0">${esc(firmaDi(S.operatore))}</div>
    <div class="bottoniera nostampa"><button class="azione vuota" data-az="copia" data-t="anteprimaFirma">Copia la firma</button></div>
  </div>

  <div class="scheda"><h3>Il quaderno della squadra <span class="etichetta">${squadraAttiva() ? "acceso" : "spento"}</span></h3>
    <p style="font-family:var(--serif);font-size:14.5px">Il cruscotto vive dentro questo dispositivo, e va bene cosi'. Ma su una cosa il dispositivo da solo non basta: se Ciro chiama un numero stamattina, il tuo telefono non lo sa, e nel pomeriggio quel numero lo chiami di nuovo. Il quaderno serve solo a questo. Ci passa <b>com'e' finita, chi l'ha lavorato e quando</b> — non l'annuncio, non le foto, non il recapito del proprietario, che restano qui.</p>
    <p style="font-family:var(--serif);font-size:14.5px">Gli immobili viaggiano <b>in cifra</b>: quello che arriva al server e' un'impronta illeggibile, non «via Terracina 64» e non un numero di telefono. Gli altri due dispositivi lo riconoscono lo stesso perche' hanno la stessa chiave. Senza la chiave, dal server non esce niente.</p>
    <div class="griglia g2">
      ${campo("Chiave della squadra", `<input id="chiaveSquadra" value="${esc(chiaveSquadra())}" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autocapitalize="characters" spellcheck="false">`)}
      <div class="dato ${squadraAttiva() ? "verde" : ""}" style="text-align:left">
        <div class="titolo">Stato</div>
        <div style="font-family:var(--serif);font-size:14px;margin:4px 0 0">
          ${squadraAttiva()
            ? `Acceso. Ultimo scambio: <b>${S.squadra.ultimaLettura ? new Date(S.squadra.ultimaLettura).toLocaleString("it-IT") : "mai"}</b>.`
            : `Spento: su questo dispositivo il lavoro resta qui e gli altri due non lo vedono.`}
          ${S.squadra && S.squadra.ultimoErrore ? `<br><span style="color:var(--rosso)">${esc(S.squadra.ultimoErrore)}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="bottoniera">
      <button class="azione" data-az="accendiSquadra">${squadraAttiva() ? "Cambia la chiave" : "Accendi il quaderno"}</button>
      ${squadraAttiva() ? `<button class="azione vuota" data-az="sincronizza">Scambia adesso</button>
        <button class="azione grigia" data-az="spegniSquadra">Spegni su questo dispositivo</button>` : ""}
    </div>
    <div class="avviso" style="margin:12px 0 0"><b>Chi ha la chiave</b>La chiave sta solo sui vostri dispositivi: non e' scritta nel sito e non e' recuperabile da qui. Mettila una volta su ogni telefono e su ogni computer che usate. Se la perdete tutti e tre, se ne fa una nuova e il quaderno riparte vuoto — il lavoro sui dispositivi non si tocca.</div>
  </div>

  <div class="scheda"><h3>Fuori dalla lista <span class="etichetta">${(S.esclusi || []).length} in archivio</span></h3>
    <p style="font-family:var(--serif);font-size:14.5px">Chi finisce qui non torna piu'. Ci arrivano le agenzie, gli immobili scartati e <b>quelli gia' contattati che non hanno portato a niente</b> — cosi' nessuno dei tre richiama un numero che un altro ha gia' chiamato. Non e' un filtro di visualizzazione: l'immobile esce dall'archivio, e a ogni aggiornamento viene riconosciuto e respinto <b>anche se il portale lo ripubblica con un altro indirizzo, un altro numero o il testo cambiato</b> — il confronto e' su indirizzo, metratura, recapito, fotografie e testo, non sul collegamento. Se un'esclusione era sbagliata, si rimette in lista da qui: alla prossima raccolta l'immobile rientra.</p>
    ${(S.esclusi || []).length ? `<div class="tabellone"><table>
      <thead><tr><th>Immobile</th><th>Perche' e' fuori</th><th>Quando</th><th></th></tr></thead>
      <tbody>${S.esclusi.slice().reverse().map(v => `<tr>
        <td><b>${esc(v.via || v.titolo || "—")}</b>${v.inserzionista ? `<br><small>${esc(v.inserzionista)}</small>` : ""}${v.url ? `<br><small><a href="${esc(v.url)}" target="_blank" rel="noopener">annuncio</a></small>` : ""}</td>
        <td style="font-size:13px"><span class="tag ${v.tipo === "lavorato" ? "verde" : ""}">${esc(v.tipo === "lavorato" ? "lavorato e chiuso" : v.tipo === "scartato" ? "scartato" : "agenzia")}</span><br>${esc(v.motivo || "—")}${v.ricomparse ? `<br><small style="color:var(--ambra)">ha provato a rientrare ${v.ricomparse} volte</small>` : ""}</td>
        <td><small>${dataIt(v.data)}${v.chi ? "<br>" + esc(v.chi) : ""}</small></td>
        <td><button class="azione grigia" data-az="riammetti" data-id="${esc(v.id)}">Rimetti in lista</button></td>
      </tr>`).join("")}</tbody></table></div>`
      : `<div class="vuoto">Nessun annuncio escluso. Si escludono col tasto «scarta» sulla scheda, oppure li riconosce da solo il radar.</div>`}
  </div>

  <div class="scheda"><h3>Il tuo profilo</h3><div class="griglia g3">
    ${campo("Chi sta lavorando", `<select data-d="operatore">${opz(S.operatori, S.operatore)}</select>`)}
    ${campo("Nomi degli operatori (separati da virgola)", `<input data-d="operatoriTxt" value="${esc(S.operatori.join(", "))}">`)}
  </div></div>

  <div class="scheda"><h3>Raccolta automatica dai portali <span class="etichetta">chiave Apify</span></h3>
    <p style="font-family:var(--serif);font-size:14.5px">Con una chiave Apify l'applicazione va a prendere <b>da sola</b> gli annunci dei privati su Milano e gli studi di amministrazione condominiale, e te li mette dentro gia' deduplicati. I dati passano da Apify direttamente a questo dispositivo: non toccano nessun nostro server e non finiscono sulla pagina pubblica. La chiave resta qui, nel browser di questo dispositivo.</p>
    <ol style="font-family:var(--serif);font-size:14.5px;padding-left:20px;line-height:1.75">
      <li>Apri <a href="https://console.apify.com/sign-up" target="_blank" rel="noopener">console.apify.com</a> e registrati: il piano gratuito include <b>5 $ di credito al mese</b>, che bastano per una raccolta al giorno.</li>
      <li>Vai in <b>Settings → API &amp; Integrations</b> e copia il <i>Personal API token</i>.</li>
      <li>Incollalo qui sotto. Poi, dalla pagina <b>Annunci</b>, premi «Aggiorna dai portali»; dalla pagina <b>Amministratori</b>, «Cerca amministratori a Milano».</li>
    </ol>
    ${campo("Chiave Apify di questo dispositivo", `<input type="password" id="tokApify" value="${esc(tokenApify())}" placeholder="apify_api_…" autocomplete="off">`)}
    <div class="bottoniera">
      <button class="azione" data-az="salvaToken">Salva la chiave</button>
      <button class="azione grigia" data-az="provaToken">Prova che funzioni</button>
      <span class="conteggio" id="esitoToken">${tokenApify() ? "chiave presente su questo dispositivo" : "nessuna chiave impostata"}</span>
    </div>
    <div class="avviso" style="margin-top:12px"><b>Quanto costa davvero</b>Circa 0,005 € per annuncio raccolto e 0,01 € per studio trovato. Una raccolta quotidiana da 80 annunci costa intorno ai 0,40 € al giorno: dentro il credito gratuito per i primi giorni, poi qualche euro al mese. E' l'unica voce a pagamento di tutto il sistema, ed e' opzionale: senza chiave restano il tasto «Prendi annuncio» e il copia-incolla, che costano zero.</div>
  </div>

  <div class="scheda"><h3>Il tasto «Prendi annuncio» <span class="etichetta">il modo piu' veloce di alimentare il radar</span></h3>
    <p style="font-family:var(--serif);font-size:14.5px">Un segnalibro nella barra del browser. Quando sei su un annuncio — immobiliare.it, idealista, casa.it, wikicasa, subito, e in generale qualsiasi portale — <b>clicchi e l'immobile arriva nel radar</b> con indirizzo, prezzo, metratura, foto di anteprima e recapito, gia' compilati. Non raccoglie niente da solo: legge la pagina che stai guardando tu, esattamente come la stai guardando.</p>
    <ol style="font-family:var(--serif);font-size:14.5px;padding-left:20px;line-height:1.75">
      <li>Su Mac, in Safari o Chrome, mostra la barra dei preferiti (in Safari: <b>Vista → Mostra barra dei preferiti</b>).</li>
      <li><b>Trascina questo bottone</b> sulla barra: <a href="${esc(SEGNALIBRO)}" style="display:inline-block;background:var(--rosso);color:#fff;padding:6px 13px;border-radius:8px;text-decoration:none;font-family:var(--sans);font-weight:700;font-size:13px">Prendi annuncio</a></li>
      <li>Se il trascinamento non funziona, crea un segnalibro qualsiasi, modificalo e incolla nell'indirizzo il codice qui sotto.</li>
    </ol>
    <details class="blocco"><summary>Codice del segnalibro</summary><div class="corpo">
      <div class="copiabile" id="codiceSegnalibro" style="font-family:ui-monospace,Menlo,monospace;font-size:11px;max-height:170px;overflow:auto">${esc(SEGNALIBRO)}</div>
      <div class="bottoniera nostampa"><button class="azione vuota" data-az="copia" data-t="codiceSegnalibro">Copia il codice</button></div>
    </div></details>
    <div class="avviso" style="margin-top:10px"><b>Sull'iPhone</b>I segnalibri con codice su iOS sono scomodi. Sul telefono usa la strada breve: tieni premuto sull'annuncio, <b>Seleziona tutto → Copia</b>, poi apri il radar e tocca <b>«Incolla un annuncio»</b>. Tre secondi, stesso risultato.</div>
  </div>

  <div class="scheda"><h3>Il radar automatico <span class="etichetta">ogni mattina alle 7:00</span></h3>
    <p style="font-family:var(--serif);font-size:14.5px">Il piano lo dice con precisione: <b>ricerche salvate e avvisi dei portali si', raccolta massiva automatizzata no.</b> Lo scraping viola quasi sempre i termini di servizio, e sul volume la differenza e' piccola mentre sul rischio e' enorme. Quindi il radar lavora sul canale che i portali stessi mettono a disposizione: gli avvisi via email delle ricerche salvate.</p>
    <table><tbody>
      <tr><td><b>1. Crea le ricerche salvate</b></td><td>Su ogni portale: Milano, <b>solo privati</b>, una ricerca per macro-area (o una per municipio), vendita e locazione separate. Attiva l'avviso via email <b>quotidiano</b>, all'indirizzo <code>${esc("gaetano.romaniello80@gmail.com")}</code>.</td></tr>
      <tr><td><b>2. Etichetta le email</b></td><td>In Gmail crea un filtro che etichetta come <code>Radar</code> tutto cio' che arriva dai portali. Serve a tenere pulita la casella, non al radar.</td></tr>
      <tr><td><b>3. Il radar legge e deposita</b></td><td>Ogni mattina alle 7:00 l'attivita' programmata legge gli avvisi arrivati nella notte, estrae gli immobili, toglie i doppioni fra portali e li deposita nel file del radar. Alle 9:00 apri questa pagina e li trovi.</td></tr>
      <tr><td><b>4. Tu apri e chiami</b></td><td>Alle 9:30 comincia l'ora d'oro con la lista gia' pronta e gia' ordinata per punteggio.</td></tr>
    </tbody></table>
    <div class="bottoniera">
      <button class="azione" data-az="aggiornaFeed">Aggiorna adesso dal radar</button>
      <span class="conteggio">${S.feed.ultimaLettura ? "ultima lettura: " + new Date(S.feed.ultimaLettura).toLocaleString("it-IT") : "mai letto"}</span>
    </div>
    <div class="avviso" style="margin-top:10px"><b>Perche' non scarico direttamente dai portali</b>I portali bloccano la raccolta automatizzata e i loro termini d'uso la vietano; un sistema costruito cosi' si rompe alla prima contromisura e nel frattempo espone l'agenzia. Gli avvisi delle ricerche salvate sono lo stesso dato, mandato dal portale a te, in modo pienamente legittimo — e non si rompono mai.</div>
  </div>

  <div class="scheda"><h3>Copia di sicurezza e scambio fra dispositivi</h3>
    <div class="bottoniera">
      <button class="azione" data-az="esporta">Esporta un file</button>
      <button class="azione vuota" data-az="importaUnisci">Importa e unisci</button>
      <button class="azione grigia" data-az="importaSostituisci">Importa e sostituisci</button>
    </div>
    <p style="font-size:12.5px;color:var(--grigio);margin:10px 0 0">
      Ultimo salvataggio: ${S.aggiornato ? new Date(S.aggiornato).toLocaleString("it-IT") : "—"} ·
      ${S.annunci.length} annunci, ${S.lead.length} lead, ${S.mandati.length} mandati, ${S.amministratori.length} amministratori,
      ${S.condomini.length} condomini, ${S.rete.length} contatti di rete, ${S.gestione.length} immobili in gestione, ${S.attivita.length} giornate registrate.
    </p>
    <div class="avviso" style="margin-top:12px"><b>Regola di igiene</b>Esporta una copia ogni venerdi', quando aggiorni il cruscotto, e tienila nella cartella condivisa su iCloud. Svuotare la cronologia del browser cancella i dati di questa applicazione: la copia e' l'unica rete di sicurezza.</div>
    <div class="bottoniera">
      <button class="azione grigia" data-az="archivia">Archivia gli annunci vecchi</button>
      <button class="azione grigia" data-az="azzeraTutto">Azzera tutti i dati</button>
    </div>
  </div>

  <div class="scheda"><h3>Metterla sull'iPhone <span class="etichetta">icona sulla schermata Home</span></h3>
    <ol style="font-family:var(--serif);font-size:14.5px;padding-left:20px;line-height:1.7">
      <li>Apri questo indirizzo <b>con Safari</b> (solo Safari sa aggiungere alla Home).</li>
      <li>Tocca <b>Condividi</b> in basso — il quadrato con la freccia.</li>
      <li>Scorri e scegli <b>«Aggiungi a Home»</b>.</li>
      <li>Il nome proposto e' gia' <b>2S Acquisizione</b> e l'icona rossa e' gia' quella giusta. Tocca <b>Aggiungi</b>.</li>
    </ol>
  </div>

  <div class="scheda"><h3>Metterla sul Dock del MacBook</h3>
    <ol style="font-family:var(--serif);font-size:14.5px;padding-left:20px;line-height:1.7">
      <li>Apri l'indirizzo <b>con Safari</b>.</li>
      <li>Menu <b>File → Aggiungi al Dock…</b>, poi conferma.</li>
      <li>In alternativa trascina nel Dock <b>Acquisizione 2 Sarpi.app</b> dalla cartella del progetto.</li>
    </ol>
  </div>

  <div class="scheda"><h3>Cosa costa questo sistema</h3>
    <table><tbody>
      <tr><td>Applicazione, icone, hosting, aggiornamenti</td><td class="num"><b>0 €</b></td></tr>
      <tr><td>Account, licenze, abbonamenti</td><td class="num"><b>0 €</b></td></tr>
      <tr><td>Radar programmato</td><td class="num"><b>0 €</b></td></tr>
    </tbody></table>
    <p style="font-size:13px;color:var(--grigio);margin-top:8px">Il budget del piano (${eur(T().budget)}/mese) resta interamente marketing e strumenti operativi.</p>
  </div>`;
}

document.addEventListener("input", ev => {
  const t = ev.target;
  if (!t.dataset.d) return;
  if (t.dataset.d === "operatoriTxt") { S.operatori = t.value.split(",").map(x => x.trim()).filter(Boolean); $("#selOperatore").innerHTML = opz(S.operatori, S.operatore); }
  else { S[t.dataset.d] = t.value; if (t.dataset.d === "operatore") $("#selOperatore").value = t.value; }
  salva();
});

Object.assign(AZIONI, {
  accendiSquadra: async () => {
    const v = ($("#chiaveSquadra").value || "").trim();
    if (!v) return alert("Serve la chiave della squadra.");
    if (await provaChiaveSquadra(v)) {
      const e = await sincronizzaSquadra(true);
      render();
      alert("Quaderno acceso su questo dispositivo." + (e ? `\nScambiate ${e.mandate} voci.` : ""));
    } else {
      render();
      alert("Quella chiave non e' buona.\n(" + (S.squadra.ultimoErrore || "") + ")");
    }
  },
  sincronizza: async () => { await sincronizzaSquadra(false); render(); },
  spegniSquadra: () => {
    if (!confirm("Spegnere il quaderno su questo dispositivo?\n\nIl lavoro fatto qui resta. Ma da adesso gli altri due non vedranno piu' cosa fai, e tu non vedrai cosa fanno loro.")) return;
    statoSquadra().chiave = ""; salva(); render();
  },
  scegliPersona: el => {
    S.operatore = el.dataset.n; salva();
    const sel = $("#selOperatore"); if (sel) sel.value = S.operatore;
    render();
  },
  riammetti: el => {
    const v = (S.esclusi || []).find(x => x.id === el.dataset.id); if (!v) return;
    if (!confirm(`Rimettere in lista ${v.via || v.titolo || "questo immobile"}?\n\nAlla prossima raccolta puo' rientrare fra gli annunci — sempre che il radar non lo riconosca di nuovo come agenzia.`)) return;
    rimettiNellaSquadra(v);
    riammettiEscluso(el.dataset.id); render();
  },
  salvaToken: () => { salvaToken($("#tokApify").value); $("#esitoToken").textContent = "chiave salvata su questo dispositivo"; },
  provaToken: async () => {
    salvaToken($("#tokApify").value);
    const e = $("#esitoToken"); e.textContent = "verifico…";
    try {
      const r = await fetch("https://api.apify.com/v2/users/me?token=" + encodeURIComponent(tokenApify()));
      if (!r.ok) throw new Error("chiave rifiutata (" + r.status + ")");
      const u = (await r.json()).data;
      e.textContent = "funziona — collegato come " + (u.username || u.id);
    } catch (err) { e.textContent = "non funziona: " + err.message; }
  },
  aggiornaFeed: async () => { await aggiornaDalFeed(false); render(); },
  esporta: () => {
    const b = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b);
    a.download = `acquisizione-2sarpi-${oggiISO()}-${(S.operatore || "").replace(/\W/g, "")}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  importaUnisci: () => scegliFile(true),
  importaSostituisci: () => scegliFile(false),
  archivia: () => {
    const soglia = prompt("Archivia gli annunci non piu' visti da quanti giorni?", "120");
    if (!soglia) return;
    const g = num(soglia);
    const prima = S.annunci.length;
    S.annunci = S.annunci.filter(a => (giorniDa(a.visto) ?? 0) < g || (a.esito && a.esito !== "Da lavorare" && a.esito !== "Scartato"));
    salva(); alert(`Archiviati ${prima - S.annunci.length} annunci.`); render();
  },
  azzeraTutto: () => {
    if (!confirm("Cancella tutti i dati di questo dispositivo. Hai esportato una copia?")) return;
    if (!confirm("Confermi definitivamente?")) return;
    localStorage.removeItem(CHIAVE); location.reload();
  }
});

function scegliFile(unisci) {
  const i = document.createElement("input"); i.type = "file"; i.accept = ".json,application/json";
  i.onchange = () => {
    const f = i.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let d; try { d = JSON.parse(r.result); } catch (e) { return alert("File non leggibile."); }
      if (!d || typeof d !== "object") return alert("Non sembra un file di questa applicazione.");
      if (!unisci) { S = Object.assign(JSON.parse(JSON.stringify(VUOTO)), d); }
      else {
        ["lead", "mandati", "rete", "gestione", "optout", "recensioni", "annunci", "amministratori", "condomini"].forEach(k => {
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
      salva();
      alert(unisci ? "Dati uniti." : "Dati sostituiti.");
      location.reload();
    };
    r.readAsText(f);
  };
  i.click();
}

avviaPagina(render);
