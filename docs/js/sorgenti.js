/* Acquisizione 2 Sarpi — sorgenti dati.
   L'applicazione chiama direttamente i raccoglitori Apify dal tuo browser: i dati vanno da Apify
   al tuo dispositivo, senza passare da nessun server nostro e senza finire sulla pagina pubblica.
   La chiave resta nel browser di questo dispositivo. */

const CHIAVE_APIFY = "ag2sarpi.apify.token";
const tokenApify = () => localStorage.getItem(CHIAVE_APIFY) || "";
const salvaToken = t => localStorage.setItem(CHIAVE_APIFY, (t || "").trim());

const API = "https://api.apify.com/v2";

async function apifyEsegui(attore, input, maxUsd = 1, secondi = 120) {
  const t = tokenApify();
  if (!t) throw new Error("Manca la chiave Apify: impostala nella pagina Dati.");
  const u = `${API}/acts/${attore}/runs?token=${encodeURIComponent(t)}&waitForFinish=${Math.min(60, secondi)}`
    + `&maxTotalChargeUsd=${maxUsd}`;
  const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!r.ok) throw new Error("Apify ha risposto " + r.status + (r.status === 401 ? " — chiave non valida" : ""));
  let d = (await r.json()).data;
  const scadenza = Date.now() + secondi * 1000;
  while (["READY", "RUNNING"].includes(d.status) && Date.now() < scadenza) {
    await new Promise(s => setTimeout(s, 3000));
    const rr = await fetch(`${API}/actor-runs/${d.id}?token=${encodeURIComponent(t)}`);
    d = (await rr.json()).data;
  }
  if (d.status !== "SUCCEEDED" && !d.defaultDatasetId) throw new Error("Raccolta non riuscita (" + d.status + ")");
  return d.defaultDatasetId;
}
async function apifyDataset(id, campi) {
  const t = tokenApify();
  const u = `${API}/datasets/${id}/items?token=${encodeURIComponent(t)}&clean=true&format=json`
    + (campi ? `&fields=${encodeURIComponent(campi)}` : "");
  const r = await fetch(u);
  if (!r.ok) throw new Error("Non riesco a leggere i risultati (" + r.status + ")");
  return r.json();
}

/* ---------------- geocodifica gratuita (OpenStreetMap) ---------------- */
const CACHE_GEO = "ag2sarpi.geo";
function geoCache() { try { return JSON.parse(localStorage.getItem(CACHE_GEO)) || {}; } catch (e) { return {}; } }
async function geocodifica(lat, lon) {
  if (!lat || !lon) return {};
  const k = lat.toFixed(5) + "," + lon.toFixed(5);
  const c = geoCache();
  if (c[k]) return c[k];
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lon}`,
      { headers: { "Accept-Language": "it" } });
    const a = (await r.json()).address || {};
    const civ = a.house_number || "";
    let quartiere = a.suburb || a.neighbourhood || a.quarter || "";
    let municipio = a.city_district || "";
    if (/^municipio/i.test(quartiere)) { municipio = quartiere; quartiere = a.neighbourhood || a.quarter || ""; }
    if (/municipio/i.test(municipio)) municipio = "Municipio " + (municipio.match(/\d+/) || [""])[0];
    else municipio = "";
    const v = { via: ((a.road || "") + (civ ? " " + civ : "")).trim(), civico: civ, quartiere, municipio };
    c[k] = v; localStorage.setItem(CACHE_GEO, JSON.stringify(c));
    return v;
  } catch (e) { return {}; }
}

/* ---------------- sorgenti di annunci ---------------- */
const SORGENTI = [
  {
    id: "subito-vendita", n: "Subito — vendita da privati", portale: "subito",
    attore: "emastra~subito-it-immobili", costo: 0.005,
    input: n => ({ startUrls: ["https://www.subito.it/annunci-lombardia/vendita/appartamenti/milano/milano/"], onlyPrivate: true, maxResultItems: n }),
    campi: "page_url,title,type,price.value,publication_date.date,advertiser.name,advertiser.phone_number,location.coordinates.latitude,location.coordinates.longitude,features.rooms.value,features.bathrooms.value,features.size_sqm.value,features.floor.value,features.energy_class.value,features.building_condition.value,images,description",
    mappa: x => daSubito(x, "Vendita")
  },
  {
    id: "subito-affitto", n: "Subito — affitto da privati", portale: "subito",
    attore: "emastra~subito-it-immobili", costo: 0.005,
    input: n => ({ startUrls: ["https://www.subito.it/annunci-lombardia/affitto/appartamenti/milano/milano/"], onlyPrivate: true, maxResultItems: n }),
    campi: "page_url,title,type,price.value,publication_date.date,advertiser.name,advertiser.phone_number,location.coordinates.latitude,location.coordinates.longitude,features.rooms.value,features.bathrooms.value,features.size_sqm.value,features.floor.value,features.energy_class.value,features.building_condition.value,images,description",
    mappa: x => daSubito(x, "Locazione")
  },
  {
    id: "idealista-vendita", n: "Idealista — vendita da privati", portale: "idealista",
    attore: "studio-amba~idealista-scraper", costo: 0.002,
    input: n => ({ country: "IT", listingType: "sale", searchQuery: "Milano", advertiserType: "private", maxResults: n }),
    campi: "", mappa: x => daIdealista(x, "Vendita")
  },
  {
    id: "idealista-affitto", n: "Idealista — affitto da privati", portale: "idealista",
    attore: "studio-amba~idealista-scraper", costo: 0.002,
    input: n => ({ country: "IT", listingType: "rent", searchQuery: "Milano", advertiserType: "private", maxResults: n }),
    campi: "", mappa: x => daIdealista(x, "Locazione")
  }
];

/* Le immagini di Subito richiedono la regola di ritaglio, altrimenti il server rifiuta. */
const REGOLA_FOTO = "?rule=vertical-mini-card-2x-auto";
const regolaFoto = u => (u && u.includes("images.sbito.it") && !u.includes("rule=")) ? u + REGOLA_FOTO : (u || "");

const STATO_SUBITO = { "ottimo---ristrutturato": "Nuovo / ristrutturato", "nuova-costruzione": "Nuovo / ristrutturato", "buono---abitabile": "Buono", "da-ristrutturare": "Da ristrutturare" };
function daSubito(x, tipo) {
  const g = v => (v && typeof v === "object") ? v.value : v;
  const f = x.features || {};
  return {
    url: x.page_url, portale: "subito",
    riferimento: (x.page_url || "").match(/-(\d+)\.htm/)?.[1] || "",
    titolo: x.title || "", tipo,
    prezzo: g(x.price) ?? x["price.value"], mq: g(f.size_sqm) ?? x["features.size_sqm.value"],
    locali: g(f.rooms) ?? x["features.rooms.value"], bagni: g(f.bathrooms) ?? x["features.bathrooms.value"],
    piano: String(g(f.floor) ?? x["features.floor.value"] ?? ""),
    classeEnergetica: String(g(f.energy_class) ?? x["features.energy_class.value"] ?? "").toUpperCase(),
    statoImmobile: STATO_SUBITO[g(f.building_condition) ?? x["features.building_condition.value"]] || "",
    telefono: (x.advertiser && x.advertiser.phone_number) || x["advertiser.phone_number"] || "",
    inserzionista: (x.advertiser && x.advertiser.name) || x["advertiser.name"] || "",
    foto: regolaFoto((x.images || [])[0] || ""),
    foto2: regolaFoto((x.images || [])[1] || ""),
    foto3: regolaFoto((x.images || [])[2] || ""),
    descrizione: (x.description || "").slice(0, 900),
    pubblicato: (x.publication_date && x.publication_date.date) || x["publication_date.date"] || oggiISO(),
    privato: true,
    // l'indirizzo con civico sta quasi sempre dentro il testo dell'annuncio: vale piu' delle coordinate
    via: (leggiTestoAnnuncio((x.title || "") + "\n" + (x.description || "")).via) || "",
    _lat: (x.location && x.location.coordinates && x.location.coordinates.latitude) || x["location.coordinates.latitude"],
    _lon: (x.location && x.location.coordinates && x.location.coordinates.longitude) || x["location.coordinates.longitude"]
  };
}
function daIdealista(x, tipo) {
  return {
    url: x.url || x.link || "", portale: "idealista",
    riferimento: String(x.propertyCode || x.id || ""),
    titolo: x.title || x.suggestedTexts?.title || "", tipo,
    prezzo: x.price, mq: x.size, locali: x.rooms, bagni: x.bathrooms,
    piano: String(x.floor ?? ""), via: x.address || x.street || "",
    quartiere: x.district || x.neighborhood || "", municipio: "",
    telefono: x.contactPhone || x.phone || "", inserzionista: x.contactName || "",
    foto: x.thumbnail || (x.images || [])[0]?.url || "",
    descrizione: (x.description || "").slice(0, 900),
    pubblicato: (x.datePosted || "").slice(0, 10) || oggiISO(),
    privato: true, _lat: x.latitude, _lon: x.longitude
  };
}

/* Scarica da una o piu' sorgenti, geocodifica quello che ha le coordinate, unisce all'archivio. */
async function aggiornaDaiPortali(idSorgenti, perSorgente, avanzamento) {
  let nuovi = 0, aggiornati = 0, letti = 0;
  for (const id of idSorgenti) {
    const s = SORGENTI.find(x => x.id === id); if (!s) continue;
    avanzamento && avanzamento(`Raccolgo da ${s.n}…`);
    let items = [];
    try {
      const ds = await apifyEsegui(s.attore, s.input(perSorgente), Math.max(0.3, perSorgente * s.costo * 1.4));
      items = await apifyDataset(ds, s.campi);
    } catch (e) { avanzamento && avanzamento(`${s.n}: ${e.message}`); continue; }
    letti += items.length;
    const mappati = [];
    for (let i = 0; i < items.length; i++) {
      const a = s.mappa(items[i]);
      if (a._lat && !a.via) {
        avanzamento && avanzamento(`${s.n}: indirizzo ${i + 1} di ${items.length}…`);
        Object.assign(a, await geocodifica(a._lat, a._lon));
        await new Promise(r => setTimeout(r, 1100));   // limite di cortesia di OpenStreetMap
      }
      delete a._lat; delete a._lon;
      mappati.push(a);
    }
    const e = importaAnnunci(mappati, "apify:" + s.id);
    nuovi += e.nuovi; aggiornati += e.aggiornati;
  }
  return { nuovi, aggiornati, letti };
}

/* ---------------- amministratori di condominio ---------------- */
/* Fonte: schede pubbliche di attivita' su Google Maps. Sono dati d'impresa, non di persone fisiche. */
async function raccogliAmministratori(zone, perZona, avanzamento) {
  let nuovi = 0, aggiornati = 0;
  for (const z of zone) {
    avanzamento && avanzamento(`Cerco amministratori in ${z}…`);
    let items = [];
    try {
      const ds = await apifyEsegui("compass~crawler-google-places", {
        searchStringsArray: ["amministratore di condominio"],
        locationQuery: z + ", Milano, Italia",
        maxCrawledPlacesPerSearch: perZona,
        language: "it", skipClosedPlaces: true
      }, Math.max(0.5, perZona * 0.007 * 1.5), 180);
      items = await apifyDataset(ds, "title,street,city,postalCode,phone,website,url,neighborhood,totalScore,reviewsCount,categoryName");
    } catch (e) { avanzamento && avanzamento(`${z}: ${e.message}`); continue; }
    items.forEach(x => {
      if (!x.title) return;
      const esiste = S.amministratori.find(a => a.nome === x.title || (x.phone && a.telefono === x.phone));
      const d = {
        nome: x.title, telefono: x.phone || "", sito: x.website || "",
        indirizzo: [x.street, x.postalCode, x.city].filter(Boolean).join(", "),
        quartiere: x.neighborhood || "", schedaMaps: x.url || "",
        recensioni: x.reviewsCount || 0, voto: x.totalScore || "",
        fonte: "Google Maps"
      };
      if (esiste) { Object.assign(esiste, d); aggiornati++; }
      else { S.amministratori.push(Object.assign({ id: uid(), relazione: "Da contattare", passi: 0 }, d)); nuovi++; }
    });
  }
  salva();
  return { nuovi, aggiornati };
}

const ZONE_RICERCA = ["Centro", "Porta Romana", "Navigli", "Isola", "Citta Studi", "Sempione", "Bicocca",
  "Lorenteggio", "Affori", "Barona", "Gratosoglio", "Lambrate", "Bovisa", "San Siro", "Corvetto"];
