# Plán implementácie – Next features

Pri implementácii každej úlohy **používaj MCP context7** pre dokumentáciu (Next.js App Router, React, Prisma, shadcn/ui, fetch API podľa potreby).

---

## Feature 1: Delete skriniek z katalógu (s potvrdením)

- [ ] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js Route Handlers, Prisma delete, UI komponenty).
- [ ] **API:** Pridať `DELETE /api/catalog/[id]/route.ts` (alebo `[slug]`) – vymazanie `Cabinet` z DB. Použiť `prisma.cabinet.delete({ where: { id } })`. Pri chybe (skrinka je použitá v zákazkách – `JobItem.cabinetId`) vrátiť vhodnú hlášku (napr. 400 „Skrinka je použitá v zákazkách“).
- [ ] **API:** Pred vymazaním voliteľne skontrolovať, či existujú `JobItem` s daným `cabinetId`; ak áno, vrátiť 400 a nepoužívať delete.
- [ ] **Frontend – katalóg:** Na stránke `src/app/dashboard/katalog/page.tsx` pri každej karte skrinky pridať tlačidlo/akciu „Zmazať“ (ikona Trash). Zabrániť propagácii kliku do `Link` (napr. `e.stopPropagation()` pri kliku na tlačidlo).
- [ ] **Frontend – potvrdenie:** Pri kliku na Zmazať otvoriť potvrdzovací dialóg (existujúci `Dialog` z `@/components/ui/dialog`) s textom typu „Naozaj chcete zmazať skrinku [názov]? Táto akcia je nezvratná.“ a tlačidlami „Zrušiť“ a „Zmazať“. Pri Zmazať volať `DELETE /api/catalog/[id]`, pri úspechu zatvoriť dialóg a obnoviť zoznam (`fetchCabinets()`).
- [ ] **Frontend – stavy:** Počas mazania zablokovať tlačidlo (loading), pri chybe API zobraziť hlášku (v dialógu alebo toast/error state).

---

## Feature 2: Delete zákazky a edit (názov, popis)

- [ ] **Dokumentácia:** Pre implementáciu používaj MCP context7 (Next.js API, Prisma update/delete, React state).
- [ ] **API – Delete:** Pridať `DELETE` handler v `src/app/api/jobs/[id]/route.ts` – vymazanie `Job` (Prisma cascade vymaže `JobItem` a súvisiace záznamy). Vrátiť 204 alebo 200 s potvrdením.
- [ ] **API – Edit:** Pridať `PATCH` handler v `src/app/api/jobs/[id]/route.ts` – prijímajúci `{ name?, description? }`, validácia (názov povinný ak sa posiela), volať `prisma.job.update({ where: { id }, data: { name, description } })`.
- [ ] **Frontend – zákazky:** Na stránke `src/app/dashboard/zakazky/page.tsx` pri každej karte zákazky pridať akcie: „Upraviť“ a „Zmazať“. Karty sú zatiaľ celé ako `Link` – upraviť štruktúru tak, aby názov/karta viedla na detail a akcie (tlačidlá) mali `e.stopPropagation()` aby nešiel klik na detail.
- [ ] **Frontend – Delete:** Pri kliku na Zmazať otvoriť potvrdzovací dialóg („Naozaj chcete zmazať zákazku [názov]? Všetky položky zákazky budú vymazané.“). Pri potvrdení volať `DELETE /api/jobs/[id]`, pri úspechu zatvoriť dialóg a obnoviť zoznam (`fetchJobs()`).
- [ ] **Frontend – Edit:** Pri kliku na Upraviť otvoriť dialóg s formulárom (polia Názov, Popis – rovnaké ako pri vytváraní). Načítaná aktuálna hodnota `job.name` a `job.description`. Pri uložení volať `PATCH /api/jobs/[id]` s `{ name, description }`, pri úspechu zatvoriť dialóg a obnoviť zoznam.
- [ ] **Frontend – stavy:** Počas delete/edit zablokovať tlačidlá (loading), pri chybe API zobraziť hlášku.

---

Po dokončení všetkých úloh danej feature zaskrtni príslušný checkbox v `doc/next-poziadavky.md`.
