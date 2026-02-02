import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/catalog/groups/[groupId] - Úprava názvu skupiny
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const { groupId } = await params;
        const body = await request.json();
        const { name } = body as { name?: string };
        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json(
                { error: "Názov skupiny je povinný" },
                { status: 400 }
            );
        }
        const group = await prisma.cabinetParameterGroup.update({
            where: { id: groupId },
            data: { name: name.trim() },
        });
        return NextResponse.json({ group });
    } catch (error) {
        console.error("Catalog group PATCH error:", error);
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code: string }).code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Skupina neexistuje" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Nastala chyba pri úprave skupiny" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/catalog/groups/[groupId] - Vymazanie skupiny (parametre zostanú, groupId sa nastaví na null)
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    try {
        const { groupId } = await params;
        await prisma.cabinetParameterGroup.delete({
            where: { id: groupId },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Catalog group DELETE error:", error);
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code: string }).code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Skupina neexistuje" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Nastala chyba pri mazaní skupiny" },
            { status: 500 }
        );
    }
}
