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
import { Label } from "@/components/ui/label";

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

export type AddCabinetPayload = {
    cabinetId: string;
    width?: number;
    height?: number;
    depth?: number;
    quantity: number;
};

interface AddCabinetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (payload: AddCabinetPayload) => Promise<void>;
}

function parseDimension(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const n = parseFloat(trimmed.replace(",", "."));
    if (Number.isNaN(n) || n <= 0) return undefined;
    return n;
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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [formValues, setFormValues] = useState({
        width: "",
        height: "",
        depth: "",
        quantity: "1",
    });
    const [formError, setFormError] = useState<string | null>(null);

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

    const openForm = (cabinet: Cabinet) => {
        setExpandedId(cabinet.id);
        setFormValues({
            width: cabinet.baseWidth != null ? String(cabinet.baseWidth) : "",
            height: cabinet.baseHeight != null ? String(cabinet.baseHeight) : "",
            depth: cabinet.baseDepth != null ? String(cabinet.baseDepth) : "",
            quantity: "1",
        });
        setFormError(null);
    };

    const closeForm = () => {
        setExpandedId(null);
        setFormError(null);
    };

    const handleSubmit = async (cabinetId: string) => {
        setFormError(null);
        const quantityNum = Math.max(1, Math.floor(Number(formValues.quantity)) || 1);
        const w = parseDimension(formValues.width);
        const h = parseDimension(formValues.height);
        const d = parseDimension(formValues.depth);

        const hasAnyDim = formValues.width.trim() !== "" || formValues.height.trim() !== "" || formValues.depth.trim() !== "";
        if (hasAnyDim) {
            if (formValues.width.trim() !== "" && w === undefined) {
                setFormError("Šírka musí byť kladné číslo (mm).");
                return;
            }
            if (formValues.height.trim() !== "" && h === undefined) {
                setFormError("Výška musí byť kladné číslo (mm).");
                return;
            }
            if (formValues.depth.trim() !== "" && d === undefined) {
                setFormError("Hĺbka musí byť kladné číslo (mm).");
                return;
            }
        }

        setAddingId(cabinetId);
        try {
            await onAdd({
                cabinetId,
                width: w,
                height: h,
                depth: d,
                quantity: quantityNum,
            });
            closeForm();
            onOpenChange(false);
        } finally {
            setAddingId(null);
        }
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
                                className="border rounded-lg overflow-hidden hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-center justify-between p-3">
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
                                    {expandedId === cabinet.id ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={closeForm}
                                            disabled={addingId !== null}
                                        >
                                            Zrušiť
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => openForm(cabinet)}
                                            disabled={addingId !== null}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Pridať
                                        </Button>
                                    )}
                                </div>
                                {expandedId === cabinet.id && (
                                    <div className="border-t bg-slate-50/80 p-4 space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="width">Šírka (mm)</Label>
                                                <Input
                                                    id="width"
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={cabinet.baseWidth != null ? String(cabinet.baseWidth) : ""}
                                                    value={formValues.width}
                                                    onChange={(e) =>
                                                        setFormValues((v) => ({ ...v, width: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="height">Výška (mm)</Label>
                                                <Input
                                                    id="height"
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={cabinet.baseHeight != null ? String(cabinet.baseHeight) : ""}
                                                    value={formValues.height}
                                                    onChange={(e) =>
                                                        setFormValues((v) => ({ ...v, height: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="depth">Hĺbka (mm)</Label>
                                                <Input
                                                    id="depth"
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={cabinet.baseDepth != null ? String(cabinet.baseDepth) : ""}
                                                    value={formValues.depth}
                                                    onChange={(e) =>
                                                        setFormValues((v) => ({ ...v, depth: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="quantity">Množstvo</Label>
                                                <Input
                                                    id="quantity"
                                                    type="number"
                                                    min={1}
                                                    value={formValues.quantity}
                                                    onChange={(e) =>
                                                        setFormValues((v) => ({ ...v, quantity: e.target.value }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        {formError && (
                                            <p className="text-sm text-red-600">{formError}</p>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={() => handleSubmit(cabinet.id)}
                                            disabled={addingId !== null}
                                        >
                                            {addingId === cabinet.id
                                                ? "Pridávam..."
                                                : "Pridať do zákazky"}
                                        </Button>
                                    </div>
                                )}
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
