import { NextRequest, NextResponse } from "next/server";
import {
    getCncProgramsPath,
    setSetting,
    CNC_PROGRAMS_PATH_KEY,
} from "@/lib/settings";

/**
 * GET /api/settings – vráti objekt nastavení (minimálne cncProgramsPath)
 */
export async function GET() {
    try {
        const cncProgramsPath = await getCncProgramsPath();
        return NextResponse.json({
            cncProgramsPath,
        });
    } catch (error) {
        console.error("GET /api/settings error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní nastavení" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/settings – aktualizácia nastavení (napr. cncProgramsPath)
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { cncProgramsPath } = body as { cncProgramsPath?: string };

        if (cncProgramsPath !== undefined) {
            if (typeof cncProgramsPath !== "string") {
                return NextResponse.json(
                    { error: "Cesta k programom musí byť reťazec" },
                    { status: 400 }
                );
            }
            await setSetting(CNC_PROGRAMS_PATH_KEY, cncProgramsPath.trim());
        }

        const path = await getCncProgramsPath();
        return NextResponse.json({
            cncProgramsPath: path,
        });
    } catch (error) {
        console.error("PATCH /api/settings error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri ukladaní nastavení" },
            { status: 500 }
        );
    }
}
