---
name: Sekcia Dokumentácia a manuál parametrov
overview: Pridanie novej sekcie „Dokumentácia“ do dashboardu s manuálom, ktorý vysvetľuje definíciu parametrov *_C_* a HRUB pri programovaní .ganx, vrátane 3D znázornenia pre pochopenie.
todos: []
isProject: false
---

# Sekcia Dokumentácia a manuál parametrov *C* a HRUB

## Cieľ

- Pridať do aplikácie novú sekciu **Dokumentácia** (návod/manuál).

## Pravidlo pre implementáciu

- **Na celú implementáciu** sa má používať **MCP context7** na dokumentáciu – teda pri implementácii (Next.js, React, Tailwind, SVG, prípadne 3D knižnice) konzultovať aktuálnu dokumentáciu cez context7, aby boli postupy a API v súlade s oficiálnou dokumentáciou.
- V tejto sekcii mať **manuál**, ktorý vysvetľuje, ako pri programovaní (v .ganx) definovať parametre ***C*** a **HRUB**, s pochopením významu a s 3D znázornením.

## Súčasný stav

- **Navigácia**: [SideMenu.tsx](src/components/SideMenu.tsx) má položky Katalóg a Zákazky (`/dashboard/katalog`, `/dashboard/zakazky`).
- **Logika parametrov**: V [job-service.ts](src/lib/job-service.ts) a [cabinet-import.ts](src/lib/cabinet-import.ts) platí:
  - ***C*** = parametre v tvare `X_C_Y`, `Y_C_X` (regex `^[XYZ]_C_[XYZ]$`). Presne **2** takéto parametre, ktoré musia pokrývať osi **X** a **Y** (nie Z).
  - **HRUB** = jeden povinný parameter (hrúbka dielca).
  - Mapovanie do .ganx: `wsX`, `wsY` sa počítajú z dvoch *C*; `wsZ` = hodnota HRUB.
  - Vzorec: pre parameter `TARGET_C_BASE` je **ws[TARGET] = rozmer_skrinky[BASE] + offset** (hodnota parametra). Os Z ako TARGET je zakázaná (rezervovaná pre HRUB).

## Navrhované zmeny

### 1. Nová sekcia v menu a routing

- V [SideMenu.tsx](src/components/SideMenu.tsx) pridať položku **Dokumentácia** (napr. ikona BookOpen alebo FileText), odkaz na `/dashboard/dokumentacia`.
- Vytvoriť priečinok `src/app/dashboard/dokumentacia/` s `page.tsx` (layout môže byť zdieľaný cez existujúci [layout.tsx](src/app/dashboard/layout.tsx)).

### 2. Stránka dokumentácie a podstránka manuálu

- **Hlavná stránka dokumentácie** (`/dashboard/dokumentacia`): úvod + odkaz na „Manuál – parametre pre programovanie“ (a prípadne ďalšie podstránky neskôr).
- **Manuál parametrov** (`/dashboard/dokumentacia/manual` alebo `/dashboard/dokumentacia/parametre`): obsah podľa bodu 3.

### 3. Obsah manuálu (text + pravidlá)

Manuál by mal obsahovať:

- **Účel**: Prečo sú parametre *C* a HRUB potrebné (generovanie programov podľa rozmerov skrinky, každý dielec má vlastný offset a hrúbku).
- **Kde sa definujú**: V .ganx súbore v blokoch `<ParameterListe>` – položky `<ParamName>`, `<ParamValue>`, `<Description>` atď. (konkrétny príklad z [BKL_A011.ganx](zakazky/sebo/a011-konf-ok4/BKL_A011.ganx) okolo riadkov 240–259).
- **Pravidlá**:
  - ***C***: Názov v tvare `X_C_Y` (X, Y, Z v rôznych kombináciách). Presne **2** takéto parametre. Prvá časť = cieľová os rozmeru dielca (wsX/wsY), tretia = os rozmeru skrinky, z ktorej sa berie základ. **Z** ako cieľová os nie je dovolená (os Z je rezervovaná pre HRUB).
  - **HRUB**: Jeden parameter s názvom presne `HRUB`; jeho hodnota = hrúbka dielca (wsZ).
- **Vzorec**: Pre každý parameter `TARGET_C_BASE`: **rozmer_dielca_po_osi_TARGET = rozmer_skrinky_po_osi_BASE + offset** (offset = hodnota parametra). Príklad: `X_C_Y` = 10 → wsX = výška_skrinky + 10; `Y_C_X` = 25 → wsY = šírka_skrinky + 25.
- **Príklad kombinácie**: Napr. `X_C_Y` a `Y_C_X` – typické pre bočný dielec (dĺžka v X z výšky skrinky, dĺžka v Y zo šírky skrinky, hrúbka = HRUB).

### 4. 3D znázornenie

- **Cieľ**: Jednoduché 3D (alebo názorné 2D/3D) znázornenie, aby bolo zrejmé, ktorá os skrinky (X,Y,Z) mapuje na ktorý rozmer dielca (wsX, wsY, wsZ) a ako súvisia *C* a HRUB.
- **Možnosti**:
  - **Odporúčaný prvý krok**: Statické **SVG** alebo **obrázok** (napr. vygenerovaný diagram): skrinka s označenými osami X, Y, Z a jeden dielec (napr. bočný panel) s označením wsX, wsY, wsZ a šípkami/textom „X_C_Y → wsX z Y skrinky“, „Y_C_X → wsY z X skrinky“, „HRUB → wsZ“. Možno jedna projekcia (napr. izometria) stačí na pochopenie.
  - **Voliteľné rozšírenie**: Jednoduchá **interaktívna 3D** scéna (napr. React Three Fiber + drei) – kocka skrinky + „panel“ dielca s popismi. Vyžaduje pridať závislosti a viac času.
- V pláne počítať s **jedným konkrétnym SVG/diagramom** v manuáli; 3D knižnicu uviesť ako voliteľnú fázu.

### 5. Štruktúra súborov (návrh)

- `src/app/dashboard/dokumentacia/page.tsx` – úvod dokumentácie + link na manuál.
- `src/app/dashboard/dokumentacia/manual/page.tsx` (alebo `parametre/page.tsx`) – manuál parametrov *C* a HRUB + vložený SVG/diagram.
- Súbor s diagramom: napr. `src/app/dashboard/dokumentacia/manual/parametre-diagram.svg` alebo komponent `ParametreDiagram.tsx` generujúci SVG.

### 6. Štýlovanie

- Použiť existujúci vzhľad dashboardu (Tailwind, slate pozadie), nadpisy, zoznamy a bloky kódu/parametrov prehľadne naformátovať, aby manuál bol čitateľný.

## Zhrnutie závislosti na kóde

- Rozšírenie len o nové stránky pod dashboardom a jeden nový odkaz v SideMenu.
- Žiadna zmena v [job-service.ts](src/lib/job-service.ts), [cabinet-import.ts](src/lib/cabinet-import.ts) alebo [ganx-parser.ts](src/lib/ganx-parser.ts) – manuál len dokumentuje existujúce správanie.

## Poradie implementácie (odporúčané)

1. Pridať položku „Dokumentácia“ do SideMenu a vytvoriť základnú stránku `/dashboard/dokumentacia`.
2. Vytvoriť podstránku manuálu (parametre) a naplniť ju textom (účel, pravidlá, vzorec, príklad, kde definovať).
3. Navrhnúť a pridať 3D/izometrický diagram (SVG) znázorňujúci skriňu, osi, dielce a mapovanie *C* a HRUB.
4. Prípadne doplniť odkaz z hlavnej stránky dokumentácie na ďalšie témy (ak budú).

