/* Pagina Immobile — la scheda singola, con tutti i portali su cui compare e il messaggio gia' scritto. */

const ID = new URLSearchParams(location.search).get("id");

function gruppoDi(id) {
  const tutti = raggruppaAnnunci(S.annunci);
  return tutti.find(g => g.membri.some(m => m.id === id));
}

function messaggioPrimoContatto(a, g) {
  const rif = riferimentoEmq(a);
  const emq = num(a.mq) ? num(a.prezzo) / num(a.mq) : null;
  const sc = rif && emq ? ((emq - rif.valore) / rif.valore * 100) : null;
  const via = (a.via || "[via]").replace(/,?\s*\d+[a-zA-Z]?\s*$/, "");
  const P = rif ? Math.round(rif.valore).toLocaleString("it-IT") : "[€/mq]";
  const gg = g ? g.giorniOnline : (giorniDa(a.pubblicato) ?? 0);
  if (a.tipo === "Locazione") {
    return `Buongiorno, sono Gaetano dell'Agenzia 2 Sarpi.

Non le scrivo per propormi: ho visto che affitta il suo immobile in ${via} da solo e le volevo segnalare due cose che forse le sono utili.

La prima: con un contratto a canone concordato 3+2 nel Comune di Milano si accede alla cedolare secca al 10% invece del 21%, piu' riduzioni IMU. Su un canone come il suo sono oltre mille euro l'anno di tasse risparmiate, ogni anno.

La seconda: la parte che fa perdere piu' tempo non e' trovare l'inquilino, e' filtrarlo. Se le fa comodo le mando per iscritto come lo verifichiamo noi, senza impegno.

Se preferisce non essere contattato me lo dica pure e non la disturbo piu'.`;
  }
  return `Buongiorno, sono Gaetano dell'Agenzia 2 Sarpi.

Non le scrivo per propormi: ho notato il suo annuncio in ${via} e le volevo segnalare un dato. Nell'ultimo trimestre, in quell'isolato, le chiusure sono avvenute intorno a ${P} €/mq${sc !== null && Math.abs(sc) >= 3 ? `, e il suo posizionamento e' circa ${Math.abs(sc).toFixed(0)}% ${sc > 0 ? "sopra" : "sotto"}` : ""}: ${sc !== null && Math.abs(sc) >= 3 ? "puo' essere del tutto voluto, ma s" : "s"}e le fa comodo le mando il dettaglio scritto delle tre comparabili.${gg > 45 ? `

Le scrivo adesso perche' l'annuncio e' online da ${gg} giorni: e' il momento in cui, di solito, vale la pena rivedere insieme non tanto il prezzo quanto il modo in cui l'immobile viene filtrato.` : ""}

Se preferisce non essere contattato me lo dica pure e non la disturbo piu'.`;
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
  <div class="bottoniera nostampa" style="margin:0 0 12px">
    <a class="azione grigia" href="radar.html" style="text-decoration:none">‹ Tutti gli annunci</a>
  </div>

  ${foto.length ? `<div class="galleria" style="margin:0 0 14px">${foto.map(f => `<img src="${esc(f)}" alt="" onerror="this.style.visibility='hidden'">`).join("")}</div>` : ""}

  <div class="intestazione">
    <span class="occhiello">${esc(a.tipo)} · ${esc(a.privato === false ? "agenzia" : "privato")}</span>
    <h2>${esc(a.via || a.titolo || "Immobile")}</h2>
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

  <div class="scheda"><h3>Contatto</h3>
    ${tel || a.email ? `<div class="contatto">
      ${tel ? `<a href="tel:${esc(tel)}">Chiama ${esc(a.telefono)}</a>` : ""}
      ${tel ? `<a class="vuoto" href="https://wa.me/${esc(tel.replace(/^\+/, "").replace(/^0/, "39"))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
      ${a.email ? `<a class="vuoto" href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : ""}
      ${a.url ? `<a class="vuoto" href="${esc(a.url)}" target="_blank" rel="noopener">Apri l'annuncio</a>` : ""}
    </div>` : `<p style="font-family:var(--serif)">Nessun recapito registrato. ${a.url ? `Il primo contatto va comunque fatto <b>dal modulo del portale</b>: e' piu' difendibile sul piano normativo e converte meglio. <a href="${esc(a.url)}" target="_blank" rel="noopener">Apri l'annuncio</a>.` : ""}</p>`}
    <div class="avviso" style="margin:12px 0 0"><b>Prima di telefonare</b>Il Registro Pubblico delle Opposizioni si applica anche ai numeri mobili. Pubblicare un recapito per ricevere offerte di acquisto non equivale a un consenso per proposte commerciali di servizi: primo contatto sul canale che il proprietario ha pubblicato, telefono solo dopo una risposta o previa verifica nel Registro.</div>
  </div>

  <div class="scheda"><h3>Il messaggio, gia' scritto <span class="etichetta">giorno 0 — via portale</span></h3>
    <div class="copiabile" id="msg">${esc(messaggioPrimoContatto(a, g))}</div>
    <div class="bottoniera nostampa">
      <button class="azione" data-az="copia" data-t="msg">Copia il messaggio</button>
      <button class="azione vuota" data-az="portaInTrattativa">Porta in trattativa e avvia la sequenza</button>
    </div>
    <p style="font-size:12.5px;color:var(--grigio);margin:10px 0 0">Da' informazione prima di chiedere, non usa la parola «esclusiva», non svaluta la scelta di vendere da solo e mette l'opt-out in chiaro. Il rifiuto arriva subito e pulito — il che e' un bene: libera tempo per i si'.</p>
  </div>

  <div class="griglia g2">
    <div class="scheda"><h3>Perche' questo punteggio</h3>
      ${p.dettaglio.map(([t, v]) => `<div style="display:flex;gap:10px;font-size:13.5px;padding:6px 0;border-bottom:1px solid var(--linea)">
        <span>${esc(t)}</span><b style="margin-left:auto;color:${v > 0 ? "var(--inchiostro)" : "var(--rosso)"}">${v > 0 ? "+" : ""}${Math.round(v)}</b></div>`).join("")}
      <div style="display:flex;gap:10px;font-size:15px;padding:9px 0 0"><b>Totale</b><b style="margin-left:auto">${p.punti}</b></div>
      ${rif ? `<p style="font-size:12px;color:var(--grigio);margin:8px 0 0">Riferimento di zona: ${Math.round(rif.valore).toLocaleString("it-IT")} €/mq — ${esc(rif.fonte)}.</p>`
      : `<p style="font-size:12px;color:var(--grigio);margin:8px 0 0">Nessun riferimento di zona: servono almeno tre annunci dello stesso quartiere e dello stesso tipo nell'archivio, oppure una fascia impostata a mano.</p>`}
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
    <div class="griglia g3">
      ${campo("Esito", `<select id="esito">${opz(ESITI, a.esito || "Da lavorare")}</select>`)}
      ${campo("Qualita' delle foto", `<select id="qfoto">${opz(["", "buone", "medie", "scarse"], a.qualitaFoto)}</select>`)}
      ${campo("Cura del testo", `<select id="qtesto">${opz(["", "curato", "medio", "scarno"], a.qualitaTesto)}</select>`)}
    </div>
    ${campo("Note", `<textarea id="note" style="min-height:70px">${esc(a.note || "")}</textarea>`)}
    <div class="bottoniera">
      <button class="azione" data-az="salvaLavoro">Salva</button>
      <button class="azione vuota" data-az="modifica">Modifica tutti i dati</button>
      <button class="azione grigia" data-az="elimina">Elimina</button>
    </div>
  </div>`;
}

Object.assign(AZIONI, {
  salvaLavoro: () => {
    const a = S.annunci.find(x => x.id === ID);
    a.esito = $("#esito").value; a.qualitaFoto = $("#qfoto").value;
    a.qualitaTesto = $("#qtesto").value; a.note = $("#note").value;
    salva(); render();
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
