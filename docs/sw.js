/* =======================================================================
   Acquisizione 2 Sarpi — service worker

   L'icona nel Dock del Mac e nella schermata Home dell'iPhone apre questo
   cruscotto come un'applicazione. Senza service worker ogni apertura
   riscarica pagina, foglio di stile e i sei file del nucleo: si vede il
   bianco prima del cruscotto. Con questo il guscio e' gia' sul
   dispositivo e compare subito.

   Il sito e' pubblicato su un sottopercorso di GitHub Pages
   (/acquisizione-2sarpi/), non sulla radice del dominio. Per questo il
   file sta accanto alle pagine e va registrato con un indirizzo
   relativo: un service worker comanda soltanto la cartella in cui si
   trova e quelle sotto.

   Le regole:

     dati/       mai dalla cache. Sono il radar vivo — annunci, condomini,
                 scaduti, posta — e le pagine li chiedono gia' con
                 ?t=<adesso> proprio per avere sempre l'ultima versione.
                 Metterli in cache vorrebbe dire lavorare su un radar di
                 ieri senza accorgersene.
     ?v=<data>   foglio di stile e file js: l'indirizzo porta la data
                 della versione, quindi a parita' di indirizzo il
                 contenuto non cambia. Si servono dalla cache e basta.
     pagine      dalla cache subito, e intanto si riscaricano di nascosto
                 per la volta dopo. Qui si puo': i dati di lavoro stanno
                 in localStorage, non dentro la pagina, quindi una pagina
                 di ieri non mostra numeri di ieri.

   Per spegnerlo: togliere sw.js dalla pubblicazione — quando il browser
   non trova piu' il file cancella da solo la registrazione. Oppure, in
   console:
     navigator.serviceWorker.getRegistrations()
       .then(r => r.forEach(x => x.unregister()));
     caches.keys().then(k => k.forEach(c => caches.delete(c)));
   ======================================================================= */

const VERSIONE = '2026-09-10';
const CACHE    = 'acq2s-' + VERSIONE;

/* Le pagine non hanno la data nell'indirizzo e si elencano cosi' come
   sono. */
const PAGINE = [
  './',
  'index.html', 'cruscotto.html', 'radar.html', 'pipeline.html',
  'condomini.html', 'posta.html', 'rete.html', 'scaduti.html',
  'gestione.html', 'annuncio.html', 'dati.html', 'metodo.html',
  'strumenti.html',
  'manifest.webmanifest',
  'icone/icona-180.png', 'icone/icona-192.png', 'icone/icona-512.png',
];

/* Foglio di stile e javascript portano invece ?v=<data> nell'indirizzo.
   La data NON si scrive qui: si legge da dati/versione.json, che e' gia'
   la fonte unica da cui nucleo.js capisce se la pagina e' vecchia. Un
   secondo posto dove tenerla allineata sarebbe un secondo posto da
   dimenticare.

   Vanno precaricati tutti, anche quelli delle pagine non ancora aperte:
   senza il proprio script una pagina si apre col guscio disegnato e il
   corpo vuoto, che e' peggio di un'attesa. */
const CODICE = [
  'css/stile.css',
  'js/nucleo.js', 'js/contenuti.js', 'js/annunci.js', 'js/esclusi.js',
  'js/squadra.js', 'js/sorgenti.js',
  'pagine/oggi.js', 'pagine/cruscotto.js', 'pagine/radar.js',
  'pagine/pipeline.js', 'pagine/condomini.js', 'pagine/posta.js',
  'pagine/rete.js', 'pagine/scaduti.js', 'pagine/gestione.js',
  'pagine/annuncio.js', 'pagine/dati.js', 'pagine/metodo.js',
  'pagine/strumenti.js',
];

async function versioneCorrente() {
  try {
    const r = await fetch('dati/versione.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) return String((await r.json()).v || '');
  } catch (_) { /* offline: si precarica solo quello senza data */ }
  return '';
}

self.addEventListener('install', evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const v = await versioneCorrente();
    const elenco = PAGINE.concat(v ? CODICE.map(f => f + '?v=' + v) : []);
    /* Uno per uno e non con addAll: se manca un file solo, addAll fa
       fallire l'installazione intera e il cruscotto resta senza guscio. */
    await Promise.all(elenco.map(async indirizzo => {
      try {
        const r = await fetch(new Request(indirizzo, { cache: 'reload' }));
        if (r.ok) await cache.put(indirizzo, r);
      } catch (_) { /* offline mentre si installa: pazienza */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', evento => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  let url;
  try { url = new URL(richiesta.url); } catch (_) { return; }

  /* Solo roba nostra: Apify, Supabase e le mappe non si toccano. */
  if (url.origin !== self.location.origin) return;

  /* Fuori dalla cartella del cruscotto non ci mettiamo bocca. */
  const base = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(base)) return;

  /* Il radar vivo non si mette mai in cache. */
  if (url.pathname.includes('/dati/')) return;

  /* Le pagine si conservano sotto il solo percorso, senza la parte dopo
     il punto interrogativo. Due motivi, e il secondo e' delicato.

     Il primo: annuncio.html?id=... e' sempre lo stesso file, l'immobile
     lo sceglie il javascript leggendo l'indirizzo. Tenerne una copia per
     ogni immobile riempirebbe la cache di doppioni identici.

     Il secondo: nucleo.js confronta dati/versione.json con il ?v= scritto
     dentro la pagina che ha in mano, e se non combaciano ricarica su
     ?v=<nuova>. Se servissimo dalla cache la pagina vecchia anche a
     quella richiesta, il confronto fallirebbe di nuovo e si ricaricherebbe
     all'infinito. Percio' una navigazione che porta ?v= o ?r= — cioe' una
     richiesta esplicita di versione fresca — passa dalla rete per prima,
     e quello che torna sostituisce la copia vecchia. */
  const eNavigazione = richiesta.mode === 'navigate';
  const chiedeFresco = eNavigazione &&
        (url.searchParams.has('v') || url.searchParams.has('r'));
  const chiave = eNavigazione ? url.origin + url.pathname : richiesta;

  evento.respondWith((async () => {
    const cache   = await caches.open(CACHE);
    const salvata = await cache.match(chiave);

    const dallaRete = fetch(richiesta).then(risposta => {
      if (risposta && risposta.ok) cache.put(chiave, risposta.clone());
      return risposta;
    }).catch(() => null);

    /* Versione fresca richiesta apposta: prima la rete. Se la rete non
       c'e', meglio la copia vecchia della schermata di errore. */
    if (chiedeFresco) {
      const risposta = await dallaRete;
      if (risposta) return risposta;
      if (salvata) return salvata;
      return Response.error();
    }

    /* C'e' in cache: si serve subito e si aggiorna di nascosto. */
    if (salvata) { evento.waitUntil(dallaRete); return salvata; }

    const risposta = await dallaRete;
    if (risposta) return risposta;

    /* Prima visita e niente rete: per una pagina si ripiega sul
       cruscotto, cosi' invece dell'errore del browser si vede il sito. */
    if (eNavigazione) {
      const ripiego = await cache.match('index.html');
      if (ripiego) return ripiego;
    }
    return Response.error();
  })());
});

self.addEventListener('message', evento => {
  if (evento.data === 'disattiva') {
    caches.keys().then(n => Promise.all(n.map(c => caches.delete(c))))
      .then(() => self.registration.unregister());
  }
});
