/* Pagina Immobile — la scheda singola, con tutti i portali su cui compare e il messaggio gia' scritto. */

const ID = new URLSearchParams(location.search).get("id");

function gruppoDi(id) {
  const tutti = raggruppaAnnunci(S.annunci);
  return tutti.find(g => g.membri.some(m => m.id === id));
}

/* Il messaggio e' sempre di chi e' selezionato in alto: cambiando persona si riscrive tutto. */
const messaggioPrimoContatto = (a, g) => messaggioPortale(a, g, S.operatore);

/* ---------------- perlustrazione dell'inserzionista ---------------- */
/* Prima di spendere una telefonata: dall'altra parte c'e' un proprietario o un collega?
   Il radar guarda quante volte ricorre lo stesso numero, com'e' scritto l'annuncio e che
   nome ha chi pubblica. Nel dubbio l'immobile resta in lista, con l'avviso ben visibile. */
function bloccoInserzionista(a) {
  const v = a.verdettoInserzionista || "";
  if (!v) return "";
  const motivi = a.motiviAgenzia || [];
  const s = Number(a.sospettoAgenzia) || 0;
  if (v === "privato")
    return `<div class="avviso" style="margin:0 0 14px"><b>Perlustrazione: proprietario privato</b>
      Nessun segnale da agenzia sull'annuncio${motivi.length ? " — " + esc(motivi.join(" · ")) : ""}. Indice di sospetto ${s}/100.
      Resta comunque il Registro Pubblico delle Opposizioni prima di comporre il numero.</div>`;
  if (v === "da verificare")
    return `<div class="avviso" style="margin:0 0 14px;border-left-color:var(--ambra)"><b>Perlustrazione: da verificare — indice ${s}/100</b>
      ${esc(motivi.join(" · "))}.<br>Non e' un motivo per saltarlo: e' un motivo per aprire con
      <i>«parlo con il proprietario?»</i>. Se e' un collega lo capisci in dieci secondi e chiudi senza bruciarti nulla.</div>`;
  return `<div class="avviso rosso" style="margin:0 0 14px"><b>Perlustrazione: probabilmente non e' un proprietario — indice ${s}/100</b>
    ${esc(motivi.join(" · "))}.<br>E' fuori dalla lista delle chiamate e dai privati. Se lo apri lo stesso,
    sappi che stai chiamando un'agenzia che si e' pubblicata come privato.</div>`;
}

function render() {
  const a = S.annunci.find(x => x.id === ID);
  if (!a) { $("#vista").innerHTML = `<div class="vuoto">Immobile non trovato. <a href="radar.html">Torna agli annunci</a></div>`; return; }
  const g = gruppoDi(ID) || { membri: [a], portali: [a.portale], giorniOnline: giorniDa(a.pubblicato) ?? 0 };
  const p = punteggioAnnuncio(a, g);
  const emq = num(a.mq) ? Math.round(num(a.prezzo) / num(a.mq)) : null;
  const rif = riferimentoEmq(a);
  const prov = provvigioneAnnuncio(a);
  const foto = [a.foto, a.foto2, a.foto3].filter(Boolean);
  const tel = (a.telefono || "").replace(/[^\d+]/g, "");

  $("#vista").innerHTML = `
  ${lavorato(a) ? (() => {
    const g = gestioneDi(a), richiamo = (a.esito || "") === "Da richiamare";
    const cl = g === "gestito" ? " fatto" : (g === "rivedere" || richiamo) ? " richiamo" : "";
    const apertura = g === "gestito" ? "gestito da" : g === "rivedere" ? "da rivedere ·" : "in mano a";
    return `<div class="gestito${cl}" style="border-radius:9px;margin:0 0 12px">
      <span>${apertura}</span><span class="chi">${esc(a.operatore || "qualcuno di noi")}</span>
      <span>${esc((a.esito === "Da lavorare" ? "" : a.esito || "").toLowerCase())}</span>
      <span class="quando">${a.ultimoContatto ? dataIt(a.ultimoContatto) : ""}${a.dataRichiamo ? " · richiamare il " + dataIt(a.dataRichiamo) : ""}</span>
    </div>`; })() : ""}

  <div class="bottoniera nostampa" style="margin:0 0 12px">
    <a class="azione grigia" href="radar.html" style="text-decoration:none">‹ Tutti gli annunci</a>
  </div>

  ${foto.length ? `<div class="galleria" style="margin:0 0 14px">${foto.map(f => `<img src="${esc(f)}" alt="" onerror="this.style.visibility='hidden'">`).join("")}</div>` : ""}

  <div class="intestazione">
    <span class="occhiello">${esc(a.tipo)} · ${esc(a.privato === false ? "agenzia" : "privato")}</span>
    <h2>${esc([a.via, a.civico].filter(Boolean).join(" ") || a.titolo || "Immobile")}</h2>
    <div style="font-size:13px;color:var(--grigio)">${esc([a.quartiere, a.municipio, a.zona].filter(Boolean).join(" · ") || "zona non ancora ricavata")}</div>
  </div>

  <div class="griglia g4" style="margin:0 0 14px">
    <div class="dato"><div class="titolo">${a.tipo === "Locazione" ? "Canone" : "Prezzo"}</div>
      <div class="valore">${a.prezzo ? eur(num(a.prezzo)) : "—"}</div>
      <div class="sotto">${emq ? emq.toLocaleString("it-IT") + " €/mq" : "metratura mancante"}</div></div>
    <div class="dato ${p.punti >= 70 ? "verde" : p.punti >= 45 ? "ambra" : ""}"><div class="titolo">Punteggio lead</div>
      <div class="valore">${p.punti}</div><div class="sotto">su 100</div></div>
    <div class="dato"><div class="titolo">Online da</div><div class="valore">${g.giorniOnline}</div><div class="sotto">giorni</div></div>
    <div class="dato"><div class="titolo">Provvigione stimata</div><div class="valore">${eur(prov)}</div>
      <div class="sotto">${a.tipo === "Locazione" ? "intermediazione + gestione, primo anno" : "3% sul prezzo richiesto"}</div></div>
  </div>

  ${!eOnline(a) ? `<div class="avviso rosso"><b>Non piu' online</b>Questo annuncio e' sparito dal portale il ${dataIt(a.sparito)}. Quasi sempre significa che l'immobile e' stato venduto o affittato: <b>non chiamare per proporti</b>. Se vuoi comunque provarci, l'unico messaggio che regge e' quello degli annunci scaduti — parte da «se ha venduto, complimenti sinceri».</div>` : `<div style="font-size:12.5px;color:var(--grigio);margin:0 0 12px">${esc(freschezza(a).t)} — il radar ricontrolla ogni giorno che l'annuncio sia ancora pubblicato.</div>`}

  <div class="scheda"><h3>Contatto</h3>
    ${tel || a.email ? `<div class="contatto">
      ${tel ? `<a href="tel:${esc(tel)}">Chiama ${esc(a.telefono)}</a>` : ""}
      ${tel ? `<a class="vuoto" href="https://wa.me/${esc(waNumero(a.telefono))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
      ${a.email ? `<a class="vuoto" href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : ""}
      ${a.url ? `<a class="vuoto" href="${esc(a.url)}" target="_blank" rel="noopener">Apri l'annuncio</a>` : ""}
    </div>` : `<p style="font-family:var(--serif)">Nessun recapito registrato. ${a.url ? `Il primo contatto va comunque fatto <b>dal modulo del portale</b>: e' piu' difendibile sul piano normativo e converte meglio. <a href="${esc(a.url)}" target="_blank" rel="noopener">Apri l'annuncio</a>.` : ""}</p>`}
    <div class="avviso" style="margin:12px 0 0"><b>Prima di telefonare</b>Il Registro Pubblico delle Opposizioni si applica anche ai numeri mobili. Pubblicare un recapito per ricevere offerte di acquisto non equivale a un consenso per proposte commerciali di servizi: primo contatto sul canale che il proprietario ha pubblicato, telefono solo dopo una risposta o previa verifica nel Registro.</div>
  </div>

  <div class="scheda"><h3>Il messaggio, gia' scritto <span class="etichetta">a nome di ${esc(persona(S.operatore).nome)} · ${esc(persona(S.operatore).agenzia)}${persona(S.operatore).insieme ? " con " + esc(persona(S.operatore).insieme) : ""}</span></h3>
    <div class="copiabile" id="msg">${esc(messaggioPrimoContatto(a, g))}</div>
    <div class="bottoniera nostampa">
      <button class="azione" data-az="copia" data-t="msg">Copia il messaggio</button>
      <button class="azione vuota" data-az="portaInTrattativa">Porta in trattativa e avvia la sequenza</button>
    </div>
    <p style="font-size:12.5px;color:var(--grigio);margin:10px 0 0">Insegna, firma, telefono ed email sono quelli di <b>${esc(persona(S.operatore).nome)}</b> (${esc(persona(S.operatore).agenzia)}${persona(S.operatore).insieme ? ", in collaborazione con " + esc(persona(S.operatore).insieme) : ""}): cambiando persona in alto, il testo si riscrive per intero. Racconta cosa sai fare — promuovere l'annuncio a pagamento, far arrivare piu' richieste di quante ne prenda un privato, e filtrarle prima che entrino in casa — senza usare la parola «esclusiva» e con l'opt-out in chiaro. Il rifiuto arriva subito e pulito — il che e' un bene: libera tempo per i si'.</p>
  </div>

  ${bloccoInserzionista(a)}

  <div class="griglia g2">
    <div class="scheda"><h3>Perche' questo punteggio${p.fonte === "radar" ? ` <span class="etichetta">calcolato dal radar</span>` : ""}</h3>
      ${p.dettaglio.map(([t, v]) => `<div style="display:flex;gap:10px;font-size:13.5px;padding:6px 0;border-bottom:1px solid var(--linea)">
        <span>${esc(t)}</span><b style="margin-left:auto;color:${v > 0 ? "var(--inchiostro)" : "var(--rosso)"}">${v > 0 ? "+" : ""}${Math.round(v)}</b></div>`).join("")}
      <div style="display:flex;gap:10px;font-size:15px;padding:9px 0 0"><b>Totale</b><b style="margin-left:auto">${p.punti}</b></div>
      ${rif ? `<p style="font-size:12px;color:var(--grigio);margin:8px 0 0">Riferimento di zona: ${Math.round(rif.valore).toLocaleString("it-IT")} €/mq — ${esc(rif.fonte)}.</p>`
      : `<p style="font-size:12px;color:var(--grigio);margin:8px 0 0">Nessun riferimento di zona: servono almeno tre annunci dello stesso quartiere e dello stesso tipo nell'archivio, oppure una fascia impostata a mano.</p>`}
      ${a.qualitaImmobile !== null && a.qualitaImmobile !== undefined ? `
        <div style="margin:12px 0 0;padding:10px 0 0;border-top:1px solid var(--linea)">
          <div style="display:flex;gap:10px;font-size:13.5px"><b>Qualita' dell'immobile</b>
            <b style="margin-left:auto;color:${Number(a.qualitaImmobile) >= 70 ? "var(--verde)" : Number(a.qualitaImmobile) >= 45 ? "var(--ambra)" : "var(--grigio)"}">${Number(a.qualitaImmobile)}/100</b></div>
          <div style="font-size:12px;color:var(--grigio);margin:4px 0 0">${(a.percheImmobile || []).map(esc).join(" · ") || "nessun elemento distintivo rilevato"}</div>
          <p style="font-size:12px;color:var(--grigio);margin:6px 0 0">Non e' il valore del lead: e' quanto vale il mandato <i>una volta preso</i>. Un incarico su una cosa che non si vende non e' un risultato.</p>
        </div>` : ""}
    </div>

    <div class="scheda"><h3>Caratteristiche</h3>
      <dl class="scheda-dett">
        ${[["Metratura", a.mq ? num(a.mq) + " mq" : "—"], ["Locali", a.locali || "—"], ["Bagni", a.bagni || "—"],
        ["Piano", a.piano || "—"], ["Ascensore", a.ascensore ? "si'" : "—"], ["Tipologia", a.tipologia || "—"],
        ["Stato", a.statoImmobile || "—"], ["Classe energetica", a.classeEnergetica || "—"],
        ["Spese condominiali", a.spese ? eur(num(a.spese)) + "/mese" : "—"],
        ["Quartiere", a.quartiere || "—"], ["Municipio", a.municipio || "—"],
        ["Pubblicato", dataIt(a.pubblicato)], ["Ultimo controllo", dataIt(a.visto)],
        ["Riferimento", a.riferimento || "—"], ["Origine del dato", a.origine || "—"]]
        .map(([t, v]) => `<div><dt>${esc(t)}</dt><dd>${esc(String(v))}</dd></div>`).join("")}
      </dl>
    </div>
  </div>

  <div class="scheda"><h3>Dove compare <span class="etichetta">${g.membri.length} annunci · ${g.portali.length} portali</span></h3>
    ${g.portali.length > 1 ? `<p style="font-family:var(--serif);font-size:14px">Lo stesso immobile e' pubblicato su piu' portali. Non e' un dettaglio: <b>chi moltiplica i canali sta facendo fatica</b>, ed e' il momento in cui una conversazione con un professionista viene accolta meglio.</p>` : ""}
    <div class="tabellone"><table>
      <thead><tr><th>Portale</th><th class="num">Prezzo</th><th class="num">Mq</th><th>Pubblicato</th><th>Riferimento</th><th></th></tr></thead>
      <tbody>${g.membri.map(m => `<tr${m.id === a.id ? ' style="background:var(--tenue)"' : ""}>
        <td><b>${esc(nomePortale(m.portale))}</b>${m.id === a.id ? ` <span class="tag">questa scheda</span>` : ""}</td>
        <td class="num">${m.prezzo ? eur(num(m.prezzo)) : "—"}</td>
        <td class="num">${m.mq || "—"}</td>
        <td>${dataIt(m.pubblicato)}</td>
        <td><small>${esc(m.riferimento || "—")}</small></td>
        <td>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">apri</a>` : ""}
            ${m.id !== a.id ? ` · <a href="annuncio.html?id=${encodeURIComponent(m.id)}">scheda</a> · <a href="#" data-az="separa" data-id="${m.id}">separa</a>` : ""}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>

  ${(a.storicoPrezzi || []).length ? `<div class="scheda"><h3>Storico dei prezzi</h3><table><tbody>
    ${a.storicoPrezzi.map(s => `<tr><td>${dataIt(s.d)}</td><td class="num">${eur(num(s.p))}</td></tr>`).join("")}
    <tr><td><b>oggi</b></td><td class="num"><b>${eur(num(a.prezzo))}</b></td></tr>
  </tbody></table></div>` : ""}

  ${a.descrizione ? `<div class="scheda"><h3>Testo dell'annuncio</h3>
    <div style="font-family:var(--serif);font-size:14.5px;white-space:pre-wrap;max-height:260px;overflow:auto">${esc(a.descrizione)}</div></div>` : ""}

  <div class="scheda"><h3>Il tuo lavoro su questo immobile</h3>
    <div class="assi" style="margin:0 0 12px">
      <div class="asse"><span class="et">Com'e' andata</span>
        <div class="passi" style="border-top:0;padding-top:0">${GIUDIZI.map(x => `<button data-az="giudizio" data-e="${esc(x.e)}" title="${esc(x.d)}"
          class="${(a.esito || "Da lavorare") === x.e ? "att " + x.cl : ""}">${esc(x.t)}</button>`).join("")}</div>
      </div>
      <div class="asse"><span class="et">Dove lo metto</span>
        <div class="passi mini" style="border-top:0;padding-top:0">${GESTIONI.map(x => `<button data-az="${x.g === "archiviato" ? "archivia" : "gest"}" data-g="${esc(x.g)}" title="${esc(x.d)}"
          class="${gestioneDi(a) === x.g ? "att " + x.cl : ""}">${esc(x.t)}</button>`).join("")}</div>
      </div>
    </div>
    ${a.fotoSospetto ? `<div class="watermark" style="margin:0 0 12px">
      <span>sulle fotografie si legge <b>«${esc(a.fotoSospetto)}»</b>: se e' un marchio, dall'altra parte non c'e' un privato</span>
      <button data-az="escludiAgenzia" data-m="watermark «${esc(a.fotoSospetto)}» sulle fotografie">E' un'agenzia, togli</button>
    </div>` : ""}
    <div class="griglia g3">
      ${campo("Com'e' andata", `<select id="esito">${opz(ESITI, a.esito || "Da lavorare")}</select>`)}
      ${campo("Dove lo metto", `<select id="gestione">${["", "gestito", "rivedere"].map(g => `<option value="${g}"${gestioneDi(a) === g ? " selected" : ""}>${esc(NOMI_GESTIONE[g])}</option>`).join("")}</select>`)}
      ${campo("Chi ha gestito il contatto", `<select id="chi">${opz(S.operatori, a.operatore || S.operatore)}</select>`)}
      ${campo("Ultima telefonata o mail", `<input type="date" id="ultimo" value="${esc(a.ultimoContatto || "")}">`)}
      ${campo("Come l'hai contattato", `<select id="canale">${opz(["", "telefono", "WhatsApp", "email", "modulo del portale", "lettera"], a.canaleContatto)}</select>`)}
      ${campo("Data del richiamo", `<input type="date" id="richiamo" value="${esc(a.dataRichiamo || "")}">`)}
      ${campo("Qualita' delle foto", `<select id="qfoto">${opz(["", "buone", "medie", "scarse"], a.qualitaFoto)}</select>`)}
      ${campo("Cura del testo", `<select id="qtesto">${opz(["", "curato", "medio", "scarno"], a.qualitaTesto)}</select>`)}
    </div>
    ${campo("Note", `<textarea id="note" style="min-height:70px" placeholder="Cosa ti ha detto, cosa gli hai promesso, da dove riprendere…">${esc(a.note || "")}</textarea>`)}
    <div class="bottoniera">
      <button class="azione" data-az="salvaLavoro">Salva</button>
      <button class="azione vuota" data-az="modifica">Modifica tutti i dati</button>
      <button class="azione grigia" data-az="elimina">Elimina</button>
    </div>
    ${(a.storicoEsiti || []).length ? `<div style="margin:14px 0 0;padding:10px 0 0;border-top:1px solid var(--linea)">
      <div style="font-size:12px;color:var(--grigio);margin:0 0 4px">Cosa e' successo finora</div>
      ${a.storicoEsiti.slice().reverse().map(x => `<div class="riga-storico"><span>${dataIt(x.data)}</span><b>${esc(x.esito)}</b><span style="margin-left:auto">${esc(x.chi || "")}</span></div>`).join("")}
    </div>` : ""}
  </div>`;
}

Object.assign(AZIONI, {
  salvaLavoro: () => {
    const a = S.annunci.find(x => x.id === ID);
    const prima = a.esito || "Da lavorare";
    a.esito = $("#esito").value; a.qualitaFoto = $("#qfoto").value;
    a.qualitaTesto = $("#qtesto").value; a.note = $("#note").value;
    a.operatore = $("#chi").value; a.ultimoContatto = $("#ultimo").value;
    a.canaleContatto = $("#canale").value; a.dataRichiamo = $("#richiamo").value;
    a.gestione = $("#gestione").value;
    if (a.esito !== "Da lavorare") a.nuovo = false;
    if (a.esito !== prima) a.storicoEsiti = (a.storicoEsiti || []).concat([{ data: oggiISO(), esito: a.esito, chi: a.operatore }]);
    // scegliere «cattivo» da un menu non fa piu' sparire l'immobile: l'unico tasto che archivia
    // si chiama «Archivia» e sta qui sopra, con la sua conferma
    if (a.esito !== prima && ESITI_CHE_CHIUDONO.includes(a.esito) && !a.gestione) a.gestione = "gestito";
    a.rivistoIl = oggiISO();
    salva(); render();
  },

  /* Gli stessi tasti della vetrina — stessa funzione, non una copia — perche' la scheda si
     apre spesso col telefono gia' all'orecchio e non si ha voglia di scorrere fino ai menu. */
  giudizio: el => {
    const a = S.annunci.find(x => x.id === ID); if (!a) return;
    if (!applicaGiudizio(a, el.dataset.e)) return;
    salva(); render();
  },

  gest: el => {
    const a = S.annunci.find(x => x.id === ID); if (!a) return;
    applicaGestione(a, el.dataset.g);
    salva(); render();
  },

  /* L'unico tasto che toglie l'immobile dalla lista, e l'unico con una conferma. */
  archivia: () => {
    const a = S.annunci.find(x => x.id === ID); if (!a) return;
    const dove = [a.via, a.civico].filter(Boolean).join(" ") || a.titolo || "questo immobile";
    if (!confirm(`Archiviare ${dove}?\n\nEsce dalla lista e non rientra a nessun aggiornamento, nemmeno se il portale lo ripubblica con un altro indirizzo o col testo cambiato.\n\nLo ritrovi nella linguetta «Archivio» degli annunci, e da li' si rimette in lista quando vuoi.`)) return;
    a.gestione = "archiviato"; a.rivistoIl = oggiISO();
    a.operatore = a.operatore || S.operatore;
    const st = a.esito || "Da lavorare";
    const chi = a.operatore;
    escludiAnnuncio(a, st === "Da lavorare"
      ? "archiviato a mano da " + chi + " senza contatto"
      : `${st.toLowerCase()} — ${chi}${a.ultimoContatto ? " il " + dataIt(a.ultimoContatto) : ""}${a.note ? " — " + a.note : ""}`,
      chi, st === "Da lavorare" ? "scartato" : "lavorato");
    S.annunci = S.annunci.filter(x => x.id !== ID);
    salva(); location.href = "radar.html";
  },

  escludiAgenzia: el => {
    const a = S.annunci.find(x => x.id === ID); if (!a) return;
    const dove = [a.via, a.civico].filter(Boolean).join(" ") || a.titolo || "questo immobile";
    if (!confirm(`Togliere ${dove} perche' e' di un'agenzia?\n\nMotivo registrato: ${el.dataset.m}\nNon rientrera' piu' in nessun aggiornamento.`)) return;
    escludiAnnuncio(a, el.dataset.m || "riconosciuto come agenzia", S.operatore);
    S.annunci = S.annunci.filter(x => x.id !== ID);
    salva(); location.href = "radar.html";
  },
  modifica: () => {
    const a = S.annunci.find(x => x.id === ID);
    apriFinestra("Modifica annuncio", moduloAnnuncioLocale(a), () => {
      const d = raccogli(); d.privato = d.privato !== "agenzia";
      Object.assign(a, normalizzaAnnuncio(Object.assign({}, a, d), a.origine));
      a.id = ID; salva(); chiudiFinestra(); render();
    });
  },
  elimina: () => {
    if (!confirm("Eliminare questo annuncio dall'archivio?")) return;
    S.annunci = S.annunci.filter(x => x.id !== ID); salva(); location.href = "radar.html";
  },
  separa: el => {
    const m = S.annunci.find(x => x.id === el.dataset.id);
    if (!m) return;
    m.nonFondere = true;
    m.via = (m.via || "") + " ";          // rompe la coincidenza esatta della via
    salva(); alert("Annuncio separato: da ora conta come immobile a se'."); render();
  },
  portaInTrattativa: () => {
    const a = S.annunci.find(x => x.id === ID);
    const g = gruppoDi(ID);
    const esistente = S.lead.find(l => l.annuncioId === ID);
    if (esistente) { alert("Questo immobile e' gia' in trattativa."); location.href = "pipeline.html"; return; }
    S.lead.push({
      id: uid(), annuncioId: ID, nome: a.inserzionista || (a.via || "").trim(),
      telefono: a.telefono, email: a.email, via: a.via, municipio: a.municipio, zona: a.zona,
      fonte: a.tipo === "Locazione" ? NOMI_FONTI[2] : NOMI_FONTI[1],
      tipo: a.tipo, mq: a.mq, prezzo: a.tipo === "Vendita" ? a.prezzo : "", canone: a.tipo === "Locazione" ? a.prezzo : "",
      giorniOnline: g ? g.giorniOnline : giorniDa(a.pubblicato), ribassi: a.ribassi,
      foto: a.qualitaFoto || "medie", testo: a.qualitaTesto || "medio",
      stato: "In sequenza", dataPrimoContatto: oggiISO(), seq: {},
      note: `Da annuncio ${nomePortale(a.portale)}${a.url ? " — " + a.url : ""}`
    });
    a.esito = "In sequenza";
    const att = attivitaDi(oggiISO()); att.tentativi = num(att.tentativi) + 1;
    salva();
    alert("Portato in trattativa: la sequenza a 90 giorni parte da oggi e il tentativo di contatto e' stato registrato.");
    location.href = "pipeline.html";
  }
});

/* il modulo completo vive nella pagina Annunci: qui ne serve una copia locale */
function moduloAnnuncioLocale(a) {
  return `<div class="griglia g2">
    ${campo("Via e civico", inp("via", a.via))}
    ${campo("Quartiere", inp("quartiere", a.quartiere))}
    ${campo("Municipio", sel("municipio", MUNICIPI, a.municipio))}
    ${campo("Fascia di zona", sel("zona", ZONE.map(z => z.nome), a.zona))}
    ${campo("Tipo", `<select data-k="tipo">${opz(["Vendita", "Locazione"], a.tipo)}</select>`)}
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
    ${campo("Riferimento", inp("riferimento", a.riferimento))}
    ${campo("Pubblicato il", inp("pubblicato", a.pubblicato, "date"))}
    ${campo("Ribassi", inp("ribassi", a.ribassi, "number"))}
    ${campo("Telefono", inp("telefono", a.telefono, "tel"))}
    ${campo("Email", inp("email", a.email, "email"))}
    ${campo("Chi pubblica", `<select data-k="privato">${opz(["privato", "agenzia"], a.privato === false ? "agenzia" : "privato")}</select>`)}
  </div>
  ${campo("Indirizzo dell'annuncio (URL)", inp("url", a.url, "url"))}
  ${campo("Foto di anteprima (URL)", inp("foto", a.foto, "url"))}
  ${campo("Descrizione", `<textarea data-k="descrizione">${esc(a.descrizione || "")}</textarea>`)}`;
}

avviaPagina(render);
