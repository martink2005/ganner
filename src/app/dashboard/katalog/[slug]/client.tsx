"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext,
    DragOverlay,
    type DragEndEvent,
    type DragStartEvent,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    FileCode,
    Settings2,
    Eye,
    LayoutTemplate,
    Plus,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    GripVertical,
} from "lucide-react";
import { getGanxFileDetail, GanxFileDetail } from "./actions";
import { PartPreview } from "@/components/catalog/part-preview";

const NO_GROUP = "no-group";

interface File {
    id: string;
    filename: string;
    relativePath: string;
    hash: string | null;
    cabinetId: string;
    quantity?: number;
    createdAt: Date;
}

interface ParameterGroup {
    id: string;
    name: string;
    sortOrder: number;
}

interface Parameter {
    id: string;
    paramName: string;
    label: string;
    paramType: string;
    unit: string | null;
    defaultValue: string | null;
    sortId: number | null;
    cabinetId: string;
    group?: ParameterGroup | null;
}

interface Cabinet {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    categoryId?: string | null;
    category?: { id: string; name: string } | null;
    catalogPath: string;
    baseWidth: number | null;
    baseHeight: number | null;
    baseDepth: number | null;
    createdAt: Date;
    updatedAt: Date;
}

type CabinetWithRelations = Cabinet & {
    files: File[];
    parameters: Parameter[];
    parameterGroups?: ParameterGroup[];
};

interface CabinetDetailClientProps {
    cabinet: CabinetWithRelations;
}

function DraggableParam({ param }: { param: Parameter }) {
    const displayLabel =
        (param.label && param.label.trim() !== "") ? param.label : param.paramName;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: param.id,
    });
    return (
        <div
            ref={setNodeRef}
            className={`flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 transition-opacity ${isDragging ? "opacity-30" : ""
                }`}
            {...listeners}
            {...attributes}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
                <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{displayLabel}</p>
                    {(param.label && param.label.trim() !== "") && (
                        <p className="text-xs text-slate-500 truncate">{param.paramName}</p>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0 w-20">
                <p className="font-mono text-sm text-slate-700 truncate" title={param.defaultValue ?? undefined}>
                    {param.defaultValue}
                    {param.unit && <span className="text-slate-500 ml-0.5">{param.unit}</span>}
                </p>
                <p className="text-xs text-slate-400">{param.paramType}</p>
            </div>
        </div>
    );
}

/** Náhľad parametra počas ťahania – zobrazuje sa v DragOverlay */
function ParamDragPreview({ param }: { param: Parameter }) {
    const displayLabel =
        (param.label && param.label.trim() !== "") ? param.label : param.paramName;
    return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-white border-2 border-blue-400 shadow-xl cursor-grabbing min-w-[200px]">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <GripVertical className="h-4 w-4 text-slate-500 shrink-0" aria-hidden />
                <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{displayLabel}</p>
                    {(param.label && param.label.trim() !== "") && (
                        <p className="text-xs text-slate-500 truncate">{param.paramName}</p>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0 w-20">
                <p className="font-mono text-sm text-slate-700 truncate" title={param.defaultValue ?? undefined}>
                    {param.defaultValue}
                    {param.unit && <span className="text-slate-500 ml-0.5">{param.unit}</span>}
                </p>
                <p className="text-xs text-slate-400">{param.paramType}</p>
            </div>
        </div>
    );
}

function DroppableZone({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={`rounded-lg border-2 border-dashed p-3 min-h-[80px] transition-colors ${isOver
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200 bg-slate-50"
                }`}
            aria-label={`Drop zone: ${title}`}
        >
            <h4 className="text-sm font-semibold text-slate-700 mb-2">{title}</h4>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

export function CabinetDetailClient({ cabinet }: CabinetDetailClientProps) {
    const router = useRouter();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<GanxFileDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [fileQuantities, setFileQuantities] = useState<Record<string, number>>(() =>
        Object.fromEntries(cabinet.files.map((f) => [f.id, Math.max(1, f.quantity ?? 1)]))
    );
    const [savingFileId, setSavingFileId] = useState<string | null>(null);
    const [fileQuantityError, setFileQuantityError] = useState<string | null>(null);
    /** Súbory s neuloženou zmenou množstva (zmenené od posledného uloženia) */
    const [unsavedFileIds, setUnsavedFileIds] = useState<Set<string>>(new Set());
    /** Po úspešnom uložení na chvíľu zobrazíme „Uložené“ */
    const [savedFileId, setSavedFileId] = useState<string | null>(null);
    /** Časovače pre autosave množstva (debounce) */
    const autosaveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    /** Popis skrinky – lokálna hodnota a stavy ukladania */
    const [description, setDescription] = useState(cabinet.description ?? "");
    const [savingDescription, setSavingDescription] = useState(false);
    const [descriptionError, setDescriptionError] = useState<string | null>(null);
    const [descriptionUnsaved, setDescriptionUnsaved] = useState(false);
    const [descriptionSaved, setDescriptionSaved] = useState(false);
    const descriptionAutosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const descriptionLatestRef = useRef(description);
    descriptionLatestRef.current = description;

    /** Kategória skrinky */
    const [categoryId, setCategoryId] = useState<string>(
        cabinet.categoryId ?? cabinet.category?.id ?? ""
    );
    const [categoriesTree, setCategoriesTree] = useState<{ id: string; name: string; parentId: string | null; children: unknown[] }[]>([]);
    const [savingCategory, setSavingCategory] = useState(false);
    const [categoryError, setCategoryError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/catalog/categories")
            .then((r) => r.json())
            .then((data) => (data.categories ? setCategoriesTree(data.categories) : undefined))
            .catch(() => { });
    }, []);

    function flattenCategoriesForSelect(
        nodes: { id: string; name: string; children: unknown[] }[],
        depth = 0
    ): { id: string; label: string }[] {
        const out: { id: string; label: string }[] = [];
        for (const n of nodes) {
            out.push({ id: n.id, label: "—".repeat(depth) + (depth ? " " : "") + n.name });
            out.push(...flattenCategoriesForSelect((n.children as { id: string; name: string; children: unknown[] }[]) ?? [], depth + 1));
        }
        return out;
    }

    const categoryOptions = flattenCategoriesForSelect(categoriesTree);

    const saveCategory = async (newCategoryId: string | null) => {
        setSavingCategory(true);
        setCategoryError(null);
        try {
            const res = await fetch(`/api/catalog/${cabinet.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId: newCategoryId ?? null }),
            });
            if (res.ok) {
                setCategoryId(newCategoryId ?? "");
            } else {
                const data = await res.json().catch(() => ({}));
                setCategoryError(data.error ?? "Nepodarilo sa uložiť kategóriu");
            }
        } catch (e) {
            console.error(e);
            setCategoryError("Chyba pri ukladaní");
        } finally {
            setSavingCategory(false);
        }
    };

    const groups = cabinet.parameterGroups ?? [];

    const [groupDialog, setGroupDialog] = useState<{
        open: boolean;
        mode: "create" | "edit";
        id?: string;
        name: string;
        saving: boolean;
    }>({ open: false, mode: "create", name: "", saving: false });
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    const [reordering, setReordering] = useState(false);
    const [paramAssigning, setParamAssigning] = useState<string | null>(null);
    const [activeParamId, setActiveParamId] = useState<string | null>(null);
    /** Optimistické priradenie: paramId -> groupId (null = Bez skupiny), aby sa parameter hneď zobrazil v novej skupine */
    const [optimisticAssign, setOptimisticAssign] = useState<Record<string, string | null>>({});

    const refresh = () => router.refresh();

    const saveFileQuantity = async (fileId: string, quantity: number) => {
        if (autosaveTimeoutsRef.current[fileId]) {
            clearTimeout(autosaveTimeoutsRef.current[fileId]);
            delete autosaveTimeoutsRef.current[fileId];
        }
        const q = Math.max(1, Math.floor(quantity));
        setSavingFileId(fileId);
        setFileQuantityError(null);
        try {
            const res = await fetch(`/api/catalog/files/${fileId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity: q }),
            });
            if (res.ok) {
                setUnsavedFileIds((prev) => {
                    const next = new Set(prev);
                    next.delete(fileId);
                    return next;
                });
                setSavedFileId(fileId);
                setTimeout(() => setSavedFileId(null), 2500);
            } else {
                const data = await res.json().catch(() => ({}));
                setFileQuantityError(data.error ?? "Nepodarilo sa uložiť množstvo");
            }
        } catch (e) {
            console.error(e);
            setFileQuantityError("Chyba pri ukladaní");
        } finally {
            setSavingFileId(null);
        }
    };

    const saveDescription = async (value: string) => {
        if (descriptionAutosaveRef.current) {
            clearTimeout(descriptionAutosaveRef.current);
            descriptionAutosaveRef.current = null;
        }
        const desc = value.trim() || null;
        setSavingDescription(true);
        setDescriptionError(null);
        try {
            const res = await fetch(`/api/catalog/${cabinet.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: desc ?? "" }),
            });
            if (res.ok) {
                setDescriptionUnsaved(false);
                setDescriptionSaved(true);
                setTimeout(() => setDescriptionSaved(false), 2500);
            } else {
                const data = await res.json().catch(() => ({}));
                setDescriptionError(data.error ?? "Nepodarilo sa uložiť popis");
            }
        } catch (e) {
            console.error(e);
            setDescriptionError("Chyba pri ukladaní");
        } finally {
            setSavingDescription(false);
        }
    };

    useEffect(() => {
        return () => {
            Object.values(autosaveTimeoutsRef.current).forEach(clearTimeout);
            autosaveTimeoutsRef.current = {};
            if (descriptionAutosaveRef.current) clearTimeout(descriptionAutosaveRef.current);
        };
    }, []);

    useEffect(() => {
        setOptimisticAssign((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const param of cabinet.parameters) {
                const opt = next[param.id];
                if (opt === undefined) continue;
                const current = param.group?.id ?? null;
                if (opt === current) {
                    delete next[param.id];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [cabinet.parameters]);

    const handleCreateGroup = () => {
        setGroupDialog({ open: true, mode: "create", name: "", saving: false });
    };
    const handleEditGroup = (g: ParameterGroup) => {
        setGroupDialog({
            open: true,
            mode: "edit",
            id: g.id,
            name: g.name,
            saving: false,
        });
    };
    const handleSaveGroup = async () => {
        if (!groupDialog.name.trim()) return;
        setGroupDialog((d) => ({ ...d, saving: true }));
        try {
            if (groupDialog.mode === "edit" && groupDialog.id) {
                const res = await fetch(`/api/catalog/groups/${groupDialog.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: groupDialog.name.trim() }),
                });
                if (res.ok) refresh();
            } else {
                const res = await fetch(
                    `/api/catalog/${cabinet.id}/groups`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: groupDialog.name.trim() }),
                    }
                );
                if (res.ok) refresh();
            }
            setGroupDialog((d) => ({ ...d, open: false }));
        } catch (e) {
            console.error(e);
        } finally {
            setGroupDialog((d) => ({ ...d, saving: false }));
        }
    };
    const handleDeleteGroup = async (groupId: string) => {
        try {
            const res = await fetch(`/api/catalog/groups/${groupId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setDeleteGroupId(null);
                refresh();
            }
        } catch (e) {
            console.error(e);
        }
    };
    const handleMoveGroup = async (index: number, direction: "up" | "down") => {
        const newOrder = [...groups];
        const swap = direction === "up" ? index - 1 : index + 1;
        if (swap < 0 || swap >= newOrder.length) return;
        [newOrder[index], newOrder[swap]] = [newOrder[swap], newOrder[index]];
        setReordering(true);
        try {
            const res = await fetch(
                `/api/catalog/${cabinet.id}/groups/reorder`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        order: newOrder.map((g, i) => ({ id: g.id, sortOrder: i })),
                    }),
                }
            );
            if (res.ok) refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setReordering(false);
        }
    };
    const handleParamGroupChange = async (paramId: string, groupId: string | null) => {
        setParamAssigning(paramId);
        try {
            const res = await fetch(`/api/catalog/parameters/${paramId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId: groupId || null }),
            });
            if (res.ok) refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setParamAssigning(null);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveParamId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveParamId(null);
        const { active, over } = event;
        if (!over) return;
        const paramId = String(active.id);
        const targetId = String(over.id);
        const newGroupId = targetId === NO_GROUP ? null : targetId;
        const param = cabinet.parameters.find((p) => p.id === paramId);
        if (!param) return;
        const currentGroupId = param.group?.id ?? null;
        if (currentGroupId === newGroupId) return;
        setOptimisticAssign((prev) => ({ ...prev, [paramId]: newGroupId }));
        handleParamGroupChange(paramId, newGroupId);
    };

    const paramsByGroup = (() => {
        const map = new Map<string, Parameter[]>();
        for (const g of groups) {
            map.set(
                g.id,
                cabinet.parameters.filter(
                    (p) => (optimisticAssign[p.id] ?? p.group?.id ?? null) === g.id
                )
            );
        }
        map.set(
            NO_GROUP,
            cabinet.parameters.filter(
                (p) => (optimisticAssign[p.id] ?? p.group?.id ?? null) === null
            )
        );
        return map;
    })();

    const handlePreview = async (file: File) => {
        setLoading(true);
        setSelectedFile(file);

        try {
            const result = await getGanxFileDetail(cabinet.slug, file.id);

            if (result.success && result.data) {
                setPreviewData(result.data);
                setOpen(true);
            } else {
                console.error(result.error);
                alert(result.error || "Nepodarilo sa načítať náhľad");
            }
        } catch (error) {
            console.error(error);
            alert("Nastala neočakávaná chyba");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Súbory */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCode className="h-5 w-5" />
                            Súbory ({cabinet.files.length})
                        </CardTitle>
                        <CardDescription>
                            .ganx programy pre jednotlivé dielce. Množstvo = počet kusov v skrinke.
                        </CardDescription>
                        {fileQuantityError && (
                            <p className="text-sm text-red-600 mt-1">{fileQuantityError}</p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {cabinet.files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <FileCode className="h-5 w-5 text-blue-600 shrink-0" />
                                        <span className="font-medium text-slate-900 truncate">
                                            {file.filename}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Label htmlFor={`qty-${file.id}`} className="text-xs text-slate-500 whitespace-nowrap">
                                            Množstvo
                                        </Label>
                                        <Input
                                            id={`qty-${file.id}`}
                                            type="number"
                                            min={1}
                                            step={1}
                                            className="w-16"
                                            value={fileQuantities[file.id] ?? file.quantity ?? 1}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                const n = v === "" ? 1 : Math.max(1, Math.floor(Number(v)));
                                                setFileQuantities((prev) => ({ ...prev, [file.id]: n }));
                                                setUnsavedFileIds((prev) => new Set(prev).add(file.id));
                                                if (autosaveTimeoutsRef.current[file.id]) {
                                                    clearTimeout(autosaveTimeoutsRef.current[file.id]);
                                                }
                                                autosaveTimeoutsRef.current[file.id] = setTimeout(() => {
                                                    saveFileQuantity(file.id, n);
                                                    delete autosaveTimeoutsRef.current[file.id];
                                                }, 1500);
                                            }}
                                            onBlur={() => saveFileQuantity(file.id, fileQuantities[file.id] ?? file.quantity ?? 1)}
                                            disabled={savingFileId === file.id}
                                        />
                                        <span className="text-xs min-w-[4.5rem]">
                                            {savingFileId === file.id ? (
                                                <span className="text-slate-500">Ukladám…</span>
                                            ) : savedFileId === file.id ? (
                                                <span className="text-green-600 font-medium">Uložené</span>
                                            ) : unsavedFileIds.has(file.id) ? (
                                                <span className="text-amber-600 font-medium">Neulozene</span>
                                            ) : null}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        onClick={() => handlePreview(file)}
                                        disabled={loading && selectedFile?.id === file.id}
                                    >
                                        <Eye className="h-4 w-4" />
                                        {loading && selectedFile?.id === file.id ? "Načítavam..." : "Náhľad"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Parametre a skupiny – drag-and-drop priradenie (pol obrazovky vedľa Súborov) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5" />
                            Parametre a skupiny
                        </CardTitle>
                        <CardDescription>
                            Presuňte parametre do skupín pretiahnutím. V zákazke sa parametre zobrazia podľa skupín.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <div className="space-y-4 max-h-[28rem] overflow-y-auto">
                                {groups.map((g, index) => (
                                    <div key={g.id} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium text-slate-700">
                                                Skupina: {g.name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleMoveGroup(index, "up")}
                                                    disabled={index === 0 || reordering}
                                                    title="Posunúť hore"
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleMoveGroup(index, "down")}
                                                    disabled={index === groups.length - 1 || reordering}
                                                    title="Posunúť dole"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEditGroup(g)}
                                                    title="Upraviť"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeleteGroupId(g.id)}
                                                    title="Zmazať"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <DroppableZone id={g.id} title={g.name}>
                                            {(paramsByGroup.get(g.id) ?? []).map((param) => (
                                                <DraggableParam
                                                    key={param.id}
                                                    param={param}
                                                />
                                            ))}
                                        </DroppableZone>
                                    </div>
                                ))}
                                <div className="space-y-2">
                                    <DroppableZone id={NO_GROUP} title="Bez skupiny">
                                        {(paramsByGroup.get(NO_GROUP) ?? []).map((param) => (
                                            <DraggableParam key={param.id} param={param} />
                                        ))}
                                    </DroppableZone>
                                </div>
                            </div>
                            <DragOverlay>
                                {activeParamId ? (() => {
                                    const param = cabinet.parameters.find((p) => p.id === activeParamId);
                                    return param ? <ParamDragPreview param={param} /> : null;
                                })() : null}
                            </DragOverlay>
                        </DndContext>
                        <Button
                            variant="outline"
                            className="w-full gap-2 mt-4"
                            onClick={handleCreateGroup}
                        >
                            <Plus className="h-4 w-4" />
                            Pridať skupinu
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Kategória skrinky */}
            <Card>
                <CardHeader>
                    <CardTitle>Kategória</CardTitle>
                    <CardDescription>
                        Priradenie skrinky do kategórie pre prehľad v katalógu a filtrovanie.
                    </CardDescription>
                    {categoryError && (
                        <p className="text-sm text-red-600 mt-1">{categoryError}</p>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                        <select
                            id="cabinet-category"
                            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm min-w-0"
                            value={categoryId}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setCategoryId(val ?? "");
                                saveCategory(val);
                            }}
                            disabled={savingCategory}
                        >
                            <option value="">Žiadna</option>
                            {categoryOptions.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        {savingCategory && (
                            <span className="text-sm text-slate-500 shrink-0">Ukladám…</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Popis skrinky */}
            <Card>
                <CardHeader>
                    <CardTitle>Popis skrinky</CardTitle>
                    <CardDescription>
                        Voliteľný textový popis skrinky. Ukladá sa automaticky po úpravách alebo pri kliknutí mimo pole.
                    </CardDescription>
                    {descriptionError && (
                        <p className="text-sm text-red-600 mt-1">{descriptionError}</p>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea
                        id="cabinet-description"
                        placeholder="Žiadny popis"
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            setDescriptionUnsaved(true);
                            if (descriptionAutosaveRef.current) {
                                clearTimeout(descriptionAutosaveRef.current);
                            }
                            descriptionAutosaveRef.current = setTimeout(() => {
                                saveDescription(descriptionLatestRef.current);
                                descriptionAutosaveRef.current = null;
                            }, 1500);
                        }}
                        onBlur={() => saveDescription(description)}
                        disabled={savingDescription}
                        rows={4}
                        className="resize-y min-h-[100px]"
                    />
                    <div className="flex items-center gap-2 text-sm">
                        {savingDescription ? (
                            <span className="text-slate-500">Ukladám…</span>
                        ) : descriptionSaved ? (
                            <span className="text-green-600 font-medium">Uložené</span>
                        ) : descriptionUnsaved ? (
                            <span className="text-amber-600 font-medium">Neulozene</span>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            {/* Dialóg Pridať / Upraviť skupinu */}
            <Dialog
                open={groupDialog.open}
                onOpenChange={(open) =>
                    !groupDialog.saving && setGroupDialog((d) => ({ ...d, open }))
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {groupDialog.mode === "create"
                                ? "Pridať skupinu parametrov"
                                : "Upraviť názov skupiny"}
                        </DialogTitle>
                        <DialogDescription>
                            Názov skupiny sa zobrazí pri úprave parametrov skrinky v zákazke.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="group-name">Názov skupiny</Label>
                        <Input
                            id="group-name"
                            value={groupDialog.name}
                            onChange={(e) =>
                                setGroupDialog((d) => ({ ...d, name: e.target.value }))
                            }
                            placeholder="Napr. Rozmery, Vŕtania"
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setGroupDialog((d) => ({ ...d, open: false }))}
                            disabled={groupDialog.saving}
                        >
                            Zrušiť
                        </Button>
                        <Button onClick={handleSaveGroup} disabled={!groupDialog.name.trim() || groupDialog.saving}>
                            {groupDialog.saving ? "Ukladám..." : groupDialog.mode === "create" ? "Pridať" : "Uložiť"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Potvrdenie zmazania skupiny */}
            <Dialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zmazať skupinu?</DialogTitle>
                        <DialogDescription>
                            Parametre v tejto skupine zostanú, len sa odstránia zo skupiny (budú v sekcii „Ostatné“).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteGroupId(null)}>
                            Zrušiť
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteGroupId && handleDeleteGroup(deleteGroupId)}
                        >
                            Zmazať
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-4xl w-[90vw] h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LayoutTemplate className="h-5 w-5 text-blue-600" />
                            Náhľad dielca: {previewData?.filename}
                        </DialogTitle>
                        <DialogDescription>
                            2D Vizualizácia vŕtaní a rozmerov
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 w-full bg-slate-50 rounded-lg border overflow-hidden mt-4 p-4 flex items-center justify-center">
                        {previewData && previewData.prgrSet && (
                            <PartPreview
                                width={previewData.prgrSet.wsX}
                                height={previewData.prgrSet.wsY}
                                operations={previewData.operations}
                            />
                        )}
                        {previewData && !previewData.prgrSet && (
                            <div className="text-center text-slate-500">
                                <p>Chýbajúce informácie o rozmeroch (PrgrSet)</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-500 mt-2 p-2 bg-slate-100 rounded">
                        <div>
                            Počet vŕtaní: {previewData?.operations.filter(o => o.type === 'B').length || 0}
                        </div>
                        {previewData?.prgrSet && (
                            <div>
                                Rozmery: {previewData.prgrSet.wsX} x {previewData.prgrSet.wsY} x {previewData.prgrSet.wsZ} mm
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
