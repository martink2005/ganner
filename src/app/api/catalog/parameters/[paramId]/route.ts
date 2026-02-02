import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/catalog/parameters/[paramId] - Priradenie parametra do skupiny
 * Body: { groupId?: string | null } (null alebo chýbajúce = odstrániť zo skupiny)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ paramId: string }> }
) {
    try {
        const { paramId } = await params;
        const body = await request.json();
        const groupId =
            body.groupId === undefined || body.groupId === null
                ? null
                : typeof body.groupId === "string" && body.groupId.trim() !== ""
                    ? body.groupId.trim()
                    : null;
        const parameter = await prisma.cabinetParameter.update({
            where: { id: paramId },
            data: { groupId },
        });
        return NextResponse.json({ parameter });
    } catch (error) {
        console.error("Catalog parameter PATCH error:", error);
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code: string }).code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Parameter neexistuje" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Nastala chyba pri úprave parametra" },
            { status: 500 }
        );
    }
}
