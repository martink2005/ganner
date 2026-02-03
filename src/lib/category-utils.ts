/**
 * Pomocné funkcie pre kategórie skriniek (slug, strom).
 */

import type { CabinetCategory } from "@prisma/client";

/**
 * Vytvorí slug z názvu (normalizácia pre URL).
 */
export function slugFromName(name: string): string {
    const base = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return base || "kategoria";
}

export type CategoryTreeNode = {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    children: CategoryTreeNode[];
};

/**
 * Zostaví rekurzívny strom z plochého zoznamu kategórií.
 */
export function buildCategoryTree(categories: CabinetCategory[]): CategoryTreeNode[] {
    const byId = new Map<string, CabinetCategory>(categories.map((c) => [c.id, c]));
    const roots: CategoryTreeNode[] = [];

    function toNode(cat: CabinetCategory): CategoryTreeNode {
        const children = categories
            .filter((c) => c.parentId === cat.id)
            .map((c) => toNode(c));
        return {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentId,
            children,
        };
    }

    for (const cat of categories) {
        if (cat.parentId === null) {
            roots.push(toNode(cat));
        }
    }
    return roots;
}

/**
 * Získa všetky ID potomkov danej kategórie (rekurzívne).
 */
export function getDescendantIds(
    categoryId: string,
    categories: { id: string; parentId: string | null }[]
): string[] {
    const result: string[] = [];
    const queue = [categoryId];
    while (queue.length > 0) {
        const id = queue.shift()!;
        for (const c of categories) {
            if (c.parentId === id) {
                result.push(c.id);
                queue.push(c.id);
            }
        }
    }
    return result;
}
