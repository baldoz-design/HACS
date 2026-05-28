# BEACON Reconstruction Checklist

## Obiettivo

Ricostruire il precedente framework `BEACON` che HACS sostituisce, partendo dalla procedura:

- `DIGIT/2020/OP/0005`
- `Benchmarking, Advisory and Consultancy Services in Information and Communication Technology`

Focus prioritario:

- `Lot 2`
- secondariamente `Lot 1`

## Output Atteso

Alla fine della ricostruzione dobbiamo avere:

1. il backbone del framework
2. la lista dei vincitori
3. la distinzione tra `Lot 1` e `Lot 2`
4. il perimetro tecnico dei servizi
5. tutto cio` che riusciamo a recuperare sui contratti derivati / call-offs

## Fase 1 - Ricostruire La Procedura Madre

### Fonti da usare

- `TED`
- `eTendering`
- documentazione di gara

### Query da provare

Usare in combinazione:

- `DIGIT/2020/OP/0005`
- `"Benchmarking, Advisory and Consultancy Services in Information and Communication Technology"`
- `BEACON`
- `BEACON lot 2`
- `BEACON lot 1`

### Cose da recuperare

- contract notice
- contract award notice
- tender / procedure page
- lot structure
- date
- durata
- valore stimato
- valore massimo framework se disponibile
- nomi dei winning suppliers

### Dati da salvare

Per il record della procedura:

- `procedure_reference`
- `title`
- `buyer`
- `publication_number`
- `publication_date`
- `procedure_type`
- `estimated_value`
- `framework_duration`
- `source_url`

## Fase 2 - Capire Bene Lot 1 e Lot 2

### Obiettivo

Capire che cosa copriva davvero ciascun lotto e perche` HACS sostituisce soprattutto `Lot 2`.

### Cose da estrarre

Per ogni lotto:

- `lot_id`
- `lot_title`
- `lot_description`
- `service scope`
- `keywords`
- `cpv codes` se presenti
- `winning suppliers`

### Domande da chiudere

- che differenza sostanziale c'era tra `Lot 1` e `Lot 2`?
- quali servizi erano piu` ordinati sotto `Lot 2`?
- quali parti di `Lot 1` confluiscono comunque in HACS?

### Output utile per il prodotto

Creare una mappa:

- `BEACON Lot 1 scope -> HACS field(s)`
- `BEACON Lot 2 scope -> HACS field(s)`

## Fase 3 - Identificare I Winning Suppliers

### Obiettivo

Capire chi ha vinto il framework e, se possibile, quali operatori erano piu` forti su ciascun lotto.

### Dati da salvare

Per ogni supplier:

- `supplier_name`
- `lot`
- `country`
- `role`
- `source_url`

### Uso futuro

Questi dati servono a:

- arricchire la competitor intelligence
- capire il benchmark di mercato
- collegare HACS ai player storici del framework precedente

## Fase 4 - Cercare I Contratti Derivati / Call-offs

### Obiettivo

Recuperare quanto piu` possibile sulla execution history del framework.

### Fonti da usare

- `TED`
- `Financial Transparency System`
- eventuali pagine award notice / ex post publication
- eventuali liste annuali DIGIT / Commission / agenzie

### Strategia

Non cercare solo `BEACON`.

Cercare combinazioni di:

- `DIGIT/2020/OP/0005`
- supplier vincitori del framework
- Commission / DIGIT come buyer
- parole chiave di scope tecnico

### Dati da salvare

Per ogni possibile call-off / specific contract:

- `contract_title`
- `buyer_entity`
- `supplier`
- `year`
- `value`
- `framework_reference`
- `lot_reference`
- `field_guess`
- `source`
- `source_url`
- `confidence_of_match`

## Fase 5 - Costruire Un Dataset Locale

### Dataset 1: Framework Backbone

Un file o tabella con:

- procedura madre
- lotti
- vincitori
- scope tecnico

### Dataset 2: Historical Execution Signals

Un file o tabella con:

- awards / call-offs recuperati
- buyer
- supplier
- year
- amount
- field guess
- confidence

## Criteri Di Successo

La ricostruzione e` soddisfacente se otteniamo:

1. procedura madre completa
2. lotti e vincitori confermati
3. mappa di scope `Lot 1` / `Lot 2`
4. almeno un primo nucleo di contratti derivati o segnali di utilizzo

## Criteri Di Realismo

E` probabile che:

- la procedura madre sia ricostruibile bene
- i vincitori siano ricostruibili bene
- i contratti derivati siano ricostruibili solo parzialmente

Quindi non bloccare il prodotto aspettando una ricostruzione perfetta dei call-offs.

## Uso Nel Main Track

Questa ricostruzione serve a:

- capire meglio che cosa HACS sostituisce davvero
- migliorare il motore di `need intelligence`
- rafforzare il `match layer`
- dare contesto storico al `Proposal Lab`

## Stop Condition

Chiudere questo filone e tornare al main track quando abbiamo:

- `framework backbone`
- `lot mapping`
- `winning suppliers`
- valutazione onesta di quanto e` ricostruibile sui call-offs

Non serve completare tutto prima di tornare allo sviluppo prodotto.
