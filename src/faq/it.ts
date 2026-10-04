import type { FaqDoc } from "./en";

export const faqIt: FaqDoc = {
  title: "Domande frequenti",
  intro: "Come Ofolam tratta i tuoi dati e come pubblicare ciò che crei.",
  back: "Torna all'app",
  sections: [
    {
      heading: "I tuoi dati",
      items: [
        {
          q: "Che cosa conserva Ofolam su di me?",
          a: [
            "Il tuo identificativo atleta Strava, il tuo nome e il tuo paese, oltre ai token che Strava ci fornisce per leggere le tue attività, cifrati. Vengono conservati anche i modelli che salvi.",
            "Non ci sono statistiche di utilizzo, pubblicità o tracciamento.",
          ],
        },
        {
          q: "Per quanto tempo vengono conservati i miei dati?",
          a: [
            "Finché hai una sessione attiva. Uscendo dalla tua ultima sessione vengono eliminati subito la tua scheda, i tuoi token e i tuoi modelli.",
            "Una sessione inutilizzata per 90 giorni viene eliminata automaticamente, e con lei la tua scheda quando non resta più alcuna sessione. Se revochi l'accesso di Ofolam su Strava, la tua scheda viene eliminata non appena l'app se ne accorge.",
          ],
        },
        {
          q: "Le mie attività vengono archiviate?",
          a: [
            "Vengono lette da Strava quando usi l'app e poi tenute in cache per rispettare i limiti di Strava: 5 minuti per l'elenco, fino a 24 ore per una singola attività. Anche il tuo dispositivo ne conserva una copia, così l'app si apre all'istante.",
            "«Aggiorna da Strava», nel menu, salta entrambe le cache.",
          ],
        },
        {
          q: "Le mie foto e i miei video vengono caricati da qualche parte?",
          a: [
            "No. L'immagine viene disegnata nel tuo browser: foto e video non lasciano mai il tuo dispositivo.",
            "Solo lo sfondo Mappa chiama un servizio esterno (Stadia Maps), che riceve la zona del tuo percorso e il tuo indirizzo IP, come qualsiasi mappa online.",
          ],
        },
        {
          q: "Come elimino tutto?",
          a: [
            "Esci. Se è la tua ultima sessione, tutto viene eliminato in una volta. Puoi anche revocare l'accesso dalle impostazioni di Strava (Le mie app) oppure scrivere a {email}.",
          ],
        },
      ],
    },
    {
      heading: "Pubblicare",
      items: [
        {
          q: "Come pubblico nella mia storia di Instagram?",
          a: [
            "Scegli il formato Storia 9:16, tocca Condividi e poi Instagram. Da computer, scarica l'immagine e inviala al telefono.",
            "Attiva l'area visibile Instagram per evitare che i testi finiscano sotto l'interfaccia di Instagram.",
          ],
        },
        {
          q: "A cosa serve lo sfondo Sticker?",
          a: [
            "Esporta la card con lo sfondo trasparente. Copiala e incollala su una foto o un video nell'editor delle storie di Instagram. Così mantieni gli strumenti di Instagram per la foto sottostante.",
          ],
        },
        {
          q: "Come creo un carosello?",
          a: [
            "Scegli lo sfondo Foto e aggiungi più foto, fino a 10. La stessa card viene disegnata su ogni foto.",
            "Con le frecce sotto l'anteprima passa da una foto all'altra per controllare che i testi si leggano bene su ciascuna. L'inquadratura si regola foto per foto; i testi e il percorso restano nella stessa posizione su tutte, quindi spostare un elemento lo sposta ovunque.",
            "Poi Condividi invia tutte le immagini insieme e Instagram le propone come un unico post. «Scarica le immagini», nel menu, le salva tutte, numerate in ordine.",
          ],
        },
        {
          q: "Quale formato per quale uso?",
          a: [
            "Storia 9:16 per storie e reel. Post 4:5 per il feed di Instagram e i caroselli. Quadrato 1:1 va bene ovunque. Orizzontale 16:9 per X, Facebook o un blog.",
          ],
        },
        {
          q: "Posso pubblicare un video?",
          a: [
            "Sì. Scegli lo sfondo Video, seleziona una clip di al massimo 60 secondi e tocca Crea il video. Il video viene codificato sul tuo dispositivo; poi puoi condividerlo o scaricarlo.",
          ],
        },
        {
          q: "Posso nascondere dove abito?",
          a: [
            "Sì. Seleziona il percorso e usa «Nascondi partenza e arrivo»: la distanza che scegli viene rimossa alle due estremità del percorso.",
          ],
        },
      ],
    },
    {
      heading: "L'app",
      items: [
        {
          q: "Come installo Ofolam sul telefono?",
          a: [
            "Ofolam si installa dal browser, senza passare da uno store: usa «Installa l'app» nel menu. Su iPhone, apri il sito in Safari, tocca Condividi e poi «Aggiungi alla schermata Home».",
          ],
        },
        {
          q: "Una nuova attività non compare. Cosa posso fare?",
          a: ["L'elenco resta in cache per 5 minuti. «Aggiorna da Strava», nel menu, lo ricarica subito."],
        },
        {
          q: "Che cosa sono i modelli?",
          a: [
            "Un modello è un layout: quali elementi vengono mostrati, dove e con quale stile. Non cambia mai lo sfondo né il formato.",
            "Puoi salvare fino a 20 modelli personali con «Salva il layout attuale come modello».",
          ],
        },
        {
          q: "Ofolam è gratuito?",
          coffee: "Se ti piace, puoi sostenere il progetto:",
          a: ["Sì, gratuito e senza pubblicità. È un progetto indipendente, non affiliato a Strava."],
        },
      ],
    },
  ],
};
