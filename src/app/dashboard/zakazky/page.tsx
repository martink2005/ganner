"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Calendar, Pencil, Trash2 } from "lucide-react";
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
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        job: Job | null;
        loading: boolean;
        error: string | null;
    }>({ open: false, job: null, loading: false, error: null });
    const [editDialog, setEditDialog] = useState<{
        open: boolean;
        job: Job | null;
        name: string;
        description: string;
        loading: boolean;
        error: string | null;
    }>({ open: false, job: null, name: "", description: "", loading: false, error: null });

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

    const handleDeleteClick = (e: React.MouseEvent, job: Job) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteDialog({ open: true, job, loading: false, error: null });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.job) return;
        setDeleteDialog((d) => ({ ...d, loading: true, error: null }));
        try {
            const res = await fetch(`/api/jobs/${deleteDialog.job.id}`, {
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
            setDeleteDialog({ open: false, job: null, loading: false, error: null });
            fetchJobs();
        } catch (err) {
            setDeleteDialog((d) => ({
                ...d,
                loading: false,
                error: err instanceof Error ? err.message : "Neznáma chyba",
            }));
        }
    };

    const handleEditClick = (e: React.MouseEvent, job: Job) => {
        e.preventDefault();
        e.stopPropagation();
        setEditDialog({
            open: true,
            job,
            name: job.name,
            description: job.description || "",
            loading: false,
            error: null,
        });
    };

    const handleEditSave = async () => {
        if (!editDialog.job || !editDialog.name.trim()) return;
        setEditDialog((d) => ({ ...d, loading: true, error: null }));
        try {
            const res = await fetch(`/api/jobs/${editDialog.job.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editDialog.name.trim(),
                    description: editDialog.description,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setEditDialog((d) => ({
                    ...d,
                    loading: false,
                    error: data.error || "Chyba pri úprave",
                }));
                return;
            }
            setEditDialog({
                open: false,
                job: null,
                name: "",
                description: "",
                loading: false,
                error: null,
            });
            fetchJobs();
        } catch (err) {
            setEditDialog((d) => ({
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
                        <div
                            key={job.id}
                            className="group relative rounded-lg border bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                        >
                            <Link
                                href={`/dashboard/zakazky/${job.id}`}
                                className="block pr-20"
                            >
                                <div>
                                    <h3 className="font-semibold text-slate-900">{job.name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                                        {job.description || "Bez popisu"}
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
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
                            <div className="absolute right-2 top-2 flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={(e) => handleEditClick(e, job)}
                                    title="Upraviť"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => handleDeleteClick(e, job)}
                                    title="Zmazať"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
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

            <Dialog
                open={deleteDialog.open}
                onOpenChange={(open) =>
                    !deleteDialog.loading &&
                    setDeleteDialog((d) => ({ ...d, open, error: null }))
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zmazať zákazku</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-600">
                        Naozaj chcete zmazať zákazku{" "}
                        <strong>{deleteDialog.job?.name}</strong>? Všetky položky zákazky budú vymazané.
                    </p>
                    {deleteDialog.error && (
                        <p className="text-sm text-red-600">{deleteDialog.error}</p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setDeleteDialog({ open: false, job: null, loading: false, error: null })
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

            <Dialog
                open={editDialog.open}
                onOpenChange={(open) =>
                    !editDialog.loading &&
                    setEditDialog((d) => ({ ...d, open, error: null }))
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upraviť zákazku</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Názov zákazky</Label>
                            <Input
                                id="edit-name"
                                value={editDialog.name}
                                onChange={(e) =>
                                    setEditDialog((d) => ({ ...d, name: e.target.value }))
                                }
                                placeholder="Napr. Kuchyňa p. Novák"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Popis (voliteľné)</Label>
                            <Textarea
                                id="edit-description"
                                value={editDialog.description}
                                onChange={(e) =>
                                    setEditDialog((d) => ({ ...d, description: e.target.value }))
                                }
                                placeholder="Poznámky k zákazke..."
                            />
                        </div>
                        {editDialog.error && (
                            <p className="text-sm text-red-600">{editDialog.error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setEditDialog({
                                    open: false,
                                    job: null,
                                    name: "",
                                    description: "",
                                    loading: false,
                                    error: null,
                                })
                            }
                            disabled={editDialog.loading}
                        >
                            Zrušiť
                        </Button>
                        <Button
                            onClick={handleEditSave}
                            disabled={!editDialog.name.trim() || editDialog.loading}
                        >
                            {editDialog.loading ? "Ukladám..." : "Uložiť"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
