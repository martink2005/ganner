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

Po dokončení všetkých úloh danej feature zaskrtni príslušný checkbox v `doc/next-poziadavky.md`.
