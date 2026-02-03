"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, FolderTree, Plus, Pencil, Trash2 } from "lucide-react";

interface CategoryNode {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    children: CategoryNode[];
}

export default function KategoriePage() {
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addDialog, setAddDialog] = useState<{
        open: boolean;
        name: string;
        parentId: string | null;
        saving: boolean;
        error: string | null;
    }>({ open: false, name: "", parentId: null, saving: false, error: null });
    const [editDialog, setEditDialog] = useState<{
        open: boolean;
        id: string;
        name: string;
        saving: boolean;
        error: string | null;
    }>({ open: false, id: "", name: "", saving: false, error: null });
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        id: string;
        name: string;
        loading: boolean;
        error: string | null;
    }>({ open: false, id: "", name: "", loading: false, error: null });

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/catalog/categories");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Chyba pri načítaní");
            setTree(data.categories);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Neznáma chyba");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAdd = async () => {
        const name = addDialog.name.trim();
        if (!name) {
            setAddDialog((d) => ({ ...d, error: "Názov je povinný" }));
            return;
        }
        setAddDialog((d) => ({ ...d, saving: true, error: null }));
        try {
            const res = await fetch("/api/catalog/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, parentId: addDialog.parentId || null }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAddDialog((d) => ({ ...d, saving: false, error: data.error || "Chyba" }));
                return;
            }
            setAddDialog({ open: false, name: "", parentId: null, saving: false, error: null });
            fetchCategories();
        } catch (err) {
            setAddDialog((d) => ({
                ...d,
                saving: false,
                error: err instanceof Error ? err.message : "Chyba",
            }));
        }
    };

    const handleEdit = async () => {
        const name = editDialog.name.trim();
        if (!name) {
            setEditDialog((d) => ({ ...d, error: "Názov je povinný" }));
            return;
        }
        setEditDialog((d) => ({ ...d, saving: true, error: null }));
        try {
            const res = await fetch(`/api/catalog/categories/${editDialog.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEditDialog((d) => ({ ...d, saving: false, error: data.error || "Chyba" }));
                return;
            }
            setEditDialog({ open: false, id: "", name: "", saving: false, error: null });
            fetchCategories();
        } catch (err) {
            setEditDialog((d) => ({
                ...d,
                saving: false,
                error: err instanceof Error ? err.message : "Chyba",
            }));
        }
    };

    const handleDeleteConfirm = async () => {
        setDeleteDialog((d) => ({ ...d, loading: true, error: null }));
        try {
            const res = await fetch(`/api/catalog/categories/${deleteDialog.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                setDeleteDialog((d) => ({
                    ...d,
                    loading: false,
                    error: data.error || "Chyba",
                }));
                return;
            }
            setDeleteDialog({ open: false, id: "", name: "", loading: false, error: null });
            fetchCategories();
        } catch (err) {
            setDeleteDialog((d) => ({
                ...d,
                loading: false,
                error: err instanceof Error ? err.message : "Chyba",
            }));
        }
    };

    function flattenForSelect(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
        const out: { id: string; label: string }[] = [];
        for (const n of nodes) {
            out.push({ id: n.id, label: "—".repeat(depth) + (depth ? " " : "") + n.name });
            out.push(...flattenForSelect(n.children, depth + 1));
        }
        return out;
    }

    const flatOptions = flattenForSelect(tree);

    function CategoryRow({ node, depth = 0 }: { node: CategoryNode; depth?: number }) {
        return (
            <>
                <div key={node.id} className="flex items-center gap-2 py-1.5 px-4 border-b border-slate-100 last:border-0">
                    <div style={{ marginLeft: depth * 20 }} className="flex items-center gap-3 min-w-0 flex-1">
                        <FolderTree className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-900 truncate">{node.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600"
                            onClick={() => setEditDialog({ open: true, id: node.id, name: node.name, saving: false, error: null })}
                            title="Upraviť"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                            onClick={() => setDeleteDialog({ open: true, id: node.id, name: node.name, loading: false, error: null })}
                            title="Zmazať"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {node.children.map((child) => (
                    <CategoryRow key={child.id} node={child} depth={depth + 1} />
                ))}
            </>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/katalog">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Kategórie skriniek</h1>
                    <p className="text-slate-600 mt-1">
                        Rekurzívne kategórie pre zoradenie skriniek v katalógu. Filtrovanie podľa kategórie je na stránke Katalóg.
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    className="gap-2"
                    onClick={() => setAddDialog({ open: true, name: "", parentId: null, saving: false, error: null })}
                >
                    <Plus className="h-4 w-4" />
                    Pridať kategóriu
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
            ) : tree.length === 0 ? (
                <div className="rounded-lg border bg-white p-8 text-center text-slate-600">
                    Žiadne kategórie. Pridajte prvú kategóriu tlačidlom vyššie.
                </div>
            ) : (
                <div className="rounded-lg border bg-white divide-y">
                    {tree.map((node) => (
                        <CategoryRow key={node.id} node={node} />
                    ))}
                </div>
            )}

            {/* Dialóg Pridať kategóriu */}
            <Dialog open={addDialog.open} onOpenChange={(open) => !addDialog.saving && setAddDialog((d) => ({ ...d, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pridať kategóriu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="add-name">Názov</Label>
                            <Input
                                id="add-name"
                                value={addDialog.name}
                                onChange={(e) => setAddDialog((d) => ({ ...d, name: e.target.value }))}
                                placeholder="Názov kategórie"
                            />
                        </div>
                        <div>
                            <Label htmlFor="add-parent">Nadradená kategória (voliteľné)</Label>
                            <select
                                id="add-parent"
                                className="w-full mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                value={addDialog.parentId ?? ""}
                                onChange={(e) =>
                                    setAddDialog((d) => ({
                                        ...d,
                                        parentId: e.target.value || null,
                                    }))
                                }
                            >
                                <option value="">— Žiadna (koreň) —</option>
                                {flatOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {addDialog.error && <p className="text-sm text-red-600">{addDialog.error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialog((d) => ({ ...d, open: false }))} disabled={addDialog.saving}>
                            Zrušiť
                        </Button>
                        <Button onClick={handleAdd} disabled={addDialog.saving}>
                            {addDialog.saving ? "Ukladám…" : "Pridať"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialóg Upraviť kategóriu */}
            <Dialog open={editDialog.open} onOpenChange={(open) => !editDialog.saving && setEditDialog((d) => ({ ...d, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upraviť kategóriu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Názov</Label>
                            <Input
                                id="edit-name"
                                value={editDialog.name}
                                onChange={(e) => setEditDialog((d) => ({ ...d, name: e.target.value }))}
                                placeholder="Názov kategórie"
                            />
                        </div>
                        {editDialog.error && <p className="text-sm text-red-600">{editDialog.error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialog((d) => ({ ...d, open: false }))} disabled={editDialog.saving}>
                            Zrušiť
                        </Button>
                        <Button onClick={handleEdit} disabled={editDialog.saving}>
                            {editDialog.saving ? "Ukladám…" : "Uložiť"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialóg Zmazať kategóriu */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => !deleteDialog.loading && setDeleteDialog((d) => ({ ...d, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zmazať kategóriu</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-600">
                        Naozaj chcete zmazať kategóriu <strong>{deleteDialog.name}</strong>? Kategória nesmie mať podkategórie ani priradené skrinky.
                    </p>
                    {deleteDialog.error && <p className="text-sm text-red-600">{deleteDialog.error}</p>}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialog({ open: false, id: "", name: "", loading: false, error: null })}
                            disabled={deleteDialog.loading}
                        >
                            Zrušiť
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteDialog.loading}>
                            {deleteDialog.loading ? "Mažem…" : "Zmazať"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
