---
name: Generovanie worklistov pre skrinky
overview: "Pridanie generovania worklistov (.jblx) pre každú skrinku v zákazke podľa existujúceho Python worklistera: worklist sa generuje spolu s programami, ukladá do zakazky/worklists/{nazov_skrinky}.jblx, cesta k CNC programom bude nastaviteľná v novej sekcii Nastavenia a použije sa v elemente File vo workliste."
todos: []
isProject: false
---

# Generovanie worklistov pre skrinky

## Kontext z Python worklistera a príkladov

- **Worklist (.jblx)** je XML so root `<Joblst xmlns="http://tempuri.org/Joblst.xsd">`, každý program je `<JobLstTable>` s:
  - **Name** = názov súboru bez prípony (z .ganx)
  - **File** = plná cesta na CNC: `{cncBasePath}\{nazov_zakazky}\{nazov_skrinky}\{súbor.ganx}`
  - **Description** = z .ganx z elementu `<PrgrSet><Description>`
  - **Stueck** = množstvo dielca (z DB – `JobItemFileQuantity.quantity`)
- Python používa `fixed_base_path = "C:\\GannoMAT Programs"` a cestu skladá ako `join(base_path, project_name, folder_name, file_name)`. V apke bude `project_name` = slug zákazky, `folder_name` = `item.name`, teda rovnaká štruktúra ako výstupná zložka programov.
- **Poradie dielcov**: podľa požiadavky bez zvláštneho zoradenia – použiť poradie ako v katalógu/zákazke (poradie `cabinet.files` z Prisma).
- **Umiestnenie worklistov**: `{zakazky_root}/{slug_zakazky}/worklists/{nazov_skrinky}.jblx` (napr. `zakazky/zakazka-1/worklists/A011_KONF.jblx`).

## 1. Nastavenia – cesta pre CNC a úložisko

- **Úložisko**: nová tabuľka v DB (jednoduché key-value), napr. `Setting` s `key` (string, unique) a `value` (string). Jedna položka napr. `cnc_programs_path` s predvolenou hodnotou `C:\GannoMAT Programs`.
- **Migrácia**: pridať model do [prisma/schema.prisma](prisma/schema.prisma) a vytvoriť migráciu; pri seed/štarte môžeme nastaviť default ak neexistuje.
- **API**: 
  - `GET /api/settings` – vráti objekt nastavení (minimálne `cncProgramsPath`).
  - `PATCH /api/settings` – aktualizácia (napr. `{ cncProgramsPath: "D:\\Programy" }`). Len pre prihlásených (middleware už rieši auth).
- **Sekcia v UI**: nová položka v bočnom menu „Nastavenia“ (napr. `/dashboard/nastavenia`), stránka s formulárom: jedno pole „Cesta k programom na CNC“ (input), uloženie cez PATCH. Predvolená hodnota z GET.

## 2. Generovanie worklistu v job-service

- **Nový modul alebo funkcie v** [src/lib/job-service.ts](src/lib/job-service.ts) (prípadne `src/lib/worklist-generator.ts`):
  - Načítať cestu CNC z nastavení (funkcia `getSetting('cnc_programs_path')` alebo priamo z DB).
  - Pre danú položku zákazky (`JobItem`) s načítanými `job`, `cabinet.files`, `fileQuantities`:
    - Cieľ súboru: `path.join(JOBS_ROOT, createSlug(job.name), "worklists",` ${item.name}.jblx`)`.
    - Pre každý súbor skrinky (v poradí ako `cabinet.files`): 
      - **Name** = `filename` bez `.ganx`
      - **File** = `{cncProgramsPath}\{createSlug(job.name)}\{item.name}\{filename}` (Windows backslash alebo podľa konvencie stroja – v príklade sú backslashes)
      - **Description** = z už vygenerovaného .ganx v `itemDir` (načítať súbor, použiť `extractPrgrSet(content).description` z [src/lib/ganx-parser.ts](src/lib/ganx-parser.ts))
      - **Stueck** = z `fileQuantities` pre daný `fileId` (ak chýba, fallback 1)
    - Zostaviť XML podľa [zakazka ganner programy/A011_KONF.jblx](zakazka ganner programy/A011_KONF.jblx): root `Joblst`, namespace, potom postupne `JobLstTable` s Name, File, Description, Stueck.
  - Zapísať do súboru (UTF-8), formátovať pekne (odsadenie) ako v Pythone (minidom toprettyprint) aby sa dal ľudsky čítať.
- **Integrácia do recalc**: na konci `recalcJobItem()` po úspešnom zápise všetkých .ganx súborov:
  - Vytvoriť priečinok `worklists` pod `jobDir` ak neexistuje.
  - Zavolať generátor worklistu pre túto položku (s načítaním CNC cesty a dát z DB). Pri chybe (napr. chýbajúce nastavenie) môžeme logovať a nastaviť outputStatus „error“, alebo len logovať a worklist preskočiť – podľa dohody; rozumnejšie je pri chybe worklistu nepadnúť celý recalc, ale logovať a pokračovať so statusom „generated“.
- **Mazanie**: v `deleteJobItem()` pred zmazaním položky z DB zmazať aj súbor `worklists/{item.name}.jblx` ak existuje (pripadne celý priečinok worklists ak je prázdny – voliteľné).

## 3. Štruktúra XML worklistu (referenčne)

```xml
<?xml version="1.0" ?>
<Joblst xmlns="http://tempuri.org/Joblst.xsd">
  <JobLstTable>
    <Name>BKP_A011</Name>
    <File>C:\GannoMAT Programs\zakazka-1\A011_KONF\BKP_A011.ganx</File>
    <Description>HRANA K DORAZU SPODNA DO PREDU</Description>
    <Stueck>1</Stueck>
  </JobLstTable>
  ...
</Joblst>
```

- Cesta v `File` musí byť tá, ktorú očakáva CNC (z nastavení); teda vždy použiť hodnotu z nastavení `cnc_programs_path`.

## 4. Závislosti a poradie

- **Načítanie Description**: po tom, čo `recalcJobItem` zapíše .ganx do `itemDir`, načítať každý .ganx, zavolať `extractPrgrSet(content)` a vziať `.description`. Ak `PrgrSet` alebo Description chýba, použiť prázdny reťazec (ako v Pythone).
- **Množstvá**: z `JobItemFileQuantity` pre daný `itemId` a `fileId`; poradie riadkov worklistu = poradie `cabinet.files` (bez ďalšieho sortovania podľa priority ako v Pythone).

## 5. Súbory na zmenu/vytvorenie


| Čo                          | Súbor / miesto                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Schéma nastavení            | [prisma/schema.prisma](prisma/schema.prisma) – model `Setting`                                                                               |
| Migrácia                    | Nová migrácia pre `Setting`                                                                                                                  |
| Čítanie/ukladanie nastavení | Nový `src/lib/settings.ts` alebo priamo v API route                                                                                          |
| API nastavení               | `src/app/api/settings/route.ts` (GET + PATCH)                                                                                                |
| Stránka Nastavenia          | `src/app/dashboard/nastavenia/page.tsx` (client + formulár)                                                                                  |
| Menu                        | [src/components/SideMenu.tsx](src/components/SideMenu.tsx) – pridať položku „Nastavenia“                                                     |
| Generátor worklistu         | Nová funkcia v [src/lib/job-service.ts](src/lib/job-service.ts) alebo `src/lib/worklist-generator.ts` (createWorklistForItem + buildJblxXml) |
| Integrácia do recalc        | [src/lib/job-service.ts](src/lib/job-service.ts) – na konci `recalcJobItem` vytvoriť worklist                                                |
| Mazanie worklistu           | [src/lib/job-service.ts](src/lib/job-service.ts) – v `deleteJobItem` zmazať `worklists/{item.name}.jblx`                                     |
| Parser                      | [src/lib/ganx-parser.ts](src/lib/ganx-parser.ts) – už má `extractPrgrSet()` s `description`, žiadna zmena nutná                              |


## 6. Poznámky

- Backslash v cestách: pre CNC je v príklade `C:\\GannoMAT Programs\...`. Pri generovaní XML použiť `\` v ceste (escape v XML ak treba) alebo jednu spätnú lomku ako v príklade – konzistentné s Pythonom.
- Worklist sa pregeneruje vždy pri úspešnom recalcu položky (pridanie/úprava/množstvá/parametre), takže „stále sa pregeneruje keď sa niečo upraví“ je splnené.
- Testy: rozšíriť alebo pridať unit test pre generovanie XML worklistu (mock nastavenia, mock item s files a fileQuantities) a integračný test pre recalc (že sa vytvorí súbor .jblx).

