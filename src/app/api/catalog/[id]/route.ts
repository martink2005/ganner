import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/catalog/[id] - Aktualizácia skrinky (popis, categoryId).
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();

        const cabinet = await prisma.cabinet.findUnique({
            where: { id },
        });
        if (!cabinet) {
            return NextResponse.json(
                { error: "Skrinka neexistuje" },
                { status: 404 }
            );
        }

        const data: { description?: string | null; categoryId?: string | null } =
            {};

        if (body.description !== undefined) {
            data.description =
                body.description === null || body.description === ""
                    ? null
                    : String(body.description).trim() || null;
        }

        if (body.categoryId !== undefined) {
            const categoryId =
                body.categoryId === null || body.categoryId === ""
                    ? null
                    : String(body.categoryId);
            if (categoryId) {
                const category = await prisma.cabinetCategory.findUnique({
                    where: { id: categoryId },
                });
                if (!category) {
                    return NextResponse.json(
                        { error: "Kategória neexistuje" },
                        { status: 400 }
                    );
                }
            }
            data.categoryId = categoryId;
        }

        if (Object.keys(data).length > 0) {
            await prisma.cabinet.update({
                where: { id },
                data,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Catalog PATCH API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri ukladaní" },
            { status: 500 }
        );
    }
}

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
