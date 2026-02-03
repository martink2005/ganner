import { describe, it, expect } from "vitest";
import {
  updateGanxParameters,
  extractParameters,
  applyPolmnInt2Rule,
} from "@/lib/ganx-parser";

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

const XML_WITH_POLMN = `<?xml version="1.0"?>
<Programm>
  <ParameterListe><ParamName>POLMN</ParamName><Value>1</Value><ParamValue>1</ParamValue></ParameterListe>
  <PrgrFile>
    <ColsDistance>{LY}/({POLMN}+1)</ColsDistance>
    <int1>3</int1>
    <int2>99</int2>
  </PrgrFile>
  <PrgrFile>
    <ColsDistance>{LX}</ColsDistance>
    <int2>77</int2>
  </PrgrFile>
</Programm>`;

describe("applyPolmnInt2Rule", () => {
  it("returns content unchanged when POLMN is not in parameters", () => {
    const xml = "<Programm><PrgrFile><x>{POLMN}</x></PrgrFile></Programm>";
    expect(applyPolmnInt2Rule(xml, {})).toBe(xml);
    expect(applyPolmnInt2Rule(xml, { LX: "500" })).toBe(xml);
  });

  it("sets int2 to 0 when POLMN is odd (1)", () => {
    const out = applyPolmnInt2Rule(XML_WITH_POLMN, { POLMN: "1" });
    expect(out).toContain("<int2>0</int2>");
    const firstPrgr = out.match(/<PrgrFile>[\s\S]*?<\/PrgrFile>/)?.[0] ?? "";
    expect(firstPrgr).toContain("{POLMN}");
    expect(firstPrgr).toContain("<int2>0</int2>");
  });

  it("sets int2 to 1 when POLMN is even (2)", () => {
    const out = applyPolmnInt2Rule(XML_WITH_POLMN, { POLMN: "2" });
    const firstBlock = out.indexOf("<PrgrFile>");
    const firstPrgr = out.slice(firstBlock, out.indexOf("</PrgrFile>") + 11);
    expect(firstPrgr).toContain("<int2>1</int2>");
  });

  it("only modifies PrgrFile blocks that contain {POLMN}", () => {
    const out = applyPolmnInt2Rule(XML_WITH_POLMN, { POLMN: "1" });
    const blocks = out.match(/<PrgrFile>[\s\S]*?<\/PrgrFile>/g) ?? [];
    const withPolmn = blocks[0];
    const withoutPolmn = blocks[1];
    expect(withPolmn).toContain("<int2>0</int2>");
    expect(withoutPolmn).toContain("<int2>77</int2>");
  });

  it("inserts int2 when missing in block that contains {POLMN}", () => {
    const xml = `<Programm><PrgrFile><ColsDistance>{POLMN}</ColsDistance></PrgrFile></Programm>`;
    const out = applyPolmnInt2Rule(xml, { POLMN: "2" });
    expect(out).toContain("<int2>1</int2>");
    expect(out).toContain("</PrgrFile>");
  });

  it("treats empty or invalid POLMN as 0 (odd → int2 = 0)", () => {
    const xml = `<Programm><PrgrFile><x>{POLMN}</x><int2>1</int2></PrgrFile></Programm>`;
    expect(applyPolmnInt2Rule(xml, { POLMN: "" })).toContain("<int2>0</int2>");
    expect(applyPolmnInt2Rule(xml, { POLMN: "x" })).toContain("<int2>0</int2>");
  });

  it("uses Math.floor for decimal POLMN (1.7 → odd → 0)", () => {
    const xml = `<Programm><PrgrFile><x>{POLMN}</x><int2>1</int2></PrgrFile></Programm>`;
    const out = applyPolmnInt2Rule(xml, { POLMN: "1,7" });
    expect(out).toContain("<int2>0</int2>");
  });
});
