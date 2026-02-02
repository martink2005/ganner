import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/catalog/[id] - Vymazanie skrinky z katalógu.
 * Ak je skrinka použitá v zákazkách (JobItem.cabinetId), vráti 400.
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        const usedInJobs = await prisma.jobItem.count({
            where: { cabinetId: id },
        });

        if (usedInJobs > 0) {
            return NextResponse.json(
                { error: "Skrinka je použitá v zákazkách" },
                { status: 400 }
            );
        }

        await prisma.cabinet.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Catalog DELETE API error:", error);
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code: string }).code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Skrinka neexistuje" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Nastala chyba pri mazaní skrinky" },
            { status: 500 }
        );
    }
}
