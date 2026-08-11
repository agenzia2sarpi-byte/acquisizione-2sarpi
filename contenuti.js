/* Acquisizione 2 Sarpi — contenuti operativi
   Tutto quanto e' scritto nei due piani (500 €/mese e 1.000 €/mese), reso consultabile e utilizzabile.
   Questo file contiene solo dati e testi: nessuna informazione personale di clienti. */

const MUNICIPI = ["Municipio 1","Municipio 2","Municipio 3","Municipio 4","Municipio 5","Municipio 6","Municipio 7","Municipio 8","Municipio 9"];

/* Fasce indicative di prezzo — da aggiornare con le quotazioni OMI correnti e con lo storico delle chiusure. */
const ZONE = [
  { nome:"Centro storico e semicentro di pregio", min:8000, max:13000 },
  { nome:"Semicentro consolidato",                min:6000, max:8000  },
  { nome:"Fascia media urbana",                   min:4500, max:6000  },
  { nome:"Fascia accessibile",                    min:3000, max:4500  },
  { nome:"Periferia esterna",                     min:2000, max:3000  }
];
const zonaMedia = z => { const f = ZONE.find(x=>x.nome===z); return f ? (f.min+f.max)/2 : 0; };

/* Le dodici fonti di proprietari, ordinate per rapporto sforzo/resa nei primi 90 giorni. */
const FONTI = [
  { n:"Database esistente riattivato",        costo:"0 €",   quando:"Settimana 1", resa:"2-4 opportunita' immediate" },
  { n:"Privati in vendita (FSBO), tutta Milano", costo:"0 €", quando:"Settimana 1", resa:"Il grosso del volume" },
  { n:"Privati in locazione, tutta Milano",   costo:"0 €",   quando:"Settimana 1", resa:"Lead tripli, poca concorrenza" },
  { n:"Annunci scaduti / mandati non rinnovati", costo:"0 €", quando:"Settimana 2", resa:"1 mandato ogni 8-10 contatti" },
  { n:"Grappolo attorno a ogni trattativa",   costo:"basso", quando:"Settimana 2", resa:"150-200 cassette per immobile trattato" },
  { n:"Amministratori di condominio",         costo:"basso", quando:"Settimana 3", resa:"Il moltiplicatore piu' forte" },
  { n:"Immobili fermi individuati dai dati",  costo:"0 €",   quando:"Settimana 3", resa:"5-10 indirizzi a settimana dal radar" },
  { n:"Host di affitti brevi in uscita",      costo:"0 €",   quando:"Settimana 4", resa:"Conversazione gia' avanzata" },
  { n:"Proprietari non residenti",            costo:"basso", quando:"Mese 2",      resa:"Poca concorrenza, alta fedelta'" },
  { n:"Professionisti (notai, commercialisti, avvocati)", costo:"basso", quando:"Mese 2", resa:"Lenta ma di qualita' altissima" },
  { n:"Investitori e proprietari multipli",   costo:"0 €",   quando:"Mese 2",      resa:"Un contatto vale cinque, in zone diverse" },
  { n:"Immobili in difficolta' (aste, NPL, saldo e stralcio)", costo:"basso", quando:"Mese 3", resa:"Nicchia dove hai un vantaggio" }
];
const NOMI_FONTI = FONTI.map(f=>f.n);

const TIPI = ["Vendita","Locazione","Vendita + Locazione"];
const STATI = ["Da contattare","In sequenza","Contatto riuscito","Valutazione fissata","Valutazione fatta","Mandato firmato","Perso","Non contattare"];

/* La giornata di un'agenzia senza ufficio. */
const AGENDA = [
  { fascia:"9:00 – 9:30",   cosa:"Leggi la lista del radar e decidi chi chiami", perche:"La selezione e' gia' stata fatta dall'automazione alle 7:00" },
  { fascia:"9:30 – 11:00",  cosa:"L'ora d'oro. Solo chiamate a proprietari, niente altro", perche:"E' la fascia in cui le persone rispondono e non sono ancora dentro la giornata", oro:true },
  { fascia:"11:00 – 13:00", cosa:"Follow-up scritti, valutazioni da preparare, rete", perche:"Lavoro che non richiede che l'altro risponda subito" },
  { fascia:"14:30 – 17:30", cosa:"Sopralluoghi e visite, raggruppati per quadrante", perche:"L'unica parte fisica: due o tre nello stesso pezzo di citta', mai sparsi" },
  { fascia:"17:30 – 19:00", cosa:"Seconda finestra di chiamate", perche:"Chi non risponde la mattina risponde a fine giornata" }
];

/* Cadenza a 90 giorni sui privati. Si interrompe a ogni risposta. */
const SEQUENZA = [
  { g:0,  canale:"Portale / email", contenuto:"Messaggio con il dato di zona" },
  { g:3,  canale:"Posta",           contenuto:"Lettera scritta a mano" },
  { g:8,  canale:"Telefono",        contenuto:"Prima chiamata, se il numero e' pubblico e verificato nel Registro" },
  { g:15, canale:"Posta",           contenuto:"Rapporto di Via: la scheda dati della sua strada, stampata apposta" },
  { g:25, canale:"Email / WhatsApp",contenuto:"«Ho un cliente che cerca in questa zona» — solo se e' vero" },
  { g:40, canale:"Telefono",        contenuto:"«Come sta andando? E' cambiato qualcosa?»" },
  { g:55, canale:"Posta",           contenuto:"Cartolina «venduto in via …» con i giorni impiegati" },
  { g:70, canale:"Email",           contenuto:"Guida: i cinque errori di chi vende da solo" },
  { g:90, canale:"Telefono",        contenuto:"«Sono passati tre mesi. Le va di rivedere insieme il prezzo?»" }
];

/* Presidio temporaneo di 60 giorni nel raggio di 100 metri, attorno a ogni mandato. */
const grappoloVoci = piano => ([
  { g:"1",   t:`${piano==="1000"?200:150} Rapporti di Via sulla via dell'immobile e sulle adiacenti`, chi:"Servizio di distribuzione — tu carichi PDF e indirizzo" },
  { g:"1",   t:`Micro-campagna geolocalizzata sul raggio minimo, ${piano==="1000"?"3-4":"2-3"} €/giorno per ${piano==="1000"?"3":"2"} settimane`, chi:"Tu, dal pannello inserzioni, 5 minuti" },
  { g:"2-3", t:"Post con il dato di mercato della via nei gruppi locali di quartiere", chi:"Tu, da casa" },
  { g:"10-15", t:"Open house, con inviti recapitati nei tre stabili adiacenti", chi:"Tu, sul posto: e' l'unica parte fisica" },
  { g:"chiusura", t:"Cartolina «venduto in questa via» con giorni impiegati e percentuale ottenuta", chi:"Servizio di distribuzione" }
]);

/* La lista dei venti: venti relazioni distribuite su macro-aree diverse. */
const RETE_CATEGORIE = [
  { n:"Amministratore di condominio", quota:6, nota:"Il moltiplicatore piu' forte: 40-80 stabili sparsi su piu' zone" },
  { n:"Commercialista",               quota:3, nota:"Intercetta successioni, divisioni, decisioni patrimoniali" },
  { n:"Notaio",                       quota:2, nota:"Materia delicata: si lavora su presentazione, mai su pressione" },
  { n:"Avvocato (successioni, famiglia)", quota:2, nota:"Eventi di vita che precedono una vendita di 3-9 mesi" },
  { n:"Artigiano o impresa di trasloco", quota:3, nota:"Un trasloco e' un immobile che si libera, con settimane di anticipo" },
  { n:"Tecnico (geometra, architetto)", quota:2, nota:"Segue pratiche edilizie su tutta la citta'" },
  { n:"Gestore di servizi (relocation, property management, pulizie)", quota:2, nota:"Inquilini oggi, proprietari domani" }
];
const RETE_DARE = ["Rapporto di Via personalizzato col suo nome, da girare ai suoi clienti","Valutazione gratuita per un suo assistito","Presenza gratuita a un'assemblea dove serve un parere immobiliare"];

/* Cruscotto: soglie per piano. */
const TARGET = {
  "500": {
    etichetta:"500 €/mese", mandatiMese:2, valutazioniMese:9, contattiMese:56, tentativiMese:280,
    tentativiSett:70, contattiSett:14, valutazioniSett:2.5, mandatiSett:0.5,
    costoValutazione:55, costoMandato:250, municipi:3, lettereMese:30, contattiFisiciSett:40,
    budget:500, grappoliAnno:24, canali:"Solo Meta, due campagne",
    voci:[
      { v:"Meta Ads", e:180, c:"Due campagne: valutazione (creativita' alternate) e retargeting", p:"12-18 lead proprietario/mese" },
      { v:"Software e AI", e:90, c:"Radar su nove municipi, archivio, generatore di Rapporti di Via, registrazione chiamate", p:"Le 5 automazioni essenziali" },
      { v:"Rete e relazioni", e:80, c:"Incontri con amministratori e professionisti in municipi diversi", p:"4-5 incontri/mese, distribuiti" },
      { v:"Stampa e distribuzione commissionata", e:80, c:"Rapporti di Via sui grappoli, 30 lettere a mano, cartoline", p:"~350 pezzi/mese, tutti dentro un grappolo" },
      { v:"Dati e documenti", e:40, c:"Visure catastali e ipotecarie, planimetrie", p:"10-15 verifiche/mese" },
      { v:"Spostamenti", e:30, c:"Abbonamento trasporti per sopralluoghi e visite", p:"L'unica voce fisica del piano" },
      { v:"Google Ads", e:0, c:"Sospeso — si riattiva al mese 4, con gli utili", p:"—" }
    ]
  },
  "1000": {
    etichetta:"1.000 €/mese", mandatiMese:3, valutazioniMese:13, contattiMese:52, tentativiMese:260,
    tentativiSett:65, contattiSett:13, valutazioniSett:3.5, mandatiSett:0.75,
    costoValutazione:75, costoMandato:350, municipi:4, lettereMese:20, contattiFisiciSett:0,
    budget:1000, grappoliAnno:36, canali:"Meta + Google",
    voci:[
      { v:"Meta Ads", e:300, c:"Valutazione, locazione e gestione, retargeting, micro-campagne dei grappoli", p:"25-40 lead proprietario/mese" },
      { v:"Google Ads (rete di ricerca)", e:220, c:"Parole ad alta intenzione, tutta la citta' e prima cintura", p:"10-18 lead/mese, qualita' alta" },
      { v:"Software e AI", e:150, c:"Radar, archivio, generatore di Rapporti di Via, VoIP con registrazione, firma digitale, pagina", p:"Le nove automazioni" },
      { v:"Stampa e distribuzione commissionata", e:130, c:"Rapporti di Via, 20 lettere a mano, cartoline", p:"~600 pezzi/mese" },
      { v:"Rete e relazioni", e:120, c:"Incontri con amministratori e professionisti in municipi diversi", p:"4-6 incontri/mese" },
      { v:"Dati e documenti", e:50, c:"Visure catastali e ipotecarie, planimetrie", p:"15-20 verifiche/mese" },
      { v:"Spostamenti", e:30, c:"Abbonamento trasporti per sopralluoghi e visite", p:"L'unica voce fisica del piano" }
    ]
  }
};

/* Le cinque cose che non si toccano (variante 500, valide anche a 1.000). */
const INTOCCABILI = [
  "L'ora d'oro di telefonate, 9:30-11:00, cinque giorni su sette.",
  "La risposta entro 5 minuti a ogni lead in entrata.",
  "La sequenza a 90 giorni sui privati, che non molla la presa.",
  "Il grappolo lanciato il giorno stesso di ogni firma, senza eccezioni.",
  "La conformita': Registro delle Opposizioni, informativa, opt-out, termini dei portali."
];

/* Script e modelli. I segnaposto [X] [Y] [Z] [N] si compilano dai campi in alto. */
const SCRIPT = [
  { id:"portale", t:"Primo contatto — via portale, giorno 0", nota:"Preferisci sempre il canale che il proprietario ha pubblicato: e' piu' difendibile e converte meglio.",
    x:`Buongiorno, sono Gaetano dell'Agenzia 2 Sarpi.

Non le scrivo per propormi: ho notato il suo annuncio in via [X] e le volevo segnalare un dato. Nell'ultimo trimestre, in quell'isolato, le chiusure sono avvenute intorno a [P] €/mq, con tempi medi di [Y] giorni. Il suo posizionamento e' circa [Z]% sopra: puo' essere del tutto voluto, ma se le fa comodo le mando il dettaglio scritto delle tre comparabili.

Se preferisce non essere contattato me lo dica pure e non la disturbo piu'.` },

  { id:"lettera", t:"Lettera scritta a mano — giorno 3", nota:"Busta bianca, indirizzo a mano, francobollo vero, mai affrancatura meccanica. Sei righe. Apertura vicina al 100% contro il 20% di un'email.",
    x:`Gentile Signora,

ho visto che vende il suo appartamento in via [X] da sola, e per come e' messo il mercato in quella zona credo stia facendo la scelta giusta a provarci.

Le lascio comunque un dato che forse le e' utile: nell'ultimo trimestre, in quella via, si e' chiuso mediamente a [P] €/mq, con tempi intorno ai [Y] giorni. Se le va, glielo porto scritto — e' una scheda di una pagina, gliela lascio e non le chiedo nulla.

Nessun impegno e nessuna insistenza: se non mi risponde, non la disturbo oltre.

Gaetano — Agenzia 2 Sarpi · [TEL]` },

  { id:"telefonata", t:"Prima telefonata, dopo la risposta", nota:"Chiusura a doppia alternativa, richiesta piccola: non stai chiedendo il mandato, stai chiedendo venti minuti. Il mandato si chiede alla seconda visita.",
    x:`APERTURA
«Signor [N], grazie di avermi risposto. Le rubo due minuti, poi decide lei. Ha gia' ricevuto visite? … Quante di queste erano acquirenti veri e quante curiosi o agenzie?»

IL PUNTO DI LEVA
«Ecco: il problema che vedo piu' spesso non e' il prezzo, e' il filtro. Su dieci chiamate, mediamente due sono persone con la disponibilita' economica reale. Le altre otto le fanno perdere i sabati.»

LA RICHIESTA MINIMA
«Le propongo una cosa senza impegno: passo io, venti minuti, e le lascio scritto il range di prezzo con tre comparabili vere della sua via. Se poi decide di continuare da solo, l'avra' usato lo stesso ed e' tempo mio, non suo. Le va meglio giovedi' alle 18 o sabato mattina?»` },

  { id:"whatsapp", t:"Risposta automatica entro 60 secondi a un lead in entrata", nota:"Poi la chiamata umana subito dopo. Sotto i 5 minuti converte diverse volte meglio. Se non rispondi in 5 minuti, non spendere in pubblicita' a risposta diretta.",
    x:`Sono Gaetano dell'Agenzia 2 Sarpi, ho ricevuto la sua richiesta per la casa in via [X], la chiamo entro 10 minuti — le va bene?` },

  { id:"obiezione1", t:"Obiezione — «Provo ancora da solo»", nota:"Non insistere: costruisci. Poi la sequenza continua.",
    x:`«Giustissimo, ci mancherebbe. Le lascio solo il dato scritto cosi' quando decide ha un riferimento. Se fra un mese vuole un confronto, sa dove trovarmi.»` },

  { id:"obiezione2", t:"Obiezione — «Le agenzie chiedono troppo»", nota:"Sposta il discorso dal costo al risultato netto.",
    x:`«Capisco, e' una cifra vera. Le faccio una domanda diversa: se io le porto un acquirente che paga 15.000 in piu' e chiude in due mesi invece di otto, la provvigione le e' costata o le ha reso? Se non ci riesco, non me la deve.»` },

  { id:"obiezione3", t:"Obiezione — «Voi non siete di questa zona»", nota:"E' l'obiezione che sentirai piu' spesso lavorando su tutta la citta'. Si vince con i numeri, mai con la simpatia. Se il numero e' zero, di' la verita' e porta il dato di mercato.",
    x:`«Ha ragione a chiedermelo. Le dico cosa faccio io in questa zona: [N] immobili seguiti quest'anno, prezzo medio di chiusura [P] €/mq, tempo medio [Y] giorni. Glielo lascio scritto.»` },

  { id:"amministratore", t:"Primo contatto con un amministratore di condominio", nota:"La regola: dai per primo, tre volte. Non chiedere segnalazioni al primo incontro. La mossa singola piu' efficace e' il Rapporto di Via con la sua intestazione sopra.",
    x:`Buongiorno,

sono Gaetano dell'Agenzia 2 Sarpi. Non la contatto per chiederle segnalazioni.

Produco ogni mese una scheda di una pagina sui prezzi reali al metro quadro, via per via: quanto si e' venduto, in quanti giorni, a che canone si e' affittato. Se le fa comodo gliela preparo con la sua intestazione sopra, cosi' la gira ai suoi condomini a suo nome. Non le costa nulla e non c'e' pubblicita' mia dentro.

Se poi le serve una valutazione per un suo assistito o una presenza a un'assemblea dove serve un parere immobiliare, ci sono.` },

  { id:"nonresidente", t:"Proprietario che non abita a Milano", nota:"Non confrontano cinque agenzie: cercano qualcuno di cui fidarsi. Il protocollo a distanza scritto e' cio' che ti fa scegliere.",
    x:`Buongiorno,

sono Gaetano dell'Agenzia 2 Sarpi, Milano. Lavoro spesso con proprietari che non vivono in citta', quindi le scrivo gia' come funziona, per iscritto:

— sopralluogo in videochiamata, cosi' vede tutto senza prendere un treno;
— firma digitale, niente spostamenti;
— gestione delle chiavi e degli artigiani da parte nostra, con un referente unico;
— report fotografico dopo ogni visita.

Se l'immobile e' affittato o da affittare, gestiamo anche contratto, cedolare, registrazione e adempimenti annuali: lei non tocca niente.` },

  { id:"concordato", t:"Il gancio fiscale — canone concordato", nota:"E' l'argomento di acquisizione piu' potente che hai, e la maggior parte dei piccoli proprietari non lo conosce. Fai confermare aliquote e valori correnti dal commercialista prima di metterli in comunicazione.",
    x:`«Le faccio un conto in trenta secondi. Con un contratto a canone concordato 3+2 nel Comune di Milano lei accede alla cedolare secca agevolata al 10% invece del 21%, piu' riduzioni sull'IMU. Su un canone di [C] € al mese sono circa [R] € l'anno di tasse risparmiate, ogni anno, a fronte di un canone leggermente piu' basso.

Serve l'attestazione di rispondenza rilasciata da un'organizzazione firmataria dell'accordo territoriale: la gestisco io per lei.»` },

  { id:"scaduto", t:"Annuncio scaduto o mandato non rinnovato", nota:"La fonte con il tasso di conversione piu' alto in assoluto: spesso 1 mandato ogni 8-10 contatti. Arrivi nel momento esatto in cui l'esclusiva del collega e' scaduta.",
    x:`Buongiorno,

ho notato che l'immobile in via [X] non e' piu' online. Se ha venduto, complimenti sinceri e la saluto qui.

Se invece l'ha ritirato, le lascio un dato: in quella via, nell'ultimo trimestre, si e' chiuso intorno a [P] €/mq con tempi di [Y] giorni. Nella grande maggioranza dei casi che vedo, il problema non e' stato il prezzo ma il modo in cui l'immobile e' stato presentato e filtrato.

Se le va, glielo guardo e le dico cosa cambierei. Venti minuti, senza impegno.` },

  { id:"host", t:"Host di affitti brevi in uscita", nota:"Sono proprietari gia' abituati a pagare un servizio di gestione: la conversazione parte da un livello piu' avanzato.",
    x:`Buongiorno,

con la stretta sugli affitti brevi molti proprietari stanno valutando il lungo periodo, e quasi sempre la domanda e' una sola: quanto ci perdo davvero.

Le faccio il conto vero, sul suo immobile: rendimento netto del breve — al netto di pulizie, gestione, sfitto e imposte — contro il netto di un 3+2 a canone concordato con cedolare al 10% e canone garantito da polizza. Se il breve resta piu' conveniente glielo dico io.

Nessun impegno: e' un foglio, glielo mando.` }
];

/* Piano a 90 giorni. */
const PIANO90 = {
  "500":[
    { s:"Settimana 1", m:"Mese 1 — Tutto quello che non costa", v:[
      "Apri l'archivio con le quattro tabelle e il campo Municipio su ogni scheda",
      "Imposta le ricerche salvate sui portali per tutti e nove i municipi, non per zona",
      "Riattiva a voce tutto il database esistente, uno per uno",
      "Rivendica e sistema il profilo Google come attivita' di servizio, indirizzo nascosto al pubblico"]},
    { s:"Settimana 2", m:"Mese 1 — Tutto quello che non costa", v:[
      "Costruisci il radar quotidiano su tutte le macro-aree e il punteggio di priorita'",
      "Comincia le chiamate: ora d'oro 9:30-11:00 tutti i giorni, piu' finestra 17:30-19:00",
      "Scrivi e spedisci le prime 30 lettere a mano",
      "Prima raccolta degli annunci scaduti degli ultimi 12 mesi su tutta Milano"]},
    { s:"Settimana 3", m:"Mese 1 — Tutto quello che non costa", v:[
      "Metti online la pagina di valutazione con il generatore di PDF",
      "Attiva la risposta automatica entro 60 secondi",
      "Cura il profilo Google: foto reali, primo post, tutte le domande frequenti compilate",
      "Primi tre incontri della lista dei venti, in tre municipi diversi",
      "Costruisci il generatore di Rapporti di Via e provalo su tre strade a caso in municipi diversi"]},
    { s:"Settimana 4", m:"Mese 1 — Tutto quello che non costa", v:[
      "Metti in agenda il protocollo del grappolo, cosi' alla prima firma parte da solo",
      "Verifica che il tempo di risposta ai lead sia davvero sotto i 5 minuti, con un test fatto da un amico"]},
    { s:"Settimane 5-6", m:"Mese 2 — Accendi il motore", v:[
      "Accendi Meta con budget pieno (180 €), ottimizzando sulle visualizzazioni di pagina",
      "Lancia il pacchetto di gestione locativa con il partner assicurativo per il canone garantito",
      "Pubblica il calcolatore del canone concordato"]},
    { s:"Settimane 7-8", m:"Mese 2 — Accendi il motore", v:[
      "Avvia il canale proprietari non residenti: pagina in inglese, protocollo a distanza scritto",
      "Primi contatti con agenzie di relocation",
      "Contatta sistematicamente gli host di affitti brevi",
      "Secondo giro di Rapporti di Via sui grappoli aperti",
      "Prima verifica del cruscotto: quante valutazioni in casa hai davvero fatto?"]},
    { s:"Settimane 9-10", m:"Mese 3 — Selezionare", v:[
      "Completa i venti incontri della rete, verificando di aver coperto almeno cinque municipi su nove",
      "Aggiungi le pagine locali sul sito per ogni zona in cui hai chiuso davvero",
      "Attiva le automazioni rimandate: trascrizione delle chiamate e canovacci per i contenuti"]},
    { s:"Settimane 11-12", m:"Mese 3 — Selezionare", v:[
      "Doppia riallocazione basata sui dati. Primo: guarda il campo fonte, chiudi i due canali peggiori e sposta il budget sui due migliori",
      "Secondo: guarda il campo municipio. Se i mandati si concentrano in uno o due municipi, non e' un successo: e' la copertura che si restringe da sola",
      "Decidi se sei pronto per salire a 1.000 €"]}
  ],
  "1000":[
    { s:"Settimana 1", m:"Mese 1 — Costruire la macchina", v:[
      "Apri l'archivio con le cinque tabelle e il campo Municipio su ogni scheda: e' la spina dorsale della Leva 1",
      "Imposta le ricerche salvate sui portali per tutti e nove i municipi, non per zona",
      "Riattiva a voce tutto il database esistente",
      "Rivendica e sistema il profilo Google"]},
    { s:"Settimana 2", m:"Mese 1 — Costruire la macchina", v:[
      "Costruisci il radar quotidiano dei privati su tutte le macro-aree e il punteggio di priorita'",
      "Metti online la pagina di valutazione con il generatore di PDF",
      "Configura WhatsApp Business e la risposta entro 60 secondi",
      "Costruisci il generatore di Rapporti di Via e provalo su tre strade a caso in tre municipi diversi"]},
    { s:"Settimana 3", m:"Mese 1 — Costruire la macchina", v:[
      "Prime chiamate: ora d'oro 9:30-11:00 tutti i giorni, piu' finestra 17:30-19:00",
      "Scrivi e spedisci le prime 20 lettere a mano",
      "Prepara il generatore dei Rapporti di Via",
      "Metti in agenda il protocollo del grappolo, cosi' alla prima firma parte da solo"]},
    { s:"Settimana 4", m:"Mese 1 — Costruire la macchina", v:[
      "Accendi Meta e Google con budget pieno",
      "Primi tre incontri della lista dei venti, in tre municipi diversi",
      "Primo bilancio dei numeri"]},
    { s:"Settimane 5-6", m:"Mese 2 — Fare volume", v:[
      "La cadenza a 90 giorni gira in automatico",
      "Attiva la trascrizione delle chiamate e correggi lo script sui dati reali",
      "Costruisci e pubblica il calcolatore del canone concordato",
      "Cura il profilo Google: foto reali, primo post, tutte le domande frequenti compilate"]},
    { s:"Settimane 7-8", m:"Mese 2 — Fare volume", v:[
      "Lancia il pacchetto di gestione locativa con il partner assicurativo per il canone garantito",
      "Avvia il canale proprietari non residenti: materiali in inglese, protocollo a distanza, primi contatti con agenzie di relocation",
      "Secondo giro di Rapporti di Via e cartoline sui grappoli aperti"]},
    { s:"Settimane 9-10", m:"Mese 3 — Selezionare e raddoppiare", v:[
      "Completa i venti incontri della rete, verificando di aver coperto almeno sei municipi su nove",
      "Aggiungi le pagine locali sul sito per ogni zona in cui hai chiuso davvero"]},
    { s:"Settimane 11-12", m:"Mese 3 — Selezionare e raddoppiare", v:[
      "Doppia riallocazione basata sui dati. Primo: guarda il campo fonte di ogni mandato, chiudi i due canali peggiori e sposta il budget sui due migliori",
      "Secondo: guarda il campo municipio. Se i mandati si concentrano in due municipi su nove, e' la copertura che si sta restringendo da sola",
      "Correggi spostando le campagne e gli incontri di rete verso i municipi scoperti"]}
  ]
};

/* Conformita': i quattro punti su cui le agenzie prendono sanzioni reali. */
const CONFORMITA = [
  { g:"Telefonate a numeri di privati", v:[
    { id:"c1", t:"Primo contatto sempre sul canale che il proprietario ha pubblicato", n:"Modulo del portale o email dell'annuncio. Telefono solo dopo una risposta." },
    { id:"c2", t:"Verifica nel Registro Pubblico delle Opposizioni prima di ogni chiamata a freddo", n:"Si applica anche alle numerazioni mobili. Pubblicare un recapito non equivale a un consenso." },
    { id:"c3", t:"Procedura confermata per iscritto dal consulente privacy", n:"" }]},
  { g:"Trattamento dei dati raccolti", v:[
    { id:"c4", t:"Informativa privacy pubblicata e consegnata al primo contatto utile", n:"" },
    { id:"c5", t:"Base giuridica esplicitata con valutazione di bilanciamento scritta e archiviata", n:"Tipicamente il legittimo interesse per il contatto commerciale mirato. Non basta pensarla: va documentata." },
    { id:"c6", t:"Registro dei trattamenti aggiornato, con tempi di conservazione definiti", n:"Es. 24 mesi per i lead non convertiti, e cancellazione effettiva alla scadenza." },
    { id:"c7", t:"Nomina a responsabile del trattamento per ogni fornitore", n:"Archivio, orchestratore, servizio email, fornitore del modello AI. Anche i piani gratuiti richiedono l'accordo firmato." },
    { id:"c8", t:"Opt-out immediato, permanente e valido su tutti i canali", n:"Una lista «non contattare» controllata prima di ogni invio, senza eccezioni." }]},
  { g:"Registrazione delle chiamate", v:[
    { id:"c9", t:"Avviso all'inizio della chiamata, con finalita' e conservazione dichiarate", n:"In alternativa: appunti dettati a fine chiamata e riassunti dal modello. Si perde poco." }]},
  { g:"Portali, contenuti e uso dell'AI", v:[
    { id:"c10", t:"Ricerche salvate e avvisi si', raccolta massiva automatizzata no", n:"Lo scraping massivo viola quasi sempre i termini di servizio. Sul volume la differenza e' piccola, sul rischio e' enorme." },
    { id:"c11", t:"Ogni immagine generata o modificata artificialmente e' dichiarata come tale", n:"Una simulazione d'arredo non dichiarata e' pubblicita' ingannevole." },
    { id:"c12", t:"Ogni testo generato passa da revisione umana prima di uscire", n:"Il modello sbaglia i numeri con grande sicurezza, e in questo mestiere i numeri sono il prodotto." },
    { id:"c13", t:"Le affermazioni di prezzo nei Rapporti di Via poggiano su fonti mostrabili", n:"Un dato sbagliato demolisce l'autorita' in un colpo." }]},
  { g:"Posizione dell'agenzia", v:[
    { id:"c14", t:"Un'ora con il commercialista: iscrizione, sede dichiarata, antiriciclaggio, identificazione nei materiali pubblicitari", n:"Lavorare senza locale aperto al pubblico e' legittimo, ma la posizione di mediatore ha comunque requisiti formali." },
    { id:"c15", t:"Rete strutturata su reciprocita' e servizi resi, non su percentuali", n:"Il diritto alla provvigione spetta solo a chi e' regolarmente iscritto: pagare percentuali a segnalatori non abilitati e' giuridicamente esposto." }]}
];

/* Playbook: le sezioni dei due piani, consultabili. */
const PLAYBOOK = [
  { n:"00", t:"Come si copre Milano senza ufficio e senza presidiare", c:`
<p>Due vincoli, ed entrambi a tuo favore piu' di quanto sembri. <b>Non hai un territorio</b>: lavori su Milano intera. <b>Non hai un ufficio</b>: lavori online e al telefono. Un piano di marketing costruito su vetrina, volantinaggio e passaggio in strada qui non funziona — non perche' sia sbagliato in assoluto, ma perche' presuppone due cose che non hai e non vuoi avere.</p>
<p>Il perno e' un'asimmetria di costi: <b>i canali che coprono la citta' costano quasi quanto coprire un quartiere; solo la presenza fisica costa in proporzione ai metri quadri</b>. Monitorare gli annunci dei privati di un municipio o di tutti e nove ha lo stesso costo marginale — zero.</p>
<h4>Livello 1 — copertura cittadina, continua</h4>
<p>Radar sui portali, annunci scaduti, database, rete di segnalatori e professionisti, campagne a intento, proprietari non residenti. Copre ogni via di Milano, produce la grande maggioranza dei contatti e si esegue interamente da remoto. E' il 90% del piano; con 500 € diventa il 95%.</p>
<h4>Livello 2 — grappolo a distanza</h4>
<p>Attorno a ogni immobile che prendi in mandato, ovunque sia, si apre un presidio di 60 giorni nel raggio di 100 metri — fatto di carta commissionata e annunci geolocalizzati, non di citofoni. Lo lanci in dieci minuti dal telefono. Poi si chiude e si sposta.</p>
<h4>Il vantaggio, e il prezzo</h4>
<p><b>Il vantaggio:</b> senza affitto e senza vetrina, il budget e' marketing puro, non l'avanzo dopo le spese. E puoi accettare un mandato ovunque, senza bacino da rispettare.</p>
<p><b>Il prezzo:</b> nessuno ti vede passando per strada. La fiducia che una vetrina costruisce in due anni la devi costruire online — il che sposta recensioni Google, reperibilita' e velocita' di risposta da «cose utili» a <b>infrastruttura critica</b>. Se sbagli quelle, non hai un piano B.</p>` },

  { n:"01", t:"La matematica, prima delle tattiche", c:`
<p>Il problema di acquisizione non si risolve con piu' pubblicita': si risolve con piu' <b>conversazioni con proprietari</b>.</p>
<h4>Il funnel</h4>
<ul>
<li>Tentativi di contatto → contatto riuscito: <b>~20%</b> (su 100 tentativi, 20 ti rispondono davvero)</li>
<li>Contatto riuscito → appuntamento di valutazione: <b>~25%</b> (1 su 4 ti fa entrare in casa)</li>
<li>Valutazione → mandato firmato: <b>~20-25%</b> (1 su 4-5 firma; sopra il 30% stai valutando troppo poco)</li>
<li>Mandato → mandato in esclusiva: <b>~60%</b> (sotto il 50% stai lavorando per la concorrenza)</li>
</ul>
<p>A 1.000 €: 3 mandati/mese richiedono ~13 valutazioni in casa, 52 contatti riusciti e 260 tentativi — <b>65 tentativi a settimana</b>. A 500 €: i lead pagati scendono a 2-3, quindi per arrivare comunque a 9 valutazioni devi produrne 6-7 da solo, cioe' <b>70 tentativi a settimana</b>, circa 14 al giorno. Quasi lo stesso carico manuale, per un risultato inferiore di un terzo.</p>
<p>C'e' un costo aggiuntivo che pesa il doppio con budget stretto: <b>gli spostamenti</b>. Una valutazione a nord e una a sud nello stesso pomeriggio ti mangiano due ore di traffico. Raggruppa gli appuntamenti per macro-area e per giorno: chi non lo fa perde il 20% del proprio tempo utile.</p>` },

  { n:"02", t:"Le tre leve che sostituiscono zona e vetrina", c:`
<p>Un'agenzia di quartiere ha tre vantaggi: la conoscono, e' vicina, e sa i prezzi di quelle vie. I primi due non puoi averli. <b>Il terzo si' — ed e' quello che pesa di piu' nella decisione di un proprietario.</b></p>
<h4>Leva 1 — densita' di dati invece di densita' di volantini</h4>
<p>Il vantaggio di chi presidia una zona non e' la vetrina: e' sapere a quanto si e' chiuso in quella via. Quel sapere <i>e' replicabile su tutta Milano</i>, perche' costa tempo di archivio e non euro di affitto. L'archivio storico degli annunci, alimentato ogni giorno dal radar su tutti i municipi, <b>e' l'unico asset che un'agenzia senza sede puo' accumulare</b>, e dopo sei mesi vale piu' di una vetrina.</p>
<h4>Leva 2 — rete distribuita invece di presenza fisica</h4>
<p>Venti professionisti scelti in municipi diversi coprono fisicamente piu' citta' di qualsiasi volantinaggio, e a differenza di un volantino sono persone che parlano di te. <b>E' la tua unica presenza permanente sul territorio</b>, ed e' distribuita per costruzione.</p>
<h4>Leva 3 — velocita' invece di prossimita'</h4>
<p>Se non sei vicino a nessuno, devi essere il piu' veloce con tutti. Risposta al lead sotto i 5 minuti, valutazione scritta consegnata entro 48 ore, ovunque sia l'immobile. E' l'unica dimensione su cui batti sistematicamente chi ha la vetrina a cento metri dal portone.</p>
<h4>La regola del grappolo</h4>
<p>Non presidi le zone: presidi le trattative. Nel raggio di cento metri da un immobile in vendita ci sono, statisticamente, altri proprietari che stanno pensando la stessa cosa — e tu sei l'unico che si e' fatto vedere nel momento in cui ci stavano pensando.</p>` },

  { n:"03", t:"Le fonti di proprietari", c:`
<p>Le fonti sono le stesse nei due piani e lavorano tutte su <b>Milano intera</b>. Cambia l'ordine con cui le accendi: a 500 € il criterio non e' «quale rende di piu'» ma <b>«quale rende di piu' per euro speso»</b>.</p>
<h4>Le quattro su cui vivi davvero con budget stretto</h4>
<ul>
<li><b>Privati che vendono da soli, su tutta Milano.</b> Monitora ogni giorno filtrando <i>solo privati</i>: Immobiliare.it, Idealista, Casa.it, Subito, Wikicasa, Bakeca, Facebook Marketplace, gruppi di zona. Un privato che pubblica da solo e', statisticamente, un proprietario che entro 60-90 giorni sara' frustrato. <b>Non devi convincerlo oggi: devi esserci il giorno in cui si stufa.</b></li>
<li><b>Privati che affittano da soli.</b> Meno battuta dalla concorrenza proprio perche' la locazione «rende poco». E' un lead triplo — mandato oggi, gestione ricorrente domani, mandato di vendita fra tre anni — e ha in media quasi due immobili, non uno.</li>
<li><b>Annunci scaduti.</b> Proprietari gia' motivati, gia' passati per un'agenzia, gia' delusi. Spesso <b>1 mandato ogni 8-10 contatti</b>: il miglior rapporto sforzo/resa dell'intero piano, e costa zero perche' la produce il tuo archivio storico.</li>
<li><b>Amministratori di condominio.</b> Un solo amministratore gestisce 40-80 stabili <i>sparsi su piu' zone</i>, e sa tutto: chi ha ereditato, chi e' moroso, chi ha lasciato sfitto, chi litiga per una divisione. Con sei amministratori ben coltivati copri piu' unita', e in piu' quadranti, di quante ne raggiungerebbe mille euro di pubblicita'.</li>
</ul>
<p><b>Attenzione:</b> raccogliere dati dai portali va fatto rispettando i loro termini di servizio — ricerche salvate, avvisi, raccolta manuale assistita. Lo scraping massivo automatizzato viola quasi sempre i ToS. Sul volume la differenza e' piccola, sul rischio e' enorme.</p>` },

  { n:"04", t:"Lo stack e le automazioni", c:`
<p>L'AI qui serve per una cosa sola: <b>farti arrivare all'ora di telefonate gia' sapendo chi chiamare, perche', e cosa dire</b>. Tutto cio' che non riduce quell'attrito e' un giocattolo.</p>
<h4>Architettura minima</h4>
<ul>
<li><b>Raccolta:</b> ricerche salvate e avvisi dei portali (una per macro-area), moduli web, WhatsApp Business — tutto converge in un'unica casella.</li>
<li><b>Orchestrazione:</b> Make.com (piano gratuito, 1.000 operazioni/mese bastano) o n8n autogestito.</li>
<li><b>Archivio:</b> Airtable o Notion — tabelle <code>Proprietari</code>, <code>Immobili</code>, <code>Contatti</code>, <code>Mandati</code>, con campi <code>Zona</code> e <code>Municipio</code>. La memoria dell'agenzia, un solo posto, sempre.</li>
<li><b>Intelligenza:</b> API di un modello linguistico, a consumo (~25 €/mese a 500 €).</li>
<li><b>Contatto:</b> WhatsApp Business, numero con registrazione, email transazionale.</li>
</ul>
<h4>Le cinque automazioni da accendere subito</h4>
<p><b>A. Il radar quotidiano dei privati.</b> Ogni mattina alle 7:00 l'orchestratore legge gli avvisi dei portali per tutte le macro-aree, passa i testi al modello ed estrae in modo strutturato indirizzo, zona, metratura, piano, prezzo, tipologia, stato, recapito se pubblicato. Salva, elimina i doppioni e ti manda <b>una lista di 15-25 nomi raggruppati per macro-area</b>. Alle 9:30 apri il telefono e cominci.</p>
<p><b>B. Il punteggio di priorita'.</b> Con Milano intera nel radar riceverai piu' lead di quanti puoi lavorarne: il punteggio 0-100 e' il meccanismo che decide cosa fai e cosa lasci. Criteri: scostamento dal €/mq reale della zona, giorni online, qualita' delle foto, cura del testo, ribassi gia' applicati, valore stimato della provvigione, distanza in minuti. <b>Un annuncio con foto storte, testo di due righe e prezzo del 15% sopra mercato in una zona a ticket alto e' il tuo lead migliore in assoluto.</b></p>
<p><b>C. La valutazione automatica come esca.</b> Una pagina — «Quanto vale davvero il tuo appartamento a Milano» — con modulo di sei campi, di cui uno e' la zona. Alla compilazione l'automazione genera un PDF di quattro pagine con la tua intestazione: range di prezzo, tre comparabili reali <i>di quella via</i>, tempi medi, tre consigli concreti. <b>Non lo invii per email.</b> Chiami entro cinque minuti e proponi di portarlo a mano. Il PDF non e' il prodotto: e' il pretesto legittimo per entrare in casa.</p>
<p><b>D. La risposta sotto i cinque minuti.</b> Notifica push immediata, messaggio WhatsApp automatico entro 60 secondi, chiamata umana subito dopo. Con budget stretto, <b>se non rispondi in 5 minuti non puoi permetterti di fare pubblicita' affatto</b>.</p>
<p><b>E. Il fascicolo pre-chiamata.</b> Tre righe preparate dal modello: cosa vende, a che prezzo, come si posiziona rispetto alla sua via, da quanto e' online, quale gancio usare. Dieci secondi di lettura, e attacchi con un vantaggio informativo evidente.</p>
<p><b>G. Il follow-up che non muore.</b> L'80% dei mandati da privato si chiude fra il quarto e il dodicesimo contatto, e a mano non ci arriva nessuno. L'automazione tiene la cadenza per 90 giorni, si ferma appena la persona risponde e passa la palla a te.</p>
<h4>Le quattro che rimandi al mese 3 (con 500 €)</h4>
<ul>
<li>Trascrizione e analisi delle chiamate — serve volume accumulato.</li>
<li>Canovacci automatici per i contenuti — nei primi due mesi scrivili tu: <b>l'AI scrive, ma tu appari</b>.</li>
<li>Ripristino visivo degli annunci altrui — arma tattica sui 3-4 privati che vuoi davvero conquistare, dichiarando sempre la simulazione. Circa un terzo, entro sei settimane, da' il mandato.</li>
<li>Report semestrale automatico ai proprietari in gestione.</li>
</ul>
<p><b>Sull'agente vocale AI:</b> anche potendoselo permettere, mai per il primo contatto con un proprietario. La fiducia e' tutto il prodotto che vendi, e farsi anticipare da un robot la brucia. Semmai per compiti a valle — conferma appuntamenti, ricontatto di lead freddissimi — dichiarando sempre in apertura che si tratta di un assistente automatico.</p>` },

  { n:"05", t:"Il budget, riga per riga", c:`
<p>Senza affitto e senza vetrina non c'e' una voce di struttura: ogni euro compra contatti o credibilita'. Il <b>94-97% del budget lavora indifferentemente su qualsiasi indirizzo di Milano</b>. Dimezzare il budget non ha ridotto la copertura geografica di un metro: ha ridotto quanti contatti riesci a produrre dentro quella copertura.</p>
<h4>Cosa costa zero, e vale doppio</h4>
<ul>
<li><b>Il profilo Google, configurato come attivita' di servizio.</b> Senza vetrina puoi comunque comparire nelle ricerche locali: ti registri come <i>service-area business</i>, con l'indirizzo verificato ma <b>nascosto al pubblico</b> e l'area di servizio impostata sul Comune di Milano. E' la mossa gratuita piu' importante, e va fatta nella settimana 1 perche' la verifica richiede giorni.</li>
<li><b>Le recensioni.</b> Per te sono <b>l'intera infrastruttura di fiducia</b>, cio' che un proprietario guarda al posto della tua insegna. Obiettivo 50 nei primi 12 mesi, chieste a voce a fine trattativa. E chiedi di <i>nominare la zona dell'immobile</i>: e' cio' che ti fa comparire nelle ricerche di quartiere in tutti i municipi dove hai lavorato.</li>
<li><b>Una pagina per ogni zona in cui hai chiuso davvero.</b> Con dati veri, mai inventate. In dodici mesi e' una rete di pesca gratuita stesa su tutta Milano — la vetrina che non hai, moltiplicata per venti.</li>
<li><b>Riattivazione del database.</b> Settimana 1, a voce, uno per uno. Da 200 nomi escono 2-4 opportunita' immediate.</li>
</ul>` },

  { n:"06", t:"Le campagne a pagamento", c:`
<h4>Con 1.000 € — Meta 300 € + Google 220 €</h4>
<p>Su scala cittadina <b>non targettizzi piu' per raggio, targettizzi per intenzione</b>. Tre regole: segmenta per fascia di prezzo, non per quartiere; usa il modulo nativo di Meta ma con domande di qualificazione (zona, metratura, tempistica, se e' gia' in vendita); cambia le creativita' ogni quattro settimane.</p>
<p>Su Google non generi domanda: la intercetti. Gruppi: intenzione di vendita, locazione e fisco, zona per zona, situazioni specifiche (casa ereditata, con inquilino, all'asta). Escludi subito <code>lavoro</code>, <code>stage</code>, <code>corso</code>, <code>gratis pdf</code>, <code>simulatore</code>, <code>agenzia entrate</code> e i nomi dei portali. Corrispondenza a frase o esatta, mai generica. <b>Non usare parole come «agenzia immobiliare milano»</b>: costano molto e ti mettono contro chi ha cento volte il tuo budget.</p>
<h4>Con 500 € — solo Meta, 180 €</h4>
<p>Google avrebbe volumi sufficienti, ma e' il campo dove competi direttamente con i grandi network: con 60 € compreresti una manciata di clic ai margini dell'asta. <b>Meglio un canale finanziato decentemente che due canali affamati.</b> Una campagna valutazione (120 €) alternando le creativita' vendita/locazione ogni due settimane, e una di retargeting (60 €).</p>
<p><b>La regola tecnica che salva i budget piccoli:</b> con 4 € al giorno non raggiungerai mai il numero di conversioni che serve all'algoritmo per ottimizzare sui «lead». <b>Ottimizza su un evento piu' frequente</b> — visualizzazioni della pagina di valutazione o avvio della compilazione — e fai tu la qualificazione al telefono.</p>
<p>Non toccare niente per i primi 21 giorni. E non giudicare mai una campagna sui lead: giudicala sulle <b>valutazioni fatte in casa</b> che ha prodotto. La creativita' che funziona meglio quasi mai e' la foto patinata: e' il video verticale girato in strada, davanti al portone di cui stai parlando, con la tua faccia.</p>` },

  { n:"07", t:"La carta, senza mai imbucarla tu", c:`
<p>Nella fascia di proprietari over 55 la carta batte ancora il digitale. Il punto e' che <b>non serve che la distribuisca tu</b>: stampa e recapito si commissionano, e il tuo lavoro si riduce a caricare un PDF e una via.</p>
<h4>Il Rapporto di Via</h4>
<p>Un A4 fronte-retro generato dall'automazione su <b>una via specifica</b>: prezzi reali al metro quadro degli ultimi 12 mesi, quanti immobili venduti e in quanti giorni, quanti affittati e a che canone, tre comparabili documentate, un grafico dell'andamento. Nessuna pubblicita', solo il tuo riquadro di contatto in fondo.</p>
<p>Tre usi: <b>distribuzione commissionata sul grappolo</b> (150-200 copie), <b>copia singola per un lead</b> (l'unica consegna che vale la pena fare di persona), e — il piu' potente — <b>girato all'amministratore con la sua intestazione sopra</b>, per i suoi condomini. Gli dai qualcosa che lo fa fare bella figura ogni mese, gratis, al costo di una manciata di copie in piu'.</p>
<p>Il vantaggio nascosto: produrlo ti obbliga a tenere aggiornato l'archivio, che e' poi il materiale di cui vivono gli script, il punteggio dei lead e le trattative.</p>
<h4>Le lettere scritte a mano — 20 al mese a 1.000 €, 30 a 500 €</h4>
<p>L'unica cosa che scrivi fisicamente, ed e' l'unica voce che <b>aumenta</b> scendendo di budget, perche' costa piu' tempo che denaro. Busta bianca, indirizzo a mano, francobollo vero, mai affrancatura meccanica. Sei righe. Apertura vicina al 100% contro il 20% di un'email, a ~1,50 € l'una.</p>
<h4>Cartoline — tre tipi</h4>
<p>«Venduto in questa via» con giorni impiegati e percentuale ottenuta. «Cerchiamo per un cliente» — solo se quel cliente esiste davvero: usarla a vuoto e' una bugia che si scopre e, senza vetrina, la reputazione online e' tutto cio' che hai. «Sta affittando da solo?» con i tre errori piu' costosi e il tuo QR. Tutte e tre vivono dentro i grappoli, mai in distribuzione cieca.</p>` },

  { n:"08", t:"La rete: il moltiplicatore cittadino", c:`
<p>A regime e' il canale che produce i mandati migliori a costo marginale zero — e con 500 € al mese non e' un complemento, e' <b>il tuo modo di coprire fisicamente le zone che non puoi presidiare</b>. Cresce lentamente, quindi va iniziata nella settimana 3, non «quando ci sara' tempo».</p>
<h4>La lista dei venti</h4>
<p>6 amministratori di condominio, 3 commercialisti, 2 notai, 2 avvocati (successioni e famiglia), 3 artigiani o imprese di trasloco, 2 tecnici (geometri o architetti), 2 gestori di servizi (relocation, property management, pulizie). <b>Sceglili distribuiti su macro-aree diverse</b>, non tutti attorno a casa: e' cosi' che venti relazioni diventano la copertura fisica di mezza citta'. Obiettivo: un incontro vero con ciascuno entro 90 giorni, uno ogni tre giorni lavorativi, in agenda.</p>
<h4>La regola: dai per primo, tre volte</h4>
<p>Non chiedere segnalazioni al primo incontro. Nei primi tre contatti <i>consegni</i>: il Rapporto di Via personalizzato col loro nome da girare ai loro clienti; una valutazione gratuita per un loro assistito; una presenza gratuita a un'assemblea dove serve un parere immobiliare; un cliente che mandi tu. Al quarto contatto la reciprocita' arriva da sola, e arriva da loro.</p>
<p><b>Punto legale da non sbagliare:</b> in Italia il diritto alla provvigione di mediazione spetta solo a chi e' regolarmente iscritto. Pagare percentuali a segnalatori non abilitati e' prassi diffusa ma <b>giuridicamente esposta</b>: puo' compromettere il tuo stesso diritto alla provvigione, oltre a creare problemi fiscali. Struttura la rete su reciprocita' e servizi resi, non su percentuali.</p>` },

  { n:"09", t:"Proprietari che non abitano a Milano", c:`
<p>E' il segmento piu' trascurato del mercato milanese, e con 500 € diventa <i>piu'</i> importante, non meno: <b>questi proprietari non hanno un'agenzia sotto casa, perche' sotto casa loro non c'e' la casa</b>. Non li raggiungi camminando — e tu, senza un presidio fisso, non raggiungi quasi nessuno camminando.</p>
<h4>Chi sono</h4>
<ul>
<li><b>Eredi che vivono altrove.</b> Spesso piu' di uno e non d'accordo, l'immobile resta fermo per anni.</li>
<li><b>Investitori di altre regioni</b> che gestiscono da lontano, male, con inquilini trovati per caso.</li>
<li><b>Proprietari stranieri</b>, numerosi a Milano, alle prese con una burocrazia che non padroneggiano.</li>
<li><b>Chi si e' trasferito</b> e ha tenuto la casa milanese sfitta o affittata sotto mercato per pura inerzia.</li>
</ul>
<h4>Perche' sono clienti eccellenti</h4>
<p><b>Primo</b>, non confrontano cinque agenzie: cercano qualcuno di cui fidarsi, non il preventivo piu' basso — quindi non ti battono sulla visibilita', che e' esattamente cio' che non puoi comprare. <b>Secondo</b>, hanno bisogno di un servizio completo che giustifica pienamente la tua provvigione. <b>Terzo</b>, sono i clienti naturali della gestione locativa: per loro non e' un servizio accessorio, e' l'unico modo di possedere quell'immobile.</p>
<h4>Come li trovi, a costo zero</h4>
<p>Dagli annunci di locazione in cui scrivono «rispondo solo via email», «visite solo il fine settimana», «delego un conoscente». Dagli amministratori, che sanno chi non viene mai alle assemblee e chi paga da un conto estero. Dagli immobili palesemente fermi, seguiti da visura. Dalle successioni, tramite notai e avvocati — materia delicatissima: solo su presentazione, tempi rispettosi, zero pressione. Dalle agenzie di relocation e dagli uffici HR. Dai gruppi online di expat e di italiani all'estero, dove «cosa faccio della casa a Milano» e' una domanda ricorrente: rispondi con competenza, senza vendere.</p>
<h4>Cosa devi avere pronto</h4>
<p>Materiali in inglese (pagina di valutazione, presentazione dei servizi, guida al mandato e alla fiscalita' della locazione), rivisti da un madrelingua. Un <b>protocollo a distanza scritto</b>: videochiamata di sopralluogo, firma digitale, gestione delle chiavi, referente unico, report fotografico dopo ogni visita — mandalo <i>prima</i> del primo incontro: costa zero ed e' cio' che ti fa scegliere. Un servizio successioni coordinato con notaio e commercialista. La gestione chiavi in mano.</p>` },

  { n:"10", t:"La locazione: motore finanziario e cavallo di Troia", c:`
<p>Con 1.000 € la locazione e' il cavallo di Troia verso la compravendita. Con 500 € cambia ruolo: diventa <b>il motore finanziario</b>. Commissioni piccole, cicli brevi, fatturato che arriva in settimane e non in mesi — esattamente cio' che serve a un'agenzia che deve autofinanziare la propria crescita. Il fatto che la concorrenza la lavori male e' un regalo. Ed e' anche il canale che ti fa entrare in zone dove non hai ancora un nome.</p>
<h4>Il gancio fiscale: il contratto concordato</h4>
<p>E' l'argomento di acquisizione piu' potente che hai, e la maggior parte dei piccoli proprietari non lo conosce. Un 3+2 nel Comune di Milano da' accesso alla cedolare secca agevolata al 10% invece del 21%, piu' riduzioni IMU. Su un canone di 1.200 €/mese sono <b>oltre 1.500 € l'anno di tasse risparmiate</b>, ogni anno, a fronte di un canone leggermente piu' basso che nella grande maggioranza dei casi resta ampiamente conveniente.</p>
<p>Serve l'attestazione di rispondenza rilasciata da un'organizzazione firmataria dell'accordo territoriale: la gestisci tu per il cliente. Metti sulla tua pagina un <b>calcolatore</b>: canone, metratura e zona, e in trenta secondi il proprietario vede quanto risparmierebbe. E' denaro suo, immediato e verificabile — il miglior «annuncio» che puoi produrre con questo budget, e funziona identico in ogni zona di Milano.</p>
<p><b>Da verificare:</b> aliquote, requisiti e valori dell'accordo territoriale milanese cambiano nel tempo e variano per fascia di zona. Fai confermare i numeri correnti dal commercialista prima di metterli in comunicazione, e aggiornali una volta l'anno.</p>
<h4>Il pacchetto «gestione chiavi in mano» — 8-10% del canone annuo, ricorrente</h4>
<p>E' l'unica entrata prevedibile che un'agenzia immobiliare possa avere. Selezione inquilino con verifica documentale. Canone garantito tramite polizza — l'argomento che vince la diffidenza dei proprietari prudenti e lontani. Burocrazia completa: contratto, registrazione telematica, cedolare, attestazione, adempimenti annuali, disdette. Verbali fotografici di consegna e riconsegna. Manutenzione con rete di artigiani entro 48 ore. Report semestrale con incassi, spese, stato dell'immobile e <b>valore di mercato aggiornato</b>: e' il seme del futuro mandato di vendita.</p>
<h4>Le quattro nicchie di Milano</h4>
<p>Studenti e fuorisede (rotazione alta, commissioni ripetute, stagionalita' estiva da anticipare in primavera). Giovani professionisti e coppie (il volume, ticket 900-1.600 €). Expat e trasferimenti aziendali (il segmento a maggior valore: canoni alti, contratti garantiti dall'azienda, si raggiunge con relazioni e non con budget — perfetto per questo piano). Ex host di affitti brevi (il piu' redditizio, entrano direttamente nella gestione).</p>
<p><b>L'obiettivo che conta: +2 immobili in gestione al mese.</b> A 24 immobili gestiti sono circa 27.000 € l'anno di ricavi ricorrenti — oltre quattro volte il budget pubblicitario annuo — e statisticamente 2-4 mandati di vendita l'anno che arrivano da soli, a costo di acquisizione zero. Un portafoglio di 30 immobili produce 3-5 mandati di vendita l'anno.</p>` },

  { n:"11", t:"Script e sequenze", c:`
<p>Preferisci sempre <b>il canale che il proprietario ha pubblicato</b> — modulo del portale o email dell'annuncio. E' piu' difendibile sul piano normativo e converte meglio: arrivi come qualcuno che ha letto, non come qualcuno che ha comprato una lista.</p>
<p>Cosa fa funzionare il primo messaggio: da' informazione prima di chiedere, non usa la parola «esclusiva», non svaluta la sua scelta di vendere da solo, e mette l'opt-out in chiaro. Il rifiuto arriva subito e pulito — il che e' un bene: ti libera il tempo per i si'.</p>
<p><b>La carta della competenza.</b> Un'agenzia di quartiere gioca la prossimita': «sono a duecento metri». Tu non ce l'hai, e fingerla si sente. La sostituisci con la competenza dimostrata: «quest'anno in quella via ne ho seguiti quattro, l'ultimo chiuso a X €/mq in Y giorni». Se il numero e' zero, di' la verita' e porta il dato di mercato: <b>un dato preciso vale piu' di una vicinanza</b>.</p>
<p>Il giorno 90 della cadenza ha la conversione piu' alta dell'intera sequenza: e' quando l'entusiasmo iniziale del privato e' finito e il tuo nome e' l'unico che si e' fatto vivo con costanza per tre mesi senza mai insistere.</p>` },

  { n:"12", t:"Cruscotto e KPI", c:`
<p>Una sola schermata, aggiornata ogni venerdi'. <b>Se un indicatore resta rosso tre settimane cambi qualcosa; se resta rosso sei settimane chiudi quel canale e sposti il budget.</b></p>
<p>I due campi piu' importanti del sistema sono due menu a tendina sulla scheda di ogni mandato: <i>fonte di acquisizione</i> e <i>zona/municipio</i>. Compilati senza eccezioni. Dopo 90 giorni saprai quali tre canali su dodici producono l'80% dei tuoi mandati e quali zone di Milano rispondono davvero. A quel punto la riallocazione non e' un'opinione, e' aritmetica.</p>
<p>Il KPI <b>municipi distinti con almeno un mandato</b> misura se stai davvero coprendo Milano o se ti sei richiuso in un angolo senza accorgertene. Il KPI <b>mandati arrivati da un grappolo</b> misura se il presidio temporaneo funziona: sotto il 15% stai lavorando male i 100 metri attorno alle trattative.</p>` },

  { n:"13", t:"Piano a 90 giorni", c:`
<p>Differenza chiave fra i due piani: a 500 € <b>la pubblicita' si accende alla settimana 5, non alla 4</b>. Prima devono funzionare la pagina di valutazione, il PDF automatico e la risposta entro 5 minuti. Accendere Meta senza quelli, con 180 € al mese, e' buttarli.</p>
<p><b>La sola disciplina che conta:</b> l'ora d'oro, 9:30-11:00, cinque giorni su sette, telefono in mano e porta chiusa. Con 1.000 € al mese saltarla ti costa dei risultati. Con 500 €, saltarla azzera il piano — perche' non c'e' budget che compensi.</p>` },

  { n:"14", t:"Conformita'", c:`
<p>La conformita' non ha una versione economica. Sono i quattro punti su cui le agenzie prendono sanzioni reali, e tre riguardano proprio le attivita' di acquisizione descritte qui. Vedi la scheda <b>Conformita'</b> per la checklist operativa.</p>
<p><b>Da fare prima di partire:</b> un'ora con il consulente privacy e una con il commercialista. Costa poco e mette al riparo una macchina che, se funziona, girera' per anni.</p>` },

  { n:"15", t:"Quando salire da 500 a 1.000 €", c:`
<p>Il piano da 500 € e' pensato per essere superato. Non c'e' merito nel restare a 500 quando i numeri dicono che puoi salire, e nessun vantaggio nel salire prima che lo dicano. Le tre condizioni, tutte e tre insieme:</p>
<ul>
<li><b>Costo per mandato sotto i 250 € per due mesi consecutivi.</b> Significa che la macchina converte davvero.</li>
<li><b>Almeno 12 immobili in gestione locativa</b> (~13.000 €/anno di ricavi ricorrenti): il budget aggiuntivo si finanzia da solo.</li>
<li><b>Tempo di risposta ai lead stabilmente sotto i 5 minuti.</b> Se non e' vero, aggiungere budget aumenta solo il numero di lead che lasci morire.</li>
</ul>
<p>Dove vanno i primi 500 € in piu', in quest'ordine: stampa mirata +20 € (scala con i mandati), Meta da 180 a 300 € +120 (solo se la condizione 3 e' soddisfatta), Google Ads +180, spostamenti e rete da 120 a 180 € +60, software con centralino VoIP +60, dati e contenuti +20.</p>
<p><b>Ma il vero salto non e' il budget: e' la seconda persona.</b> Un collaboratore a provvigione raddoppia le ore di contatto — che sono il vero vincolo di tutto questo documento. Su un territorio grande come Milano il collo di bottiglia non sono mai gli euro: sono le telefonate che una persona sola riesce a fare in un giorno.</p>` }
];
