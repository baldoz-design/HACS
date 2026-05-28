# Source Validation Plan

## Obiettivo

Validare le fonti dati prima di integrarle nel prodotto, così da costruire la `Entity Intelligence` su segnali affidabili e utili al decisioning.

L'obiettivo non e` "trovare tanti dati", ma capire quali fonti aiutano davvero a:

- inferire un `need`
- suggerire un `field HACS`
- decidere se vale la pena aprire il `Proposal Lab`

## Fonti Candidate

Ordine di validazione consigliato:

1. `TED`
2. `Vecchi affidamenti`
3. `Beacon`
4. `Web / news / documenti ente`

## Decisione Attesa Per Ogni Fonte

Per ogni fonte il risultato finale deve essere una di queste decisioni:

- `Use now`
- `Use later`
- `Discard`

## Scorecard Di Valutazione

Valutare ogni fonte su scala `1-5`, dove `5` e` ottimo.

| Criterio | Domanda |
| --- | --- |
| Accesso | La fonte e` facilmente accessibile? API aperta, export, oppure accesso manuale sostenibile? |
| Copertura | Copre abbastanza enti e opportunita` del nostro perimetro? |
| Freshness | I dati sono abbastanza aggiornati per essere utili? |
| Struttura | I dati sono abbastanza strutturati da essere normalizzati senza troppo lavoro fragile? |
| Matchability | Possiamo collegare bene i record agli enti del nostro universo? |
| Signal quality | I dati aiutano davvero a inferire need, field e priorita`? |
| Maintenance risk | La fonte e` stabile oppure fragile nel tempo? |

### Soglie Pratiche

- `26-35`: forte candidata `Use now`
- `18-25`: candidata `Use later`
- `<18`: da tenere fuori o usare solo in modo limitato

## Campione Di Test

Per validare le fonti usiamo un campione ristretto di enti.

Target consigliato:

- `10-15` enti
- mix di enti con:
  - field gia` noto
  - cluster diversi
  - presenza/assenza di relationship signal
  - storico affidamenti presente e assente

## TED - Piano Di Test

### Obiettivo

Capire se TED produce segnali abbastanza affidabili da:

- suggerire un field
- indicare un need plausibile
- supportare una raccomandazione `Explore / Monitor / Send to Proposal Lab`

### Metodo

Per ogni ente nel campione eseguire:

1. query per `nome completo ente`
2. query per `acronimo`
3. query per `nome + keyword HACS` rilevanti

Keyword iniziali da usare:

- `digital`
- `ai`
- `data`
- `governance`
- `evaluation`
- `monitoring`
- `benchmarking`
- `innovation`
- `legal`
- `regulatory`

### Campi Da Raccogliere

Per ogni notice utile:

- `source = ted`
- `entity searched`
- `query used`
- `notice id`
- `title`
- `buyer / authority`
- `publication date`
- `contract value`
- `raw field guess`
- `relevance score`
- `why relevant`
- `false positive?`

### Criteri Di Qualita`

TED e` valida per Fase 1 se:

- troviamo risultati utili per almeno `50-60%` degli enti testati
- i falsi positivi restano gestibili
- il titolo/metadata aiutano davvero a inferire un field
- la recency del dato e` leggibile

### Domande Da Chiudere

- I risultati sono abbastanza specifici per singolo ente?
- L'acronimo genera troppo rumore?
- Il titolo della notice basta per suggerire un field oppure serve il documento completo?
- Le notice TED sono piu` utili per `need detection` o solo per `historical signal`?

## Vecchi Affidamenti - Piano Di Test

### Obiettivo

Capire quanto lo storico affidamenti aiuta a:

- identificare recurring demand
- aumentare la credibilita` dell'opportunita`
- dare contesto per field e provider fit

### Metodo

Per ogni ente nel campione verificare:

1. se esistono affidamenti collegati
2. se il collegamento e` affidabile
3. se il testo/metadata suggeriscono un field
4. se emerge continuita` su certi temi

### Campi Da Raccogliere

- `source = historical_award`
- `entity`
- `match quality`
- `contract title`
- `client`
- `date range`
- `value`
- `field guess`
- `signal usefulness`
- `why relevant`

### Criteri Di Qualita`

Lo storico affidamenti e` valido per Fase 1 se:

- il matching ente-record e` affidabile
- il dato aiuta a inferire recurring demand
- il dato aggiunge contesto concreto alla valutazione

### Domande Da Chiudere

- Il matching sugli enti e` abbastanza preciso?
- Lo storico e` abbastanza ricco da dire qualcosa o solo descrittivo?
- Aiuta meglio il `need detection` o il `confidence boosting`?

## Beacon - Piano Di Test

### Gate Decision

Prima di valutarne il valore, dobbiamo capire:

- esiste API?
- esiste export?
- l'accesso e` realisticamente integrabile?

Se la risposta e` `no`, Beacon esce dalla Fase 1.

Se la risposta e` `si`, allora testiamo:

- coverage su 5-10 enti
- qualita` del segnale
- unicita` rispetto a TED e storico

## Web / News / Documenti Ente - Piano Di Test

### Posizionamento

Questa fonte e` esplorativa, non core, nella Fase 0.

### Obiettivo

Capire se fornisce segnali realmente distintivi oppure troppo rumore.

### Metodo

Su `5` enti:

- ricerca manuale/assistita
- raccolta di 2-3 evidenze per ente massimo
- valutazione del rapporto segnale/rumore

### Decisione Attesa

- se produce segnali forti e ripetibili: `Use later`
- se produce molto rumore: `Discard for now`

## Output Finale Atteso

Alla fine della validazione dobbiamo avere:

1. una tabella punteggi per ogni fonte
2. una decisione `Use now / Use later / Discard`
3. un set minimo di fonti per Fase 1

## Template Di Risultato

| Fonte | Accesso | Copertura | Freshness | Struttura | Matchability | Signal quality | Maintenance risk | Totale | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TED |  |  |  |  |  |  |  |  |  |
| Vecchi affidamenti |  |  |  |  |  |  |  |  |  |
| Beacon |  |  |  |  |  |  |  |  |  |
| Web/news |  |  |  |  |  |  |  |  |  |

## Esito Atteso Probabile

Ipotesi iniziale prima dei test:

- `TED`: `Use now`
- `Vecchi affidamenti`: `Use now`
- `Beacon`: `Use later`, salvo accesso semplice e immediato
- `Web/news`: `Use later` o `Discard for now`
