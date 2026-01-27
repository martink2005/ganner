/**
 * GANX Parser - Parser pre .ganx XML súbory
 *
 * Extrahuje parametre a základné informácie z Gannomat .ganx súborov.
 */

/**
 * Parameter extrahovaný z <ParameterListe>
 */
export interface GanxParameter {
    paramName: string; // <ParamName>
    value: string; // <Value>
    description: string; // <Description>
    paramValue: string; // <ParamValue>
    sortId: number; // <SortID>
}

/**
 * Základné nastavenia programu z <PrgrSet>
 */
export interface GanxPrgrSet {
    prgrName: string; // <PrgrName>
    description: string; // <Description>
    wsX: number; // <wsX> šírka
    wsY: number; // <wsY> výška
    wsZ: number; // <wsZ> hrúbka
}

/**
 * Výsledok parsovania .ganx súboru
 */
export interface GanxFile {
    prgrSet: GanxPrgrSet | null;
    parameters: GanxParameter[];
}

/**
 * Pomocná funkcia na extrakciu textu z XML elementu
 */
function extractElementText(
    xml: string,
    tagName: string,
    startIndex: number = 0
): string | null {
    const openTag = `<${tagName}>`;
    const closeTag = `</${tagName}>`;

    const openIndex = xml.indexOf(openTag, startIndex);
    if (openIndex === -1) return null;

    const contentStart = openIndex + openTag.length;
    const closeIndex = xml.indexOf(closeTag, contentStart);
    if (closeIndex === -1) return null;

    return xml.substring(contentStart, closeIndex).trim();
}

/**
 * Parsuje hodnotu čísla z reťazca (podporuje čiarku ako desatinný oddeľovač)
 */
export function parseNumber(value: string): number {
    if (!value) return 0;
    // Nahradí čiarku bodkou pre parseFloat
    const normalized = value.replace(",", ".");
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
}

/**
 * Extrahuje <PrgrSet> z XML
 */
export function extractPrgrSet(xml: string): GanxPrgrSet | null {
    const prgrSetMatch = xml.match(/<PrgrSet>([\s\S]*?)<\/PrgrSet>/);
    if (!prgrSetMatch) return null;

    const prgrSetXml = prgrSetMatch[1];

    return {
        prgrName: extractElementText(prgrSetXml, "PrgrName", 0) || "",
        description: extractElementText(prgrSetXml, "Description", 0) || "",
        wsX: parseNumber(extractElementText(prgrSetXml, "wsX", 0) || "0"),
        wsY: parseNumber(extractElementText(prgrSetXml, "wsY", 0) || "0"),
        wsZ: parseNumber(extractElementText(prgrSetXml, "wsZ", 0) || "0"),
    };
}

/**
 * Extrahuje všetky <ParameterListe> elementy z XML
 */
export function extractParameters(xml: string): GanxParameter[] {
    const parameters: GanxParameter[] = [];

    // Nájdeme všetky ParameterListe elementy
    const paramRegex = /<ParameterListe>([\s\S]*?)<\/ParameterListe>/g;
    let match;

    while ((match = paramRegex.exec(xml)) !== null) {
        const paramXml = match[1];

        const paramName = extractElementText(paramXml, "ParamName", 0);
        if (!paramName) continue;

        parameters.push({
            paramName,
            value: extractElementText(paramXml, "Value", 0) || "",
            description: extractElementText(paramXml, "Description", 0) || "",
            paramValue: extractElementText(paramXml, "ParamValue", 0) || "",
            sortId: parseInt(extractElementText(paramXml, "SortID", 0) || "0", 10),
        });
    }

    return parameters;
}

/**
 * Parsuje celý .ganx súbor
 */
export function parseGanxFile(content: string): GanxFile {
    return {
        prgrSet: extractPrgrSet(content),
        parameters: extractParameters(content),
    };
}

/**
 * Odhaduje typ parametra podľa hodnoty a popisu
 */
export function inferParameterType(
    value: string,
    description: string
): string {
    const lowerDesc = description.toLowerCase();

    // Boolean parametre (ANO/NIE, =1/=0)
    if (
        lowerDesc.includes("ano/nie") ||
        lowerDesc.includes("ano=1") ||
        lowerDesc.includes("nie=0")
    ) {
        return "boolean";
    }

    // Ak hodnota je 0 alebo 1 a popis obsahuje ano/nie
    if ((value === "0" || value === "1") && lowerDesc.includes("ano")) {
        return "boolean";
    }

    // Inak je to number
    return "number";
}

/**
 * Deduplikuje parametre podľa paramName
 * Ak sa parameter opakuje, použije prvý výskyt
 */
export function deduplicateParameters(
    allParameters: GanxParameter[]
): GanxParameter[] {
    const seen = new Map<string, GanxParameter>();

    for (const param of allParameters) {
        if (!seen.has(param.paramName)) {
            seen.set(param.paramName, param);
        }
    }

    return Array.from(seen.values());
}

/**
 * Aktualizuje hodnoty parametrov v obsahu .ganx súboru
 *
 * @param xmlContent Pôvodný obsah súboru
 * @param parameters Mapa parametrov na aktualizáciu { "ParamName": "NewValue" }
 * @returns Aktualizovaný obsah XML
 */
export function updateGanxParameters(
    xmlContent: string,
    parameters: Record<string, string>
): string {
    let updatedXml = xmlContent;

    for (const [paramName, newValue] of Object.entries(parameters)) {
        // Regex na nájdenie bloku ParameterListe pre konkrétny ParameterName
        // Hľadá <ParamName>NAME</ParamName> ... <Value>OLD</Value> ... <ParamValue>OLD</ParamValue>
        // Pozor: Poradie tagov sa môže líšiť, ale v Gannomat súboroch je zvyčajne konzistentné.
        // Pre robustnosť hľadáme konkrétny blok <ParameterListe> ktorý obsahuje dané meno.

        const paramRegex = new RegExp(
            `(<ParameterListe>)([^]*?<ParamName>${paramName}<\\/ParamName>[^]*?)(<Value>)(.*?)(<\\/Value>)([^]*?)(<ParamValue>)(.*?)(<\\/ParamValue>)([^]*?<\\/ParameterListe>)`,
            "g"
        );

        // Nahradí obsah tagov Value a ParamValue
        // Skupiny:
        // 1: <ParameterListe>
        // 2: content before Value (including ParamName)
        // 3: <Value>
        // 4: OLD VALUE
        // 5: </Value>
        // 6: content between Value and ParamValue
        // 7: <ParamValue>
        // 8: OLD PARAM VALUE
        // 9: </ParamValue>
        // 10: rest of block

        updatedXml = updatedXml.replace(
            paramRegex,
            (match, p1, p2, p3, _p4, p5, p6, p7, _p8, p9, p10) => {
                // Formátovanie hodnoty (desatinná čiarka pre Gannomat)
                // Ak je to číslo, uistíme sa že má čiarku
                const formattedValue = newValue.replace(".", ",");

                return `${p1}${p2}${p3}${formattedValue}${p5}${p6}${p7}${formattedValue}${p9}${p10}`;
            }
        );
    }

    return updatedXml;
}
