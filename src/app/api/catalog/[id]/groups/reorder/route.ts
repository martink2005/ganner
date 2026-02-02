import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/catalog/[id]/groups/reorder - Zoradenie skupín
 * Body: { order: { id: string, sortOrder: number }[] }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cabinetId } = await params;
        const body = await request.json();
        const { order } = body as { order?: { id: string; sortOrder: number }[] };
        if (!Array.isArray(order) || order.length === 0) {
            return NextResponse.json(
                { error: "Pole order je povinné" },
                { status: 400 }
            );
        }
        await prisma.$transaction(
            order.map(({ id, sortOrder }) =>
                prisma.cabinetParameterGroup.updateMany({
                    where: { id, cabinetId },
                    data: { sortOrder },
                })
            )
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Catalog groups reorder error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri ukladaní poradia" },
            { status: 500 }
        );
    }
}
