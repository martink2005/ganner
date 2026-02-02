"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileCode, Settings2, Eye, LayoutTemplate } from "lucide-react";
import { getGanxFileDetail, GanxFileDetail } from "./actions";
import { PartPreview } from "@/components/catalog/part-preview";

// Definície typov zhodné s Prisma CabinetFile (bez updatedAt)
interface File {
    id: string;
    filename: string;
    relativePath: string;
    hash: string | null;
    cabinetId: string;
    createdAt: Date;
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
}

interface Cabinet {
    id: string;
    name: string;
    slug: string;
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
};

interface CabinetDetailClientProps {
    cabinet: CabinetWithRelations;
}

export function CabinetDetailClient({ cabinet }: CabinetDetailClientProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<GanxFileDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

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
                            .ganx programy pre jednotlivé dielce
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {cabinet.files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileCode className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium text-slate-900">
                                            {file.filename}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
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

                {/* Parametre */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5" />
                            Parametre ({cabinet.parameters.length})
                        </CardTitle>
                        <CardDescription>
                            Nastaviteľné parametre skrinky
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {cabinet.parameters.map((param) => {
                                const displayLabel = (param.label && param.label.trim() !== "") ? param.label : param.paramName;
                                return (
                                    <div
                                        key={param.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                {displayLabel}
                                            </p>
                                            {(param.label && param.label.trim() !== "") && (
                                                <p className="text-xs text-slate-500">{param.paramName}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-sm text-slate-700">
                                                {param.defaultValue}
                                                {param.unit && <span className="text-slate-500 ml-1">{param.unit}</span>}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {param.paramType}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

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
