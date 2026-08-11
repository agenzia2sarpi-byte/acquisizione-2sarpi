/* Pagina Gestione locativa — generata dal nucleo condiviso. */

/* ---------------- vista: GESTIONE LOCATIVA ---------------- */
const CONTRATTI = ["Concordato 3+2", "Libero 4+4", "Transitorio", "Studenti universitari", "Breve"];
function vistaGestione() {
  const ric = S.gestione.reduce((s, g) => s + num(g.canone) * 12 * (num(g.perc) || 8) / 100, 0);
  const mese = oggiISO().slice(0, 7);
  const nuoviMese = S.gestione.filter(g => (g.dataInizio || "").startsWith(mese)).length;
  return testa("Il motore finanziario", "Gestione locativa",
    `<b>+2 immobili in gestione al mese.</b> A 24 immobili gestiti sono circa 27.000 € l'anno di ricavi ricorrenti — oltre quattro volte il budget pubblicitario annuo — e statisticamente 2-4 mandati di vendita l'anno che arrivano da soli, a costo di acquisizione zero.`) + `

  <div class="griglia g3">
    <div class="dato"><div class="titolo">Immobili in gestione</div><div class="valore">${S.gestione.length}</div><div class="sotto">soglia per salire a 1.000 €: 12</div></div>
    <div class="dato ${nuoviMese >= 2 ? "verde" : "ambra"}"><div class="titolo">Nuovi questo mese</div><div class="valore">${nuoviMese}</div><div class="sotto">obiettivo +2/mese</div></div>
    <div class="dato"><div class="titolo">Ricavo ricorrente annuo</div><div class="valore">${eur(ric)}</div><div class="sotto">${ric >= T().budget * 12 ? "copre l'intero budget annuo" : "budget annuo: " + eur(T().budget * 12)}</div></div>
  </div>

  <div class="scheda" style="margin-top:12px">
    <h3>Calcolatore del canone concordato <span class="etichetta">il gancio fiscale</span></h3>
    <div class="griglia g3">
      ${campo("Canone mensile (€)", `<input type="number" id="ccCanone" value="1200">`)}
      ${campo("IMU risparmiata stimata (€/anno)", `<input type="number" id="ccImu" value="0">`)}
      ${campo("", `<button class="azione" data-az="calcolaConcordato" style="margin-top:18px">Calcola</button>`)}
    </div>
    <div id="ccEsito"></div>
    <div class="avviso" style="margin-top:10px"><b>Da verificare</b>Aliquote, requisiti e valori dell'accordo territoriale milanese cambiano nel tempo e variano per fascia di zona. Fai confermare i numeri correnti dal commercialista prima di metterli in comunicazione, e aggiornali una volta l'anno.</div>
  </div>

  <div class="bottoniera nostampa"><button class="azione" data-az="nuovaGestione">+ Immobile in gestione</button></div>

  ${S.gestione.length ? `<div class="scheda" style="margin-top:12px"><div class="tabellone"><table>
    <thead><tr><th>Immobile</th><th>Contratto</th><th class="num">Canone</th><th class="num">%</th><th class="num">Ricorrente/anno</th><th>Rivalutazione</th></tr></thead>
    <tbody>${S.gestione.map(g => {
      const gg = giorniDa(g.ultimaRivalutazione || g.dataInizio);
      const scad = gg !== null && gg > 180;
      return `<tr>
      <td><b data-az="apriGestione" data-id="${g.id}" style="cursor:pointer;border-bottom:1px dotted var(--linea)">${esc(g.indirizzo || "—")}</b><br><small style="color:var(--grigio)">${esc(g.municipio || "")}</small></td>
      <td><small>${esc(g.tipoContratto || "—")}</small></td>
      <td class="num">${eur(num(g.canone))}</td><td class="num">${num(g.perc) || 8}%</td>
      <td class="num">${eur(num(g.canone) * 12 * (num(g.perc) || 8) / 100)}</td>
      <td>${scad ? `<span class="tag ambra">da rivalutare</span>` : `<small>${dataIt(g.ultimaRivalutazione || g.dataInizio)}</small>`}</td></tr>`;
    }).join("")}</tbody></table></div></div>` : `<div class="vuoto">Nessun immobile in gestione. E' l'unica entrata prevedibile che un'agenzia immobiliare possa avere: sono i soldi che ti permettono di non spegnere la pubblicita' nei mesi vuoti.</div>`}

  <div class="scheda"><h3>Il pacchetto «gestione chiavi in mano» — 8-10% del canone annuo</h3>
    <div class="griglia g2">
      ${[["Selezione inquilino", "Verifica documentale reddituale, controllo affidabilita', referenze del precedente locatore. Il proprietario paga soprattutto per non sbagliare persona."],
        ["Canone garantito", "Polizza di garanzia locativa tramite partner assicurativo. E' l'argomento che vince la diffidenza dei proprietari prudenti e, soprattutto, di quelli lontani."],
        ["Burocrazia completa", "Contratto, registrazione telematica, cedolare, attestazione concordato, adempimenti annuali, disdette. Il proprietario non tocca niente."],
        ["Verbali fotografici", "Consegna e riconsegna documentate voce per voce. Elimina la causa numero uno di lite sul deposito cauzionale."],
        ["Manutenzione", "Rete di artigiani, interventi entro 48 ore, preventivi autorizzati sopra soglia. Fidelizza e rifornisce la rete di segnalatori."],
        ["Report semestrale", "Incassi, spese, stato dell'immobile e <b>valore di mercato aggiornato</b>. E' il seme del futuro mandato di vendita."]]
        .map(([t, d]) => `<div class="dato"><div class="titolo">${t}</div><div style="font-family:var(--serif);font-size:14px;margin-top:5px">${d}</div></div>`).join("")}
    </div>
  </div>

  <div class="scheda"><h3>Le quattro nicchie di Milano</h3>
    <table><tbody>
      <tr><td><b>Studenti e fuorisede</b></td><td>Rotazione alta, commissioni ripetute sullo stesso immobile, forte stagionalita' estiva da anticipare in primavera.</td></tr>
      <tr><td><b>Giovani professionisti e coppie</b></td><td>Il volume. Ticket 900-1.600 €, decisione rapida, alta sensibilita' alla qualita' dell'annuncio.</td></tr>
      <tr><td><b>Expat e trasferimenti aziendali</b></td><td>Il segmento a maggior valore: canoni alti, contratti spesso garantiti dall'azienda, rinnovi frequenti. Si raggiunge con relazioni — agenzie di relocation e uffici HR — non con budget.</td></tr>
      <tr><td><b>Ex host di affitti brevi</b></td><td>Gia' abituati a pagare un servizio di gestione: la conversazione parte avanti. Il piu' redditizio, perche' entrano direttamente nella gestione.</td></tr>
    </tbody></table>
  </div>`;
}
function apriGestione(id) {
  const g = id ? S.gestione.find(x => x.id === id) : { id: uid(), dataInizio: oggiISO(), perc: 8, tipoContratto: "Concordato 3+2" };
  apriFinestra(id ? "Immobile in gestione" : "Nuovo immobile in gestione", `<div class="griglia g2">
    ${campo("Indirizzo", inp("indirizzo", g.indirizzo))}
    ${campo("Municipio", sel("municipio", MUNICIPI, g.municipio))}
    ${campo("Tipo di contratto", sel("tipoContratto", CONTRATTI, g.tipoContratto))}
    ${campo("Canone mensile (€)", inp("canone", g.canone, "number"))}
    ${campo("Percentuale di gestione (%)", inp("perc", g.perc, "number"))}
    ${campo("Inizio gestione", inp("dataInizio", g.dataInizio, "date"))}
    ${campo("Ultima rivalutazione", inp("ultimaRivalutazione", g.ultimaRivalutazione, "date"))}
  </div>${campo("Note", `<textarea data-k="note">${esc(g.note || "")}</textarea>`)}
  ${id ? `<div class="bottoniera"><button class="azione grigia" data-az="eliminaGestione" data-id="${g.id}">Elimina</button></div>` : ""}`,
    () => { Object.assign(g, raccogli()); if (!id) S.gestione.push(g); salva(); chiudiFinestra(); render(); });
}

function render() { $("#vista").innerHTML = vistaGestione(); }
Object.assign(AZIONI, {
  nuovaGestione: () => apriGestione(null),
  apriGestione: el => apriGestione(el.dataset.id),
  eliminaGestione: el => { if (confirm("Eliminare?")) { const id = el.dataset.id; S.gestione = S.gestione.filter(x => x.id !== id); salva(); chiudiFinestra(); render(); } },
  calcolaConcordato: () => {
    const c = num($("#ccCanone").value), imu = num($("#ccImu").value);
    const annuo = c * 12, t21 = annuo * 0.21, t10 = annuo * 0.10;
    $("#ccEsito").innerHTML = `<div class="griglia g3" style="margin-top:10px">
      <div class="dato"><div class="titolo">Cedolare 21% (libero)</div><div class="valore">${eur(t21)}</div><div class="sotto">imposta annua</div></div>
      <div class="dato"><div class="titolo">Cedolare 10% (concordato)</div><div class="valore">${eur(t10)}</div><div class="sotto">imposta annua</div></div>
      <div class="dato verde"><div class="titolo">Risparmio annuo</div><div class="valore">${eur(t21 - t10 + imu)}</div><div class="sotto">${imu ? "incluse riduzioni IMU" : "IMU esclusa"} · ogni anno</div></div>
    </div>
    <div class="copiabile" id="testoConcordato" style="margin-top:10px">Su un canone di ${eur(c)} al mese, il contratto a canone concordato 3+2 nel Comune di Milano le fa risparmiare circa ${eur(t21 - t10 + imu)} l'anno di sole imposte — ogni anno, a fronte di un canone leggermente piu' basso. L'attestazione di rispondenza la gestisco io per lei.</div>
    <div class="bottoniera nostampa"><button class="azione vuota" data-az="copia" data-t="testoConcordato">Copia</button></div>`;
  }
});
avviaPagina(render);
