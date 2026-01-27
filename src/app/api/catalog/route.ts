import { NextResponse } from "next/server";
import { getAllCabinets } from "@/lib/cabinet-import";

/**
 * GET /api/catalog - Zoznam všetkých skriniek v katalógu
 */
export async function GET() {
    try {
        const cabinets = await getAllCabinets();

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
