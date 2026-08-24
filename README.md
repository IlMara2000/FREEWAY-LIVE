# TraduLimba

Traduttore web pubblico italiano ↔ sardo, con scelta esplicita tra:

- Limba Sarda Comuna (riferimento scritto)
- Campidanese (beta)
- Logudorese (beta)

Il frontend non importa Supabase, non richiede un account e conserva le traduzioni recenti soltanto nel `localStorage` del browser. Il backend storico resta separato come archivio e non viene modificato.

Il design usa un neomorfismo minimale con una palette ispirata ai colori della Sardegna: blu, verde, giallo e arancio su superfici grigio-perla. Marchio e icona sono originali.

## Motore linguistico

La traduzione di base usa la coppia open source [`apertium-srd-ita`](https://github.com/apertium/apertium-srd-ita) attraverso l'API pubblica Apertium. Le varianti campidanese e logudorese possono essere rifinite da un modello AI tramite Vercel AI Gateway; se il servizio AI non è configurato, l'app restituisce la forma standard e lo dichiara nell'interfaccia.

La voce è sperimentale. In produzione prova Vercel AI Gateway e, se non disponibile, usa la sintesi vocale italiana del dispositivo come fallback. Nessuna delle due soluzioni garantisce una pronuncia sarda nativa.

Per un lancio commerciale su larga scala è consigliato ospitare Apertium in proprio, verificare gli obblighi GPL e introdurre un glossario revisionato da linguisti e parlanti delle diverse aree.

## Avvio locale

```sh
npm install
npm run dev
```

La traduzione LSC funziona senza segreti. Per il post-editing delle varianti e la voce AI, copia `.env.example` in `.env.local` e imposta `AI_GATEWAY_API_KEY`. Su Vercel si può usare l'identità OIDC automatica senza salvare una chiave permanente.

## Verifiche

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

## Registrazione della voce

Il [copione completo](docs/copione-registrazione-voce.md) divide la registrazione in fasi: fonetica di base, frasi naturali, numeri e date, parole moderne, prosodia e blocchi separati per campidanese e logudorese. Le registrazioni non vanno inviate a un fornitore senza consenso esplicito del parlante e verifica delle condizioni d’uso.

## API

- `POST /api/translate` — massimo 4.000 caratteri
- `POST /api/speech` — massimo 1.000 caratteri

Entrambe le route validano l'input, non salvano i testi e applicano un limite leggero per istanza. Prima di un traffico elevato va aggiunto un rate limit distribuito.
