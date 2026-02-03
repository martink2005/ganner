# Plán implementácie – Next features

Pri implementácii každej úlohy **používaj MCP context7** pre dokumentáciu (Next.js App Router, React, Prisma, shadcn/ui, fetch API podľa potreby).

---

## Feature 1: Delete skriniek z katalógu (s potvrdením)

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js Route Handlers, Prisma delete, UI komponenty).
- [x] **API:** Pridať `DELETE /api/catalog/[id]/route.ts` (alebo `[slug]`) – vymazanie `Cabinet` z DB. Použiť `prisma.cabinet.delete({ where: { id } })`. Pri chybe (skrinka je použitá v zákazkách – `JobItem.cabinetId`) vrátiť vhodnú hlášku (napr. 400 „Skrinka je použitá v zákazkách“).
- [x] **API:** Pred vymazaním voliteľne skontrolovať, či existujú `JobItem` s daným `cabinetId`; ak áno, vrátiť 400 a nepoužívať delete.
- [x] **Frontend – katalóg:** Na stránke `src/app/dashboard/katalog/page.tsx` pri každej karte skrinky pridať tlačidlo/akciu „Zmazať“ (ikona Trash). Zabrániť propagácii kliku do `Link` (napr. `e.stopPropagation()` pri kliku na tlačidlo).
- [x] **Frontend – potvrdenie:** Pri kliku na Zmazať otvoriť potvrdzovací dialóg (existujúci `Dialog` z `@/components/ui/dialog`) s textom typu „Naozaj chcete zmazať skrinku [názov]? Táto akcia je nezvratná.“ a tlačidlami „Zrušiť“ a „Zmazať“. Pri Zmazať volať `DELETE /api/catalog/[id]`, pri úspechu zatvoriť dialóg a obnoviť zoznam (`fetchCabinets()`).
- [x] **Frontend – stavy:** Počas mazania zablokovať tlačidlo (loading), pri chybe API zobraziť hlášku (v dialógu alebo toast/error state).

---

## Feature 2: Delete zákazky a edit (názov, popis)

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js API, Prisma update/delete, React state).
- [x] **API – Delete:** Pridať `DELETE` handler v `src/app/api/jobs/[id]/route.ts` – vymazanie `Job` (Prisma cascade vymaže `JobItem` a súvisiace záznamy). Vrátiť 204 alebo 200 s potvrdením.
- [x] **API – Edit:** Pridať `PATCH` handler v `src/app/api/jobs/[id]/route.ts` – prijímajúci `{ name?, description? }`, validácia (názov povinný ak sa posiela), volať `prisma.job.update({ where: { id }, data: { name, description } })`.
- [x] **Frontend – zákazky:** Na stránke `src/app/dashboard/zakazky/page.tsx` pri každej karte zákazky pridať akcie: „Upraviť“ a „Zmazať“. Karty sú zatiaľ celé ako `Link` – upraviť štruktúru tak, aby názov/karta viedla na detail a akcie (tlačidlá) mali `e.stopPropagation()` aby nešiel klik na detail.
- [x] **Frontend – Delete:** Pri kliku na Zmazať otvoriť potvrdzovací dialóg („Naozaj chcete zmazať zákazku [názov]? Všetky položky zákazky budú vymazané.“). Pri potvrdení volať `DELETE /api/jobs/[id]`, pri úspechu zatvoriť dialóg a obnoviť zoznam (`fetchJobs()`).
- [x] **Frontend – Edit:** Pri kliku na Upraviť otvoriť dialóg s formulárom (polia Názov, Popis – rovnaké ako pri vytváraní). Načítaná aktuálna hodnota `job.name` a `job.description`. Pri uložení volať `PATCH /api/jobs/[id]` s `{ name, description }`, pri úspechu zatvoriť dialóg a obnoviť zoznam.
- [x] **Frontend – stavy:** Počas delete/edit zablokovať tlačidlá (loading), pri chybe API zobraziť hlášku.

---

## Feature 3: Boolean parameter ako checkbox pri úpravách skrinky v zákazke

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (React formuláre, shadcn/ui Checkbox, typy).
- [x] **UI komponent:** Pridať Checkbox z shadcn/ui (`npx shadcn@latest add checkbox`) ak ešte neexistuje v `src/components/ui/`.
- [x] **Dáta:** Overiť, že pri načítaní položky zákazky (`zakazky/[id]/item/[itemId]`) sa v `cabinet.parameters` vracia pole s `paramType` (Prisma `CabinetParameter.paramType`). Ak API/page neposiela `paramType`, doplniť do `include` / response.
- [x] **Frontend – typ:** V `src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx` rozšíriť interface pre parameter o `paramType: string` (napr. `number`, `boolean`, `string`).
- [x] **Frontend – render:** Pri zobrazení parametrov: ak `paramType === 'boolean'`, renderovať **Checkbox** namiesto `Input`. Hodnoty `"true"`, `"1"` (a prípadne ďalšie) považovať za zaškrtnuté; pri zmene ukladať do state `"true"` / `"false"` ako reťazec (zachovať kompatibilitu s `parameters` objektom).
- [x] **Frontend – label:** Pri boolean parametri zobraziť rovnaký label (paramName + prípadne label z definície) ako pri ostatných typoch, jednotku nepísať.

---

## Feature 4: Skupiny parametrov v katalógu a v skrinke (názov, priradenie, drag-and-drop poradie)

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js App Router, Prisma, React state, drag-and-drop knižnica napr. @dnd-kit alebo react-beautiful-dnd).
- [x] **DB – model:** Pridať model `CabinetParameterGroup`: `id`, `cabinetId` (FK na Cabinet), `name`, `sortOrder` (Int, poradie zobrazenia). Migrácia.
- [x] **DB – väzba:** V modeli `CabinetParameter` pridať voliteľné pole `groupId` (FK na `CabinetParameterGroup`). Parametre bez `groupId` zostanú „bez skupiny“. Migrácia.
- [x] **API – skupiny:** Pridať endpoint(y) pre CRUD skupín: napr. `POST /api/catalog/[cabinetId]/groups` (vytvorenie), `PATCH /api/catalog/groups/[groupId]` (názov), `DELETE /api/catalog/groups/[groupId]`, `PATCH /api/catalog/[cabinetId]/groups/reorder` (telo: pole `{ id, sortOrder }`) pre zoradenie.
- [x] **API – priradenie parametrov:** Endpoint na priradenie parametra do skupiny: napr. `PATCH /api/catalog/parameters/[paramId]` s `{ groupId?: string }` (null = odstrániť zo skupiny).
- [x] **Frontend – katalóg/skrinka:** V katalógu (zoznam skriniek) alebo na stránke danej skrinky (`katalog/[slug]`) – podľa UX – umožniť správu skupín: zoznam skupín s názvom, vytvorenie novej skupiny (názov), úprava názvu, zmazanie. Drag-and-drop zoradenie skupín podľa `sortOrder`; uloženie poradia cez API (implementované tlačidlami hore/dole).
- [x] **Frontend – priradenie parametrov:** V rámci danej skrinky možnosť priradiť jednotlivé parametre do skupín (dropdown / select pri parametri alebo drag parametra do skupiny). Uložiť cez API.
- [x] **Frontend – zákazka:** Na stránke úpravy položky zákazky (`zakazky/[id]/item/[itemId]`) načítať parametre vrátane skupín (group, sortOrder). Zobraziť parametre zoskupené podľa skupín, v poradí skupín (podľa `sortOrder`) a v rámci skupiny parametre v existujúcom poradí; parametre bez skupiny napr. v sekcii „Ostatné“ alebo na konci.

---

## Feature 5: Rozmery skrinky – označenie X, Y, Z pri editovaní v zákazke

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (React, shadcn/ui Label/Input, accessibility).
- [x] **Frontend – labely:** V `src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx` pri poliach rozmerov (Šírka, Výška, Hĺbka) doplniť do labelu označenie osi cez pomlčku: **Šírka – X**, **Výška – Y**, **Hĺbka – Z** (alebo ekvivalentný text, napr. „Šírka (X)“ podľa konzistentného štýlu).
- [x] **Frontend – konzistencia:** Zachovať existujúce `id` pre inputy (width, height, depth) a `htmlFor` na labeloch; zmeniť len zobrazený text labelov tak, aby používateľ videl súvislosť s osami X, Y, Z.

---

## Feature 6: Položka Dashboard v menu

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js App Router, React, navigácia).
- [x] **Frontend – menu:** V `src/components/SideMenu.tsx` pridať do poľa `menuItems` novú položku **Dashboard** s `href: "/dashboard"` (alebo `/dashboard` ako východisková stránka dashboardu). Použiť vhodnú ikonu (napr. `LayoutDashboard` z lucide-react).
- [x] **Frontend – poradie:** Položku Dashboard umiestniť na prvé miesto v menu (pred Katalóg), aby bola vstupným bodom po prihlásení.

---

## Feature 7: Funkčný dashboard – hodnoty a posledné zákazky

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js Server Components, Prisma aggregate/count, fetch zákaziek, Link).
- [x] **Dáta – štatistiky:** Na stránke `src/app/dashboard/page.tsx` (alebo v server komponente) načítať reálne počty: počet záznamov v `Cabinet` (katalóg), počet `Job` (zákazky), prípadne počet vygenerovaných programov (ak existuje model/počet – inak nechať 0 alebo odvodiť z JobItem). Použiť `prisma.cabinet.count()`, `prisma.job.count()` atď.
- [x] **Dáta – posledné zákazky:** Načítať z DB zoznam posledných zákaziek (napr. `prisma.job.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 })`) vrátane `id`, `name`, `updatedAt` (alebo `createdAt`) podľa potreby.
- [x] **Frontend – karty:** V dashboard stránke zobraziť v kartách skutočné hodnoty (počet skriniek, počet zákaziek, počet programov) namiesto pevnej 0.
- [x] **Frontend – sekcia Posledné zákazky:** Pridať sekciu „Posledné zákazky“ (nadpis + zoznam). Pre každú zákazku zobraziť názov a odkaz (`Link` s `href={/dashboard/zakazky/${job.id}}`), aby klik otvoril danú zákazku.
- [x] **Frontend – prázdny stav:** Ak nie sú žiadne zákazky, zobraziť v sekcii vhodnú hlášku (napr. „Zatiaľ žiadne zákazky“).

---

## Feature 8: Množstvo dielca/programu v katalógu a v zákazke

**Cieľ:** V katalógu pri otvorení skrinky pridať možnosť zadať množstvo ku každému dielcu (programu) – definuje počet kusov daného dielca v skrinke. Pri editovaní skrinky v zákazke tieto množstvá musia byť editovateľné. Pri pridaní skrinky do zákazky default = hodnota z katalógu.

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Prisma migrácie, Next.js API, React formuláre, shadcn/ui Input).
- [x] **DB – katalóg:** V modeli `CabinetFile` pridať pole `quantity Int @default(1)` (počet kusov tohto dielca v skrinke). Vytvoriť migráciu.
- [x] **DB – zákazka:** Pridať model `JobItemFileQuantity`: `id`, `itemId` (FK na JobItem, onDelete Cascade), `fileId` (FK na CabinetFile), `quantity` (Int, min 1). Unikátna dvojica `[itemId, fileId]`. Migrácia.
- [x] **API – katalóg:** Endpoint na uloženie množstva súboru v katalógu: napr. `PATCH /api/catalog/files/[fileId]` s telom `{ quantity: number }` (validácia: celé číslo ≥ 1). Aktualizovať `CabinetFile.quantity`.
- [x] **API – načítanie skrinky v katalógu:** Overiť, že GET katalógu/skrinky (napr. stránka `katalog/[slug]` alebo existujúce API) vracia pri `files` aj pole `quantity` (CabinetFile.quantity).
- [x] **Frontend – katalóg:** Na stránke `src/app/dashboard/katalog/[slug]/client.tsx` v sekcii „Súbory“ pri každom súbore (dielci/programe) pridať vstup pre **Množstvo** (Input type number, min 1). Načítavať a zobrazovať `file.quantity`. Pri zmene volať `PATCH /api/catalog/files/[fileId]` s `{ quantity }` (pri úspechu aktualizovať lokálny state).
- [x] **Job service – pridanie skrinky:** V `addCabinetToJob` po vytvorení `JobItem` vytvoriť záznamy `JobItemFileQuantity` pre každý `cabinet.files` s `quantity: file.quantity` (z katalógu). Načítať `cabinet` s `files: true` a použiť `file.quantity` (ak neexistuje, default 1).
- [x] **API – položka zákazky GET:** V `GET /api/jobs/items/[itemId]` v `include` pridať `cabinet: { include: { files: true } }` (ak ešte nie je) a načítať `fileQuantities` (JobItemFileQuantity) pre položku – vrátiť v response tak, aby frontend vedel zobraziť množstvo pre každý súbor (napr. `item.fileQuantities` alebo map fileId → quantity).
- [x] **API – položka zákazky PUT:** Rozšíriť `PUT /api/jobs/items/[itemId]` o prijatie tela `fileQuantities?: { fileId: string; quantity: number }[]`. Validácia: každé quantity ≥ 1. Volať `updateJobItem` s novým parametrom `fileQuantities` (upsert JobItemFileQuantity pre daný itemId).
- [x] **Job service – updateJobItem:** Rozšíriť `updateJobItem` o podporu `fileQuantities?: { fileId: string; quantity: number }[]`. Ak je pole zadané, pre daný `itemId` synchronizovať záznamy v `JobItemFileQuantity` (napr. vymazať staré pre item a vytvoriť nové podľa poľa, alebo upsert podľa fileId).
- [x] **Frontend – edit skrinky v zákazke:** V `src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx` načítať pri položke aj zoznam súborov (dielcov) s množstvami (z `item.cabinet.files` a `item.fileQuantities` alebo ekvivalent). Pridať sekciu „Množstvá dielcov“ (alebo rozšíriť základné údaje) s poľom pre každý súbor: názov súboru + Input pre množstvo (min 1). Pri uložení poslať v PUT aj `fileQuantities: [{ fileId, quantity }, ...]`.
- [x] **Frontend – stavy a validácia:** Pri zmene množstva v katalógu aj v zákazke zablokovať odoslanie ak quantity < 1; pri chybe API zobraziť hlášku. Voliteľne: loading stav pri ukladaní množstva v katalógu (inline alebo celý blok).

---

## Feature 9: Popis skrinky v katalógu

**Cieľ:** V katalógu pridať možnosť zadať/upraviť popis ku skrinke. Popis sa zobrazí a bude editovateľný na stránke detailu skrinky (`katalog/[slug]`).

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Prisma migrácie, Next.js API, React formuláre, shadcn/ui Textarea).
- [x] **DB:** V modeli `Cabinet` pridať pole `description String?` (voliteľný popis skrinky). Vytvoriť migráciu.
- [x] **API:** Pridať `PATCH /api/catalog/[id]/route.ts` – prijíma `{ description?: string | null }`. Aktualizovať `Cabinet.description`. Validácia: ak je `description` reťazec, povoliť prázdny; ak `null` alebo chýba, ponechať/vyčistiť. Alternatíva: existujúci route má len DELETE – pridať PATCH handler do toho istého súboru.
- [x] **API – načítanie:** Overiť, že načítanie skrinky (getCabinetDetail / stránka `katalog/[slug]`) vracia pole `description` (Prisma vráti automaticky po pridání stĺpca).
- [x] **Frontend – katalóg:** Na stránke `src/app/dashboard/katalog/[slug]` (v `CabinetDetailClient` alebo v page nad názvom) pridať sekciu **Popis skrinky**: zobraziť aktuálny `cabinet.description` (ak je prázdny, zobraziť placeholder napr. „Žiadny popis“ alebo prázdne pole). Umožniť editáciu cez `Textarea` (viacriadkový vstup). Uloženie: pri zmene (onBlur) alebo tlačidlo „Uložiť popis“ volať `PATCH /api/catalog/[cabinet.id]` s `{ description: value }`. Pri úspechu aktualizovať lokálny state / refresh.
- [x] **Frontend – stavy:** Počas ukladania zobraziť loading (napr. „Ukladám…“); pri chybe API zobraziť hlášku. Voliteľne: indikácia „Neulozene“ / „Uložené“ analogicky ako pri množstve dielcov.

---

## Feature 10: Kategorizácia skriniek v katalógu

**Cieľ:** Skrinky môžu patriť do kategórií. Kategórie sú rekurzívne (strom – každá kategória môže mať podkategórie donekonečna). V katalógu bude filtrovanie podľa kategórie. Kategórie sa musia dať spravovať (vytvárať, upravovať, mazať).

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Prisma rekurzívne relácie, Next.js API, React stromové komponenty, filtrovanie).
- [x] **DB – overenie:** Schéma už obsahuje model `CabinetCategory` (id, name, slug, parentId, parent, children, cabinets) a `Cabinet.categoryId`. Overiť, či existuje migrácia a tabuľka `cabinet_categories`; ak nie, vytvoriť migráciu. Slug pri kategórii musí byť unikátny.
- [x] **API – strom kategórií:** Pridať `GET /api/catalog/categories` – vrátiť všetky kategórie ako rekurzívny strom (pole koreňových kategórií, každá s `children` naplnenými rekurzívne). Použiť Prisma `findMany` s `where: { parentId: null }` a rekurzívne načítať `children` (alebo jednu query s include `{ children: true }` a zostaviť strom na serveri). Formát vhodný pre frontend (napr. `{ id, name, slug, parentId, children: [...] }`).
- [x] **API – vytvorenie kategórie:** Pridať `POST /api/catalog/categories` – telo `{ name: string, parentId?: string | null }`. Validácia: názov povinný. Generovať `slug` z názvu (normalizácia, unikátnosť – prípadne pridať číslo ak kolízia). Uložiť do `CabinetCategory`. Vrátiť vytvorenú kategóriu.
- [x] **API – úprava kategórie:** Pridať `PATCH /api/catalog/categories/[id]` – telo `{ name?: string, parentId?: string | null }`. Pri zmene `name` prepočítať `slug`. Pri zmene `parentId` overiť, že nedochádza k cyklu (presun pod seba sameho alebo pod potomka). Aktualizovať záznam.
- [x] **API – zmazanie kategórie:** Pridať `DELETE /api/catalog/categories/[id]`. Overiť: ak kategória má `children`, vrátiť 400 s hláškou „Kategória má podkategórie“. Ak má priradené skrinky (`cabinets`), rozhodnúť: buď 400 „Kategória obsahuje skrinky“, alebo odstrániť väzbu (nastaviť skrinkám `categoryId: null`) a potom kategóriu zmazať. Dokumentovať správanie v tasku.
- [x] **API – katalóg s filtrom:** Rozšíriť `GET /api/catalog` o query parameter `categoryId` (voliteľný). Ak je zadaný, vrátiť len skrinky kde `cabinet.categoryId === categoryId`. Voliteľne parameter `includeChildren` (boolean): ak true, vrátiť aj skrinky z podkategórií (rekurzívne). Upraviť `getAllCabinets` v `cabinet-import.ts` alebo volať Prisma priamo v route s `where: { categoryId }`.
- [x] **API – priradenie skrinky ku kategórii:** Rozšíriť `PATCH /api/catalog/[id]` o prijatie `categoryId?: string | null`. Ak je poslané, aktualizovať `Cabinet.categoryId` (null = odstrániť kategóriu). Validácia: ak `categoryId` nie je null, overiť že kategória existuje.
- [x] **Frontend – správa kategórií:** Pridať sekciu alebo stránku pre správu kategórií (napr. `dashboard/katalog/kategorie` alebo podstránka v katalógu). Zobraziť strom kategórií (rekurzívne s odsadením alebo stromová štruktúra). Možnosti: Pridať kategóriu (root alebo pod vybranú – názov, voliteľne rodič), Upraviť názov kategórie, Zmazať kategóriu (s potvrdením). Načítavať strom cez `GET /api/catalog/categories`. Vytvorenie cez `POST`, úprava cez `PATCH`, zmazanie cez `DELETE`. Použiť MCP context7 pre React/Next dokumentáciu.
- [x] **Frontend – filtrovanie v katalógu:** Na stránke `src/app/dashboard/katalog/page.tsx` pridať ovládanie filtra podľa kategórie: dropdown alebo stromový výber (všetky / kategória 1 / kategória 2 / …). Načítať kategórie cez `GET /api/catalog/categories`. Pri zmene filtra volať `GET /api/catalog?categoryId=...` (prípadne `includeChildren=true`) a aktualizovať zoznam skriniek (`fetchCabinets` s parametrom). Možnosť „Všetky kategórie“ = bez query parametra.
- [x] **Frontend – priradenie skrinky ku kategórii:** Na stránke detailu skrinky `src/app/dashboard/katalog/[slug]` (client komponent) pridať pole **Kategória**: Select alebo dropdown s plochým zoznamom kategórií (alebo strom) – možnosť „Žiadna“. Zobraziť aktuálnu `cabinet.categoryId` / `cabinet.category`. Pri zmene volať `PATCH /api/catalog/[cabinet.id]` s `{ categoryId: value }` (null pre „Žiadna“). Po úspechu aktualizovať lokálny state.
- [x] **Frontend – zobrazenie kategórie v katalógu:** V zozname skriniek (karty na `katalog/page.tsx`) voliteľne zobraziť názov kategórie pri každej skrinke (ak má `cabinet.category`), aby bolo jasné, do ktorej kategórie skrinka patrí.

---

## Feature 11: Pri importe skrinky – default rozmer a kategória

**Cieľ:** Pri importe skrinky umožniť nastaviť default rozmer skrinky (šírka, výška, hĺbka) a rovno priradiť kategóriu. Rozmery môžu byť prepísané oproti hodnotám z .ganx; kategória sa nastaví pri vytvorení skrinky.

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js Route Handlers, Prisma create, React formuláre, shadcn/ui Select/Input).
- [x] **API – import:** Rozšíriť `POST /api/catalog/import` o voliteľné body parametre: `defaultWidth?: number | null`, `defaultHeight?: number | null`, `defaultDepth?: number | null`, `categoryId?: string | null`. Validácia: ak sú rozmery zadané, musia byť kladné čísla. Ak je `categoryId` zadané, overiť že kategória existuje (`prisma.cabinetCategory.findUnique`). Odovzdať tieto hodnoty do `importCabinet(..., options)`.
- [x] **cabinet-import – importCabinet:** Rozšíriť signatúru `importCabinet(sourcePath, catalogRoot, options?)` kde `options` je `{ defaultWidth?: number | null; defaultHeight?: number | null; defaultDepth?: number | null; categoryId?: string | null }`. Pri vytváraní `Cabinet`: ak sú v `options` zadané `defaultWidth`/`defaultHeight`/`defaultDepth`, použiť ich pre `baseWidth`/`baseHeight`/`baseDepth`; inak ponechať stávajúcu logiku (hodnoty z prvého .ganx `prgrSet`). Ak je v `options` `categoryId`, nastaviť v `data` pri `prisma.cabinet.create` pole `categoryId` (null = žiadna kategória).
- [x] **Frontend – kategórie:** Na stránke `src/app/dashboard/katalog/import/page.tsx` načítať strom kategórií (napr. `GET /api/catalog/categories`) pri mounte alebo pred prvým importom. Použiť existujúcu utilitu na plochý zoznam pre Select (napr. `flattenCategoriesForSelect` z category-utils alebo ekvivalent).
- [x] **Frontend – formulár:** Pridať sekciu „Pred importom (voliteľné)“ s poľami: **Šírka – X (mm)**, **Výška – Y (mm)**, **Hĺbka – Z (mm)** (Input type number, voliteľné, min 0 alebo prázdne) a **Kategória** (Select: „Žiadna“ + zoznam kategórií). Ak používateľ nezadá rozmery, pri importe sa použijú hodnoty z .ganx (súčasné správanie).
- [x] **Frontend – odoslanie:** Pri volaní `POST /api/catalog/import` poslať v body okrem `sourcePath` (a `catalogRoot`) aj `defaultWidth`, `defaultHeight`, `defaultDepth` (iba ak vyplnené, inak neposielať alebo null) a `categoryId` (id vybranej kategórie alebo null pre „Žiadna“). Po úspešnom importe ponechať presmerovanie na detail skrinky.
- [x] **Frontend – stavy:** Počas načítavania kategórií neblokovať formulár; pri chybe načítania kategórií zobraziť fallback (Select bez kategórií alebo „Žiadna“). Validácia: ak sú rozmery vyplnené, odoslať len kladné čísla.

---

## Feature 12: Pri importe – modal „názov už existuje“ a možnosť prepísať názov

**Cieľ:** Ak pri importe skrinky už v katalógu existuje skrinka s rovnakým názvom (slug), nezobraziť len chybovú hlášku, ale modal s informáciou a možnosťou zadať nový názov a importovať s ním (prepísať názov).

- [x] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js API, React state, Dialog/Modal, formuláre).
- [x] **API – import:** Rozšíriť `POST /api/catalog/import` o voliteľný body parameter `overrideName?: string | null`. Ak je zadaný, odovzdať do `importCabinet(..., options)`. Validácia: ak je `overrideName` poslaný, musí byť neprázdny reťazec po trim. Pri odpovedi 400 z dôvodu „skrinka už existuje“ vrátiť v JSON aj pole `code: "CABINET_EXISTS"` (a prípadne `existingName`), aby frontend vedel zobraziť modal namiesto generickej chyby.
- [x] **cabinet-import – importCabinet:** Rozšíriť `ImportCabinetOptions` o `overrideName?: string | null`. Na začiatku importu: ak `options?.overrideName` je neprázdny reťazec, použiť ho ako `cabinetName` a `createSlug(options.overrideName)` ako `slug`; inak ponechať súčasné správanie (`path.basename(sourcePath)` a `createSlug(cabinetName)`). Zvyšok logiky (kontrola existing, vytvorenie priečinka pod novým slugom, atď.) ostáva rovnaký.
- [x] **Frontend – detekcia konfliktu:** Pri volaní `POST /api/catalog/import` ak response nie je ok a v `data` je `data.code === "CABINET_EXISTS"` (alebo ekvivalentná detekcia z error message), namiesto zobrazenia chyby v alert/texte otvoriť modal „Skrinka s týmto názvom už existuje“.
- [x] **Frontend – modal:** Pridať modal (napr. `Dialog` z `@/components/ui/dialog`) s titulkom typu „Skrinka s týmto názvom už existuje“, textom že v katalógu už je skrinka s rovnakým názvom a že môže zadať iný názov. Input pre nový názov (placeholder alebo predvyplnený návrh, napr. priečinok + „_2“). Tlačidlá „Zrušiť“ (zatvoriť modal) a „Importovať s novým názvom“ (odoslať znova POST s `overrideName` = hodnota z inputu, ostatné parametre rovnaké ako pri prvom pokuse).
- [x] **Frontend – odoslanie s novým názvom:** Pri kliku na „Importovať s novým názvom“ volať `POST /api/catalog/import` s rovnakým `sourcePath` (a ďalšími voliteľnými parametrami) a pridaným `overrideName: newName`. Validácia: nový názov nesmie byť prázdny. Pri úspechu zatvoriť modal, zobraziť success a presmerovať na detail skrinky ako doteraz. Pri ďalšej chybe (napr. opätovný konflikt) zobraziť chybu v modale alebo v texte.
- [x] **Frontend – stavy:** Počas odosielania s novým názvom zablokovať tlačidlo (loading). Pri zatvorení modalu zrušiť stav „zobrazený modal“.

---

Po dokončení všetkých úloh danej feature zaskrtni príslušný checkbox v `doc/next-poziadavky.md`.
