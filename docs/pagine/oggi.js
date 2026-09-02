/* Pagina Oggi — generata dal nucleo condiviso. */

/* ---------------- vista: OGGI ---------------- */
function vistaOggi() {
  const t = T(), a = attivitaDi(oggiISO());
  const seq = scadenzeSequenza().filter(x => x.data <= oggiISO());
  const gra = scadenzeGrappolo().filter(x => x.data <= oggiISO());
  const reteDaFare = S.rete.filter(r => !r.incontro).length;
  const tentGiorno = Math.round(t.tentativiSett / 5);

  const contatori = CONTATORI.map(c => `
    <div class="contatore">
      <button data-az="meno" data-c="${c.k}">−</button>
      <div class="n">${num(a[c.k])}</div>
      <div class="et"><b>${c.t}</b><br><span style="color:var(--grigio)">${c.s}</span></div>
      <button class="piu" data-az="piu" data-c="${c.k}">+</button>
    </div>`).join("");

  const barraTent = Math.min(100, num(a.tentativi) / tentGiorno * 100);

  return testa("La giornata", "Oggi — " + new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }),
    `<b>L'ora d'oro, 9:30–11:00, cinque giorni su sette, telefono in mano e porta chiusa.</b> Con 1.000 € al mese saltarla ti costa dei risultati. Con 500 €, saltarla azzera il piano — perche' non c'e' budget che compensi.`) + `

  <div class="scheda">
    <h3>Tentativi di contatto di oggi <span class="etichetta">obiettivo ${tentGiorno}/giorno · ${t.tentativiSett}/settimana</span></h3>
    <div style="display:flex;align-items:baseline;gap:10px">
      <span style="font-size:34px;font-weight:800;letter-spacing:-1px">${num(a.tentativi)}</span>
      <span style="color:var(--grigio)">su ${tentGiorno} — settimana: ${sommaSettimana("tentativi")} / ${t.tentativiSett}</span>
    </div>
    <div class="barra"><i class="${barraTent >= 100 ? "v" : barraTent >= 70 ? "a" : ""}" style="width:${barraTent}%"></i></div>
    <div class="griglia g2" style="margin-top:12px">${contatori}</div>
    <div class="bottoniera"><span style="font-size:12px;color:var(--grigio)">Registrato a nome di <b>${esc(S.operatore)}</b>. I contatori sono del giorno; il cruscotto somma settimana e mese.</span></div>
  </div>

  <div class="griglia g2">
    <div class="scheda">
      <h3>Da fare adesso <span class="etichetta">${seq.length + gra.length} scadenze</span></h3>
      ${seq.length || gra.length ? `
        ${seq.map(x => `<div class="spunta">
          <input type="checkbox" data-az="fattoSeq" data-id="${x.lead.id}" data-g="${x.passo.g}">
          <div class="testo"><b>${esc(x.lead.nome || x.lead.via || "Lead")}</b> — giorno ${x.passo.g}: ${esc(x.passo.contenuto)}
          <small>${esc(x.passo.canale)} · previsto ${dataIt(x.data)} ${x.data < oggiISO() ? "· <b style='color:var(--rosso)'>in ritardo</b>" : ""}</small></div>
        </div>`).join("")}
        ${gra.map(x => `<div class="spunta">
          <input type="checkbox" data-az="fattoGrappolo" data-id="${x.mandato.id}" data-i="${x.idx}">
          <div class="testo"><b>Grappolo — ${esc(x.mandato.indirizzo || "mandato")}</b>: ${esc(x.voce.t)}
          <small>giorno ${esc(x.voce.g)} · ${esc(x.voce.chi)}</small></div>
        </div>`).join("")}
      ` : `<div class="vuoto">Nessuna scadenza aperta. Se e' davvero cosi', l'ora d'oro va usata sul radar: apri <b>Radar lead</b> e aggiungi i privati di oggi.</div>`}
    </div>

    <div>
      <div class="scheda">
        <h3>L'agenda della giornata</h3>
        <table><tbody>${AGENDA.map(f => `<tr>
          <td style="white-space:nowrap;font-weight:700;${f.oro ? "color:var(--rosso)" : ""}">${esc(f.fascia)}</td>
          <td>${f.oro ? "<b>" : ""}${esc(f.cosa)}${f.oro ? "</b>" : ""}<br><small style="color:var(--grigio)">${esc(f.perche)}</small></td>
        </tr>`).join("")}</tbody></table>
        <div class="avviso" style="margin:12px 0 0"><b>Accorgimento logistico</b>Non accettare mai due sopralluoghi in quadranti opposti nello stesso pomeriggio. Raggruppa per macro-area: chi non lo fa perde il 20% del proprio tempo utile.</div>
      </div>
      <div class="scheda">
        <h3>Le cinque cose che non si toccano</h3>
        ${INTOCCABILI.map((v, i) => `<div class="spunta"><span style="color:var(--rosso);font-weight:800">${i + 1}</span><div class="testo">${esc(v)}</div></div>`).join("")}
      </div>
    </div>
  </div>

  <div class="scheda">
    <h3>Stato del sistema</h3>
    <div class="griglia g4">
      <div class="dato"><div class="titolo">Lead in sequenza</div><div class="valore">${S.lead.filter(l => l.stato === "In sequenza" || l.stato === "Da contattare").length}</div></div>
      <div class="dato"><div class="titolo">Mandati attivi</div><div class="valore">${S.mandati.length}</div></div>
      <div class="dato"><div class="titolo">Immobili in gestione</div><div class="valore">${S.gestione.length}</div><div class="sotto">obiettivo +2/mese</div></div>
      <div class="dato ${reteDaFare > 0 ? "ambra" : "verde"}"><div class="titolo">Rete da incontrare</div><div class="valore">${reteDaFare}</div><div class="sotto">su ${S.rete.length} inseriti / 20</div></div>
    </div>
  </div>`;
}

/* La lista del radar, in cima: e' con questa che si apre l'ora d'oro. */
/* I richiami promessi. Erano l'unica cosa che il cruscotto sapeva e non diceva a nessuno: la
   data si scriveva nella scheda e poi restava li' dentro, e chi aveva detto «mi richiami
   giovedi'» il giovedi' non lo richiamava nessuno. Un richiamo mancato brucia un contatto
   meglio di una telefonata sbagliata, perche' quello dall'altra parte ci contava. */
function bloccoRichiami() {
  const oggi = oggiISO();
  const dovuti = S.annunci
    .filter(a => a.dataRichiamo && a.dataRichiamo <= oggi && eOnline(a) && !inOptOut(a)
                 && gestioneDi(a) !== "archiviato")
    .sort((a, b) => String(a.dataRichiamo).localeCompare(String(b.dataRichiamo)));
  if (!dovuti.length) return "";
  const tardi = dovuti.filter(a => a.dataRichiamo < oggi).length;
  return `<div class="scheda" style="border-left:3px solid var(--ambra)">
    <h3>Richiami promessi <span class="etichetta">${dovuti.length} da fare${tardi ? ` · ${tardi} in ritardo` : ""}</span></h3>
    ${dovuti.slice(0, 12).map(a => {
      const g = giorniDa(a.dataRichiamo);
      return `<a href="annuncio.html?id=${encodeURIComponent(a.id)}" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--linea);text-decoration:none;color:inherit">
        <span style="flex:1;min-width:0">
          <b style="font-size:14px">${esc([a.via, a.civico].filter(Boolean).join(" ") || a.titolo || "senza indirizzo")}</b>
          <small style="display:block;color:var(--grigio);font-size:11.5px">${esc(a.operatore || "—")} · ${esc(a.quartiere || "Milano")}${a.note ? " · " + esc(a.note.slice(0, 60)) : ""}</small>
        </span>
        <b style="flex:0 0 auto;font-size:11.5px;color:${g > 0 ? "var(--rosso)" : "var(--ambra)"}">${g > 0 ? `${g} gg fa` : "oggi"}</b>
      </a>`;
    }).join("")}
  </div>`;
}

function bloccoRadar() {
  if (!S.annunci.length) return `<div class="scheda"><h3>Il radar e' vuoto</h3>
    <p style="font-family:var(--serif);font-size:14.5px">L'ora d'oro senza lista e' un'ora persa. Vai su <a href="radar.html">Annunci</a> e alimenta il radar: bastano il tasto «Prendi annuncio» o un copia-incolla.</p>
    <div class="bottoniera"><a class="azione" href="radar.html" style="text-decoration:none">Apri il radar</a></div></div>`;
  // Nella lista delle chiamate entra solo chi si puo' davvero chiamare oggi: un immobile
  // uscito dai portali e' quasi sempre gia' venduto, e chi ha scritto «no agenzie» ha deciso.
  const chiamabili = S.annunci.filter(a =>
    a.privato !== false && eOnline(a) && !inOptOut(a) && !a.noAgenzie);
  const g = raggruppaAnnunci(chiamabili);
  g.forEach(x => x.p = punteggioAnnuncio(x.capo, x));
  // «da fare» adesso vuol dire due cose insieme: nessuno ci ha messo mano, e nessuno l'ha
  // ancora chiamato. Chi e' segnato gestito o da rivedere non ruba spazio nell'ora d'oro.
  const daFare = g.filter(x => !gestioneDi(x.capo) && (x.capo.esito || "Da lavorare") === "Da lavorare")
    .sort((a, b) => b.p.punti - a.p.punti);
  const nuovi = g.filter(x => x.capo.nuovo || (giorniDa(x.capo.scoperto || x.capo.visto) ?? 99) <= 1).length;
  const usciti = S.annunci.filter(a => !eOnline(a)).length;
  const quota = Math.round(T().tentativiSett / 5);
  return `<div class="scheda">
    <h3>Chi chiamare oggi <span class="etichetta">${daFare.length} immobili da lavorare · ${nuovi} novita'${usciti ? ` · ${usciti} usciti dai portali, fuori lista` : ""}</span></h3>
    ${daFare.length ? daFare.slice(0, Math.max(quota, 8)).map(x => {
      const a = x.capo, emq = num(a.mq) ? Math.round(num(a.prezzo) / num(a.mq)) : null;
      return `<a href="annuncio.html?id=${encodeURIComponent(a.id)}" style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--linea);text-decoration:none;color:inherit">
        <span style="flex:0 0 38px;height:38px;border-radius:8px;background:${a.foto ? `url('${esc(a.foto)}') center/cover` : "var(--tenue)"};"></span>
        <span style="flex:1;min-width:0">
          <b style="font-size:14px">${esc([a.via, a.civico].filter(Boolean).join(" ") || a.titolo || "senza indirizzo")}</b>
          <span style="font-size:9.5px;font-weight:800;letter-spacing:.07em;padding:1px 5px;border-radius:4px;color:#fff;background:${a.tipo === "Locazione" ? "var(--verde)" : "var(--blu)"}">${a.tipo === "Locazione" ? "AFFITTO" : "VENDITA"}</span>
          ${a.nuovo ? `<span style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--verde)">NUOVO</span>` : ""}${a.verdettoInserzionista === "da verificare" ? `<span style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--ambra)"> DA VERIFICARE</span>` : ""}
          <small style="display:block;color:var(--grigio);font-size:11.5px">${esc(a.quartiere || a.municipio || "Milano")} · ${a.prezzo ? eur(num(a.prezzo)) + (a.tipo === "Locazione" ? "/mese" : "") : "prezzo n.d."}${emq ? " · " + emq.toLocaleString("it-IT") + " €/mq" : ""} · ${x.giorniOnline} gg online${x.portali.length > 1 ? " · " + x.portali.length + " portali" : ""}${a.telefono ? " · telefono" : ""}</small>
        </span>
        <b style="flex:0 0 auto;font-size:17px;color:${x.p.punti >= 70 ? "var(--verde)" : x.p.punti >= 45 ? "var(--ambra)" : "var(--grigio)"}">${x.p.punti}</b>
      </a>`;
    }).join("") : `<div class="vuoto">Nessun immobile da lavorare: tutti gia' presi in carico.</div>`}
    <div class="bottoniera"><a class="azione vuota" href="radar.html" style="text-decoration:none">Tutti gli annunci</a>
      <span style="align-self:center;font-size:12px;color:var(--grigio)">La quota di oggi e' ${quota} tentativi: parti dall'alto e scendi.</span></div>
  </div>`;
}
/* ---------------- l'ultimo giro del radar ---------------- */
/* Quando il giro lo fa GitHub — ogni mattina, anche a Mac spento — nessuno e' li' a
   raccontare com'e' andata. Il riepilogo se lo scrive da solo in un file, e la pagina Oggi
   lo mostra in cima: quanti nuovi, quanti usciti, com'e' andata la perlustrazione. */
let RIEPILOGO = null;

/* Il semaforo dell'automatismo. Serve a rispondere a una domanda sola, senza aprire niente
   altro: «sta girando da solo, si' o no?». Le soglie sono tarate sulla cadenza quotidiana: due
   giorni di silenzio sono ancora il ritardo con cui GitHub fa partire i lavori programmati
   quando e' carico, tre no — tre vuol dire che qualcosa si e' rotto e la lista sta invecchiando
   con annunci gia' venduti in prima pagina. */
function statoAutomatismo(r, gg) {
  if (gg === null || gg === undefined) return { cl: "var(--grigio)", t: "mai girato" };
  if (gg >= 3) return { cl: "var(--rosso)", t: `fermo da ${gg} giorni — il giro quotidiano e' saltato` };
  if (gg === 2) return { cl: "var(--ambra)", t: "due giorni senza girare: da tenere d'occhio" };
  if ((r.note || []).length) return { cl: "var(--ambra)", t: "girato, ma con qualcosa da guardare" };
  return { cl: "var(--verde)", t: "sta girando da solo, ogni mattina" };
}

function bloccoRiepilogo() {
  const r = RIEPILOGO;
  if (!r) return "";
  const gg = giorniDa((r.quando || "").slice(0, 10));
  const quando = gg === 0 ? "stamattina" : gg === 1 ? "ieri" : gg != null ? `${gg} giorni fa` : "";
  const st = statoAutomatismo(r, gg);
  const daSolo = /github/i.test(r.origine || "");
  const ins = r.inserzionisti || {};
  const dubbi = num(ins["da verificare"]), agenzie = num(ins["probabile agenzia"]);
  const voci = [
    [num(r.nuovi_in_vista), "immobili nuovi"],
    [num(r.tolti_dalla_vista), "usciti dai portali"],
    [num(ins["privato"]), "privati confermati"],
    [dubbi, "da verificare al telefono"],
    [agenzie, "agenzie sotto copertura, fuori lista"]
  ].filter(([n]) => n > 0);
  return `<div class="scheda">
    <h3><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${st.cl};margin-right:7px"></span>L'ultimo giro del radar
      <span class="etichetta">${esc(quando)}${r.origine ? " · " + esc(r.origine) : ""}</span></h3>
    <div style="font-size:12.5px;color:${st.cl};font-weight:700;margin:0 0 6px">${esc(st.t)}${daSolo ? " — anche a Mac spento" : " — questo giro l'ha fatto il Mac, non GitHub"}</div>
    ${voci.length
      ? `<div style="font-family:var(--serif);font-size:15px">${voci.map(([n, t]) => `<b>${n}</b> ${esc(t)}`).join(" · ")}.</div>`
      : `<div style="font-family:var(--serif);font-size:15px">Nessuna novita': i portali non hanno pubblicato niente di nuovo da privati.</div>`}
    ${(r.note || []).length ? `<div class="avviso" style="margin:10px 0 0">${(r.note).map(esc).join("<br>")}</div>` : ""}
    ${r.credito ? `<div style="font-size:12px;color:var(--grigio);margin:8px 0 0">Credito del radar: ${esc(r.credito)} questo mese.</div>` : ""}
  </div>`;
}

function render() { $("#vista").innerHTML = bloccoRiepilogo() + bloccoRichiami() + bloccoRadar() + vistaOggi(); }
Object.assign(AZIONI, {
  piu: el => { const a = attivitaDi(oggiISO()); a[el.dataset.c] = num(a[el.dataset.c]) + 1; salva(); render(); },
  meno: el => { const a = attivitaDi(oggiISO()); a[el.dataset.c] = Math.max(0, num(a[el.dataset.c]) - 1); salva(); render(); },
  fattoSeq: el => { const l = S.lead.find(x => x.id === el.dataset.id); if (!l) return; l.seq = l.seq || {}; l.seq[el.dataset.g] = true; if (l.stato === "Da contattare") l.stato = "In sequenza"; salva(); render(); },
  fattoGrappolo: el => { const m = S.mandati.find(x => x.id === el.dataset.id); if (!m) return; m.grappolo = m.grappolo || {}; m.grappolo[el.dataset.i] = !m.grappolo[el.dataset.i]; salva(); render(); }
});
avviaPagina(render);
/* Anche la home legge il radar pubblicato: un dispositivo nuovo si riempie da solo,
   senza dover passare prima dalla pagina Annunci. */
// anche «cinque immobili non sono piu' online» e' una novita': prima la pagina restava ferma
// e continuava a proporre di chiamare chi aveva gia' venduto
aggiornaDalFeed(true).then(e => { if (e && (e.nuovi || e.aggiornati || e.spariti || e.respinti)) render(); });

/* Il riepilogo dell'ultimo giro: se il file non c'e' — perche' il giro non e' ancora mai
   girato — la pagina resta esattamente com'era, senza avvisi e senza buchi. */
fetch("dati/riepilogo.json?t=" + Date.now(), { cache: "no-store" })
  .then(r => r.ok ? r.json() : null)
  .then(d => { if (d) { RIEPILOGO = d; render(); } })
  .catch(() => {});
