---
name: Doplnenie základného popisu štruktúry GANX súborov
overview: Doplniť základný popis štruktúry `.ganx` súborov a organizácie skriniek do špecifikácie na základe analýzy príkladových súborov z priečinka `zakazka ganner programy`.
todos:
  - id: update-section-4
    content: Aktualizovať sekciu 4 (Storage a súborová štruktúra) - doplniť informácie o .param a .txt súboroch
    status: completed
  - id: update-section-6
    content: Rozšíriť sekciu 6 (Extrakcia parametrov) - doplniť základný popis XML štruktúry a typických parametrov
    status: completed
  - id: update-section-14
    content: Aktualizovať sekciu 14 (Otvorené TODO) - doplniť konkrétnejšie informácie na základe analýzy
    status: completed
  - id: add-structure-section
    content: Pridať novú sekciu alebo rozšíriť existujúcu o základný popis štruktúry príkladových súborov
    status: completed
---

# Doplnenie základného popisu štruktúry GANX súborov do špecifikácie

## Cieľ

Doplniť základný popis štruktúry `.ganx` súborov a organizácie skriniek do súboru `gannomat_protec_spec_v1_1.md` na základe analýzy príkladových súborov.

## Zistenia z analýzy

### 1. Organizácia súborov

- Každá skrinka má vlastný priečinok s názvom typu `A011_KONF`, `B442-600_KONF`, `E001_TEK`, atď.
- V každom priečinku sú:
- `.ganx` súbory - jednotlivé dielce (BKL, BKP, DNO, DVL, DVP, STROP, VLYS, CZD, CZM, atď.)
- `.param` súbor - binárny súbor s parametrami skrinky (nie je možné čítať ako text)
- `.txt` súbory - voliteľné poznámky/dodatočné informácie

### 2. Štruktúra `.ganx` súborov

- XML formát s namespace `http://tempuri.org/Programm.xsd`
- Hlavné sekcie:
- `PrgrSet` - základné rozmery dielca (`wsX`, `wsY`, `wsZ`)
- `ParameterListe` - zoznam parametrov s:
- `ParamName` - názov parametra
- `Value` - aktuálna hodnota
- `ParamValue` - hodnota parametra (môže obsahovať výrazy ako `{CLY}/2`)
- `Description` - popis parametra
- `SortID` - poradie zobrazenia
- `PrgrFile`/`PrgrFileWork` - jednotlivé operácie/vŕtania s referenciami na parametre v zátvorkách `{PARAMETER}`

### 3. Typické parametre

- `LX`, `LY`, `LZ` - rozmery dielca (dĺžka X, Y, Z)
- `CLX`, `CLY`, `CLZ` - stred dielca (centrum)
- `SKR_X`, `SKR_Y`, `SKR_Z` - rozmery skrinky (šírka, výška, hĺbka)
- `SPSX`, `SPSY` - offsety vŕtania spojovaciek
- `SPSAN` - flag pre spojovacky (1=áno, 0=nie)
- Ďalšie špecifické parametre podľa typu skrinky

## Úpravy v špecifikácii

### Sekcia 4: Storage a súborová štruktúra

- Doplniť poznámku o `.param` súboroch (binárny formát)
- Spomenúť možnosť `.txt` súborov s poznámkami

### Sekcia 6: Extrakcia parametrov z `.ganx`

- Doplniť základný popis XML štruktúry:
- `PrgrSet` s `wsX`, `wsY`, `wsZ`
- `ParameterListe` sekcia s parametrami
- Referencie na parametre v operáciách pomocou `{PARAMETER}`
- Spomenúť typické parametre (LX, LY, LZ, SKR_X, SKR_Y, SKR_Z, atď.)
- Poznámka: `.param` súbory sú binárne a vyžadujú špeciálne spracovanie (TODO)

### Sekcia 14: Otvorené TODO

- Aktualizovať s konkrétnejšími informáciami o štruktúre
- Pridať poznámku o `.param` súboroch

## Implementácia

1. Upraviť sekciu 4 - doplniť informácie o `.param` a `.txt` súboroch
2. Rozšíriť sekciu 6 - doplniť základný popis XML štruktúry a typických parametrov
3. Aktualizovať sekciu 14 - doplniť konkrétnejšie TODO položky
4. Pridať novú sekciu alebo rozšíriť existujúcu o základný popis štruktúry príkladových súborov