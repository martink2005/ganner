import { describe, it, expect } from "vitest";
import {
    parseGanxFile,
    extractParameters,
    extractPrgrSet,
    inferParameterType,
    deduplicateParameters,
} from "../ganx-parser";

const SAMPLE_XML = `<?xml version="1.0" standalone="yes"?>
<Programm xmlns="http://tempuri.org/Programm.xsd">
  <PrgrSet>
    <PrgrName>BKL_A011</PrgrName>
    <Description>Sample Description</Description>
    <wsX>560.5</wsX>
    <wsY>570</wsY>
    <wsZ>18</wsZ>
  </PrgrSet>
  <ParameterListe>
    <ParamName>LX</ParamName>
    <Value>560,5</Value>
    <Description>Length X</Description>
    <ParamValue>560,5</ParamValue>
    <SortID>10</SortID>
  </ParameterListe>
  <ParameterListe>
    <ParamName>SPSAN</ParamName>
    <Value>1</Value>
    <Description>SPOJOVACKY ANO/NIE</Description>
    <ParamValue>1</ParamValue>
    <SortID>12</SortID>
  </ParameterListe>
</Programm>`;

describe("GANX Parser", () => {
    describe("extractPrgrSet", () => {
        it("should extract basic dimensions", () => {
            const result = extractPrgrSet(SAMPLE_XML);

            expect(result).not.toBeNull();
            expect(result?.prgrName).toBe("BKL_A011");
            expect(result?.wsX).toBe(560.5);
            expect(result?.wsY).toBe(570);
            expect(result?.wsZ).toBe(18);
        });

        it("should return null for invalid XML", () => {
            expect(extractPrgrSet("<Invalid></Invalid>")).toBeNull();
        });
    });

    describe("extractParameters", () => {
        it("should extract all parameters", () => {
            const params = extractParameters(SAMPLE_XML);

            expect(params).toHaveLength(2);
            expect(params[0].paramName).toBe("LX");
            expect(params[0].value).toBe("560,5");
            expect(params[1].paramName).toBe("SPSAN");
        });
    });

    describe("inferParameterType", () => {
        it("should identify boolean parameters from description", () => {
            expect(inferParameterType("1", "Something ANO/NIE")).toBe("boolean");
            expect(inferParameterType("0", "Option ANO=1/NIE=0")).toBe("boolean");
        });

        it("should identify numbers", () => {
            expect(inferParameterType("500", "Length")).toBe("number");
            expect(inferParameterType("0,5", "Offset")).toBe("number");
        });
    });

    describe("deduplicateParameters", () => {
        it("should remove duplicate parameters by name", () => {
            const params = [
                { paramName: "A", sortId: 1 } as any,
                { paramName: "B", sortId: 2 } as any,
                { paramName: "A", sortId: 3 } as any,
            ];

            const unique = deduplicateParameters(params);

            expect(unique).toHaveLength(2);
            expect(unique.map(p => p.paramName)).toEqual(["A", "B"]);
            // Should keep the first occurrence
            expect(unique.find(p => p.paramName === "A")?.sortId).toBe(1);
        });
    });

    describe("parseGanxFile", () => {
        it("should parse complete file", () => {
            const result = parseGanxFile(SAMPLE_XML);

            expect(result.prgrSet).toBeDefined();
            expect(result.parameters).toHaveLength(2);
        });
    });
});
