import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slugFromName, getDescendantIds } from "@/lib/category-utils";

/**
 * PATCH /api/catalog/categories/[id] – úprava kategórie.
 * Telo: { name?: string, parentId?: string | null }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();

        const category = await prisma.cabinetCategory.findUnique({
            where: { id },
        });
        if (!category) {
            return NextResponse.json(
                { error: "Kategória neexistuje" },
                { status: 404 }
            );
        }

        const data: { name?: string; slug?: string; parentId?: string | null } =
            {};

        if (typeof body.name === "string") {
            const name = body.name.trim();
            if (!name) {
                return NextResponse.json(
                    { error: "Názov kategórie nemôže byť prázdny" },
                    { status: 400 }
                );
            }
            data.name = name;
            let slug = slugFromName(name);
            const existing = await prisma.cabinetCategory.findFirst({
                where: { slug, id: { not: id } },
            });
            if (existing) {
                let n = 1;
                while (
                    await prisma.cabinetCategory.findFirst({
                        where: { slug: `${slug}-${n}`, id: { not: id } },
                    })
                ) {
                    n++;
                }
                slug = `${slug}-${n}`;
            }
            data.slug = slug;
        }

        if (body.parentId !== undefined) {
            const newParentId =
                body.parentId === null || body.parentId === ""
                    ? null
                    : String(body.parentId);

            if (newParentId === id) {
                return NextResponse.json(
                    { error: "Kategória nemôže byť rodičom sama seba" },
                    { status: 400 }
                );
            }
            if (newParentId) {
                const allCategories = await prisma.cabinetCategory.findMany();
                const descendants = getDescendantIds(id, allCategories);
                if (descendants.includes(newParentId)) {
                    return NextResponse.json(
                        {
                            error:
                                "Kategória nemôže byť presunutá pod svoju podkategóriu",
                        },
                        { status: 400 }
                    );
                }
                const parent = await prisma.cabinetCategory.findUnique({
                    where: { id: newParentId },
                });
                if (!parent) {
                    return NextResponse.json(
                        { error: "Nadradená kategória neexistuje" },
                        { status: 400 }
                    );
                }
            }
            data.parentId = newParentId;
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json(category);
        }

        const updated = await prisma.cabinetCategory.update({
            where: { id },
            data,
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Category PATCH error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri ukladaní kategórie" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/catalog/categories/[id] – zmazanie kategórie.
 * Nemožné ak má podkategórie alebo priradené skrinky.
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        const category = await prisma.cabinetCategory.findUnique({
            where: { id },
            include: {
                children: true,
                cabinets: { take: 1 },
            },
        });

        if (!category) {
            return NextResponse.json(
                { error: "Kategória neexistuje" },
                { status: 404 }
            );
        }

        if (category.children.length > 0) {
            return NextResponse.json(
                { error: "Kategória má podkategórie. Najprv ich zmažte alebo presuňte." },
                { status: 400 }
            );
        }

        if (category.cabinets.length > 0) {
            return NextResponse.json(
                {
                    error:
                        "Kategória obsahuje skrinky. Odstráňte kategóriu zo skriniek alebo presuňte skrinky do inej kategórie.",
                },
                { status: 400 }
            );
        }

        await prisma.cabinetCategory.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Category DELETE error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri mazaní kategórie" },
            { status: 500 }
        );
    }
}
