/* Acquisizione 2 Sarpi — archivio annunci: normalizzazione, deduplica fra portali, punteggio, importazione.
   La deduplica non guarda l'URL: guarda l'immobile. Lo stesso appartamento su cinque portali resta una riga sola. */

const PORTALI = [
  { id: "immobiliare", n: "Immobiliare.it", dom: ["immobiliare.it"] },
  { id: "idealista", n: "Idealista", dom: ["idealista.it"] },
  { id: "casa", n: "Casa.it", dom: ["casa.it"] },
  { id: "wikicasa", n: "Wikicasa", dom: ["wikicasa.it"] },
  { id: "subito", n: "Subito", dom: ["subito.it"] },
  { id: "bakeca", n: "Bakeca", dom: ["bakeca.it"] },
  { id: "facebook", n: "Facebook", dom: ["facebook.com", "fb.com"] },
  { id: "zappyrent", n: "Zappyrent", dom: ["zappyrent.com"] },
  { id: "dove", n: "Dove.it", dom: ["dove.it"] },
  { id: "rentola", n: "Rentola", dom: ["rentola.it"] },
  { id: "kijiji", n: "Kijiji", dom: ["kijiji.it"] },
  { id: "altro", n: "Altro", dom: [] }
];
const nomePortale = id => (PORTALI.find(p => p.id === id) || { n: id || "Altro" }).n;
function portaleDaUrl(u) {
  let host = "";
  try { host = new URL(String(u)).hostname.toLowerCase(); }
  catch (e) { host = String(u || "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0]; }
  if (!host) return "altro";
  // confronto sul dominio intero: "wikicasa.it" non deve finire dentro "casa.it"
  for (const p of PORTALI) for (const d of p.dom) if (host === d || host.endsWith("." + d)) return p.id;
  return "altro";
}

const TIPOLOGIE = ["Monolocale", "Bilocale", "Trilocale", "Quadrilocale", "5 locali o piu'", "Attico", "Loft", "Villa", "Altro"];
const STATI_IMMOBILE = ["Nuovo / ristrutturato", "Buono", "Da ristrutturare", "Non indicato"];
const ESITI = ["Da lavorare", "Contattato", "In sequenza", "Appuntamento", "Valutazione fatta", "Mandato", "Scartato", "Non contattare"];

/* ---------------- normalizzazione ---------------- */
const senzaAccenti = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PREFISSI = /^(via|viale|v\.le|piazza|p\.zza|piazzale|corso|c\.so|largo|vicolo|strada|ripa|alzaia|bastioni|foro|galleria|passaggio|riva|v\.)\s+/i;
function normalizzaVia(v) {
  return senzaAccenti(String(v || "").toLowerCase())
    .replace(/[.,'`]/g, " ").replace(PREFISSI, "").replace(/\s+/g, " ").trim();
}
function estraiCivico(v) {
  const m = String(v || "").match(/(?:^|[\s,])(\d{1,4})\s*([a-zA-Z]?)\s*$/);
  return m ? (m[1] + (m[2] || "")).toLowerCase() : "";
}
function viaSenzaCivico(v) {
  return normalizzaVia(String(v || "").replace(/(?:^|[\s,])\d{1,4}\s*[a-zA-Z]?\s*$/, ""));
}

/* ---------------- deduplica ---------------- */
function firma(a) {
  return {
    via: viaSenzaCivico(a.via), civico: a.civico || estraiCivico(a.via),
    mq: num(a.mq), locali: num(a.locali), piano: String(a.piano || "").trim().toLowerCase(),
    prezzo: num(a.prezzo), tipo: a.tipo, tel: (a.telefono || "").replace(/\D/g, "").slice(-9)
  };
}
function vicini(x, y, tolleranza) {
  if (!x || !y) return false;
  return Math.abs(x - y) / Math.max(x, y) <= tolleranza;
}
/* 0 = estranei, 1 = stesso immobile. Soglia di fusione: 0.70 */
function somiglianza(a, b) {
  const f = firma(a), g = firma(b);
  if (f.tipo && g.tipo && f.tipo !== g.tipo) return 0;           // vendita non si fonde con affitto
  if (f.tel && g.tel && f.tel === g.tel && vicini(f.mq, g.mq, 0.15)) return 1;  // stesso recapito, stessa metratura
  let p = 0;
  const viaUguale = f.via && g.via && f.via === g.via;
  if (!viaUguale) {
    // vie diverse: si fondono solo se il recapito coincide (gia' gestito sopra)
    return 0;
  }
  p += 0.42;
  if (f.civico && g.civico) p += (f.civico === g.civico) ? 0.20 : -0.30;
  if (vicini(f.mq, g.mq, 0.06)) p += 0.16; else if (f.mq && g.mq) p -= 0.18;
  if (f.locali && g.locali) p += (f.locali === g.locali) ? 0.10 : -0.12;
  if (vicini(f.prezzo, g.prezzo, 0.08)) p += 0.14; else if (f.prezzo && g.prezzo && !vicini(f.prezzo, g.prezzo, 0.25)) p -= 0.15;
  if (f.piano && g.piano) p += (f.piano === g.piano) ? 0.06 : -0.08;
  return Math.max(0, Math.min(1, p));
}
/* Raggruppa in immobili unici. Ritorna [{id, capo, membri:[], portali:[]}] */
function raggruppaAnnunci(lista) {
  const padre = lista.map((_, i) => i);
  const trova = i => padre[i] === i ? i : (padre[i] = trova(padre[i]));
  const unisci = (i, j) => { const a = trova(i), b = trova(j); if (a !== b) padre[b] = a; };
  // indice per via normalizzata: confronta solo chi puo' davvero coincidere
  const indice = {};
  lista.forEach((a, i) => { const k = viaSenzaCivico(a.via) || "?" + i; (indice[k] = indice[k] || []).push(i); });
  Object.values(indice).forEach(gruppo => {
    for (let x = 0; x < gruppo.length; x++)
      for (let y = x + 1; y < gruppo.length; y++)
        if (somiglianza(lista[gruppo[x]], lista[gruppo[y]]) >= 0.70) unisci(gruppo[x], gruppo[y]);
  });
  // fusione per recapito telefonico anche fra vie scritte diversamente
  const perTel = {};
  lista.forEach((a, i) => { const t = (a.telefono || "").replace(/\D/g, "").slice(-9); if (t.length >= 8) (perTel[t] = perTel[t] || []).push(i); });
  Object.values(perTel).forEach(g => {
    for (let x = 0; x < g.length; x++) for (let y = x + 1; y < g.length; y++)
      if (somiglianza(lista[g[x]], lista[g[y]]) >= 0.70) unisci(g[x], g[y]);
  });
  const mappa = {};
  lista.forEach((a, i) => { const r = trova(i); (mappa[r] = mappa[r] || []).push(a); });
  return Object.values(mappa).map(membri => {
    // il capogruppo e' l'annuncio piu' completo, a parita' il piu' vecchio (chi e' online da piu' tempo e' piu' maturo)
    const ordinati = membri.slice().sort((a, b) => completezza(b) - completezza(a) || (a.pubblicato || "").localeCompare(b.pubblicato || ""));
    const capo = ordinati[0];
    return {
      id: capo.id, capo, membri: ordinati,
      portali: [...new Set(membri.map(m => m.portale))],
      giorniOnline: Math.max(...membri.map(m => giorniDa(m.pubblicato) ?? 0)),
      prezzoMin: Math.min(...membri.map(m => num(m.prezzo)).filter(Boolean).concat([Infinity])),
      prezzoMax: Math.max(...membri.map(m => num(m.prezzo)))
    };
  });
}
function completezza(a) {
  let n = 0;
  ["via", "prezzo", "mq", "locali", "piano", "foto", "telefono", "email", "descrizione", "pubblicato"].forEach(k => { if (a[k]) n++; });
  if (a.privato) n += 2;
  return n;
}

/* ---------------- prezzo di riferimento della zona ---------------- */
function emqQuartiere(quartiere, tipo) {
  const v = S.annunci.filter(a => a.quartiere && a.quartiere === quartiere && a.tipo === tipo && num(a.mq) > 15 && num(a.prezzo) > 0)
    .map(a => num(a.prezzo) / num(a.mq)).sort((x, y) => x - y);
  if (v.length < 3) return null;
  return v[Math.floor(v.length / 2)];
}
function riferimentoEmq(a) {
  const q = emqQuartiere(a.quartiere, a.tipo);
  if (q) return { valore: q, fonte: "mediana dell'archivio in " + a.quartiere };
  const z = zonaMedia(a.zona);
  if (z && a.tipo === "Vendita") return { valore: z, fonte: "fascia indicativa " + a.zona };
  return null;
}

/* ---------------- punteggio dell'annuncio ---------------- */
/* Stessa logica del piano: piu' l'annuncio e' messo male e da tanto, piu' vale come lead. */
function punteggioAnnuncio(a, gruppo) {
  let p = 0; const dett = [];
  const mq = num(a.mq), pr = num(a.prezzo);
  const rif = riferimentoEmq(a);
  if (rif && mq && pr) {
    const sc = ((pr / mq) - rif.valore) / rif.valore * 100;
    const v = Math.max(0, Math.min(25, sc * 1.25));
    p += v; dett.push([`Prezzo ${sc > 0 ? "+" : ""}${sc.toFixed(0)}% rispetto alla zona`, v]);
  } else { p += 8; dett.push(["Prezzo di zona non confrontabile", 8]); }

  const gg = gruppo ? gruppo.giorniOnline : (giorniDa(a.pubblicato) ?? 0);
  const vg = Math.max(0, Math.min(20, gg / 6));
  p += vg; dett.push([`${gg} giorni online`, vg]);

  const vf = ({ scarse: 15, medie: 8, buone: 2 })[a.qualitaFoto] ?? 8;
  p += vf; dett.push([`Foto: ${a.qualitaFoto || "non valutate"}`, vf]);

  const vt = ({ scarno: 10, medio: 5, curato: 1 })[a.qualitaTesto] ?? 5;
  p += vt; dett.push([`Testo: ${a.qualitaTesto || "non valutato"}`, vt]);

  const vr = Math.min(10, num(a.ribassi) * 4);
  p += vr; if (num(a.ribassi)) dett.push([`${a.ribassi} ribassi gia' applicati`, vr]);

  const prov = provvigioneAnnuncio(a);
  const vp = Math.max(0, Math.min(20, prov / 1000));
  p += vp; dett.push([`Provvigione stimata ${eur(prov)}`, vp]);

  if (gruppo && gruppo.portali.length >= 3) { p += 4; dett.push([`Pubblicato su ${gruppo.portali.length} portali: sta facendo fatica`, 4]); }
  if (a.privato === false) { p -= 25; dett.push(["Annuncio di agenzia", -25]); }

  return { punti: Math.round(Math.max(0, Math.min(100, p))), dettaglio: dett };
}
function provvigioneAnnuncio(a) {
  if (a.tipo === "Locazione") return num(a.prezzo) * 12 * 0.10 + num(a.prezzo) * 12 * 0.08;
  return num(a.prezzo) * 0.03;
}

/* ---------------- importazione ---------------- */
/* Fonde per (portale + riferimento) o per URL; altrimenti aggiunge. Ritorna {nuovi, aggiornati}. */
function importaAnnunci(lista, origine) {
  let nuovi = 0, aggiornati = 0;
  lista.forEach(x => {
    const a = normalizzaAnnuncio(x, origine);
    if (!a.via && !a.url) return;
    const esiste = S.annunci.find(y =>
      (a.url && y.url === a.url) ||
      (a.portale && a.riferimento && y.portale === a.portale && y.riferimento === a.riferimento));
    if (esiste) {
      const prezzoVecchio = num(esiste.prezzo);
      Object.keys(a).forEach(k => { if (a[k] !== "" && a[k] !== undefined && a[k] !== null && k !== "id" && k !== "esito" && k !== "note") esiste[k] = a[k]; });
      if (prezzoVecchio && num(a.prezzo) && num(a.prezzo) < prezzoVecchio) {
        esiste.ribassi = num(esiste.ribassi) + 1;
        esiste.storicoPrezzi = (esiste.storicoPrezzi || []).concat([{ d: oggiISO(), p: prezzoVecchio }]);
      }
      esiste.visto = oggiISO();
      aggiornati++;
    } else { S.annunci.push(a); nuovi++; }
  });
  salva();
  return { nuovi, aggiornati };
}
function normalizzaAnnuncio(x, origine) {
  const url = x.url || x.link || "";
  const via = x.via || x.indirizzo || "";
  return {
    id: x.id || uid(),
    portale: x.portale || portaleDaUrl(url),
    url, riferimento: x.riferimento || x.ref || "",
    titolo: x.titolo || "",
    via, civico: x.civico || estraiCivico(via),
    quartiere: x.quartiere || "", municipio: x.municipio || "", zona: x.zona || "",
    tipo: x.tipo === "Locazione" || /affitt|locaz|rent/i.test(x.tipo || "") ? "Locazione" : "Vendita",
    tipologia: x.tipologia || "",
    prezzo: num(x.prezzo), mq: num(x.mq), locali: num(x.locali), bagni: num(x.bagni),
    piano: x.piano || "", ascensore: !!x.ascensore, statoImmobile: x.statoImmobile || "",
    classeEnergetica: x.classeEnergetica || "", spese: num(x.spese),
    privato: x.privato === undefined ? true : !!x.privato,
    inserzionista: x.inserzionista || "",
    telefono: x.telefono || "", email: x.email || "",
    foto: x.foto || "", foto2: x.foto2 || "", foto3: x.foto3 || "",
    descrizione: x.descrizione || "",
    pubblicato: (x.pubblicato || oggiISO()).slice(0, 10),
    visto: oggiISO(), origine: origine || "manuale",
    qualitaFoto: x.qualitaFoto || "", qualitaTesto: x.qualitaTesto || "",
    ribassi: num(x.ribassi), esito: x.esito || "Da lavorare", note: x.note || "",
    storicoPrezzi: x.storicoPrezzi || []
  };
}

/* ---------------- lettura del testo incollato ---------------- */
/* Funziona sul testo di un annuncio copiato dal portale: estrae quello che riesce, il resto lo correggi a mano. */
function leggiTestoAnnuncio(testo) {
  const t = String(testo || "").replace(/ /g, " ");
  const a = {};
  const url = (t.match(/https?:\/\/[^\s"'<>]+/) || [])[0];
  if (url) { a.url = url; a.portale = portaleDaUrl(url); }

  const prezzo = t.match(/(?:€|EUR)\s*([\d.]{3,})|([\d.]{4,})\s*(?:€|EUR|euro)/i);
  if (prezzo) a.prezzo = num(prezzo[1] || prezzo[2]);
  const canone = t.match(/([\d.]{3,})\s*€?\s*\/?\s*(?:al\s+)?mese/i);
  if (canone) { a.prezzo = num(canone[1]); a.tipo = "Locazione"; }
  if (/affitt|locazion/i.test(t) && !/vendit/i.test(t.slice(0, 200))) a.tipo = "Locazione";

  const mq = t.match(/(\d{2,4})\s*(?:m²|m2|mq\b|metri\s+quadr)/i)
    || t.match(/(?:superficie|metratura)\D{0,12}(\d{2,4})/i);
  if (mq) a.mq = num(mq[1]);
  const loc = t.match(/(\d{1,2})\s*local/i); if (loc) a.locali = num(loc[1]);
  const bag = t.match(/(\d{1,2})\s*bagn/i); if (bag) a.bagni = num(bag[1]);
  const pia = t.match(/piano\s*[:\s]\s*([\w°]+)/i) || t.match(/(\d{1,2})°\s*piano/i);
  if (pia) a.piano = pia[1];
  if (/ascensore/i.test(t) && !/senza ascensore|no ascensore/i.test(t)) a.ascensore = true;

  const ind = t.match(/\b((?:[Vv]ia|[Vv]iale|[Pp]iazza|[Pp]iazzale|[Cc]orso|[Ll]argo|[Vv]icolo|[Aa]lzaia|[Rr]ipa|[Bb]astioni)\s+[A-ZÀ-Üa-zà-ü'’.\- ]{3,45}?(?:,?\s*\d{1,4}[a-zA-Z]?)?)(?=[,\n•|·]|\s{2,}|$)/);
  if (ind) a.via = ind[1].replace(/\s+/g, " ").trim();

  const tel = t.match(/(?:\+39[\s.]?)?((?:3\d{2}|0\d{1,3})[\s.\-]?\d{3}[\s.\-]?\d{3,4})/);
  if (tel) a.telefono = tel[0].trim();
  const mail = t.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/); if (mail) a.email = mail[0];

  const rif = t.match(/(?:rif\.?|riferimento|codice(?:\s+dell'annuncio)?)[\s:]*([A-Za-z0-9\-_\/]{3,20})/i);
  if (rif) a.riferimento = rif[1];

  const cls = t.match(/classe\s+energetica[\s:]*([A-G]\d?\+?)/i); if (cls) a.classeEnergetica = cls[1].toUpperCase();
  const spe = t.match(/spese\s+condominiali[\s:]*€?\s*([\d.]+)/i); if (spe) a.spese = num(spe[1]);

  if (/privato|da privato|no agenzie/i.test(t)) a.privato = true;
  if (/agenzia|immobiliare s\.?r\.?l|studio immobiliare/i.test(t) && !/no agenzie/i.test(t)) a.privato = false;

  a.descrizione = t.slice(0, 1200);
  a.titolo = (t.split("\n").find(r => r.trim().length > 8) || "").trim().slice(0, 120);
  return a;
}

/* ---------------- feed automatico ---------------- */
/* Un file JSON nella stessa cartella del sito, aggiornato dal radar programmato.
   L'applicazione lo scarica e ne unisce il contenuto senza sovrascrivere il tuo lavoro. */
async function aggiornaDalFeed(silenzioso) {
  try {
    const r = await fetch("dati/radar.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("feed non disponibile");
    const d = await r.json();
    if (!d || !Array.isArray(d.annunci)) throw new Error("feed vuoto");
    if (d.id && d.id === S.feed.ultimoId) { if (!silenzioso) alert("Il radar non ha nulla di nuovo dall'ultimo aggiornamento."); return { nuovi: 0, aggiornati: 0 }; }
    const e = importaAnnunci(d.annunci, "radar");
    S.feed = { ultimoId: d.id || null, ultimaLettura: new Date().toISOString(), generato: d.generato || null };
    salva();
    if (!silenzioso) alert(`Radar aggiornato: ${e.nuovi} nuovi, ${e.aggiornati} aggiornati.`);
    return e;
  } catch (e) {
    if (!silenzioso) alert("Nessun aggiornamento disponibile dal radar.\n(" + e.message + ")");
    return null;
  }
}

/* ---------------- feed degli amministratori ---------------- */
/* Anche questo file lo riscrive il radar quotidiano. Non tocca mai il tuo lavoro:
   stato della relazione, «dati per primo» e note restano come li hai lasciati. */
async function aggiornaAmministratoriDalFeed(silenzioso) {
  try {
    const r = await fetch("dati/amministratori.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("non disponibile");
    const d = await r.json();
    if (!d || !Array.isArray(d.amministratori)) throw new Error("vuoto");
    S.feedAmm = S.feedAmm || {};
    if (d.id && d.id === S.feedAmm.ultimoId) { if (!silenzioso) alert("Nessun amministratore nuovo."); return { nuovi: 0, aggiornati: 0 }; }
    let nuovi = 0, aggiornati = 0;
    d.amministratori.forEach(x => {
      const tel = (x.telefono || "").replace(/\D/g, "");
      const e = S.amministratori.find(a => a.nome === x.nome || (tel && (a.telefono || "").replace(/\D/g, "") === tel));
      if (e) { ["telefono", "sito", "indirizzo", "via", "cap", "quartiere", "municipio", "voto", "recensioni", "schedaMaps", "fonte"].forEach(k => { if (x[k] !== "" && x[k] != null) e[k] = x[k]; }); aggiornati++; }
      else { S.amministratori.push(Object.assign({ id: uid(), relazione: "Da contattare", passi: 0 }, x)); nuovi++; }
    });
    S.feedAmm = { ultimoId: d.id, ultimaLettura: new Date().toISOString() };
    salva();
    if (!silenzioso) alert(`Amministratori aggiornati: ${nuovi} nuovi, ${aggiornati} aggiornati.`);
    return { nuovi, aggiornati };
  } catch (e) {
    if (!silenzioso) alert("Nessun aggiornamento disponibile sugli amministratori.");
    return null;
  }
}
