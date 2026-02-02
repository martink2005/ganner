import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/catalog/[id]/groups - Zoznam skupín parametrov skrinky
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cabinetId } = await params;
        const groups = await prisma.cabinetParameterGroup.findMany({
            where: { cabinetId },
            orderBy: { sortOrder: "asc" },
            include: {
                parameters: { orderBy: { sortId: "asc" } },
            },
        });
        return NextResponse.json({ groups });
    } catch (error) {
        console.error("Catalog groups GET error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní skupín" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/catalog/[id]/groups - Vytvorenie novej skupiny
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cabinetId } = await params;
        const body = await request.json();
        const { name } = body as { name?: string };
        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json(
                { error: "Názov skupiny je povinný" },
                { status: 400 }
            );
        }
        const count = await prisma.cabinetParameterGroup.count({
            where: { cabinetId },
        });
        const group = await prisma.cabinetParameterGroup.create({
            data: {
                cabinetId,
                name: name.trim(),
                sortOrder: count,
            },
        });
        return NextResponse.json({ group });
    } catch (error) {
        console.error("Catalog groups POST error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri vytváraní skupiny" },
            { status: 500 }
        );
    }
}
