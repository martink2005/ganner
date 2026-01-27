"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddCabinetDialog } from "@/components/AddCabinetDialog";
import { Package, Plus, AlertCircle, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

interface Job {
    id: string;
    name: string;
    description: string | null;
    items: JobItem[];
}

interface JobItem {
    id: string;
    name: string;
    cabinet: {
        name: string;
    };
    quantity: number;
    width: number | null;
    height: number | null;
    depth: number | null;
    outputStatus: string;
}

interface JobDetailClientProps {
    initialJob: Job;
}

export function JobDetailClient({ initialJob }: JobDetailClientProps) {
    const router = useRouter();
    const [job, setJob] = useState(initialJob);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const refreshJob = async () => {
        const res = await fetch(`/api/jobs/${job.id}`);
        if (res.ok) {
            const data = await res.json();
            setJob(data.job);
            router.refresh(); // Refresh server components cache
        }
    };

    // Auto-refresh ak je nejaký item v stave "generating"
    useEffect(() => {
        const isGenerating = job.items.some(
            (item) => item.outputStatus === "generating"
        );

        if (isGenerating) {
            const timer = setInterval(() => {
                refreshJob();
            }, 3000); // Check every 3 seconds

            return () => clearInterval(timer);
        }
    }, [job]); // Re-run when job state changes

    const handleAddCabinet = async (cabinetId: string) => {
        try {
            const res = await fetch(`/api/jobs/${job.id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cabinetId }),
            });

            if (res.ok) {
                // Refresh job data
                refreshJob();
            }
        } catch (err) {
            console.error("Failed to add cabinet", err);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!confirm("Naozaj chcete odstrániť túto skrinku?")) return;

        try {
            const res = await fetch(`/api/jobs/items/${itemId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                refreshJob();
            }
        } catch (err) {
            console.error("Failed to delete item", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{job.name}</h1>
                    <p className="text-slate-600 mt-1">{job.description || "Zákazka"}</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/zakazky">
                        <Button variant="outline">Späť</Button>
                    </Link>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Pridať skrinku
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {job.items.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-slate-50 text-slate-500">
                        Zákazka neobsahuje žiadne skrinky. Pridajte prvú skrinku.
                    </div>
                ) : (
                    job.items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:border-blue-300 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        {item.name}
                                    </h3>
                                    <div className="text-sm text-slate-500 flex gap-2">
                                        <span>{item.cabinet.name}</span>
                                        <span>•</span>
                                        <span>{item.width} x {item.height} x {item.depth} mm</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <StatusBadge status={item.outputStatus} />

                                <div className="flex gap-2">
                                    <Link href={`/dashboard/zakazky/${job.id}/item/${item.id}`}>
                                        <Button variant="outline" size="sm">
                                            Upraviť
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        Zmazať
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AddCabinetDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onAdd={handleAddCabinet}
            />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "generated") {
        return (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" />
                Vygenerované
            </div>
        );
    }
    if (status === "generating") {
        return (
            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3 animate-spin" />
                Generujem...
            </div>
        );
    }
    if (status === "error") {
        return (
            <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Chyba
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            Čaká
        </div>
    );
}
