Pokyny:
nizsie mas poziadavky na nove features, pre kazdu features popripade pre tu pre ktoru ta poprosim tak mi do suboru task.md sprav komplet plan na implementaciu danej features vsetky tasky musia mat checkboxy [ ] aby ich agent mohol zaskrtavat, na vytvaranie taskov pre implementaciu a planovania pouzivaj mcp context7 pre dokumentaciu a aj v taskoch nech je dane ze pre implementaciu sa ma pouzivat mcp context7 pre dokumentaciu, po vytvorenia taskov a popisu pre danu features zaskrtni checkbox na danej features

Next features for application
[x] Pridaj delete skriniek z katalogu, musi mat aj potvrdenie
[x] Pridaj delete zakazky, a edit aby sa dal upravit nazov a popis
[x] Pri upravovani parametrov skrinky v zakazke, tam kde je boolean typ parametru tak nech tam je checkbox
[x] Nech sa v katalogu a uz v danej skrinke, nech sa daju vytvarat groupy pre parametre, kazda groupa bude mat nazov a ked si jednotlive parametre podavam do groups tak podla toho sa budu potom zobrazovat aj v zakazke pri upravovani v skrinke, a nech sa aj tie groupy daju drag-end-dropom zoradzovat a podla toho zoradenia sa potom budu zobrazovat aj pri upravovani parametrov v zakazke pri skrinke, cielom je aby sa dali parametre ktore suvisia spolu presuvat do group pre prehliadnost
[x] Pri editovani skrinky v zakazke nech pri rozmeroch skrinky nech pri vyska,sirka,hlbka pise aj cez pomlcku pise X,Y,Z
[x] Pridaj do menu aj polozku dashboard
[x] Sfunkcni dashboard aby ukazoval hodnoty, pridaj nanho ze posledne zakazky s tym ze nech tam je rovno preklik ze mi otvori tu danu zakazku
[x] Do katalogu ked otvorim danu skrinku pridaj moznost zadat mnozstvo ku kazemu dielcu respektive programu, to bude definovat pocet kolko je toho dielca v danej skrinke, pri editovani skrinky v zakazke sa musia dat tieto mnozstva upravit ale ked sa prida skrinka tak default bude hodnota z katalogu
[x] Pridaj moznost v katalogu pridat popis ku skrinke
[x] Pridaj do katalogu kategorizaciu skriniek, to znamena ze skrinky môzu patrit do kategorii, kategorie budu rekurzivne a budu sa dat vytvarat donekonecna, nech tam je aj filtrovanie podla kategorii..., kategorie sa musia dat aj spravovat
[x] Pridaj aby sa pri importe skrinky dal nastavit default rozmer skrinky, a tiez aby sa dala rovno nastavit kategoria
[x] Pri importe ak skrinky s danym nazvom uz existuje nech vybehne modal ze uz s takym nazvom existuje a aby sa dal prepisat nazov
[x] Uprav generovanie programov, potrebujem tam pridat jedno pravidlo ze ked prechadza program respektive dielec a v <PrgrFile> sa niekde nachadza parameter POLMN (v programe je v kucerevych ratvorkach {POLMN}) a tom tagu kde sa najde ten parameter tak bude podmienka ak parameter POLMN ma v parametroch <ParameterListe> hodnotu a je parna tak v tom tagu nastavi hodnotu <int2> na 1 a ak je neparna tak nastavi na 0. takto musi prejst vsetky tagy <PrgrFile> v programe, ak tam nenajde tag ktory obsahuje dany parameter tak neupravuje nic ale pozor, hodnotu <int2> upravuje iba v tom danom tagu !!! akokeby v programe v jednej operacii napr. vrtanie !!! priklad programu.ganx je v /catalog/a011-konf/BKL_A011.ganx, celom tejto podmienky je aby ked nastavujem v parametri pocet polic pocet tak aby to sprvne prepocitavalo
[x] Pridaj do dokumentacie kratucke instrukcie ako treba definovat pocet polic akym parametrom ze to je parameter POLMN