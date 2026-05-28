# BEACON Execution Coverage

Obiettivo: massimizzare la copertura del dataset `beacon_execution_public` con record che diano almeno:

- ente
- fornitore
- valore

## Stato attuale

Fonti coperte e gia' trasformate in record:

- `EESC` - lista annuale contratti specifici 2024
- `Europol` - annual list of contracts 2023
- `Europol` - annual list of contracts 2024
- `Clean Hydrogen JU` - specific contracts 2022
- `HaDEA` - contracts EU4Health 2022
- `HaDEA` - contracts EU4Health 2024
- `European Parliament` - list of contracts awarded 2021

Tracker completo:

- [data/beacon_execution_coverage_plan.json](/Users/davide/Documents/EU%20HACS%20Matirx/data/beacon_execution_coverage_plan.json:1)

Quadro programma:

- `103` enti totali nel dataset
- `5` enti gia' coperti da execution signals pubblici
- `49` enti in `Wave 1`
- `23` enti in `Wave 2`
- `26` enti in `Wave 3`

## Copertura per ente

| Ente | Stato | Fonte | Qualita' |
| --- | --- | --- | --- |
| European Economic and Social Committee | covered | annual specific contracts 2024 | alta |
| Europol | covered | annual contracts 2023, 2024 | alta |
| Clean Hydrogen Joint Undertaking | covered | specific contracts 2022 | alta |
| European Health and Digital Executive Agency | covered | EU4Health contracts 2022, 2024 | alta |
| European Parliament | covered | contracts awarded 2021 | media |

## Programma completo

### Wave 0

Enti gia' coperti:

- `EESC`
- `Europol`
- `Clean Hydrogen JU`
- `HaDEA`
- `European Parliament`

### Wave 1

Target ad alta priorita' e alta probabilita' di fonti pubbliche utili.

Include:

- tutte le `EC DGs`
- grandi istituzioni centrali
- grandi agenzie digital / procurement-heavy

Volume:

- `49` enti

### Wave 2

Target con buona probabilita' di documentazione, soprattutto:

- enti Brussels / Luxembourg
- Joint Undertakings
- Executive Agencies

Volume:

- `23` enti

### Wave 3

Target a bassa evidenza pubblica o con procurement meno trasparente.

Volume:

- `26` enti

## Prossimi target prioritari

### Tier 1

- `European Court of Auditors`
- `Court of Justice of the European Union`
- `European External Action Service`
- `ENISA`
- `EUIPO`
- `eu-LISA`
- `EIB`

Ragione:

- alta rilevanza HACS
- buona probabilita' di pubblicare liste annuali o pagine contratti

### Tier 2

- `ECDC`
- `EMA`
- `EIOPA`
- `ECHA`
- `European Labour Authority`
- `European Environment Agency`

### Tier 3

- Joint Undertakings e Executive Agencies minori
- fondazioni / bodies con scarsa trasparenza documentale

## Pattern di fonte da cercare

Per ogni ente, priorita' di ricerca:

1. `annual list of contracts`
2. `contracts awarded`
3. `specific contracts`
4. `framework contracts`
5. ricerca combinata con:
   - `DIGIT/2020/OP/0005`
   - `BEACON`
   - `Lot 1`
   - `Lot 2`

## Regole di inclusione nel dataset

Inserire un record solo se almeno due di questi elementi sono chiari:

- riferimento `DIGIT/2020/OP/0005`
- keyword `BEACON`
- fornitore identificato
- valore identificato
- ente identificato

Preferenza forte per record che abbiano tutti e tre:

- ente
- supplier
- value

## Obiettivo pratico

Target minimo per passare all'integrazione prodotto:

- `15-20` record execution pubblici
- almeno `8-10` enti diversi coperti
- almeno `2` fonti indipendenti di alta qualita'

Il dataset puo' considerarsi "abbastanza robusto" per la prima integrazione prodotto quando raggiunge quel livello.
