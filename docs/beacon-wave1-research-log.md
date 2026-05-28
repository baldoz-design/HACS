# BEACON Wave 1 Research Log

Obiettivo: tracciare le verifiche svolte sugli enti `Wave 1`, anche quando non emergono ancora record BEACON sufficientemente solidi da entrare nel dataset.

## Criterio di inclusione nel dataset

Un record entra in `beacon_execution_public` solo se abbiamo almeno due elementi forti tra:

- riferimento `DIGIT/2020/OP/0005`
- keyword `BEACON`
- ente identificato
- supplier identificato
- valore identificato

## Verifiche svolte

### European Court of Auditors (ECA)

Fonte ufficiale:

- [Public Procurement hub](https://www.eca.europa.eu/en/public-procurement)
- [2024 annual information on specific contracts based on a framework contract](https://www.eca.europa.eu/ContentPagesDocuments/Public_procurement/2024_FWC_consumption.pdf)
- [2023 annual information on specific contracts based on a framework contract](https://www.eca.europa.eu/ContentPagesDocuments/Public_procurement/2023_FWC_consumption.pdf)
- [2022 annual information on specific contracts based on a framework contract](https://www.eca.europa.eu/ContentPagesDocuments/Public_procurement/2022_FWC_consumption.pdf)

Esito:

- fonte ufficiale confermata e molto utile per la copertura generale procurement
- ad oggi non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European External Action Service (EEAS)

Fonte ufficiale:

- [Ex-post publicity of the annual lists of contracts](https://www.eeas.europa.eu/eeas/ex-post-publicity-annual-lists-contracts_en)
- [2023 specific contracts on the basis of framework contracts](https://www.eeas.europa.eu/sites/default/files/documents/2024/2023%20specific%20contracts%20on%20the%20basis%20of%20framework%20contracts.pdf)
- [2022 specific contracts on the basis of framework contracts](https://www.eeas.europa.eu/sites/default/files/documents/2023/2022%20specific%20contracts%20on%20the%20basis%20of%20framework%20contracts.pdf)

Esito:

- fonte ufficiale confermata e ricca di contratti specifici
- compaiono vari framework `HR/...`, `COMM/...`, `EEAS/...`, `EASME/...`
- non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### ENISA

Fonte ufficiale:

- [2024 annual list of contracts awarded](https://www.enisa.europa.eu/sites/default/files/2025-06/2024%20-%20Annual%20list%20of%20contracts%20awarded.pdf)

Esito:

- fonte ufficiale confermata
- sono presenti diversi contratti con fornitori che ricorrono anche nell'ecosistema BEACON/DIGIT (`PwC`, `Gartner`, `NTT Belgium`)
- compaiono inoltre alcuni riferimenti `DI-....`
- pero' non emerge un collegamento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### EUIPO

Fonti ufficiali:

- [Procurement and grants hub](https://www.euipo.europa.eu/en/about-us/the-office/procurement-and-grants)
- [2024 list of specific contracts associated with framework contracts](https://euipo.europa.eu/tunnel-web/secure/webdav/guest/document_library/contentPdfs/about_euipo/public_procurement/publication_year_2024_en.pdf)
- [2021 list of specific contracts associated with framework contracts](https://euipo.europa.eu/tunnel-web/secure/webdav/guest/document_library/contentPdfs/about_euipo/public_procurement/publication_year_2021_en.pdf)

Esito:

- fonte ufficiale confermata e molto strutturata
- EUIPO pubblica bene i framework contract e gli importi aggregati dei specific contracts
- non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### eu-LISA

Fonti ufficiali:

- [Annual List of Contracts Signed in 2022](https://www.eulisa.europa.eu/sites/default/files/documents/contracts-awarded-2022.pdf)
- [Annual List of Contracts Signed in 2021](https://www.eulisa.europa.eu/sites/default/files/documents/contracts-awarded-2021.pdf)
- [Annual List of Contracts Signed in 2020](https://www.eulisa.europa.eu/sites/default/files/documents/contracts-awarded-2020.pdf)

Esito:

- fonte ufficiale confermata
- annual lists pubbliche e ben accessibili
- compaiono contratti IT, audit, legal e advisory, ma non un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European Investment Bank (EIB)

Fonti ufficiali trovate:

- [Corporate & Technical Assistance Procurement Guide](https://www.eib.org/en/publications/20230383-eib-s-corporate-and-technical-assistance-procurement-guide)
- [Technical assistance framework agreement clarifications](https://www.eib.org/files/procurement/ta-20240322-r0-clarifications-ii.pdf)

Esito:

- esistono fonti procurement ufficiali e framework clarifications
- al momento non emerge una annual list o specific contract list con legame esplicito a `DIGIT/2020/OP/0005`
- nessuna evidenza pubblica BEACON abbastanza forte per il dataset core

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Court of Justice of the European Union (CJEU / Curia)

Fonte ufficiale:

- [Procurement hub](https://curia.europa.eu/site/jcms/d2_5144/en/)

Esito:

- fonte ufficiale confermata
- il portale procurement di Curia espone annual lists of contracts e framework-specific disclosures
- ad oggi, dalla ricerca pubblica disponibile, non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European Research Executive Agency (REA)

Fonti ufficiali:

- [European Research Executive Agency - financial year 2021](https://commission.europa.eu/publications/european-research-executive-agency-financial-year-2021_en)
- [Research Executive Agency - financial year 2020](https://commission.europa.eu/publications/research-executive-agency-financial-year-2020_en)
- [Publication of annual list of specific contracts created under the framework contracts in 2021](https://commission.europa.eu/system/files/2022-06/promotion_of_agricultural_products_-_publication_of_annual_list_of_specific_contracts_created_under_the_framework_contracts_in_2021rea_operational_budget.pdf)
- [Publication of annual list of specific contracts/purchase orders created under the framework contracts in 2020](https://commission.europa.eu/system/files/2021-07/promotion_of_agricultural_products_-_publication_of_annual_list_of_specific_contracts_purchase_orders_created_under_the_framework_contracts_in_2020.pdf)

Esito:

- fonte ufficiale confermata
- REA pubblica chiaramente liste annuali di specific contracts basati su framework contracts
- al momento, nelle fonti verificate, non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European Medicines Agency (EMA)

Fonti ufficiali:

- [Procurement activities 2023](https://www.ema.europa.eu/en/about-us/procurement/procurement-archive/procurement-activities-2023)
- [Annual list of contracts 2024](https://www.ema.europa.eu/en/documents/other/annual-list-contracts-2024_en.pdf)
- [Annual list of contracts 2023](https://www.ema.europa.eu/en/documents/other/annual-list-contracts-2023_en.pdf)

Esito:

- fonte ufficiale confermata e molto strutturata
- EMA pubblica annual lists con una sezione dedicata al valore aggregato di specific contracts sotto framework contracts
- al momento non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Translation Centre for the Bodies of the EU (CdT)

Fonti ufficiali:

- [Annual list of Specific Contracts based on Framework Contracts - 2024](https://cdt.europa.eu/sites/default/files/documentation/pdf/2024_annual_list_fc_art_3.3_annexe_i_rf-en.pdf)
- [Annual list of Specific Contracts based on Framework Contracts - 2020](https://cdt.europa.eu/sites/default/files/documentation/pdf/2021_annual_list_fc_art_3.3_annexe_i_rf_en.pdf)
- [Documentation hub - procurement](https://cdt.europa.eu/cs/documentation/filter?field_documentation_theme_target_id=377)

Esito:

- fonte ufficiale confermata e molto adatta a questa metodologia
- CdT pubblica in modo esplicito framework reference, contractor e valore aggregato dei specific contracts
- emergono anche framework interistituzionali che coinvolgono altri enti come `Court of Justice` e `Court of Auditors`
- al momento non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Executive Agencies batch - emerging signal

Fonti ufficiali rilevanti:

- [REA - list of contracts made on the REA Administrative Budget in 2021](https://commission.europa.eu/system/files/2022-06/list_of_contracts_2021_made_on_rea_administrative_budget.pdf)

Esito:

- questo batch e' piu' promettente dei precedenti
- nelle liste contratti amministrativi REA compaiono fornitori compatibili con l'ecosistema BEACON/DIGIT:
  - `ATOS BELGIUM`
  - `EUROPEAN DYNAMICS LUXEMBOURG`
  - `NETWORK RESEARCH BELGIUM`
  - `NTT DATA SPAIN`
- i record sono esplicitamente classificati come `Specific Contract or Order Form based on a Framework Contract`
- pero' la fonte, nel passaggio verificato finora, non esplicita ancora `DIGIT/2020/OP/0005`
- quindi non entrano ancora nel dataset BEACON execution

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`
- `promising_batch_for_follow_up`

Dettagli utili gia' emersi:

- [REA 2021 administrative budget contracts](https://commission.europa.eu/system/files/2022-06/list_of_contracts_2021_made_on_rea_administrative_budget.pdf)
  - `ATOS BELGIUM` - `144,269.54 EUR` - `IT services and telecommunication charges`
  - `EUROPEAN DYNAMICS LUXEMBOURG SA` - `130,363.20 EUR` - `IT services and telecommunication charges`
  - `NETWORK RESEARCH BELGIUM SA` - `110,115.50 EUR` - `IT maintenance and development`
  - `NTT DATA SPAIN, SL` - `478,520.31 EUR` - `IT maintenance and development`

- [REA 2024 administrative budget contracts](https://commission.europa.eu/document/download/8bc4b8e2-0d73-4540-aae2-ecb18c476de4_en?filename=List+of+contracts+2024+on+REA+administrative+budget.pdf)
  - `ACCENTURE SA` - `427,092.80 EUR` - `IT maintenance and development`
  - `ARHS DEVELOPMENTS SA` - `132,367.40 EUR` - `IT maintenance and development`
  - `CGI LUXEMBOURG SA / LOGICA LUXEMBOURG` - `523,188.00 EUR` - `IT maintenance and development`
  - `CRONOS EUROPA` - `227,585.60 EUR` - `IT maintenance and development`
  - `DELOITTE CONSULTING & ADVISORY BV` - `24,504.00 EUR` - `IT training`
  - `NETCOMPANY-INTRASOFT SA` - `227,660.82 EUR` - `promotional campaign and audience analysis`
  - `TWENTY8 LUXEMBOURG SA` - `139,583.40 EUR` - `IT maintenance and development`

Interpretazione:

- il cluster di fornitori e il tipo di servizi sono molto compatibili con il perimetro BEACON / DIGIT
- pero' manca ancora il riferimento pubblico esplicito a `DIGIT/2020/OP/0005`
- quindi questi restano `indirect signals`, non `confirmed BEACON execution`

Stato per sottobatch:

- `REA` -> `documented indirect signal`
- `EISMEA` -> `public source pattern identified, no direct detailed document confirmed yet`
- `EACEA` -> `public source pattern identified, no direct detailed document confirmed yet`
- `ERCEA` -> `public source pattern identified, no direct detailed document confirmed yet`

Nota di metodo:

- per il ramo `Executive Agencies`, la Commissione pubblica chiaramente pagine annuali `financial year` con allegati tipo `list of contracts` e, in alcuni casi, `annual list of specific contracts created under the framework contracts`
- il pattern di pubblicazione e' quindi confermato anche quando il documento diretto non e' ancora stato intercettato per ogni singola agency
- questo rende il batch ad alta priorita' per ulteriori verifiche mirate

### Commission family / DGs

Fonti e pattern osservati:

- il dominio `commission.europa.eu` pubblica sia pagine `financial year` sia allegati `annual list of specific contracts created under the framework contracts`
- il pattern appare stabile soprattutto per Executive Agencies e programmi gestiti dalla Commissione
- per le `DGs` in senso stretto, la pubblicazione pubblica dei specific contracts sembra meno uniforme e meno facile da ricondurre direttamente all'ente nel dataset

Esito:

- il batch `Commission family` resta ad alta priorita'
- ad oggi non e' emerso ancora un record pubblico netto da attribuire in modo pulito a una `DG` del dataset con riferimento esplicito a `DIGIT/2020/OP/0005`
- quindi nessun nuovo record inserito nel dataset core per ora

Stato:

- `public_source_pattern_identified`
- `follow_up_needed`

Sottobatch incluso nello stesso pattern:

- `Eurostat`
- `Joint Research Centre`
- `OLAF`
- `Secretariat-General`
- `Legal Service`
- `Service for Foreign Policy Instruments`
- `Interpretation`
- `Translation`
- `OIB`
- `OIL`
- `PMO`
- `EPSO`
- `Publications Office`
- `Internal Audit Service`

Interpretazione:

- anche questi enti/servizi fanno parte del perimetro `Commission family`
- non ha senso lasciarli `pending` come se non avessimo alcun pattern di fonte
- ereditano quindi lo stato `follow_up_needed` del batch Commission, finché non troviamo un riferimento pubblico netto a `DIGIT/2020/OP/0005` o `BEACON`

### Eurojust

Fonte ufficiale:

- [Annual list of contracts](https://www.eurojust.europa.eu/about-us/procurement/annual-list-contracts)

Esito:

- fonte ufficiale procurement confermata
- Eurojust pubblica un hub dedicato alle annual lists of contracts
- il download pubblico 2024 individuato tramite hub non e' immediatamente estraibile come PDF diretto nel test automatizzato, quindi richiede follow-up tecnico sul retrieval del documento
- per ora nessun record inserito nel dataset core

Stato:

- `checked_official_source`
- `follow_up_needed`

## Wave 2 pilot findings

### EDPS

Fonti ufficiali:

- [Annual list of contracts 2024](https://www.edps.europa.eu/system/files/2025-06/Annual%20list%20of%20contracts_%202024_EN.pdf)
- [Annual list of contracts 2023](https://www.edps.europa.eu/system/files/2025-06/24-06-07_annual_list_of_contracts_2023_en.pdf)
- [Annual list of contracts 2022](https://www.edps.europa.eu/system/files/2023-06/2022-list-awarded-contracts_en.pdf)

Esito:

- fonte ufficiale confermata e molto forte
- EDPS pubblica contratti specifici sotto framework contracts con contractor e valore
- emergono riferimenti espliciti a framework `PE/ITEC/ITS19` e `PE/ITEC/ITS20`, con contractor come `NTT DATA BELGIQUE` e `SWORD S.A`
- pero' non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EDA

Fonti ufficiali:

- [Annual List of Contracts 2024](https://eda.europa.eu/docs/default-source/procurement-library/annual-list-of-contracts-20248b26c33fa4d264cfa776ff000087ef0f.pdf)
- [Annual List of Contracts 2023](https://eda.europa.eu/docs/default-source/procurement-library/annual-list-of-specific-contracts-2023.pdf)
- [Annual List of Contracts 2022](https://eda.europa.eu/docs/default-source/procurement-library/annual-list-of-specific-contracts-2022.pdf)

Esito:

- fonte ufficiale confermata
- EDA pubblica liste annuali con `specific contracts under a framework contract`
- emergono segnali indiretti utili come:
  - `NTT BELGIUM S.A.` su `16.CSD-IT.IP.181`
  - `Service level agreement with DIGIT` su `15.CSD-IT.IP.903`
- pero' non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### EuroHPC JU

Fonti ufficiali:

- [Ex-post publication of Annual list of Contracts and Grants Awarded in 2022](https://eurohpc-ju.europa.eu/document/download/fc7540ba-2cd1-4114-80d5-722515dabb86_en?filename=Ex-post+publication+of+Annual+list+of+Contracts+and+Grants+Awarded+in+2022.pdf)
- [Ex-post publication of Annual list of Contracts and Grants Awarded in 2021](https://www.eurohpc-ju.europa.eu/system/files/2023-06/Ex-post%20publication%20of%20Annual%20list%20of%20Contracts%20and%20Grants%20Awarded%20in%202021.pdf)
- [Ex-post publication of Annual list of Contracts and Grants Awarded in 2020](https://www.eurohpc-ju.europa.eu/document/download/3a9dcd73-3e2e-49f0-8e4e-889b5950aa7e_en?filename=Ex-post+publication+of+Annual+list+of+Contracts+and+Grants+Awarded+in+2020.pdf)

Esito:

- fonte ufficiale molto forte e ben pubblicata
- annual lists dettagliate con contractor e valore
- i contratti trovati riguardano soprattutto supercomputing infrastructure, grants e supply contracts
- non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Circular Bio-based Europe Joint Undertaking (CBE JU)

Fonti ufficiali:

- [Contracts concluded in 2022](https://www.cbe.europa.eu/system/files/2023-07/CBE-JU-contracts-2022.pdf)

Esito:

- fonte ufficiale confermata
- elenco contratti con importi, contractor e indicazione del framework
- nei casi verificati il campo `Framework` risulta `None`
- non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Fusion for Energy (F4E)

Fonti ufficiali:

- [Industry and Fusion Laboratories Portal - procurement documents](https://industryportal.f4e.europa.eu/mainmenu/how-to-do-business/procurement-documents/)

Esito:

- fonte ufficiale confermata
- F4E pubblica annual list of awarded contracts and amendments
- il dominio procurement e' ricco ma molto focalizzato su industrial procurement e fusion components
- al momento non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EIOPA

Fonte ufficiale:

- [Procurement hub](https://www.eiopa.europa.eu/about/procurement_en)

Esito:

- fonte ufficiale confermata e molto strutturata
- EIOPA pubblica annual lists di `specific contracts under framework contracts` per piu' anni
- il pattern documentale e' molto adatto a questa metodologia
- al momento non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset core

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EEA

Fonte ufficiale:

- [Annual List of Contracts 2023](https://www.eea.europa.eu/en/about/procurement-and-grants/contracts-and-grants-awarded/list-of-contracts-2022.pdf/%40%40download/file)

Esito:

- fonte ufficiale confermata
- la lista pubblica e' ben strutturata con reference number, contractor, short description e valore
- al momento non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito per ora nel dataset core

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EPPO

Fonti ufficiali:

- [Procurement hub](https://www.eppo.europa.eu/en/about/procurement)
- [Annual list of contracts 2024](https://www.eppo.europa.eu/sites/default/files/2025-06/EPPO_procurement_annual_list_of_contracts_2024.pdf)
- [Annual list of contracts 2023](https://www.eppo.europa.eu/sites/default/files/2024-06/EPPO_procurement_annual_list_of_contracts_2023.pdf)
- [Annual list of contracts 2022](https://www.eppo.europa.eu/sites/default/files/2023-06/EPPO_procurement_annual_list_of_contracts_2022.pdf)

Esito:

- fonte ufficiale molto forte e ben strutturata
- EPPO pubblica specific contracts under framework contracts con contractor e valore
- emergono riferimenti a framework come `BUDG/23/OP/0004`, `COJ/PROC/19/010`, `COMM/2020/OP/0024`, `CDT/WANSIV/2022`
- compare anche `NTT Data Belgique SPRL` su un framework `COMM/2020/OP/0024`
- pero' non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EISMEA

Fonti ufficiali:

- [List of contractors 2023](https://eismea.ec.europa.eu/document/download/e2f21976-a91e-4d50-a945-75cb7b8a4dc0_en?filename=EISMEA+List+of+Contracts+2023.pdf)
- [List of contractors 2021](https://eismea.ec.europa.eu/publications/list-contractors-2021_en)

Esito:

- fonte ufficiale confermata
- EISMEA pubblica `specific contracts under a framework contract` con contractor e importi aggregati
- emergono riferimenti forti a framework digitali `DI/...` e fornitori compatibili con ecosistema Commission / BEACON:
  - `FWC DI/07810` - `Atos`
  - `FWC DI/07949` - `Cronos`
  - `FWC DI/07948` - `Network Research Belgium`
  - `FWC DI/07961` - `Netcompany-Intrasoft`
  - `FWC DI/07958` - `ARHS Developments`
- pero' non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### ERCEA

Fonti ufficiali:

- [Annual list of contractors and of the specific contracts/order forms under framework contracts for the year 2022](https://erc.europa.eu/sites/default/files/2023-06/contractors-2022.pdf)

Esito:

- fonte ufficiale molto forte
- ERCEA pubblica molti `specific contracts/order forms under framework contracts`
- emergono numerosi framework digitali `DI/...` con oggetto `Informatic services` e importi aggregati:
  - `DI/07720` - `Bechtle Brussels`
  - `DI/07722` - `Insight Technology Solutions Belgium`
  - `DI/07810` - `ATOS Belgium`
  - `DI/7701` - `ARHS`
  - `DI/7948` - `Octoplus2`
  - `DI/7949` - `Eurora Supernova`
  - `DI/7952` - `Metis`
  - `DI/7702` - `Cronos`
  - `DI/7704` - `Trasys`
  - `DI/7945` - `ITA`
- emerge anche `COMM/2020/OP/0024 - Lot 1 - NTT DATA`
- pero' non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### Innovative Health Initiative (IHI JU)

Fonti ufficiali:

- [Procurement hub](https://www.ihi.europa.eu/procurement)
- [List of contracts concluded in 2024](https://www.ihi.europa.eu/sites/default/files/uploads/Documents/Recruitment/Procurement/List_of_contracts_2024.pdf)
- [List of contracts concluded in 2022](https://www.ihi.europa.eu/sites/default/files/uploads/Documents/Recruitment/Procurement/List_of_contracts_singed_in_2022.pdf)
- [List of contracts concluded in 2021](https://www.ihi.europa.eu/sites/default/files/flmngr/List_of_contracts_2021.pdf)

Esito:

- fonte ufficiale molto forte
- IHI pubblica chiaramente `specific contracts awarded ... implementing IHI JU and interinstitutional framework contracts`
- emergono molti contratti IT / cloud / managed services / software con contractor come:
  - `Netcompany-Intrasoft`
  - `Inetum`
  - `Bechtle`
  - `Insight Technology Solutions`
  - `Randstad`
- i riferimenti pero' sono generici come `EC-FWC`, `JU-FWC`, `Inter-JU FWC`
- non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### SESAR JU

Fonti ufficiali:

- [Procurement archive](https://www.sesarju.eu/procurement-archive)
- [List of contracts awarded from 01/01/2023-31/12/2023](https://www.sesarju.eu/sites/default/files/documents/procurements/contracts_awarded_2023.pdf)
- [Bi-Annual Work Programme 2024-2025](https://www.sesarju.eu/sites/default/files/documents/reports/Bi-Annual%20Work%20Programme%20for%20years%202024-2025.pdf)

Esito:

- fonte ufficiale molto forte
- SESAR pubblica sia l'archivio procurement sia il procurement planning
- emergono framework contracts e specific contracts sotto procurement interistituzionale
- i riferimenti trovati sono del tipo `CS2JU.2021.OP.01`, `SLA`, `inter-institutional procurement`
- non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Chips Joint Undertaking (Chips JU)

Fonti ufficiali:

- [Procurements hub](https://www.chips-ju.europa.eu/opsproc)
- [Administrative Procurement library](https://www.chips-ju.europa.eu/Documents)

Esito:

- fonte ufficiale procurement confermata
- esiste una libreria dedicata all'`Administrative Procurement`
- emergono procurement actions, pilot lines procurements e documenti amministrativi
- ma non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### Clean Aviation Joint Undertaking (CA JU)

Fonti ufficiali:

- [Calls for tenders](https://www.clean-aviation.eu/clean-aviation-calls/calls-for-tenders)
- [Example contract award notice 2022/S 054-139563](https://www.clean-aviation.eu/sites/default/files/2022-05/2022-OJS054-139563_en.pdf)
- [Decision on ICT services procurement](https://clean-aviation.eu/sites/default/files/2022-07/CAJU-ED-Decision-n20-ICT-Services-signed-ts.pdf)

Esito:

- fonte ufficiale procurement confermata
- Clean Aviation pubblica sia tender pages sia award notices TED-linked e decisioni procurement
- emergono framework service contracts e procurement ICT
- ma non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### SNS JU

Fonti ufficiali:

- [Procurement hub](https://smart-networks.europa.eu/procurement/)

Esito:

- fonte ufficiale procurement confermata
- SNS JU pubblica call e procurement actions proprie e anche call congiunte con altre Joint Undertakings
- emerge una forte interazione procurement con `Clean Aviation`, `CHIPS JU`, `EU-Rail`, `SESAR3 JU`, `EURO-HPC JU`, `CBE JU`, `GHEDCTP3 JU`, `IHI JU`
- ma non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EACEA

Esito:

- `EACEA` rientra chiaramente nel pattern `Executive Agencies`
- il pattern di pubblicazione Commission per questo cluster e' ormai consolidato:
  - pagine `financial year`
  - `list of contracts`
  - in alcuni casi `specific contracts created under the framework contracts`
- non abbiamo ancora intercettato un documento diretto con riferimento esplicito a `DIGIT/2020/OP/0005`
- ma non ha piu' senso trattarla come `pending`

Stato:

- `public_source_pattern_identified`
- `follow_up_needed`

### EDCTP3 JU

Esito:

- `EDCTP3 JU` rientra chiaramente nel pattern `Joint Undertakings`
- le altre JU gia' verificate mostrano un comportamento omogeneo:
  - procurement hub pubblico
  - annual lists o contratti conclusi
  - framework references diversi da `DIGIT/2020/OP/0005`
- non abbiamo ancora un documento diretto con BEACON esplicito
- ma non ha piu' senso lasciarla `pending`

Stato:

- `public_source_pattern_identified`
- `follow_up_needed`

### Euratom Supply Agency (ESA)

Esito:

- `ESA` rientra nel cluster Luxembourg / Commission-related bodies
- per questo cluster il pattern procurement pubblico e' stato verificato piu' volte
- non abbiamo ancora un documento diretto che colleghi l'ente a `DIGIT/2020/OP/0005`
- quindi la classificazione corretta, al momento, e' di follow-up e non di assenza totale di pattern

Stato:

- `public_source_pattern_identified`
- `follow_up_needed`

### Common Foreign and Security Policy Entities (CFSP)

Esito:

- `CFSP` e' un contenitore trasversale piu' che un singolo contracting body
- perimetralmente cade dentro il ramo `Commission / EEAS / foreign policy entities`
- il pattern di fonte pubblica del ramo e' confermato, ma non abbiamo un documento esplicito specifico BEACON per questo record aggregato
- non ha senso mantenerlo `pending`

Stato:

- `public_source_pattern_identified`
- `follow_up_needed`

### Committee of the Regions (CoR)

Fonti ufficiali:

- [Procurement hub](https://cor.europa.eu/it/proposito-del-cdr/il-nostro-lavoro/gare-dappalto)
- [List of contracts awarded in 2024 & modifications of contracts](https://cor.europa.eu/sites/default/files/2025-06/List%20of%20contracts%20with%20a%20value%20greater%20than%2015000%E2%82%AC%20signed%20by%20the%20CoR%20in%202024%20%281%29.pdf)

Esito:

- fonte ufficiale molto forte
- il CoR pubblica sia contratti aggiudicati sia liste di contratti specifici basati su framework contracts
- emergono anche contratti di formazione e trasformazione digitale, per esempio con `PricewaterhouseCoopers EU Services`
- pero' non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European Investment Fund (EIF)

Fonti ufficiali:

- [Procurement catalogue](https://www.eif.org/work-with-us/procurement/catalogue)

Esito:

- fonte ufficiale procurement confermata
- EIF pubblica un procurement catalogue strutturato con contract notices e contract award notices
- emergono servizi di consulenza, marketing, IT e support services
- al momento non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European Commission (root entity)

Fonti ufficiali:

- [Tender opportunities - Digital Services](https://commission.europa.eu/funding-tenders/find-calls-tender/tender-opportunities-department/tender-opportunities-digital-services_en)
- [Tender opportunities - Human Resources and Security](https://commission.europa.eu/funding-tenders/find-calls-tender/tender-opportunities-department/tender-opportunities-human-resources-and-security_en)

Esito:

- fonte ufficiale procurement confermata
- per il root `European Commission` il pattern di pubblicazione ex-post e delle specific contracts esiste chiaramente
- questo conferma che l'ente non e' piu' `unknown`, anche se il mapping pubblico a BEACON resta incompleto
- al momento non emerge un riferimento pubblico abbastanza netto da inserirlo come record execution BEACON nel dataset core

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### European Schools / EURSC

Fonti ufficiali:

- [Public procurement hub](https://www.eursc.eu/en/office/public-procurement/)

Esito:

- fonte ufficiale molto forte
- EURSC pubblica in modo molto esplicito:
  - `contracts awarded`
  - `framework contracts`
  - `list of specific contracts based on a framework contract`
  - `volumes per contract and per semester`
- il pattern documentale e' perfettamente compatibile con la metodologia del progetto
- al momento non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

## Conclusione operativa

La `Wave 1` sta confermando una cosa importante:

- esistono fonti ufficiali utili da verificare per ente
- pero' molte fonti non espongono in modo esplicito il legame con `BEACON`

Quindi il programma completo deve distinguere chiaramente:

1. `execution records confirmed`
2. `official source checked, no public BEACON evidence yet`
3. `possible indirect signal only`

Questo evita di:

- inserire record deboli nel dataset core
- ma anche di perdere traccia del lavoro gia' svolto

## Wave 3 pilot findings

### ECHA

Fonti ufficiali:

- [Annual lists of awarded contracts](https://echa.europa.eu/annual-lists-of-awarded-contracts)

Esito:

- fonte ufficiale molto forte
- ECHA pubblica annual lists di contratti aggiudicati per molti anni
- storicamente pubblica anche `Specific contracts ... under Inter-institutional Framework Contracts with DG DIGIT (Commission)` per gli anni 2012-2015
- questo conferma un legame forte con il procurement interistituzionale DIGIT, ma non con `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### EASA

Fonti ufficiali:

- [Procurement hub](https://www.easa.europa.eu/da/the-agency/procurement)

Esito:

- fonte ufficiale confermata
- EASA pubblica chiaramente `2009-2024 Annual list of contractors`
- procurement transparency buona, ma senza legame pubblico emerso con `DIGIT/2020/OP/0005`
- nessuna evidenza pubblica BEACON trovata nel pilot

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EFSA

Fonti ufficiali:

- [Procurement for services we need](https://www.efsa.europa.eu/mk/calls/procurement)
- [EFSA procurement infographic](https://www.efsa.europa.eu/sites/default/files/2022-02/2022-procurement-Infographic_final.pdf)

Esito:

- fonte ufficiale procurement confermata
- EFSA espone bene procedure e regole procurement
- nel pilot non emerge una annual list o evidence pubblica collegata a `DIGIT/2020/OP/0005`
- nessuna evidenza pubblica BEACON trovata

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EIGE

Fonti ufficiali:

- [Low value and specific contracts awarded](https://eige.europa.eu/document-types/low-value-and-specific-contracts-awarded)

Esito:

- fonte ufficiale molto forte
- EIGE pubblica specific contracts awarded per piu' anni
- nel pilot non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EUAA / former EASO

Fonti ufficiali:

- [Procurement hub](https://www.euaa.europa.eu/procurement)
- [List of contracts signed under framework contracts with aggregate value > EUR 130,000 in 2014](https://www.euaa.europa.eu/sites/default/files/public/EASO-specific-contracts-2014.pdf)

Esito:

- fonte ufficiale molto forte
- emerge un legame storico esplicito con framework `DG DIGIT DI/06820`
- esempio: `FWC DG DIGIT DI/06820 - Provision of software products, maintenance and support and informatics services`
- contractor esplicito: `Comparex Nederland`
- questo non dimostra un legame con `DIGIT/2020/OP/0005`
- pero' dimostra un rapporto molto concreto con il procurement interistituzionale DIGIT

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### ELA

Fonti ufficiali:

- [Procurement hub](https://www.ela.europa.eu/en/about/procurement)
- [List of contracts signed in 2023](https://www.ela.europa.eu/sites/default/files/2024-04/List-of-contracts-2023-for_website.pdf)
- [List of contracts signed in 2022](https://www.ela.europa.eu/sites/default/files/2023-05/List-of-contracts-2022-for%20website.pdf)
- [List of contracts signed in 2021](https://www.ela.europa.eu/sites/default/files/2022-04/ela-list-of-contracts-2021.pdf)

Esito:

- fonte ufficiale molto forte
- ELA pubblica annual lists con una sezione esplicita `Specific contracts under a framework contract`
- emergono riferimenti come `BUDG19/PO/01` e contratti quadro / SC / OF ben strutturati
- non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### FRA

Fonti ufficiali:

- [Procurement hub](https://fra.europa.eu/pl/about-fra/procurement)

Esito:

- fonte ufficiale procurement confermata
- FRA espone chiaramente il canale procurement e la documentazione amministrativa collegata
- al momento non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`
- quindi nessun record inserito nel dataset BEACON execution

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### CEPOL

Fonti ufficiali:

- [Awarded public contracts](https://www.cepol.europa.eu/work/procurement/list-awarded-public-contracts)
- [Annual list of contractors 2024 - specific contracts based on inter-institutional FWC](https://www.cepol.europa.eu/api/assets/media/downloads/2025/05-SC-Inter-institutional-FWC-2024.pdf)
- [CEPOL Procurement Plan 2025](https://www.cepol.europa.eu/api/assets/media/downloads/2025/Procurement-Plan-2025-web.pdf)

Esito:

- fonte ufficiale molto forte
- CEPOL pubblica annual lists di `specific contracts` sia su propri framework sia su `Inter Institutional Framework Contracts`
- emergono riferimenti espliciti a framework `DI/...` e al perimetro `DIGIT`:
  - `Framework Contract No DI/08050`
  - `Framework Contract No DI/08090`
  - `Mini-Competition 2 Microsoft Reseller (LSP) under SIDE III DPS DIGIT/2023/DPS/0001`
  - procurement plan con voce `DIGIT FWCs`
- questo non dimostra un legame con `DIGIT/2020/OP/0005`
- pero' dimostra un legame molto forte con procurement interistituzionale DIGIT

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### Frontex

Fonti ufficiali:

- [General information - procurement](https://www.frontex.europa.eu/about-frontex/procurement/procurement/general-information/)
- [Annual list of low and middle value contracts concluded in 2022](https://prd.frontex.europa.eu/wp-content/uploads/lowmid-2022.pdf)
- [Annual procurement plan 2025](https://prd.frontex.europa.eu/wp-content/uploads/mb-decision-42_2024-annual-procurement-plan-2025.pdf)

Esito:

- fonte ufficiale procurement confermata
- Frontex pubblica annual lists e procurement plan con framework contracts e planned entries
- nel pilot non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EU Agency for Large-Scale IT Systems (EU-LISA)

Fonti ufficiali:

- [Ex Post Publicity hub](https://www.eulisa.europa.eu/procurement/ex-post-publicity)
- [Annual List of Contracts Signed in 2023](https://www.eulisa.europa.eu/sites/default/files/documents/contracts-awarded-2023.pdf)

Esito:

- fonte ufficiale confermata e molto strutturata
- EU-LISA pubblica annual lists con una sezione dedicata ai `Specific Contracts`
- emergono framework propri dell'agenzia (`LISA/...`) e ICT external assistance
- non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### CEDEFOP

Fonti ufficiali:

- [Annual list of contracts hub](https://www.cedefop.europa.eu/en/document-types/annual-list-contracts)
- [Annual List of Contractors 2024](https://www.cedefop.europa.eu/en/content/annual-list-contractors-2024)

Esito:

- fonte ufficiale confermata
- CEDEFOP pubblica annual contractor lists in modo regolare
- il canale pubblico procurement esiste ed è verificato
- non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### ECDC

Fonti ufficiali:

- [Ex-post publicity hub](https://www.ecdc.europa.eu/en/about-ecdc/procurement-and-grants/ex-post-publicity)
- [Specific contracts per inter-institutional framework contract - 2022](https://www.ecdc.europa.eu/sites/default/files/documents/List_of_specific_contracts_IP_LCK_2022.pdf)

Esito:

- fonte ufficiale confermata e molto adatta a questa metodologia
- ECDC pubblica sia `Specific Contracts per framework contract` sia `Specific Contracts per inter-institutional framework contract`
- nelle annual lists storiche compaiono sezioni `Specific Contracts: DIGIT`
- non emerge però un riferimento pubblico abbastanza forte a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### ERA

Fonti ufficiali:

- [Procurement hub](https://www.era.europa.eu/agency/procurement_en)
- [Annual Lists of Contractors](https://www.era.europa.eu/agency/procurement/annual-lists-contractors)
- [Annual list of contractors 2020](https://www.era.europa.eu/system/files/2024-02/Annual%20List%20of%20Contractors%202020.pdf?t=1707300956)

Esito:

- fonte ufficiale confermata
- ERA pubblica annual contractor lists con sezione `Specific contracts under a framework contract`
- emergono fornitori IT e advisory compatibili con ecosistemi Commission/DIGIT, ma senza aggancio esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EU-OSHA

Fonti ufficiali:

- [Procurement hub](https://osha.europa.eu/en/about-eu-osha/procurement)

Esito:

- fonte ufficiale confermata
- EU-OSHA pubblica procurement plan e annual contractor lists per più anni
- il canale pubblico procurement è chiaro e verificato
- non emerge un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### BEREC Office

Fonti ufficiali:

- [Public procurement hub](https://www.berec.europa.eu/index.php/en/public-procurement-at-the-berec-office)
- [Closed procedures](https://www.berec.europa.eu/en/closed-procedures)
- [Ex-post publication of contracts signed in 2024](https://www.berec.europa.eu/system/files/2025-06/Ex-post%20publication%20of%20contracts%20signed%20in%202024_BEREC%20Office.pdf)

Esito:

- fonte ufficiale confermata
- BEREC pubblica ex-post contract lists, procurement plans e riferimenti a specific contracts sotto framework contracts
- il pattern procurement è buono e verificato
- non emerge però un riferimento esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### CPVO

Fonti ufficiali:

- [Annual list of specific contracts concluded under InterInstitutional Framework Contracts - 2023](https://cpvo.europa.eu/sites/default/files/documents/2024-09/euis-fwc-2023.pdf)
- [Annual list of contractors 2022](https://cpvo.europa.eu/sites/default/files/documents/2023-11/contractors-list-2022.pdf)

Esito:

- fonte ufficiale confermata
- CPVO pubblica in modo molto esplicito contratti specifici sotto `InterInstitutional Framework Contracts`
- compaiono riferimenti DG DIGIT (`DI/07870`, `DI/07722`, `SLA DIGIT 009`) e contractor come `Oracle`, `Insight`, `Deloitte`
- non emerge però un riferimento pubblico abbastanza forte a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `possible_indirect_signal_only`

### EUDA

Fonti ufficiali:

- [Contracts awarded hub](https://www.euda.europa.eu/about/procurement/list-contracts-awarded_en)
- [Specific contracts awarded by the EMCDDA in 2023](https://www.euda.europa.eu/drugs-library/specific-contracts-awarded-emcdda-2023_en)

Esito:

- fonte ufficiale confermata e molto strutturata
- EUDA pubblica tabelle dettagliate di `specific contracts under framework contracts`
- compaiono framework ICT (`ITS19-...`) con contractor, valore e subject matter
- non emerge però un riferimento pubblico a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### ETF

Fonti ufficiali:

- [Procurement hub](https://www.etf.europa.eu/en/about/procurement?page=1)
- [Ex post advertising of contracts concluded in 2023](https://www.etf.europa.eu/sites/default/files/document/2024%20Ex%20post%20advertising_0.pdf)

Esito:

- fonte ufficiale confermata
- ETF pubblica ex-post advertising con contratti e spese su running contracts
- emergono framework contracts e lotti, ma non un aggancio esplicito a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### EUI

Fonti ufficiali:

- [List of public contracts](https://www.eui.eu/en/public/about/procurement/list-of-contracts)
- [Calls for Tenders hub](https://www.eui.eu/About/Tenders/Index)

Esito:

- fonte ufficiale confermata
- EUI pubblica una lista dei public contracts e un tender hub strutturato
- il contesto mostra uso di framework contracts e specific contracts in senso amministrativo
- non emerge però un riferimento pubblico a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### AMLA

Fonti ufficiali:

- [About AMLA](https://www.amla.europa.eu/about-amla_en)
- [Personal data protection policy](https://www.amla.europa.eu/personal-data-protection-policy_en)
- [Record of Processing Activities - SEDIA](https://www.amla.europa.eu/document/download/67dfcd51-f736-4897-8926-8408726bac83_en?filename=18+-+SEDIA+-+Record+of+Processing+Activities.pdf)

Esito:

- AMLA è una nuova autorità UE, giuridicamente esistente dal 26 giugno 2024
- emerge un contesto operativo che include `Finance & Procurement` e uso di SEDIA
- però non è ancora emerso un vero hub pubblico ex-post comparabile alle altre agenzie mature
- non emerge alcun riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `public_source_pattern_identified`
- `follow_up_needed`

### ECCC

Fonti ufficiali:

- [ECCC home](https://cybersecurity-centre.europa.eu/home-0_en)
- [Provision of interim support services for the European Cybersecurity Competence Centre in Bucharest, Romania - EU tenders](https://op.europa.eu/en/web/public-procurement/procurement-details/-/procurement/2d6e8328-8316-4c49-b1b3-a96641e4b63b)

Esito:

- fonte ufficiale procurement confermata
- ECCC ha già tender e award notices pubbliche, incluse framework agreements e contract award information
- il pattern procurement dell'ente è quindi chiaramente verificato
- non emerge però un riferimento pubblico a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`

### ESMA

Fonti ufficiali:

- [ESMA procurement library](https://www.esma.europa.eu/databases-library/esma-library?bcsi_scan_421d4638436100a9=EfTXCgMiI6wF+KhzuWcr0RwbJBdwAAAAkXEiMQ%3D%3D&bcsi_scan_filename=Dir_01_107.PDF&f%5B0%5D=basic_section%3A4&f%5B1%5D=basic_section%3A10&perpage=100&solrsort=ss_esma_document_reference+desc)
- [Annual list of contracts 2024](https://www.esma.europa.eu/databases-library/esma-library?bcsi_scan_421d4638436100a9=EfTXCgMiI6wF+KhzuWcr0RwbJBdwAAAAkXEiMQ%3D%3D&bcsi_scan_filename=Dir_01_107.PDF&f%5B0%5D=basic_section%3A4&f%5B1%5D=basic_section%3A10&perpage=100&solrsort=ss_esma_document_reference+desc)

Esito:

- fonte ufficiale procurement confermata
- ESMA pubblica annual list of contracts e procurement plan overview
- nel pilot non emerge un riferimento a `DIGIT/2020/OP/0005`
- non emerge la keyword `BEACON`

Stato:

- `checked_official_source`
- `no_public_beacon_evidence_yet`
