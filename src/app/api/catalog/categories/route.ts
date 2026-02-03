import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildCategoryTree, slugFromName } from "@/lib/category-utils";

/**
 * GET /api/catalog/categories – strom kategórií (rekurzívne s children).
 */
export async function GET() {
    try {
        const categories = await prisma.cabinetCategory.findMany({
            orderBy: [{ parentId: "asc" }, { name: "asc" }],
        });
        const tree = buildCategoryTree(categories);
        return NextResponse.json({ categories: tree });
    } catch (error) {
        console.error("Categories GET error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní kategórií" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/catalog/categories – vytvorenie kategórie.
 * Telo: { name: string, parentId?: string | null }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
            return NextResponse.json(
                { error: "Názov kategórie je povinný" },
                { status: 400 }
            );
        }
        const parentId =
            body.parentId === null || body.parentId === undefined
                ? null
                : typeof body.parentId === "string"
                    ? body.parentId
                    : null;

        if (parentId) {
            const parent = await prisma.cabinetCategory.findUnique({
                where: { id: parentId },
            });
            if (!parent) {
                return NextResponse.json(
                    { error: "Nadradená kategória neexistuje" },
                    { status: 400 }
                );
            }
        }

        let slug = slugFromName(name);
        const existing = await prisma.cabinetCategory.findUnique({
            where: { slug },
        });
        if (existing) {
            let n = 1;
            while (
                await prisma.cabinetCategory.findUnique({
                    where: { slug: `${slug}-${n}` },
                })
            ) {
                n++;
            }
            slug = `${slug}-${n}`;
        }

        const category = await prisma.cabinetCategory.create({
            data: { name, slug, parentId },
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error("Categories POST error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri vytváraní kategórie" },
            { status: 500 }
        );
    }
}
