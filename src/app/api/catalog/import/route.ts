import { NextRequest, NextResponse } from "next/server";
import { importCabinet, scanCabinetFolder } from "@/lib/cabinet-import";

/**
 * POST /api/catalog/import - Import skrinky z priečinka
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sourcePath, catalogRoot } = body;

        if (!sourcePath) {
            return NextResponse.json(
                { error: "sourcePath je povinný parameter" },
                { status: 400 }
            );
        }

        // Import skrinky
        const result = await importCabinet(
            sourcePath,
            catalogRoot || "./catalog"
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.errors.join(", "), errors: result.errors },
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
