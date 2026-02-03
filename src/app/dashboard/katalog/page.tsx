"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileBox, Settings2, Trash2, FolderTree } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    children: Category[];
}

interface Cabinet {
    id: string;
    name: string;
    slug: string;
    baseWidth: number | null;
    baseHeight: number | null;
    baseDepth: number | null;
    createdAt: string;
    category?: { id: string; name: string } | null;
    _count: {
        files: number;
        parameters: number;
    };
}

function flattenCategories(nodes: Category[]): { id: string; label: string }[] {
    const out: { id: string; label: string }[] = [];
    function walk(ns: Category[], depth: number) {
        for (const n of ns) {
            out.push({ id: n.id, label: "—".repeat(depth) + (depth ? " " : "") + n.name });
            walk(n.children, depth + 1);
        }
    }
    walk(nodes, 0);
    return out;
}

/** Zoskupí skrinky podľa categoryId; null = bez kategórie. */
function groupCabinetsByCategory(cabinets: Cabinet[]): Map<string | null, Cabinet[]> {
    const map = new Map<string | null, Cabinet[]>();
    for (const c of cabinets) {
        const key = c.category?.id ?? null;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
    }
    return map;
}

/** Má kategória skrinky alebo má potomka, ktorý má skrinky? */
function categoryHasCabinetsOrDescendants(
    node: Category,
    groups: Map<string | null, Cabinet[]>
): boolean {
    if ((groups.get(node.id)?.length ?? 0) > 0) return true;
    return node.children.some((child) => categoryHasCabinetsOrDescendants(child, groups));
}

export default function KatalogPage() {
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [includeChildren, setIncludeChildren] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        cabinet: Cabinet | null;
        loading: boolean;
        error: string | null;
    }>({ open: false, cabinet: null, loading: false, error: null });

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/catalog/categories");
            const data = await res.json();
            if (res.ok) setCategories(data.categories);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchCabinets();
    }, [categoryFilter, includeChildren]);

    const fetchCabinets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (categoryFilter) {
                params.set("categoryId", categoryFilter);
                if (includeChildren) params.set("includeChildren", "true");
            }
            const url = params.toString() ? `/api/catalog?${params}` : "/api/catalog";
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Chyba pri načítaní katalógu");
            }

            setCabinets(data.cabinets);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Neznáma chyba");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, cabinet: Cabinet) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteDialog({ open: true, cabinet, loading: false, error: null });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.cabinet) return;
        setDeleteDialog((d) => ({ ...d, loading: true, error: null }));
        try {
            const res = await fetch(`/api/catalog/${deleteDialog.cabinet.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                setDeleteDialog((d) => ({
                    ...d,
                    loading: false,
                    error: data.error || "Chyba pri mazaní",
                }));
                return;
            }
            setDeleteDialog({ open: false, cabinet: null, loading: false, error: null });
            fetchCabinets();
        } catch (err) {
            setDeleteDialog((d) => ({
                ...d,
                loading: false,
                error: err instanceof Error ? err.message : "Neznáma chyba",
            }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Katalóg</h1>
                    <p className="text-slate-600 mt-1">
                        Správa šablón skriniek a ich parametrov
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href="/dashboard/katalog/kategorie">
                        <Button variant="outline" className="gap-2">
                            <FolderTree className="h-4 w-4" />
                            Kategórie
                        </Button>
                    </Link>
                    <Link href="/dashboard/katalog/import">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Import skrinky
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="cat-filter" className="text-sm font-medium text-slate-700">
                        Kategória:
                    </label>
                    <select
                        id="cat-filter"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="">Všetky kategórie</option>
                        {flattenCategories(categories).map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>
                {categoryFilter ? (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={includeChildren}
                            onChange={(e) => setIncludeChildren(e.target.checked)}
                        />
                        Vrátane podkategórií
                    </label>
                ) : null}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            ) : cabinets.length === 0 ? (
                <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
                    <div className="text-slate-400">
                        <FileBox className="mx-auto h-12 w-12" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-slate-900">
                        Katalóg je prázdny
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Začni importovaním prvej skrinky z priečinka.
                    </p>
                    <Link href="/dashboard/katalog/import">
                        <Button className="mt-4 gap-2">
                            <Plus className="h-4 w-4" />
                            Import skrinky
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {(() => {
                        const groups = groupCabinetsByCategory(cabinets);

                        function renderCabinetCard(cabinet: Cabinet) {
                            return (
                                <div
                                    key={cabinet.id}
                                    className="group relative rounded-lg border bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                                >
                                    <Link
                                        href={`/dashboard/katalog/${cabinet.slug}`}
                                        className="block pr-12"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                                                    <FileBox className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">
                                                        {cabinet.name}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">
                                                        {cabinet._count.files} súborov
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <Settings2 className="h-4 w-4" />
                                                <span>{cabinet._count.parameters} parametrov</span>
                                            </div>
                                            {cabinet.baseWidth && cabinet.baseHeight && (
                                                <span>
                                                    {cabinet.baseWidth} × {cabinet.baseHeight} mm
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={(e) => handleDeleteClick(e, cabinet)}
                                        title="Zmazať"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        }

                        function renderCategorySection(
                            node: Category,
                            nested: boolean
                        ): React.ReactNode {
                            const list = groups.get(node.id) ?? [];
                            const hasChildren = node.children.some((child) =>
                                categoryHasCabinetsOrDescendants(child, groups)
                            );
                            const showSection = list.length > 0 || hasChildren;
                            if (!showSection) return null;

                            const boxClass = nested
                                ? "rounded-lg border border-slate-200 bg-white p-4 mt-4 ml-4 shadow-sm"
                                : "rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm";

                            return (
                                <section key={node.id} className={boxClass}>
                                    <h2
                                        className={
                                            nested
                                                ? "mb-3 flex items-center gap-2 text-base font-semibold text-slate-700"
                                                : "mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800"
                                        }
                                    >
                                        <FolderTree className="h-4 w-4 text-slate-500" />
                                        {node.name}
                                        {list.length > 0 && (
                                            <span className="ml-2 text-sm font-normal text-slate-500">
                                                ({list.length}{" "}
                                                {list.length === 1
                                                    ? "skrinka"
                                                    : list.length < 5
                                                        ? "skrinky"
                                                        : "skriniek"})
                                            </span>
                                        )}
                                    </h2>
                                    {list.length > 0 && (
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {list.map(renderCabinetCard)}
                                        </div>
                                    )}
                                    {node.children
                                        .filter((child) =>
                                            categoryHasCabinetsOrDescendants(child, groups)
                                        )
                                        .map((child) => (
                                            <div key={child.id}>
                                                {renderCategorySection(child, true)}
                                            </div>
                                        ))}
                                </section>
                            );
                        }

                        const uncategorized = groups.get(null) ?? [];
                        return (
                            <>
                                {categories.map((node) => renderCategorySection(node, false))}
                                {uncategorized.length > 0 && (
                                    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
                                        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                                            <FolderTree className="h-5 w-5 text-slate-500" />
                                            Bez kategórie
                                            <span className="ml-2 text-sm font-normal text-slate-500">
                                                ({uncategorized.length}{" "}
                                                {uncategorized.length === 1
                                                    ? "skrinka"
                                                    : uncategorized.length < 5
                                                        ? "skrinky"
                                                        : "skriniek"})
                                            </span>
                                        </h2>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {uncategorized.map(renderCabinetCard)}
                                        </div>
                                    </section>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            <Dialog
                open={deleteDialog.open}
                onOpenChange={(open) =>
                    !deleteDialog.loading &&
                    setDeleteDialog((d) => ({ ...d, open, error: null }))
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zmazať skrinku</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-600">
                        Naozaj chcete zmazať skrinku{" "}
                        <strong>{deleteDialog.cabinet?.name}</strong>? Táto akcia je
                        nezvratná.
                    </p>
                    {deleteDialog.error && (
                        <p className="text-sm text-red-600">{deleteDialog.error}</p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setDeleteDialog({ open: false, cabinet: null, loading: false, error: null })
                            }
                            disabled={deleteDialog.loading}
                        >
                            Zrušiť
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteDialog.loading}
                        >
                            {deleteDialog.loading ? "Mažem..." : "Zmazať"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
