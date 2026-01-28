---
name: Import do katalógu – filtrácia a validácie parametrov
overview: Upraviť import skrinky do katalógu tak, aby sa do DB neukladali technické parametre (CLX/CLY/CLZ/LX/LY/LZ) a aby import zlyhal, ak ktorýkoľvek `.ganx` (dielec) neobsahuje aspoň 2 parametre v tvare `^[XYZ]_C_[XYZ]$` definované v `<ParamName>` alebo ak mu chýba povinný parameter `HRUB`.
todos:
  - id: add-per-file-coordinate-param-validation
    content: Pridať validáciu v `importCabinet()` (pre každý `.ganx` aspoň 2× `^[XYZ]_C_[XYZ]$` v `ParamName` + povinný `HRUB`) a failnúť import, ak niektorý súbor neprejde.
    status: completed
  - id: exclude-derived-dimension-params-from-db
    content: Filtrovať `CLX/CLY/CLZ/LX/LY/LZ` z `uniqueParameters` pred `prisma.cabinet.create(... parameters.create ...)` a upraviť počty/response.
    status: completed
  - id: update-unit-tests
    content: Rozšíriť `cabinet-import.test.ts` o testy na novú validáciu a na filtráciu zakázaných parametrov pri DB zápise.
    status: completed
isProject: false
---

### Kontext (kde sa to deje dnes)

- Import skrinky beží cez route handler [`src/app/api/catalog/import/route.ts`](src/app/api/catalog/import/route.ts), ktorý volá `importCabinet()`.
- Samotná logika importu + zápis do DB je v [`src/lib/cabinet-import.ts`](src/lib/cabinet-import.ts).
- Parametre sa dnes ukladajú do DB bez filtrácie cez nested `create`:
```176:200:C:\Users\martink\Documents\GitHub\ganner\src\lib\cabinet-import.ts
        const cabinet = await prisma.cabinet.create({
            data: {
                name: cabinetName,
                slug,
                catalogPath,
                baseWidth,
                baseHeight,
                baseDepth,
                files: {
                    create: ganxFiles.map((filename) => ({
                        filename,
                        relativePath: filename,
                        hash: calculateHash(fileContents.get(filename) || ""),
                    })),
                },
                parameters: {
                    create: uniqueParameters.map((param) => ({
                        paramName: param.paramName,
                        label: param.description || param.paramName,
                        paramType: inferParameterType(param.value, param.description),
                        defaultValue: param.paramValue,
                        sortId: param.sortId,
                    })),
                },
            },
            include: {
                files: true,
                parameters: true,
            },
        });
```

- Prisma nested `create` je atomické (z Context7 Prisma docs), takže z DB pohľadu stačí validovať pred `prisma.cabinet.create()`.

### Požadované zmeny

- **Filtrácia DB parametrov**: pri importe do katalógu **nevytvárať** záznamy pre `CLZ`, `CLY`, `CLX`, `LZ`, `LY`, `LX`.
- **Validácia pre každý `.ganx` súbor (dielec)**:
  - v `<ParameterListe><ParamName>` musí existovať **aspoň 2×** parameter, ktorý matchuje regex: `^[XYZ]*C*[XYZ]$`.
  - v `<ParameterListe><ParamName>` musí existovať aj povinný parameter `HRUB`.
  - validácia musí byť “fail-safe”: ak čo i len jeden súbor podmienku nespĺňa → **celá skrinka sa neimportuje**.

### Implementačný návrh (čo konkrétne zmeniť)

- V [`src/lib/cabinet-import.ts`](src/lib/cabinet-import.ts) v cykle `for (const filename of ganxFiles)`:
  - po `const parsed = parseGanxFile(content);` pridať check:
    - spočítať `count = parsed.parameters.filter(p => /^[XYZ]*C*[XYZ]$/.test(p.paramName)).length`
    - ak `count < 2` → pridať do `errors` napr. `"Súbor <filename> nemá aspoň 2 parametre typu ^[XYZ]*C*[XYZ]$ (našiel som <count>)."` a označiť import ako neúspešný.
    - overiť `hasHrub = parsed.parameters.some(p => p.paramName === "HRUB")`; ak nie → pridať do `errors` napr. `"Súbor <filename> nemá povinný parameter HRUB."` a označiť import ako neúspešný.
  - dôležité: validovať **predtým**, než sa začne vytvárať `catalogPath` a kopírovať súbory (aby pri chybe nevznikali polovičné importy na disku).

- Po deduplikácii (`const uniqueParameters = deduplicateParameters(allParameters);`) pridať filtráciu:
  - `const EXCLUDED = new Set(["CLX","CLY","CLZ","LX","LY","LZ"])`
  - `const dbParameters = uniqueParameters.filter(p => !EXCLUDED.has(p.paramName))`
  - `parameters.create` potom mapovať z `dbParameters` (a `parametersCount` v `ImportResult` má reflektovať už filtrovaný stav).

### Test plan (unit)

- Aktualizovať [`src/lib/__tests__/cabinet-import.test.ts`](src/lib/__tests__/cabinet-import.test.ts):
  - **happy path**: mock `parseGanxFile()` nech vracia minimálne 2 parametre, napr. `X_C_Y` a `Y_C_X`, plus `HRUB`; očakávať `success: true`.
  - **fail path (validácia)**: mock `parseGanxFile()` nech pre jeden súbor vráti 0 alebo 1 `*_C_*` parameter; očakávať `success: false` a zmysluplnú hlášku s názvom súboru.
  - **fail path (HRUB)**: mock `parseGanxFile()` nech pre jeden súbor nemá `HRUB`; očakávať `success: false` a zmysluplnú hlášku s názvom súboru.
  - **filtrácia**: mock nech vracia mix parametrov vrátane `LX`, `CLX` + legit parametrov; overiť, že do `prisma.cabinet.create` ide `parameters.create` bez týchto zakázaných názvov.

### Súbory, ktoré sa budú meniť

- [`src/lib/cabinet-import.ts`](src/lib/cabinet-import.ts)
- [`src/lib/__tests__/cabinet-import.test.ts`](src/lib/__tests__/cabinet-import.test.ts)
- (voliteľne) [`src/app/api/catalog/import/route.ts`](src/app/api/catalog/import/route.ts) iba ak bude treba spresniť text chýb alebo status kód (už dnes vracia 400 pri `!success`).