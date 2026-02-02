"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileBox, Settings2, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface Cabinet {
    id: string;
    name: string;
    slug: string;
    baseWidth: number | null;
    baseHeight: number | null;
    baseDepth: number | null;
    createdAt: string;
    _count: {
        files: number;
        parameters: number;
    };
}

export default function KatalogPage() {
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        cabinet: Cabinet | null;
        loading: boolean;
        error: string | null;
    }>({ open: false, cabinet: null, loading: false, error: null });

    useEffect(() => {
        fetchCabinets();
    }, []);

    const fetchCabinets = async () => {
        try {
            const response = await fetch("/api/catalog");
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Katalóg</h1>
                    <p className="text-slate-600 mt-1">
                        Správa šablón skriniek a ich parametrov
                    </p>
                </div>
                <Link href="/dashboard/katalog/import">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Import skrinky
                    </Button>
                </Link>
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cabinets.map((cabinet) => (
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
                    ))}
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
