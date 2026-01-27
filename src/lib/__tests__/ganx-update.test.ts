import { describe, it, expect } from "vitest";
import { updateGanxParameters, extractParameters } from "@/lib/ganx-parser";

const TEST_XML = `<?xml version="1.0" standalone="yes"?>
<Programm xmlns="http://tempuri.org/Programm.xsd">
  <PrgrSet>
    <PrgrName>TEST</PrgrName>
  </PrgrSet>
  <ParameterListe>
    <ParamName>LX</ParamName>
    <Value>500,0</Value>
    <Description>Length</Description>
    <ParamValue>500,0</ParamValue>
    <SortID>1</SortID>
  </ParameterListe>
  <ParameterListe>
    <ParamName>LY</ParamName>
    <Value>300</Value>
    <Description>Width</Description>
    <ParamValue>300</ParamValue>
    <SortID>2</SortID>
  </ParameterListe>
</Programm>`;

describe("updateGanxParameters", () => {
    it("should update existing parameters", () => {
        const updates = {
            "LX": "600,0",
            "LY": "400"
        };

        const updatedXml = updateGanxParameters(TEST_XML, updates);

        // Overíme či sa text zmenil
        expect(updatedXml).toContain("<Value>600,0</Value>");
        expect(updatedXml).toContain("<ParamValue>600,0</ParamValue>");
        expect(updatedXml).toContain("<Value>400</Value>");

        // Parsing check - extrahujeme znova a overíme dáta
        const params = extractParameters(updatedXml);
        const lx = params.find(p => p.paramName === "LX");
        const ly = params.find(p => p.paramName === "LY");

        expect(lx?.value).toBe("600,0");
        expect(lx?.paramValue).toBe("600,0");
        expect(ly?.value).toBe("400");
    });

    it("should handle decimal points by converting to comma", () => {
        const updates = {
            "LX": "123.45"
        };

        const updatedXml = updateGanxParameters(TEST_XML, updates);
        expect(updatedXml).toContain("<Value>123,45</Value>");
    });

    it("should ignore non-existent parameters", () => {
        const updates = {
            "NON_EXISTENT": "999"
        };

        const updatedXml = updateGanxParameters(TEST_XML, updates);
        expect(updatedXml).toBe(TEST_XML);
    });
});
