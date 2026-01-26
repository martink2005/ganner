# Gannomat ProTec – Webová aplikácia na automatizáciu CNC programov (špecifikácia v1.1)

> **Hook:** Dnes meníš rozmery skrinky ručne v 7–10 dielcoch. **Takže** stačí jeden preklep a výroba sa pokazí. **A potom** máš stratu materiálu. Táto appka má zabezpečiť, že zmeníš rozmery/parametre *raz* a systém bezpečne, opakovateľne a testami kryto prepočíta všetky `.ganx` programy.

**Stav upresnení (26. 1. 2026):**
- ✅ Aplikácia bude bežať **na serveri**.
- ✅ `qty` (množstvo) je zatiaľ **iba evidencia** (bez duplikácie priečinkov).
- ✅ Základná štruktúra `.ganx` súborov a organizácia skriniek je popísaná na základe analýzy príkladových súborov (sekcie 6, 6.1).
- ⏳ Detailnejšia analýza parametrov a ich mapovania bude pokračovať počas implementácie → v špecifikácii sú stále označené **TODO** miesta pre pokročilé témy.

---

## 1) Kontext a problém

### Ako to funguje dnes
- Pre **každú skrinku** existuje sada programov pre **dielce** (typicky 7–10 dielcov).
- Programy sú v súboroch **`.ganx`** (XML).
- Existujú čiastočne **parametrické skrinky**, ale keď sa mení rozmer skrinky, musíš:
  - otvoriť **každý dielec** v Gannomat editore,
  - upraviť rozmery a doplnkové parametre (napr. vzdialenosti vŕtaní),
  - dávať pozor na preklepy → vysoká chybovosť.
- V jednej zákazke môže byť ~**12 typov skriniek**, takže ručné prepočty sú pomalé.

### Prečo je to kritické
- Ak aplikácia zle prepočíta hodnoty, chyba sa prejaví až pri **vŕtaní** → **okamžité straty materiálu**.
- Preto musí byť dôraz na:
  - deterministický prepočet,
  - validácie,
  - unit testy + golden fixtures,
  - audit a porovnanie výstupov.

---

## 2) Ciele a ne-ciele

### Ciele
1. **Katalóg skriniek** (template / “master”):
   - každá skrinka má:
     - názov,
     - základný rozmer (ako pri importe),
     - sadu `.ganx` dielcov,
     - zoznam *nastaviteľných parametrov* (zjednotený naprieč dielcami).
2. **Zákazky**:
   - vytvoríš zákazku (len názov),
   - do zákazky pridávaš skrinky z katalógu,
   - pre každú pridanú skrinku nastavíš:
     - rozmery,
     - parametre,
     - množstvo (qty).
3. **Generovanie programov**:
   - pri uložení skrinky v zákazke systém:
     - nakopíruje programy z katalógu,
     - upraví rozmery a parametre v každom `.ganx`,
     - uloží výsledok do štruktúry zákazky.
   - prepočet je opakovateľný (keď zmeníš parametre, znovu prepočíta).

### Ne-ciele (zatiaľ)
- Plná CAD/CAM pipeline (napr. DXF → GANX) – iná etapa.
- Automatické generovanie nových operácií “od nuly” – riešime **prepis parametrov** existujúcich programov.
- Duplikácia priečinkov podľa qty – **zatím nie**, qty je len evidencia.

---

## 3) Kľúčové pojmy

- **Skrinka (Cabinet Template)**: template v katalógu, obsahuje dielce a parametre.
- **Dielec (Part)**: jeden `.ganx` súbor v skrinke.
- **Parameter**: nastaviteľná hodnota (napr. šírka, výška, offset vŕtania).
- **Základný rozmer**: referenčný rozmer template pri importe.
- **Zákazka (Order/Job)**: kolekcia konkrétnych skriniek s konkrétnymi rozmermi/parametrami.
- **Inštancia skrinky v zákazke**: záznam v zákazke, ktorý odkazuje na template skrinky + má vlastné hodnoty parametrov a rozmery.
- **Qty (množstvo)**: koľkokrát sa má skrinka vyrobiť (**len evidencia**).

---

## 4) Storage a súborová štruktúra (server)

Keďže appka beží **na serveri**, filesystem musí byť serverový (lokálny disk servera alebo object storage + export na disk).

### Odporúčaný model storage (praktický a jednoduchý)
- Server má definovaný root storage (napr. `/data/gannomat/`).
- V ňom sú dve zložky:

#### Katalóg
```
/data/gannomat/catalog/
  <nazov_skrinky>/
    *.ganx          (programy pre jednotlivé dielce)
    *.param         (binárny súbor s parametrami skrinky)
    *.txt           (voliteľné poznámky/dodatočné informácie)
    (prípadne podsložky)
```

#### Zákazky
```
/data/gannomat/zakazky/
  <nazov_zakazky>/
    <nazov_alebo_kod_skrinky>/   (unikátne v rámci zákazky)
      *.ganx          (vygenerované programy pre dielce)
      (voliteľne *.param, *.txt ak sa kopírujú z katalógu)
```

**Poznámka k súborom:**
- `.ganx` súbory sú XML formát s programami pre CNC stroj (dielce skrinky).
- `.param` súbory sú binárne a obsahujú parametre skrinky (vyžadujú špeciálne spracovanie alebo môžu byť ignorované, ak sa parametre extrahujú priamo z `.ganx`).
- `.txt` súbory sú voliteľné poznámky (napr. špecifikácie zásuviek, dodatočné informácie).

### Kolízia názvov priečinkov v zákazke
- Ak pridáš rovnakú skrinku viackrát:
  - UI vypíše konflikt,
  - ponúkne premenovanie (napr. `SkrinkaA_2`),
  - qty sa eviduje samostatne.

---

## 5) Modul: Import skrinky do katalógu (server režim)

> Keďže appka beží na serveri, import musí dostať dáta **na server**.

### Odporúčaný spôsob importu (default)
- Upload **ZIP** (alebo tar) cez web UI:
  1. user zvolí názov skrinky + kategóriu,
  2. nahrá ZIP s `.ganx` súbormi,
  3. server ZIP bezpečne rozbalí do `catalog/<nazov_skrinky>/`,
  4. prejde súbory a vyextrahuje parametre.

### Bezpečné rozbaľovanie (must)
- Validovať:
  - iba povolené prípony (primárne `.ganx`, voliteľne aj podpora podsložiek),
  - ochrana proti path traversal (`../`),
  - limit veľkosti uploadu a rozbaleného obsahu,
  - hash súborov a deduplikácia.

### Cieľ importu
1. Skopírovať dielce do `catalog/<nazov_skrinky>/`.
2. Prejsť všetky `.ganx`:
   - načítať XML,
   - zistiť *nastaviteľné parametre*,
   - urobiť **sumár unikátnych parametrov** pre celú skrinku:
     - ak 3 dielce majú rovnaký parameter, v zozname bude len raz,
     - evidovať usage (v ktorých dielcoch je použitý).

### Výstup importu do DB (meta)
- Template skrinky + zoznam parametrov + mapping parametrov na dielce + defaulty + kontrolné hash-e súborov.

---

## 6) Extrakcia parametrov z `.ganx` (XML)

### Základná štruktúra XML súborov

`.ganx` súbory sú XML dokumenty s namespace `http://tempuri.org/Programm.xsd`. Hlavné sekcie:

#### 1. `PrgrSet` – základné rozmery dielca
```xml
<PrgrSet>
  <PrgrName>BKL_A011</PrgrName>
  <Description>HRANA K DORAZU SPODNA DO PREDU</Description>
  <wsX>559.5</wsX>    <!-- šírka dielca -->
  <wsY>614</wsY>       <!-- výška dielca -->
  <wsZ>25</wsZ>        <!-- hrúbka dielca -->
</PrgrSet>
```

#### 2. `ParameterListe` – zoznam parametrov
Každý parameter je definovaný ako:
```xml
<ParameterListe>
  <ParamName>LX</ParamName>              <!-- názov parametra -->
  <Value>559,5</Value>                   <!-- aktuálna hodnota (zobrazovaná) -->
  <Description>Delka X</Description>     <!-- popis parametra -->
  <ParamValue>559,5</ParamValue>         <!-- hodnota parametra (môže obsahovať výrazy ako {CLY}/2) -->
  <SortID>1038</SortID>                   <!-- poradie zobrazenia -->
</ParameterListe>
```

**Dôležité:** `ParamValue` môže obsahovať:
- číselnú hodnotu: `559,5`
- výraz s referenciou na iný parameter: `{CLY}/2`
- kombináciu hodnôt a výrazov

#### 3. `PrgrFile` / `PrgrFileWork` – operácie/vŕtania
Jednotlivé operácie obsahujú referencie na parametre v zátvorkách `{PARAMETER}`:
```xml
<PrgrFile>
  <RefVal1>{SPSY}</RefVal1>    <!-- referencia na parameter SPSY -->
  <RefVal2>{SPSX}</RefVal2>    <!-- referencia na parameter SPSX -->
  <Clause>{SPSAN}=1</Clause>   <!-- podmienka: ak SPSAN == 1 -->
</PrgrFile>
```

### Typické parametre (na základe analýzy príkladových súborov)

#### Rozmery dielca
- `LX`, `LY`, `LZ` – dĺžka dielca v osiach X, Y, Z (v mm)
- `CLX`, `CLY`, `CLZ` – stred dielca (centrum), často vypočítané ako `LX/2`, `LY/2`, `LZ/2`

#### Rozmery skrinky
- `SKR_X`, `SKR_Y`, `SKR_Z` – šírka, výška, hĺbka skrinky (v mm)

#### Parametre vŕtania a spojovaciek
- `SPSX`, `SPSY` – vzdialenosť/offset vŕtania spojovaciek v osiach X, Y
- `SPSAN` – flag pre spojovacky (1 = áno, 0 = nie)

#### Parametre dverí
- `DVODD` – odsadenie dverí z dola
- `DVODH` – odsadenie dverí zhora

#### Ďalšie špecifické parametre
- `POLAN`, `POLOD`, `POLVR` – parametre polic
- `ZA3AN`, `ZAV1Y`, `ZAV2Y`, `ZAV3Y` – parametre zásuviek
- `UCHK`, `UCHV`, `UCHH`, `UCHX`, `UCHY`, `UCHVR` – parametre uchytiek
- `C2KAN`, `C2KOL` – parametre kolíkov
- `KOROD` – odsadenie korpusu
- `KOSAN`, `CHRBZ`, `CZDY` – ďalšie špecifické parametre podľa typu skrinky

**Poznámka:** Zoznam parametrov sa môže líšiť podľa typu skrinky. Systém musí dynamicky extrahovať všetky unikátne parametre z dielcov.

### Čo potrebujeme uložiť pre každý parameter
Pre každý parameter chceme uložiť minimálne:
- `key` (interný identifikátor = `ParamName`),
- `label` (ľudský názov = `Description`),
- `type` (number / int / bool / enum / string) – odvodené z hodnoty,
- `unit` (mm – predpokladá sa pre rozmery),
- `default_value` (z template = `ParamValue`),
- `constraints` (min/max/step alebo enum hodnoty) – ak sú dostupné,
- `source_files` (v ktorých `.ganx` sa nachádza),
- `xml_paths` (presné miesto v XML: `/Programm/ParameterListe[ParamName='...']/ParamValue`).

### Zjednotenie parametrov naprieč dielcami
- Parameter sa považuje za "rovnaký", ak:
  - má rovnaký `ParamName` (identifikátor),
  - a rovnakú semantiku (podľa `Description`).
- **Riziko:** rovnaký názov s iným významom v rôznych skrinkách → treba validovať podľa `Description` alebo kontextu skrinky.

### Bezpečnostná zásada
- **Nikdy** neupravovať XML "heuristikou" bez presnej mapy:
  - musíme vedieť presné uzly/atribúty, ktoré reprezentujú parametre a rozmery.
  - Pri prepise `ParamValue` musíme zachovať formát (čiastočne aj výrazy, ak nie sú jednoduché hodnoty).
- Prepis musí byť:
  - deterministický,
  - auditovateľný,
  - spätne porovnateľný (diff).
- **Poznámka k `.param` súborom:** Sú binárne a vyžadujú špeciálne spracovanie. Pre extrakciu parametrov sa primárne používajú `.ganx` súbory, kde sú parametre explicitne definované v XML.

---

## 6.1) Príkladová štruktúra súborov (na základe analýzy)

### Organizácia skriniek v zákazke

Príkladová zákazka obsahuje viacero skriniek, každá v samostatnom priečinku:

```
zakazka ganner programy/
  A011_KONF/              (skrinka typu A011)
    A011_KONF.param       (binárny súbor s parametrami)
    BKL_A011.ganx         (dielec: bok ľavý)
    BKP_A011.ganx         (dielec: bok pravý)
    DNO_A011.ganx         (dielec: dno)
    DVL_A011.ganx         (dielec: dvere ľavé)
    DVP_A011.ganx         (dielec: dvere pravé)
    STROP_A011.ganx       (dielec: strop)
  B442-600_KONF/          (skrinka typu B442, variant 600)
    B442_KONF.param
    BKL_B442.ganx
    BKP_B442.ganx
    CZD_B442.ganx         (dielec: celo zásuvky dvere)
    DNO_B442.ganx
    VLYSP_B442.ganx       (dielec: vlys predný)
    VLYSZ_B442.ganx       (dielec: vlys zadný)
    ZASUVKA ANTARO D450.txt  (poznámka k zásuvke)
  ...
```

### Typy dielcov (na základe názvov súborov)

- **BKL** – bok ľavý (left side panel)
- **BKP** – bok pravý (right side panel)
- **DNO** – dno (bottom panel)
- **STROP** – strop (top panel)
- **DVL** – dvere ľavé (left door)
- **DVP** – dvere pravé (right door)
- **VLYS** / **VLYSP** / **VLYSZ** – vlys (front/rear molding)
- **CZD** / **CZM** – celo zásuvky dvere/montáž (drawer front/mounting)
- **STD** – štandardný dielec
- **MV** – montážny dielec
- **STR** – stredný dielec

**Poznámka:** Názvy dielcov sa môžu líšiť podľa typu skrinky. Systém musí dynamicky rozpoznať všetky `.ganx` súbory v priečinku skrinky.

### Štruktúra názvov skriniek

Názvy skriniek často obsahujú:
- Typ skrinky: `A011`, `B442`, `E001`
- Variant/rozmer: `600`, `850` (napr. `B442-600_KONF`, `B5472-850_KONF`)
- Kategóriu: `KONF`, `TEK` (konferenčný stôl, technický)
- Prípony: `-1`, `-2` pre varianty (napr. `A014-1_KONF`, `A014-2_KONF`)

**Poznámka:** Pri importe do katalógu sa názov priečinka použije ako základný identifikátor skrinky.

### Spoločné parametre naprieč dielcami

Všetky dielce jednej skrinky zdieľajú základné parametre:
- Rozmery skrinky: `SKR_X`, `SKR_Y`, `SKR_Z`
- Parametre vŕtania: `SPSX`, `SPSY`, `SPSAN`
- Parametre dverí: `DVODD`, `DVODH`
- Ďalšie špecifické parametre podľa typu skrinky

Každý dielec má navyše vlastné rozmery (`LX`, `LY`, `LZ`), ktoré sa odvodzujú z rozmerov skrinky a typu dielca.

---

## 7) Modul: Zákazky

### Vytvorenie zákazky
- Zadáš len `názov zákazky`.
- V DB vznikne `orders`.

### Pridanie skrinky do zákazky
- Vyberieš skrinku z katalógu.
- Zadáš:
  - nový rozmer (šírka/výška/hĺbka podľa definície),
  - parametre (unified zoznam),
  - `qty` (**len evidencia**).

### Uloženie a generovanie
Pri uložení sa spustí “recalc”:
1. Skopírujú sa dielce skrinky do `zakazky/<order>/<cabinet_instance>/`.
2. Každý `.ganx` sa prečíta, prepočíta a uloží.
3. Výstup sa zaznamená do auditu (run, log, hash).

### Opätovné uloženie
- Ak zmeníš parametre alebo rozmer:
  - systém znovu prepočíta a prepíše výstupné `.ganx` podľa aktuálnych hodnôt,
  - voliteľne spraví snapshot predošlej verzie.

---

## 8) Prepočet `.ganx` (jadro aplikácie)

### Návrh prístupu
- Parser/writer:
  - načítať XML do DOM,
  - meniť iba konkrétne mapované uzly,
  - uložiť späť (konzistentne).

### Režimy prepočtu (návrh)
1. **Parameter-only režim** (najbezpečnejší):
   - prepíše iba hodnoty v `<ParameterListe>/<ParamValue>`.
   - prepíše referencie na parametre v operáciách (`{PARAMETER}` → nová hodnota).
   - nechá výrazy v `ParamValue` (ak obsahujú výrazy ako `{CLY}/2`) alebo ich prepíše na hodnoty podľa konfigurácie.
2. **Parameter + rozmery dielca**:
   - prepíše aj rozmery dielca v `<PrgrSet>` (`wsX`, `wsY`, `wsZ`).
   - prepíše parametre `LX`, `LY`, `LZ` v `<ParameterListe>`.

> **Poznámka:** Konečný režim bude závisieť od detailnejšej analýzy a testovania. Odporúča sa začať s Parameter-only režimom pre maximálnu bezpečnosť.

### Validácie po prepočte
- XML musí zostať validné (“well-formed”).
- Sanity checks:
  - žiadne záporné rozmery,
  - minimálne okraje,
  - typové kontroly (číslo vs text).

### Audit (silno odporúčané)
- Uložiť:
  - hash vstupu,
  - hash výstupu,
  - diff summary (koľko miest sa zmenilo),
  - timestamp, user.

---

## 9) Presnosť a bezpečnosť (najvyššia priorita)

### Fail-safe princíp
- Ak niečo nesedí (parameter neexistuje, chýba xml path, typ nesedí):
  - recalc sa zastaví,
  - skrinka sa označí ako **error**,
  - žiadne “tiché” generovanie.

### Golden testy
- Pre každú skrinku v katalógu mať fixtures:
  - vstupné `.ganx`,
  - očakávané výstupy pre konkrétny set parametrov.
- Testy porovnávajú:
  - hodnoty na konkrétnych miestach (structured asserts),
  - plus textový diff ako pomocné.

---

## 10) UI/UX (Next.js + React + shadcn/ui + Tailwind)

### Prihlásenie
- Session-based auth.
- Layout so **side menu** vľavo.

### Sekcie v side menu (návrh)
1. **Katalóg skriniek**
   - list, filtre podľa kategórie,
   - detail skrinky:
     - základné rozmery,
     - parametre,
     - dielce (súbory),
     - import/reimport (ZIP).
2. **Zákazky**
   - list,
   - detail:
     - skrinky v zákazke,
     - qty (evidencia),
     - status generovania,
     - export.
3. **Nastavenia**
   - storage root,
   - limity uploadu,
   - validácie,
   - užívatelia/role (ak treba).

---

## 11) Databázový model (PostgreSQL) – návrh

### Auth
- `users`
- `sessions` (podľa zvoleného session riešenia)

### Katalóg
- `cabinet_categories`
  - `id`, `name`, `parent_id` (voliteľné)
- `cabinets`
  - `id`, `name`, `slug`, `category_id`, `base_width`, `base_height`, `base_depth`, `catalog_path`, `created_at`
- `cabinet_files`
  - `id`, `cabinet_id`, `relative_path`, `hash`, `created_at`
- `cabinet_parameters`
  - `id`, `cabinet_id`, `key`, `label`, `type`, `unit`, `default_value`, `constraints_json`
- `cabinet_parameter_usages`
  - `id`, `cabinet_parameter_id`, `cabinet_file_id`, `xml_path`, `kind`

### Zákazky
- `orders`
  - `id`, `name`, `slug`, `output_path`, `created_at`
- `order_items`
  - `id`, `order_id`, `cabinet_id`, `instance_name`, `qty`, `width`, `height`, `depth`, `status`, `output_folder`
- `order_item_parameter_values`
  - `id`, `order_item_id`, `cabinet_parameter_id`, `value`

### Generovanie a audit
- `recalc_runs`
  - `id`, `order_item_id`, `started_at`, `finished_at`, `status`, `log`
- `generated_files`
  - `id`, `recalc_run_id`, `relative_path`, `input_hash`, `output_hash`, `diff_summary_json`

---

## 12) Backend architektúra (Next.js)

- App Router + Route Handlers/Server Actions:
  - import (upload ZIP),
  - create order,
  - add/update order item,
  - recalc,
  - export.

### Background jobs (odporúčané)
- Recalc môže byť ťažká operácia → spraviť job:
  - jednoduché: DB job queue + worker,
  - alebo Redis + BullMQ.

---

## 13) Testovanie (požiadavka: unit testy)

### Unit testy (must-have)
- GANX XML parser/writer (roundtrip).
- Parameter deduplikácia.
- Recalc engine (mapovanie + prepis).
- Validácie.

### Golden fixtures (must-have)
- Reálne `.ganx` vzorky v repo.

### E2E (doplnkové)
- Playwright: import → order → add cabinet → recalc → export.

---

## 14) Otvorené TODO (na základe analýzy príkladových súborov)

### Čiastočne vyriešené (základný popis pridaný v sekcii 6)
1. ✅ **Štruktúra `.ganx` súborov:**
   - Parametre sú v sekcii `<ParameterListe>` s `ParamName`, `Value`, `ParamValue`, `Description`.
   - Rozmery dielca sú v `<PrgrSet>` (`wsX`, `wsY`, `wsZ`) a v parametroch (`LX`, `LY`, `LZ`).
   - Operácie používajú referencie na parametre v zátvorkách `{PARAMETER}` v sekcii `<PrgrFile>`/`<PrgrFileWork>`.

### Stále otvorené (vyžaduje detailnejšiu analýzu)
2. **Typy parametrov:**
   - Väčšina parametrov sú čísla (desatinné s čiarkou ako desatinnou čiarkou: `559,5`).
   - Boolean parametre sú reprezentované ako `1` (áno) / `0` (nie) – napr. `SPSAN`, `C2KAN`.
   - **TODO:** Overiť, či existujú enum parametre alebo string parametre.
   - **TODO:** Definovať pravidlá pre rozpoznanie typu z hodnoty a `Description`.

3. **Jednotky a zaokrúhľovanie:**
   - Predpokladá sa, že rozmery sú v milimetroch (mm).
   - Desatinné čísla používajú čiarku ako desatinnú čiarku (`559,5` namiesto `559.5`).
   - **TODO:** Overiť presné pravidlá zaokrúhľovania pre výrobu (napr. na koľko desatinných miest).
   - **TODO:** Definovať, ako spracovať výrazy v `ParamValue` (napr. `{CLY}/2`).

4. **Pravidlá pre kolízie názvov parametrov:**
   - Parameter sa identifikuje podľa `ParamName`.
   - `Description` slúži na validáciu semantiky.
   - **TODO:** Definovať pravidlá pre prípad, keď rovnaký `ParamName` má rôzny význam v rôznych skrinkách.
   - **TODO:** Rozhodnúť, či sa parametre zjednocujú globálne alebo len v rámci jednej skrinky.

5. **Spracovanie `.param` súborov:**
   - `.param` súbory sú binárne a nie je možné ich čítať ako text.
   - **TODO:** Rozhodnúť, či sa `.param` súbory budú spracovávať (vyžaduje špeciálny parser) alebo sa parametre extrahujú len z `.ganx`.
   - **TODO:** Ak sa `.param` ignorujú, definovať, či sa kopírujú do výstupu alebo nie.

6. **Výrazy v `ParamValue`:**
   - Niektoré `ParamValue` obsahujú výrazy ako `{CLY}/2` namiesto konkrétnej hodnoty.
   - **TODO:** Definovať, či sa tieto výrazy prepisujú na hodnoty pri recalc alebo sa zachovávajú.
   - **TODO:** Ak sa zachovávajú, overiť, či Gannomat editor podporuje takéto výrazy.

7. **Mapovanie parametrov na operácie:**
   - Parametre sa používajú v `<PrgrFile>` cez referencie `{PARAMETER}`.
   - **TODO:** Detailnejšie analyzovať, kde všade sa parametre používajú (v `RefVal1`, `RefVal2`, `Clause`, atď.).
   - **TODO:** Definovať pravidlá pre prepis referencií pri zmene parametrov.

---

## 15) Implementačné míľniky (čo robiť teraz)

1. Skeleton app:
   - auth + layout + side menu.
2. Storage konfigurácia:
   - server root, bezpečné uploady (ZIP).
3. Import skrinky:
   - upload ZIP → rozbalenie → uloženie → listing dielcov.
4. Recalc engine v "dry-run" móde:
   - len načítaj a vypíš, čo by zmenil (bez zápisu) → bezpečný štart.
5. Implementácia parsera a mapovania:
   - na základe základného popisu štruktúry (sekcia 6) implementovať parser `.ganx` súborov,
   - extrakcia parametrov z `<ParameterListe>`,
   - mapovanie referencií `{PARAMETER}` v operáciách,
   - pridanie golden fixtures z príkladových súborov,
   - zapnutie reálneho generovania po validácii.

---

## 16) Poznámka k „MCP context7“
Pri vývoji používať `mcp context7` ako zdroj dokumentácie pre:
- Next.js App Router,
- shadcn/ui,
- Tailwind,
- PostgreSQL prácu,
- testovanie (Vitest/Jest/Playwright podľa stacku).
