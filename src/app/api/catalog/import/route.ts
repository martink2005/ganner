import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { importCabinet, scanCabinetFolder } from "@/lib/cabinet-import";

/**
 * POST /api/catalog/import - Import skrinky z priečinka
 * Body: sourcePath (povinný), catalogRoot?, defaultWidth?, defaultHeight?, defaultDepth?, categoryId?, overrideName?
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            sourcePath,
            catalogRoot,
            defaultWidth,
            defaultHeight,
            defaultDepth,
            categoryId,
            overrideName,
        } = body;

        if (!sourcePath) {
            return NextResponse.json(
                { error: "sourcePath je povinný parameter" },
                { status: 400 }
            );
        }

        const overrideNameStr =
            overrideName === null || overrideName === undefined
                ? undefined
                : typeof overrideName === "string"
                    ? overrideName.trim()
                    : String(overrideName).trim();
        if (overrideName !== undefined && overrideName !== null && overrideNameStr === "") {
            return NextResponse.json(
                { error: "overrideName nesmie byť prázdny reťazec" },
                { status: 400 }
            );
        }

        // Validácia rozmerov – ak sú zadané, musia byť kladné
        const num = (v: unknown): number | null =>
            v === null || v === undefined || v === ""
                ? null
                : typeof v === "number"
                    ? v
                    : Number(v);
        const w = num(defaultWidth);
        const h = num(defaultHeight);
        const d = num(defaultDepth);
        if (w !== null && (Number.isNaN(w) || w <= 0)) {
            return NextResponse.json(
                { error: "Šírka (defaultWidth) musí byť kladné číslo" },
                { status: 400 }
            );
        }
        if (h !== null && (Number.isNaN(h) || h <= 0)) {
            return NextResponse.json(
                { error: "Výška (defaultHeight) musí byť kladné číslo" },
                { status: 400 }
            );
        }
        if (d !== null && (Number.isNaN(d) || d <= 0)) {
            return NextResponse.json(
                { error: "Hĺbka (defaultDepth) musí byť kladné číslo" },
                { status: 400 }
            );
        }

        // Validácia categoryId – ak je zadané, kategória musí existovať
        const catId =
            categoryId === null || categoryId === undefined || categoryId === ""
                ? null
                : String(categoryId);
        if (catId) {
            const category = await prisma.cabinetCategory.findUnique({
                where: { id: catId },
            });
            if (!category) {
                return NextResponse.json(
                    { error: "Zadaná kategória neexistuje" },
                    { status: 400 }
                );
            }
        }

        const options = {
            defaultWidth: w ?? undefined,
            defaultHeight: h ?? undefined,
            defaultDepth: d ?? undefined,
            categoryId: catId ?? undefined,
            overrideName: overrideNameStr ?? undefined,
        };

        // Import skrinky
        const result = await importCabinet(
            sourcePath,
            catalogRoot || "./catalog",
            options
        );

        if (!result.success) {
            if (result.conflictExistingName) {
                return NextResponse.json(
                    {
                        error:
                            result.errors[0] ??
                            `Skrinka s názvom "${result.conflictExistingName}" už existuje v katalógu.`,
                        errors: result.errors,
                        code: "CABINET_EXISTS",
                        existingName: result.conflictExistingName,
                    },
                    { status: 400 }
                );
            }

            const formatOne = (raw: string) => {
                // Očakávaný tvar z importu:
                // Súbor "NAME.ganx" sa nedá importovať:
                //   - ...
                const m = raw.match(/^Súbor\s+"([^"]+)"\s+sa\s+nedá\s+importovať:\s*\n?/);
                const filename = m?.[1];
                const rest = m ? raw.slice(m[0].length) : raw;

                const normalizedRest = rest
                    .trim()
                    .replace(/^\s*-\s+/gm, "  - ");

                return filename
                    ? `• ${filename}\n${normalizedRest ? `${normalizedRest}` : ""}`.trim()
                    : `• ${raw.trim()}`;
            };

            const errorMessage =
                result.errors.length <= 1
                    ? `Import sa nepodaril.\n\n${formatOne(result.errors[0] ?? "")}`
                    : `Import sa nepodaril.\n\nSkontroluj nasledujúce súbory:\n\n${result.errors
                        .map(formatOne)
                        .join("\n\n")}`;

            return NextResponse.json(
                { error: errorMessage, errors: result.errors },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            cabinet: result.cabinet,
            filesCount: result.filesCount,
            parametersCount: result.parametersCount,
        });
    } catch (error) {
        console.error("Import API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri importe" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/catalog/import?path=... - Náhľad súborov v priečinku
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sourcePath = searchParams.get("path");

        if (!sourcePath) {
            return NextResponse.json(
                { error: "path parameter je povinný" },
                { status: 400 }
            );
        }

        const files = await scanCabinetFolder(sourcePath);

        return NextResponse.json({
            folderName: sourcePath.split(/[/\\]/).pop() || "",
            files,
            totalFiles: files.length,
        });
    } catch (error) {
        console.error("Scan API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri skenovaní priečinka" },
            { status: 500 }
        );
    }
}
