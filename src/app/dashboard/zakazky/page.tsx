"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Calendar, ChevronRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Job {
    id: string;
    name: string;
    description: string | null;
    status: string;
    updatedAt: string;
    _count: {
        items: number;
    };
}

export default function ZakazkyPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newJobName, setNewJobName] = useState("");
    const [newJobDesc, setNewJobDesc] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await fetch("/api/jobs");
            const data = await response.json();
            if (response.ok) {
                setJobs(data.jobs);
            }
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async () => {
        if (!newJobName.trim()) return;

        setCreating(true);
        try {
            const response = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newJobName,
                    description: newJobDesc,
                }),
            });

            if (response.ok) {
                setNewJobName("");
                setNewJobDesc("");
                setIsDialogOpen(false);
                fetchJobs(); // Refresh list
            }
        } catch (error) {
            console.error("Failed to create job", error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Zákazky</h1>
                    <p className="text-slate-600 mt-1">Správa výrobných zákaziek</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nová zákazka
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : jobs.length === 0 ? (
                <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
                    <div className="text-slate-400">
                        <Briefcase className="mx-auto h-12 w-12" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-slate-900">Žiadne zákazky</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Vytvor prvú zákazku pre začiatok práce.
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)} className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        Vytvoriť zákazku
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {jobs.map((job) => (
                        <Link
                            key={job.id}
                            href={`/dashboard/zakazky/${job.id}`}
                            className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{job.name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                                        {job.description || "Bez popisu"}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
                            </div>

                            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                                <div className="flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" />
                                    <span>{job._count.items} položiek</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(job.updatedAt).toLocaleDateString("sk-SK")}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vytvoriť novú zákazku</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Názov zákazky</Label>
                            <Input
                                id="name"
                                value={newJobName}
                                onChange={(e) => setNewJobName(e.target.value)}
                                placeholder="Napr. Kuchyňa p. Novák"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Popis (voliteľné)</Label>
                            <Textarea
                                id="description"
                                value={newJobDesc}
                                onChange={(e) => setNewJobDesc(e.target.value)}
                                placeholder="Poznámky k zákazke..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Zrušiť
                        </Button>
                        <Button onClick={handleCreateJob} disabled={!newJobName.trim() || creating}>
                            {creating ? "Vytváram..." : "Vytvoriť"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
