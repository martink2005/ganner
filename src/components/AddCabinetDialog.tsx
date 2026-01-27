"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Search, Package, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Cabinet {
    id: string;
    name: string;
    baseWidth: number | null;
    baseHeight: number | null;
    baseDepth: number | null;
    _count: {
        parameters: number;
    };
}

interface AddCabinetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (cabinetId: string) => Promise<void>;
}

export function AddCabinetDialog({
    open,
    onOpenChange,
    onAdd,
}: AddCabinetDialogProps) {
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [addingId, setAddingId] = useState<string | null>(null);

    useEffect(() => {
        if (open && cabinets.length === 0) {
            fetchCabinets();
        }
    }, [open]);

    const fetchCabinets = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/catalog");
            const data = await res.json();
            setCabinets(data.cabinets);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCabinets = cabinets.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = async (id: string) => {
        setAddingId(id);
        await onAdd(id);
        setAddingId(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Pridať skrinku do zákazky</DialogTitle>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Hľadať v katalógu..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Načítavam...</div>
                    ) : filteredCabinets.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Žiadne skrinky nenájdené
                        </div>
                    ) : (
                        filteredCabinets.map((cabinet) => (
                            <div
                                key={cabinet.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded text-blue-600">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-slate-900">
                                            {cabinet.name}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {cabinet.baseWidth} x {cabinet.baseHeight} x{" "}
                                            {cabinet.baseDepth} mm • {cabinet._count.parameters}{" "}
                                            parametrov
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleAdd(cabinet.id)}
                                    disabled={addingId !== null}
                                >
                                    {addingId === cabinet.id ? "Pridávam..." : "Pridať"}
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Zatvoriť
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
