---
name: Úprava parametrov skrinky v zákazke – checkbox a skupiny
overview: Opraviť nefunkčný boolean checkbox (použiť Radix onCheckedChange), vylepšiť vzhľad checkboxu a vizuálne oddeliť skupiny parametrov do boxov pre lepší prehľad.
todos: []
isProject: false
---

# Plán: Úprava parametrov skrinky v zákazke – checkbox a skupiny

## 1. Problém: Boolean checkbox nefunguje

**Príčina:** V [src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx](src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx) sa pri boolean parametri používa `onChange` a `(e.target as HTMLInputElement).checked`. Komponent [src/components/ui/checkbox.tsx](src/components/ui/checkbox.tsx) je však **Radix UI Checkbox** (`CheckboxPrimitive.Root`), ktorý neexponuje `onChange` ani `e.target.checked`, ale `**onCheckedChange?: (checked: boolean | "indeterminate") => void**`.

**Riešenie:** V client.tsx pri boolean parametri namiesto `onChange={(e) => handleParamChange(..., (e.target as HTMLInputElement).checked ? "true" : "false")}` použiť `**onCheckedChange={(checked) => handleParamChange(def.paramName, checked === true ? "true" : "false")}**`. Tým bude checkbox reagovať na klik a správne meniť state.

---

## 2. Krajší checkbox

**Súčasný stav:** Checkbox je štandardný shadcn (malý štvorček, check ikona). V client.tsx je v jednoduchom `<div className="flex items-center gap-2">` bez väčšieho vizuálneho zvýraznenia.

**Navrhované úpravy (v client.tsx):**

- Obaliť checkbox do klikateľného bloku (napr. `<div role="button" onClick={...} className="flex items-center gap-3 ...">`) alebo použiť `<Label>` s `htmlFor` tak, aby klik na názov parametra tiež prepol checkbox – Label už je, stačí zabezpečiť, že je asociovaný s checkboxom.
- Pridať vedľa checkboxu krátky text „Áno“ / „Nie“ podľa stavu (voliteľné, pre lepšiu čitateľnosť).
- Mierne zväčšiť a oddeliť: napr. `p-2 rounded-md border border-slate-200 bg-slate-50` okolo riadku s boolean parametrom, aby bol celý riadok jasne „prepínateľný“ a vizuálne oddelený od číselných inputov.

Konkrétne v kóde: pre boolean položku použiť `onCheckedChange` (bod 1), zachovať `Label` s `htmlFor={def.paramName}`, prípadne obaliť checkbox + label do jedného bloku so slabým pozadím a zaoblením; voliteľne zobraziť „Áno“ / „Nie“ podľa `boolChecked`.

---

## 3. Skupiny parametrov – väčšie oddelenie (boxy)

**Súčasný stav:** V [src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx](src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx) sa sekcie generujú ako `sections.map(section => <div key={section.title}><h4>...</h4><div className="grid ...">...</div></div>)` v jednom `space-y-6`. Jednotlivé skupiny sú teda len nadpisy + grid bez výraznej vizuálnej hranice.

**Riešenie:** Každú sekciu (skupinu) obaliť do **vizuálneho boxu**, napr.:

- Použiť komponent **Card** z `@/components/ui/card`: `<Card><CardHeader><CardTitle>{section.title}</CardTitle></CardHeader><CardContent><div className="grid ...">...</div></CardContent></Card>` pre každú sekciu, alebo
- Jednoduchý box: `<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">` s nadpisom a gridom parametrov vnútri.

Tým bude každá skupina (aj „Ostatné“) v samostatnom bloku s rámom a pozadím, čo zlepší prehľad.

---

## Súhrn zmien (súbory)


| Súbor                                                                                                              | Zmena                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx](src/app/dashboard/zakazky/[id]/item/[itemId]/client.tsx) | 1) Boolean: `onChange` + `e.target.checked` nahradiť za `onCheckedChange={(checked) => handleParamChange(..., checked === true ? "true" : "false")}`. 2) Boolean riadok: pridať obal so slabým pozadím/okrajom, voliteľne text „Áno“/„Nie“. 3) Sekcie skupín: obaliť každú `section` do Card alebo do `div` s `rounded-lg border bg-slate-50 p-4`. |


Žiadna zmena v [src/components/ui/checkbox.tsx](src/components/ui/checkbox.tsx) nie je nutná – API Radix checkboxu ostáva; mení sa len spôsob volania v client.tsx.

---

## Poradie implementácie

1. Opraviť handler checkboxu na `onCheckedChange` (boolean bude fungovať).
2. Pridať vizuálny box okolo každej skupiny parametrov (Card alebo border + padding).
3. Vylepšiť vzhľad boolean riadku (obal, prípadne „Áno“/„Nie“).

