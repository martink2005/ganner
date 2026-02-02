"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";

interface ParameterValue {
    paramName: string;
    value: string;
}

interface ParamDef {
    paramName: string;
    label: string;
    paramType?: string;
    unit?: string | null;
    group?: { id: string; name: string; sortOrder: number } | null;
}

interface CabinetFileDef {
    id: string;
    filename: string;
    quantity?: number;
}

interface FileQuantityDef {
    fileId: string;
    quantity: number;
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
        parameters: ParamDef[];
        parameterGroups?: { id: string; name: string; sortOrder: number }[];
        files?: CabinetFileDef[];
    };
    parameterValues: ParameterValue[];
    fileQuantities?: FileQuantityDef[];
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

    // Množstvo pre každý dielec: fileId -> quantity (default z fileQuantities alebo cabinet.files.quantity alebo 1)
    const getDefaultFileQuantities = (): Record<string, number> => {
        const files = item.cabinet.files ?? [];
        const map: Record<string, number> = {};
        for (const f of files) {
            const fq = item.fileQuantities?.find((q) => q.fileId === f.id);
            map[f.id] = Math.max(1, fq?.quantity ?? (f as { quantity?: number }).quantity ?? 1);
        }
        return map;
    };
    const [fileQuantities, setFileQuantities] = useState<Record<string, number>>(getDefaultFileQuantities);

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
            const files = item.cabinet.files ?? [];
            const fileQuantitiesPayload = files.map((f) => ({
                fileId: f.id,
                quantity: Math.max(1, Math.floor(fileQuantities[f.id] ?? 1)),
            }));

            const response = await fetch(`/api/jobs/items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    width: parseFloat(width) || null,
                    height: parseFloat(height) || null,
                    depth: parseFloat(depth) || null,
                    quantity: qtyNum,
                    parameters: params,
                    fileQuantities: fileQuantitiesPayload.length > 0 ? fileQuantitiesPayload : undefined,
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
                                <Label htmlFor="width">
                                    Šírka{" "}
                                    <span className="text-xs font-normal text-slate-500">
                                        – X
                                    </span>
                                </Label>
                                <Input
                                    id="width"
                                    value={width}
                                    onChange={e => setWidth(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">
                                    Výška{" "}
                                    <span className="text-xs font-normal text-slate-500">
                                        – Y
                                    </span>
                                </Label>
                                <Input
                                    id="height"
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="depth">
                                    Hĺbka{" "}
                                    <span className="text-xs font-normal text-slate-500">
                                        – Z
                                    </span>
                                </Label>
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

                        {(item.cabinet.files?.length ?? 0) > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-slate-900">Množstvá dielcov</h3>
                                    <p className="text-xs text-slate-500">
                                        Počet kusov každého dielca (programu) v tejto skrinke.
                                    </p>
                                    <div className="space-y-2">
                                        {(item.cabinet.files ?? []).map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between gap-3"
                                            >
                                                <Label
                                                    htmlFor={`file-qty-${file.id}`}
                                                    className="text-sm font-medium text-slate-700 shrink-0 min-w-0 truncate"
                                                    title={file.filename}
                                                >
                                                    {file.filename}
                                                </Label>
                                                <Input
                                                    id={`file-qty-${file.id}`}
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    className="w-20"
                                                    value={fileQuantities[file.id] ?? 1}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        const n = v === "" ? 1 : Math.max(1, Math.floor(Number(v)));
                                                        setFileQuantities((prev) => ({ ...prev, [file.id]: n }));
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
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
                        {(() => {
                            const groups = item.cabinet.parameterGroups ?? [];
                            const paramsByGroup = new Map<string, ParamDef[]>();
                            let ungrouped: ParamDef[] = [];
                            for (const pv of item.parameterValues) {
                                const def = item.cabinet.parameters?.find(
                                    (d) => d.paramName === pv.paramName
                                );
                                if (!def) continue;
                                if (def.group) {
                                    const list = paramsByGroup.get(def.group.id) ?? [];
                                    list.push(def);
                                    paramsByGroup.set(def.group.id, list);
                                } else {
                                    ungrouped.push(def);
                                }
                            }
                            const sections: { title: string; params: ParamDef[] }[] = [
                                ...groups.map((g) => ({
                                    title: g.name,
                                    params: paramsByGroup.get(g.id) ?? [],
                                })),
                                ...(ungrouped.length > 0
                                    ? [{ title: "Ostatné", params: ungrouped }]
                                    : []),
                            ];
                            return (
                                <div className="space-y-6">
                                    {sections.map((section) => (
                                        <Card key={section.title}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">
                                                    {section.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {section.params.map((def) => {
                                                        const p = {
                                                            paramName: def.paramName,
                                                            value: params[def.paramName] ?? "",
                                                        };
                                                        const hasNote =
                                                            def?.label && def.label.trim() !== "";
                                                        const isBoolean =
                                                            def?.paramType === "boolean";
                                                        const boolChecked =
                                                            isBoolean &&
                                                            (params[def.paramName] === "true" ||
                                                                params[def.paramName] === "1" ||
                                                                params[def.paramName]?.toLowerCase() ===
                                                                "true");
                                                        return (
                                                            <div
                                                                key={def.paramName}
                                                                className="space-y-2"
                                                            >
                                                                <Label
                                                                    htmlFor={def.paramName}
                                                                    className="block"
                                                                >
                                                                    <span className="font-medium text-slate-900">
                                                                        {def.paramName}
                                                                    </span>
                                                                    {hasNote && (
                                                                        <span className="ml-2 text-xs font-normal text-slate-500">
                                                                            {def.label}
                                                                        </span>
                                                                    )}
                                                                </Label>
                                                                {isBoolean ? (
                                                                    <label
                                                                        htmlFor={def.paramName}
                                                                        className="flex items-center gap-3 p-2 rounded-md border border-slate-200 bg-slate-50 w-fit cursor-pointer hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        <Checkbox
                                                                            id={def.paramName}
                                                                            checked={boolChecked}
                                                                            onCheckedChange={(checked) =>
                                                                                handleParamChange(
                                                                                    def.paramName,
                                                                                    checked === true ? "true" : "false"
                                                                                )
                                                                            }
                                                                        />
                                                                        <span className="text-sm font-medium text-slate-700 select-none">
                                                                            {boolChecked ? "Áno" : "Nie"}
                                                                        </span>
                                                                    </label>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            id={def.paramName}
                                                                            value={
                                                                                params[def.paramName] ||
                                                                                ""
                                                                            }
                                                                            onChange={(e) =>
                                                                                handleParamChange(
                                                                                    def.paramName,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="font-mono"
                                                                        />
                                                                        {def?.unit && (
                                                                            <span className="text-sm text-slate-500 shrink-0">
                                                                                {def.unit}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            );
                        })()}
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
