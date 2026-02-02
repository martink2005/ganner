"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";

interface ParameterValue {
    paramName: string;
    value: string;
}

interface JobItem {
    id: string;
    name: string;
    width: number | null;
    height: number | null;
    depth: number | null;
    quantity: number;
    outputStatus: string;
    cabinet: {
        name: string;
        parameters: {
            paramName: string;
            label: string;
            unit?: string | null;
        }[];
    };
    parameterValues: ParameterValue[];
}

interface ItemDetailClientProps {
    initialItem: JobItem;
    jobId: string;
}

export function ItemDetailClient({ initialItem, jobId }: ItemDetailClientProps) {
    const router = useRouter();
    const [item, setItem] = useState(initialItem);
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // State pre základné údaje
    const [name, setName] = useState(item.name);
    const [width, setWidth] = useState(item.width?.toString() || "");
    const [height, setHeight] = useState(item.height?.toString() || "");
    const [depth, setDepth] = useState(item.depth?.toString() || "");
    const [quantity, setQuantity] = useState(String(item.quantity ?? 1));

    // State pre parametre (mapa pre rýchly prístup)
    const [params, setParams] = useState<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        item.parameterValues.forEach(p => {
            map[p.paramName] = p.value;
        });
        return map;
    });

    const handleParamChange = (key: string, value: string) => {
        setParams(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async () => {
        setSaveError(null);
        const qtyNum = Math.floor(Number(quantity));
        if (!Number.isFinite(qtyNum) || qtyNum < 1) {
            setSaveError("Množstvo musí byť aspoň 1 ks");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`/api/jobs/items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    width: parseFloat(width) || null,
                    height: parseFloat(height) || null,
                    depth: parseFloat(depth) || null,
                    quantity: qtyNum,
                    parameters: params
                })
            });

            if (response.ok) {
                router.push(`/dashboard/zakazky/${jobId}`);
                router.refresh();
            } else {
                const data = await response.json().catch(() => ({}));
                setSaveError(data.error ?? "Nepodarilo sa uložiť");
            }
        } catch (error) {
            console.error("Failed to save item", error);
            setSaveError("Nastala chyba pri ukladaní");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/zakazky/${jobId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Upraviť skrinku: {item.name}
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Typ: {item.cabinet.name}
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Ľavý stĺpec - Základné údaje */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg">Základné údaje</h3>
                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="name">Názov v zákazke</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">
                                Unikátny názov priečinka (napr. Skrinka_1)
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-2">
                                <Label htmlFor="width">Šírka</Label>
                                <Input
                                    id="width"
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">Výška</Label>
                                <Input
                                    id="height"
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="depth">Hĺbka</Label>
                                <Input
                                    id="depth"
                                    value={depth}
                                    onChange={e => setDepth(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity">Množstvo</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min={1}
                                step={1}
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">
                                Evidencia počtu kusov (min. 1)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pravý stĺpec - Parametre */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <h3 className="font-semibold text-lg">Technické parametre</h3>
                        <p className="text-xs text-slate-500">
                            Offset (X_C_Y, Y_C_X) a hrubka (HRUB) sú špecifické pre každý dielec a čítajú sa z .ganx súborov; tu nie sú editovateľné.
                        </p>
                        <Separator />
                        <div className="grid gap-4 sm:grid-cols-2">
                            {item.parameterValues.map((p) => {
                                const def = item.cabinet.parameters?.find(d => d.paramName === p.paramName);
                                const hasNote = def?.label && def.label.trim() !== "";
                                return (
                                    <div key={p.paramName} className="space-y-2">
                                        <Label htmlFor={p.paramName} className="block">
                                            <span className="font-medium text-slate-900">{p.paramName}</span>
                                            {hasNote && (
                                                <span className="ml-2 text-xs font-normal text-slate-500">
                                                    {def.label}
                                                </span>
                                            )}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id={p.paramName}
                                                value={params[p.paramName] || ""}
                                                onChange={e => handleParamChange(p.paramName, e.target.value)}
                                                className="font-mono"
                                            />
                                            {def?.unit && (
                                                <span className="text-sm text-slate-500 shrink-0">{def.unit}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {saveError}
                </div>
            )}

            <div className="fixed bottom-0 right-0 left-0 lg:left-64 p-4 bg-white border-t flex justify-end gap-2 z-40">
                <Link href={`/dashboard/zakazky/${jobId}`}>
                    <Button variant="outline">Zrušiť</Button>
                </Link>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Uložiť a prepočítať
                </Button>
            </div>
        </div>
    );
}
