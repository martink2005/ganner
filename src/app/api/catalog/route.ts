import { NextRequest, NextResponse } from "next/server";
import { getAllCabinets } from "@/lib/cabinet-import";

/**
 * GET /api/catalog - Zoznam skriniek v katalógu.
 * Query: categoryId (voliteľný), includeChildren (boolean, default false).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get("categoryId") || undefined;
        const includeChildren =
            searchParams.get("includeChildren") === "true";

        const cabinets = await getAllCabinets({
            categoryId: categoryId || undefined,
            includeChildren,
        });

        return NextResponse.json({
            cabinets,
            total: cabinets.length,
        });
    } catch (error) {
        console.error("Catalog API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní katalógu" },
            { status: 500 }
        );
    }
}
