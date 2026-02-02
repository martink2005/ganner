---
name: Prepočet ws rozmerov dielcov
overview: Upraviť recalc generovanie skrinky v zákazke tak, aby pri generovaní každý .ganx dielec prepísal rozmery v <PrgrSet> (<wsX>, <wsY>, <wsZ>) podľa 2 povinných parametrov ^[XYZ]_C_[XYZ]$ a parametra HRUB; zároveň upraviť UI aby rozmery skrinky zobrazovalo ako X/Y/Z (nie len šírka/výška/hĺbka).
todos:
  - id: analyza-recalc-flow
    content: Zrefaktorovať recalc tak, aby per-súbor chyby neskončili len v console a recalc sa pri chybe zastavil
    status: in_progress
  - id: ganx-update-prgrset
    content: Doplniť do ganx utils funkciu na prepis <PrgrSet> wsX/wsY/wsZ a helpery na čítanie parametrov (_C_, HRUB)
    status: completed
  - id: implement-ws-recalc
    content: Implementovať výpočet ws podľa 2× ^[XYZ]_C_[XYZ]$ + HRUB pre každý súbor; mapovanie width=X, height=Y, depth=Z
    status: in_progress
  - id: ui-xyz-labels
    content: Upraviť UI aby zobrazovalo rozmery ako X/Y/Z (vrátane listingu a Add dialogu)
    status: pending
  - id: tests
    content: Doplniť Vitest testy pre update <PrgrSet> a validácie povinných parametrov
    status: pending
isProject: false
---

### Kontext (čo už je v kóde)

- **Recalc dnes** prepíše iba `<ParameterListe>` cez `updateGanxParameters()` a výsledok uloží do `./zakazky/...` ([`src/lib/job-service.ts`](src/lib/job-service.ts)).
- **Import do katalógu už validuje**, že každý `.ganx` má **aspoň** 2× `^[XYZ]*C*[XYZ]$ `a `HRUB` ([`src/lib/cabinet-import.ts`](src/lib/cabinet-import.ts)).
- Na reálnom súbore [`zakazka ganner programy/A011_KONF_OK/BKL_A011.ganx`](zakazka%20ganner%20programy/A011_KONF_OK/BKL_A011.ganx) existujú presne: `X_C_Y`, `Y_C_X`, `HRUB`, a `<PrgrSet>` obsahuje `<wsX>`, `<wsY>`, `<wsZ>`.

### Cieľová logika pre každý jeden `.ganx` dielec

- Zoberiem rozmery skrinky z DB (potvrdené): **width=X, height=Y, depth=Z**.
- Z `.ganx` (z `<ParameterListe>`) vyhľadám:
- presne **2** parametre v tvare `^[XYZ]*C*[XYZ]$` (inak **chyba** a negenerovať skrinku)
- povinný parameter `HRUB` (inak **chyba**)
- Pre každý z 2 `_C_` parametrov:
- názov `A_C_B`
- **A** určuje cieľový rozmer dielca (`wsA`, teda `wsX`/`wsY`/`wsZ`)
- **B** určuje ktorý rozmer skrinky použiť ako základ (`cabinet[B]`)
- výpočet: `newWsA = cabinet[B] + value(A_C_B)`
- Hrúbku dielca nastavím vždy: `wsZ = value(HRUB)` (bez prepočtu)
- Fail-safe validácie počas recalcu (nie len pri importe):
- `.ganx` musí mať `<PrgrSet>` a všetky 3 `<wsX>/<wsY>/<wsZ>` (ak nie, chyba)
- hodnoty musia byť čísla (podpora desatinnej čiarky), nesmú byť NaN
- odporúčanie: ak `_C_` parametre cielia na `Z`, vyhlásiť konflikt s pravidlom `wsZ=HRUB` (fail-safe)

### Zmeny v kóde (konkrétne miesta)

- **GANX úpravy (parser/writer):**
- rozšíriť [`src/lib/ganx-parser.ts`](src/lib/ganx-parser.ts) o:
- helper na nájdenie parametra podľa `paramName`
- funkciu na update `<PrgrSet>`: napr. `updateGanxPrgrSet(xml, { wsX, wsY, wsZ })` (regex výmena iba vo vnútri `<PrgrSet>`)
- voliteľne: po výpočte udržať konzistenciu aj s parametrami `LX/LY/LZ` (ak v súbore sú), aby sa rozmery nerozchádzali medzi `<PrgrSet>` a `<ParameterListe>`
- **Recalc engine:**
- upraviť [`src/lib/job-service.ts`](src/lib/job-service.ts):
- v `recalcJobItem()` spracovať súbory **sekvenčne a bez tichého swallow** chýb (dnes je tam `try/catch` per súbor a pokračuje ďalej)
- pre každý súbor:
- načítať XML
- aplikovať `updateGanxParameters(xml, paramsMap)` (user parametre)
- z výsledného XML vyčítať 2× `_C_` + `HRUB`
- vypočítať nové `wsX/wsY` podľa pravidiel + `wsZ=HRUB`
- prepísať `<PrgrSet>` pomocou novej helper funkcie
- (ak zvolíme) dopísať aj `LX/LY/LZ` do `<ParameterListe>` podľa nových ws
- zapísať výsledok
- pri prvej chybe (missing param, zlé číslo, missing prgrset) nastaviť `outputStatus=error` a **ukončiť recalc**

### UI zmeny (X/Y/Z namiesto šírka/výška/hĺbka)

- V UI ponechať DB polia `width/height/depth`, ale pre používateľa zobrazovať ako:
- **X (šírka)** = `width`
- **Y (výška)** = `height`
- **Z (hĺbka)** = `depth`
- Konkrétne komponenty:
- [`src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx`](src/app/dashboard/zakazky/%5Bid%5D/item/%5BitemId%5D/client.tsx): zmeniť labely vstupov z “Šírka/Výška/Hĺbka” na “X/Y/Z” (príp. malý popis v zátvorke)
- [`src/app/dashboard/zakazky/[id]/client.tsx`](src/app/dashboard/zakazky/%5Bid%5D/client.tsx): v riadku s rozmermi zmeniť formát na `X x Y x Z mm`
- [`src/components/AddCabinetDialog.tsx`](src/components/AddCabinetDialog.tsx): v zozname skriniek zmeniť `baseWidth/baseHeight/baseDepth` na `X/Y/Z`

### Testy (Vitest)

- Doplniť jednotkové testy tak, aby chyby neprešli potichu a výpočet sedel:
- rozšíriť `src/lib/__tests__/ganx-update.test.ts` alebo pridať nový test súbor pre `updateGanxPrgrSet` (prepíše `<wsX>/<wsY>/<wsZ>`)
- pridať test pre výpočet z `X_C_Y` + `Y_C_X` + `HRUB` na malom XML fixture
- pridať testy na validácie: chýba 1 z `_C_`, chýba `HRUB`, `_C_` je viac/menej ako 2 → chyba

### Poznámka k dokumentácii (MCP context7)

- Pri implementácii sa budem držať odporúčaných patternov pre Route Handlers (request.json + try/catch) a testovanie vo Vitest podľa context7 výťahov (Next.js/Prisma/Vitest).