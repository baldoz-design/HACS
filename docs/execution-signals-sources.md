# BEACON Execution Signals

Obiettivo: ricostruire i contratti specifici / execution signals sotto `DIGIT/2020/OP/0005` per arrivare a:

- ente utilizzatore
- fornitore assegnatario
- valore
- descrizione del bisogno / oggetto
- periodo

## Quadro attuale

Abbiamo gia' ricostruito il backbone BEACON da TED:

- `2022/S 015-031141` - `Lot 1`
- `2022/S 034-086205` - `Lot 2`

Questo ci da':

- framework originario
- vendor winners
- valore per lotto

Non basta pero' per sapere quali enti hanno usato davvero BEACON nei contratti specifici.

## Fonti confermate

### 1. Liste annuali di contratti specifici / awarded contracts dei singoli enti

Questa e' la fonte migliore per il livello `ente -> fornitore -> valore`.

#### EESC / CESE

Fonte:

- [Liste annuelle 2024 Contrats spécifiques](https://www.eesc.europa.eu/sites/default/files/2025-03/Liste-annuelle-2024-Contrats-specifiques.pdf)

Segnale confermato:

- `CESE.SG.D - DIRECTORATE D - PWC - DIGIT/2020/OP/0005 - (BEACON) LOT 2`
- oggetto: `Visitor Process Optimization`
- periodo: `16.12.2024 - 15.05.2025`
- fornitore: `PRICEWATERHOUSECOOPERS EU SERVICES`
- valore: `99.514,49 EUR`

Campi estraibili:

- ente
- framework reference
- lot
- fornitore
- descrizione
- date
- valore

#### Europol

Fonte:

- [Annual List of Contracts 2023](https://www.europol.europa.eu/sites/default/files/documents/Annual_List_of_Contracts_2023.pdf)

Segnali confermati:

- `BEACON (LOT 1)` con `GARTNER BELGIUM BVBA` e valore `64,953.98`
- `BEACON (LOT 2)` con `TREMEND BENELUX SA` e valore `88,821.00`

Campi estraibili:

- ente
- titolo framework / lot
- reference
- contractor
- paese contractor
- valore

Nota:

- questa fonte e' molto buona per la parte economica, ma la descrizione del need e' corta.

#### European Parliament

Fonte hub:

- [Contracts awarded](https://www.europarl.europa.eu/contracts-and-grants/en/public-procurement/contracts-awarded)

Utilita':

- il Parlamento pubblica informazioni ex post su contratti aggiudicati e specific contracts basati su framework contracts
- e' una fonte promettente per espandere il coverage BEACON

Nota:

- il page hub conferma esplicitamente che i `specific contracts based on framework contracts` devono essere pubblicati dai contracting authorities.

### 2. Pagine programma / agenzia con contratti specifici espliciti

#### Clean Hydrogen Partnership

Fonte:

- [Specific contracts awarded in 2022](https://www.clean-hydrogen.europa.eu/document/download/fc36eebf-2138-4f72-b3cb-1b996eacc430_en?filename=List+of+contracts+2022.pdf)

Segnale confermato:

- `Specific contract No1 implementing Framework Contract DIGIT/2020/OP/0005 (BEACON)`
- oggetto: `Supporting the Clean Hydrogen JU to setup up a Hydrogen Knowledge Hub`
- contractor: `Consortium of Tremend Benelux SA`, represented by `Tremend Benelux S.A`
- valore: `43,000.00 EUR`

Campi estraibili:

- ente
- oggetto
- riferimento specific contract
- framework reference
- contractor
- valore

#### HaDEA

Fonte:

- [EU4Health contracts page](https://hadea.ec.europa.eu/programmes/eu4health/calls-and-contracts/contracts/contracts-eu4health-2024-annual-work-programme_en?prefLang=it)

Segnale confermato:

- `Specific contract under DIGIT/2020/OP/0005 BEACON FWC`
- oggetto: `Compliance checks for HealthData@EU and Secure Processing Environments in the European Health Data Space`
- contractor: `ERNST & YOUNG CONSULTING`
- valore: `1,092,516.24 EUR`
- data firma: `07/04/2025`

Campi estraibili:

- ente / programma
- oggetto
- contractor
- valore
- periodo / signing date

### 3. Tracce pubbliche narrative / portfolio / academic activity

Queste non sono fonti core per il dataset economico, ma aiutano a identificare specific contracts e use cases.

#### VUB research portal

Fonte:

- [IT Project and Legal Assistant](https://researchportal.vub.be/en/activities/it-project-and-legal-assistant)

Segnale confermato:

- `specific contract BEACON-000067 under FWC DIGIT/2020/OP/0005 Lot 2`
- DG utilizzatrice: `DG GROW`
- periodo: `5 Dec 2022 -> 28 Feb 2023`
- use case: supporto eInvoicing / eProcurement

Campi estraibili:

- DG / ente
- reference specific contract
- lot
- use case / need area
- periodo

Nota:

- utile soprattutto come `need/evidence signal`, meno per il valore.

## Strategia raccomandata

### Fase A - raccogliere execution signals confermati

Priorita':

1. `EESC`
2. `Europol`
3. `Clean Hydrogen`
4. `HaDEA`
5. `European Parliament`

Per ogni fonte estrarre:

- `entity_name`
- `framework_reference`
- `lot_reference`
- `specific_contract_reference` se presente
- `contract_title`
- `supplier_name`
- `contract_value_eur`
- `start_date`
- `end_date`
- `source_url`
- `notes / need summary`

### Fase B - standardizzare i record

Ogni execution signal dovrebbe essere memorizzato con:

- `source = beacon_execution_public`
- `entity_name_raw`
- `client_name`
- `supplier_name`
- `contract_title`
- `framework_reference = DIGIT/2020/OP/0005`
- `lot_reference`
- `contract_value_eur`
- `field_of_expertise`
- `source_url`
- `confidence_of_match`

### Fase C - usare il dataset come seconda fonte intelligence

Uso prodotto:

- arricchire il dossier ente
- mostrare storico reale BEACON per ente
- rafforzare `need statement`
- rafforzare `provider match`

## Cosa NON fare adesso

- scraping generico del web senza whitelist fonti
- tentare di ricostruire tutti i call-off da TED
- integrare i risultati nel Proposal Lab prima di avere un primo dataset execution pulito

## Conclusione

Per ottenere l'informazione che ci interessa davvero, il track giusto e':

- `TED/XML` per framework backbone
- `liste annuali e pagine contratti dei singoli enti` per execution signals

Il prossimo sprint operativo deve costruire il primo dataset BEACON execution usando queste fonti pubbliche confermate.
