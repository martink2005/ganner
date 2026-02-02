---
name: Náhľad vrtania do hrany
overview: V katalógu pri náhľade dielca (napr. DNO_A011.ganx) sa vŕtania ležiace na hrane dielca (Y=0, X=0, X=wsX, Y=wsY) zobrazujú ako plné kruhy. Úpravou parsera a komponentu PartPreview sa tieto diery zobrazia ako polokruhy otvorené smerom k hrane, aby bola viditeľná celá hĺbka vrtania.
todos: []
isProject: false
---

# Náhľad dielca – vrtanie do hrany v katalógu

## Problém

Pri náhľade dielca v katalógu (napr. skrinka A011_KONF_OK4, dielec DNO_A011.ganx) sú **vŕtania do hrany** zobrazené ako plné kruhy. V skutočnosti ide o diery, ktoré vychádzajú z hrany dielca dovnútra (napr. Y=0 alebo X=0). Používateľ chce, aby sa tieto diery zobrazovali **ako otvorené od hrany** (polokruh smerom do dielca), aby bola viditeľná celá hĺbka vrtania.

**Príklad z DNO_A011.ganx:** wsX=559.5, wsY=614; viacero vŕtaní má Y=0 alebo X=0 alebo X=529.5 (takmer wsX) – tieto sú „vrtanie do hrany“.

## Súčasný stav

- `**[src/components/catalog/part-preview.tsx](src/components/catalog/part-preview.tsx)**` – vykresľuje všetky vŕtania (type B) ako plné kruhy (`<circle>`) podľa `op.x`, `op.y`, `op.diameter`. Rozmery dielca sú `width` (wsX), `height` (wsY).
- `**[src/lib/ganx-parser.ts](src/lib/ganx-parser.ts)**` – `GanxOperation` obsahuje `x`, `y`, `diameter`, `depth`; **neobsahuje** informáciu o tom, či je vrtanie do hrany. V GANX sú v `<PrgrFile>` prítomné `DblB`, `DblL`, `DblE` (vrtanie do hrany), ale parser ich z PrgrFileWork nečíta (PrgrFileWork tieto polia nemá; sú v PrgrFile zhodné podľa CntID).

## Riešenie

1. **Rozšírenie dát pre operácie** – buď doplniť z GANX `DblB`/`DblL`/`DblE` (cez párovanie PrgrFileWork ↔ PrgrFile podľa CntID), alebo **určiť „na hrane“ z pozície** (x, y vzhľadom na 0, width, height). Pre prvú iteráciu stačí **detekcia z pozície** v komponente náhľadu (bez zmeny parsera): ak je vrtanie blízko hrany (tolerancia napr. 1–2 mm), považujeme ho za vrtanie do hrany.
2. **Zmena vykresľovania v PartPreview** – pre vŕtania na hrane nekresliť celý kruh, ale **polkruh (arc)** otvorený smerom k príslušnej hrane, aby diera „vychádzala z hrany“ a bola viditeľná celá hĺbka.

## Implementačné kroky

### 1. Rozšíriť `GanxOperation` a parser (voliteľné, odporúčané)

V `**[src/lib/ganx-parser.ts](src/lib/ganx-parser.ts)**`:

- Do `GanxOperation` pridať voliteľné polia napr. `dblB?: boolean`, `dblL?: boolean`, `dblE?: boolean` (alebo jedno pole `atEdge?: 'left'|'right'|'top'|'bottom'`).
- V `extractOperations`:
  - parsovať aj `<PrgrFile>` bloky a z nich získať pre každé `CntID` hodnoty `DblB`, `DblL`, `DblE`;
  - pri vytváraní operácie z PrgrFileWork pridať tieto hodnoty podľa zhodného CntID.

Alternatíva (jednoduchšia, bez zmeny štruktúry): nepridávať nové polia a **určovať „na hrane“ až v PartPreview** podľa `(op.x, op.y)` a `(width, height)` s malou toleranciou – pozícia na alebo tesne pri 0 / width / height znamená vrtanie do ľavej / pravej / dolnej / hornej hrany.

### 2. V PartPreview určiť, ktoré vŕtania sú „do hrany“

V `**[src/components/catalog/part-preview.tsx](src/components/catalog/part-preview.tsx)**`:

- Pre každé vrtanie (type B) určiť, či leží na hrane:
  - **ľavý okraj:** `x <= tolerance` (napr. 2 mm),
  - **pravý okraj:** `x >= width - tolerance`,
  - **dolný okraj:** `y <= tolerance`,
  - **horný okraj:** `y >= height - tolerance`.
- Ak je na viacerých hranách (roh), zvoliť jednu (napr. prioritne bottom, potom left/right, potom top) alebo zobraziť ako štvrťkruh; pre DNO_A011 typicky stačí jedna hrana (Y=0 alebo X=0).

### 3. Vykresľovať „vrtanie do hrany“ ako polkruh

Namiesto `<circle>` pre vrtanie na hrane použiť SVG `**<path>**` s arc:

- **Dolná hrana (y ≈ 0):** polkruh otvorený dole – arc od (x − r, y) cez (x + r, y) alebo ekvivalent (viditeľná horná polovica kruhu).
- **Horná hrana (y ≈ height):** polkruh otvorený hore.
- **Ľavá hrana (x ≈ 0):** polkruh otvorený vľavo (pravá polovica kruhu).
- **Pravá hrana (x ≈ width):** polkruh otvorený vpravo (ľavá polovica kruhu).

Polomer `r = (op.diameter || 5) / 2`. Zachovať rovnaké farby/štýly ako pri plnom kruhu (fill, stroke, prípadne stredový krížik len pre časť oblúka alebo ho prispôsobiť).

### 4. Predávanie `depth` do PartPreview (voliteľné)

Ak sa v budúcnosti bude zobrazovať aj hĺbka (napr. vedľa diery), `**[src/app/dashboard/katalog/[slug]/client.tsx](src/app/dashboard/katalog/[slug]/client.tsx)**` už volá `PartPreview` s `operations`. Rozšírenie `PartPreview` o `depth` v props nie je nutné pre samotné „polkruh na hrane“; stačí šírka/výška a operácie.

## Závislosti

- Žiadna nová závislosť – len SVG `<path>` a aritmetika súradníc.
- API a server action `getGanxFileDetail` nemusia meniť rozhranie, ak zostaneme pri detekcii hrany z (x, y) a (width, height). Ak pridáte `dblB`/`dblL`/`dblE` do `GanxOperation`, dáta pôjdu do `PartPreview` cez existujúce `operations`.

## Testovanie

- Otevrieť katalóg → skrinka A011_KONF_OK4 → náhľad dielca **DNO_A011.ganx**.
- Skontrolovať vŕtania na Y=0, X=0 a na pravom okraji (X ≈ 559.5): mali by byť zobrazené ako polkruhy otvorené smerom k príslušnej hrane.
- Ověřiť, že vŕtania vnútri dielca zostávajú ako plné kruhy.

## Zhrnutie zmien súborov


| Súbor                                                                                | Zmena                                                                                                                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `[src/lib/ganx-parser.ts](src/lib/ganx-parser.ts)`                                   | (Voliteľné) Pridať do `GanxOperation` polia pre vrtanie do hrany; v `extractOperations` načítať DblB/DblL/DblE z PrgrFile podľa CntID. |
| `[src/components/catalog/part-preview.tsx](src/components/catalog/part-preview.tsx)` | Detekcia vŕtaní na hrane podľa (x,y) a (width, height); vykresľovanie takých vŕtaní ako SVG `<path>` (polkruh) namiesto `<circle`.     |


