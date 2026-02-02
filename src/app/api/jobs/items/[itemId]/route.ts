import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateJobItem, deleteJobItem } from "@/lib/job-service";

/**
 * PUT /api/jobs/items/[itemId] - Aktualizácia položky (parametre, názov, rozmery)
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { itemId: string } }
) {
    try {
        const itemId = params.itemId;
        const body = await request.json();

        // Parsovanie a validácia quantity (evidencia: celé číslo >= 1)
        let quantity: number | undefined;
        if (body.quantity !== undefined) {
            const q = Math.floor(Number(body.quantity));
            if (!Number.isFinite(q) || q < 1) {
                return NextResponse.json(
                    { error: "Množstvo musí byť aspoň 1" },
                    { status: 400 }
                );
            }
            quantity = q;
        }

        const updateData: Parameters<typeof updateJobItem>[1] = {
            name: body.name,
            width: body.width,
            height: body.height,
            depth: body.depth,
            parameters: body.parameters,
        };
        if (quantity !== undefined) updateData.quantity = quantity;

        await updateJobItem(itemId, updateData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update Job Item API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Nastala chyba pri aktualizácii" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/jobs/items/[itemId] - Odstránenie položky
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { itemId: string } }
) {
    try {
        const itemId = params.itemId;

        // Použijeme delete funkciu zo servisu (zmaže aj súbory)
        await deleteJobItem(itemId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Job Item API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri mazaní" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs/items/[itemId] - Detail položky s parametrami
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { itemId: string } }
) {
    try {
        const itemId = params.itemId;
        const item = await prisma.jobItem.findUnique({
            where: { id: itemId },
            include: {
                cabinet: {
                    include: {
                        parameters: true,
                    },
                },
                parameterValues: true,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "Položka neexistuje" },
                { status: 404 }
            );
        }

        return NextResponse.json({ item });
    } catch (error) {
        console.error("Get Job Item Detail API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba" },
            { status: 500 }
        );
    }
}
