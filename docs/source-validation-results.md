# Source Validation Results

## Sintesi Esecutiva

Primo esito della Fase 0:

- `TED`: **Use now**, ma solo con:
  - query strutturate
  - alias canonici per ente
  - caching / throttling
- `Vecchi affidamenti`: **Use later**
  - l'idea e` valida
  - il dataset attuale e` troppo povero per sostenere Fase 1
- `Beacon`: **Use later**
  - da valutare appena chiarito l'accesso
- `Web / news`: **Use later**
  - non necessario nel primo MVP intelligence

## Campione Usato

Campione di 12 enti:

- `AMLA`
- `CdT`
- `CJEU`
- `EASA`
- `ECHA`
- `EIB`
- `EIOPA`
- `ENISA`
- `EUIPO`
- `FRA`
- `HADEA`
- `EUROPOL`

Il campione copre:

- cluster diversi
- agenzie, istituzioni, organismi regolatori
- enti piu` generalisti e piu` digital / technical

## Fonte 1: TED

### Test Eseguiti

Sono stati provati due approcci:

1. query per `organisation-name-buyer="<entity name>"`
2. query `FT~"<acronym>"` su un sottoinsieme per misurare il rumore

Documentazione ufficiale TED usata come riferimento:

- [Search API](https://docs.ted.europa.eu/api/latest/search.html)
- [Search API reuse docs](https://docs.ted.europa.eu/ODS/latest/reuse/search-api.html)
- [TED help on expert search / FT syntax](https://ted.europa.eu/en/help/browse-by-subject)

### Risultati Grezzi Sul Nome Ente Corrente

| Ente | Buyer count | Note |
| --- | ---: | --- |
| AMLA | 55 | copertura presente |
| CdT | 0 | naming non riconosciuto |
| CJEU | 89 | copertura presente |
| EASA | 0 | naming non riconosciuto |
| ECHA | 111 | copertura presente |
| EIB | 381 | copertura forte |
| EIOPA | 109 | copertura forte |
| ENISA | 0 | naming non riconosciuto |
| EUIPO | 0 | naming non riconosciuto |
| FRA | 0 | naming non riconosciuto |
| HADEA | 4 | copertura presente, molto mirata |
| EUROPOL | 0 | naming non riconosciuto |

Copertura grezza sul naming attuale del dataset:

- `7 / 12` enti con risultati
- `5 / 12` enti con zero risultati dovuti soprattutto al naming

### Risultati Con Alias Canonici

Sono stati testati alcuni alias manuali:

- `EASA -> European Union Aviation Safety Agency`
- `ENISA -> European Union Agency for Cybersecurity`
- `EUIPO -> European Union Intellectual Property Office`
- `FRA -> European Union Agency for Fundamental Rights`
- `EUROPOL -> European Union Agency for Law Enforcement Cooperation`
- `CdT -> Translation Centre for the Bodies of the European Union`

Esito:

| Ente | Alias count |
| --- | ---: |
| EASA | 140 |
| ENISA | 132 |
| EUIPO | 123 |
| FRA | 94 |
| EUROPOL | 95 |
| CdT | 98 |

### Insight Principale

La copertura TED non e` il problema principale.

Il problema principale e` la `matchability` tra:

- nomi nel nostro dataset
- nomi canonici / legali usati da TED

Conclusione:

- serve un `alias layer` per ente
- senza alias, il motore di intelligence sottostima la copertura reale

### Rumore Delle Query Su Acronimo

Su alcuni enti il test `FT~"<acronym>"` ha mostrato forte rumore:

| Ente | Acronym count |
| --- | ---: |
| AMLA | 182 |
| EASA | 27130 |
| ENISA | 565 |
| HADEA | 605 |

Conclusione:

- la query su acronimo **non e` affidabile** come strategia primaria
- puo` essere usata al massimo come fallback molto controllato

### Qualita` Del Segnale

Osservazioni:

- alcuni enti restituiscono risultati utili e leggibili
- altri restituiscono contratti interistituzionali generici
- per alcuni enti i primi risultati recenti sono gia` abbastanza informativi

Esempi positivi:

- `HADEA`: risultati recenti su evaluation, monitoring, communication
- `EIB`: risultati su audit, training, IT security managed services
- `EIOPA`: risultati su reporting frameworks e business intelligence

Esempi misti / rumorosi:

- `AMLA`: copertura presente, ma parte dei risultati e` trasversale alle istituzioni UE
- `CJEU`: risultati presenti ma spesso piu` generici
- `EUROPOL` con alias: risultati presenti ma non sempre specifici al need dell'ente

### Limiti Emersi

1. `Rate limiting`
   la API risponde con `429 Too Many Requests` se interrogata in modo troppo aggressivo

2. `Expert query syntax`
   non e` una quick search libera; serve una strategia query piu` strutturata

3. `Naming`
   i nomi del dataset attuale non bastano sempre

### Scorecard TED

| Criterio | Voto | Note |
| --- | ---: | --- |
| Accesso | 4 | API aperta e documentata |
| Copertura | 4 | buona, ma visibile solo con alias corretti |
| Freshness | 4 | risultati recenti presenti |
| Struttura | 4 | output API strutturato |
| Matchability | 3 | buona solo con alias layer |
| Signal quality | 3 | utile ma con rumore e genericita` interistituzionale |
| Maintenance risk | 3 | rate limiting e query syntax da gestire |

**Totale TED: 25/35**

Verdetto:

- quasi `Use now`
- con alias layer e caching passa pragmaticamente a `Use now`

### Decisione TED

**TED = Use now**

Condizioni minime per Fase 1:

- alias per ente
- query buyer-name come strategia primaria
- caching locale
- refresh manuale / batch limitato

## Fonte 2: Vecchi Affidamenti

### Test Eseguiti

Verificato il database locale `backend/hacs.db`.

Risultato:

- `2` record totali
- `2` record Annex 7.1
- `0` record CSV

Per il campione di 12 enti:

- `0 / 12` match utili

### Insight Principale

La fonte non e` scarsa come concetto.
E` scarsa il dataset attuale.

In questo momento lo storico affidamenti:

- non copre gli enti target
- non consente recurring demand detection
- non migliora la confidence in modo sistematico

### Scorecard Vecchi Affidamenti

| Criterio | Voto | Note |
| --- | ---: | --- |
| Accesso | 5 | dati locali, semplici da leggere |
| Copertura | 1 | quasi nulla sul campione |
| Freshness | 1 | dataset troppo limitato |
| Struttura | 3 | formato gestibile |
| Matchability | 1 | nessun match utile sul campione |
| Signal quality | 1 | insufficiente per il need intelligence |
| Maintenance risk | 4 | basso rischio tecnico |

**Totale Vecchi affidamenti: 16/35**

### Decisione Vecchi Affidamenti

**Vecchi affidamenti = Use later**

Per diventare `Use now` serve:

- import molto piu` ampio
- matching migliore sugli enti
- almeno una base minima di copertura sul perimetro target

## Beacon

Non ancora testato.

Decisione attuale:

**Beacon = Use later**

Serve chiarire prima:

- API?
- export?
- accesso realisticamente integrabile?

## Web / News / Documenti Ente

Non ancora testato in modo strutturato.

Decisione attuale:

**Web / news = Use later**

Per il primo MVP intelligence non e` necessario.

## Raccomandazione Operativa

Se oggi dovessimo partire con la Fase 1, il set minimo sensato sarebbe:

1. `TED`
2. `Entity alias layer`
3. `Snapshot intelligence`

Lo storico affidamenti attuale non e` ancora abbastanza ricco per essere pilastro del sistema.

## Implicazioni Per Il Prodotto

La Fase 1 non dovrebbe essere:

- `TED + vecchi affidamenti` in modo equivalente

ma piu` realisticamente:

- `TED come fonte primaria`
- `vecchi affidamenti come fonte secondaria futura`

## Prossimo Passo Consigliato

Prima di sviluppare il modulo intelligence:

1. introdurre un `alias dictionary` per gli enti
2. definire la strategia query TED primaria
3. implementare caching e throttle
4. solo dopo integrare la UI
