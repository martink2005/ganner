"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileBox, Settings2, ChevronRight } from "lucide-react";

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
                        <Link
                            key={cabinet.id}
                            href={`/dashboard/katalog/${cabinet.slug}`}
                            className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
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
                                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
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
                    ))}
                </div>
            )}
        </div>
    );
}
