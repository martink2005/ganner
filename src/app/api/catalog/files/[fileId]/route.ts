import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/catalog/files/[fileId] – aktualizácia množstva súboru v katalógu
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
        const body = await request.json();

        const raw = body.quantity;
        const q = typeof raw === "number" ? Math.floor(raw) : Math.floor(Number(raw));
        if (!Number.isFinite(q) || q < 1) {
            return NextResponse.json(
                { error: "Množstvo musí byť celé číslo aspoň 1" },
                { status: 400 }
            );
        }

        const file = await prisma.cabinetFile.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return NextResponse.json(
                { error: "Súbor sa nenašiel" },
                { status: 404 }
            );
        }

        await prisma.cabinetFile.update({
            where: { id: fileId },
            data: { quantity: q },
        });

        return NextResponse.json({ success: true, quantity: q });
    } catch (error) {
        console.error("PATCH catalog file error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri ukladaní" },
            { status: 500 }
        );
    }
}
