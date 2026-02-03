"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, FolderOpen, FileCode, CheckCircle, Search } from "lucide-react";
import { FileBrowser } from "@/components/FileBrowser";

interface GanxFileInfo {
    filename: string;
    size: number;
    parametersCount: number;
}

interface ScanResult {
    folderName: string;
    files: GanxFileInfo[];
    totalFiles: number;
}

type CategoryTreeNode = { id: string; name: string; children: CategoryTreeNode[] };

function flattenCategoriesForSelect(
    nodes: CategoryTreeNode[],
    depth = 0
): { id: string; label: string }[] {
    const out: { id: string; label: string }[] = [];
    for (const n of nodes) {
        out.push({ id: n.id, label: "—".repeat(depth) + (depth ? " " : "") + n.name });
        out.push(...flattenCategoriesForSelect(n.children ?? [], depth + 1));
    }
    return out;
}

export default function ImportPage() {
    const router = useRouter();
    const [sourcePath, setSourcePath] = useState("");
    const [browserOpen, setBrowserOpen] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /** Pred importom (voliteľné): default rozmer a kategória */
    const [defaultWidth, setDefaultWidth] = useState<string>("");
    const [defaultHeight, setDefaultHeight] = useState<string>("");
    const [defaultDepth, setDefaultDepth] = useState<string>("");
    const [categoryId, setCategoryId] = useState<string>("");
    const [categoriesTree, setCategoriesTree] = useState<CategoryTreeNode[]>([]);

    /** Modal „skrinka s týmto názvom už existuje“ – prepísanie názvu */
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictExistingName, setConflictExistingName] = useState("");
    const [overrideNameInput, setOverrideNameInput] = useState("");
    const [importingWithOverride, setImportingWithOverride] = useState(false);
    const [conflictModalError, setConflictModalError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/catalog/categories")
            .then((r) => r.json())
            .then((data) =>
                data.categories ? setCategoriesTree(data.categories) : undefined
            )
            .catch(() => { });
    }, []);

    const categoryOptions = flattenCategoriesForSelect(categoriesTree);

    const handleScan = async (pathToCheck: string = sourcePath) => {
        if (!pathToCheck.trim()) {
            setError("Zadaj cestu k priečinku");
            return;
        }

        setScanning(true);
        setError(null);
        setScanResult(null);

        try {
            const response = await fetch(
                `/api/catalog/import?path=${encodeURIComponent(pathToCheck)}`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Chyba pri skenovaní");
            }

            setScanResult(data);

            if (data.totalFiles === 0) {
                setError("Priečinok neobsahuje žiadne .ganx súbory");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Neznáma chyba");
        } finally {
            setScanning(false);
        }
    };

    const handleBrowserSelect = (path: string) => {
        setSourcePath(path);
        handleScan(path); // Auto-scan after selection
    };

    const handleImport = async () => {
        if (!sourcePath.trim()) return;

        const w = defaultWidth.trim() ? Number(defaultWidth) : null;
        const h = defaultHeight.trim() ? Number(defaultHeight) : null;
        const d = defaultDepth.trim() ? Number(defaultDepth) : null;
        if (w !== null && (Number.isNaN(w) || w <= 0)) {
            setError("Šírka musí byť kladné číslo");
            return;
        }
        if (h !== null && (Number.isNaN(h) || h <= 0)) {
            setError("Výška musí byť kladné číslo");
            return;
        }
        if (d !== null && (Number.isNaN(d) || d <= 0)) {
            setError("Hĺbka musí byť kladné číslo");
            return;
        }

        setImporting(true);
        setError(null);
        setSuccess(null);

        const body: Record<string, unknown> = { sourcePath };
        if (w != null && w > 0) body.defaultWidth = w;
        if (h != null && h > 0) body.defaultHeight = h;
        if (d != null && d > 0) body.defaultDepth = d;
        if (categoryId.trim()) body.categoryId = categoryId;
        else body.categoryId = null;

        try {
            const response = await fetch("/api/catalog/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === "CABINET_EXISTS") {
                    const folderName = sourcePath.split(/[/\\]/).pop() || "skrinka";
                    setConflictExistingName(data.existingName ?? folderName);
                    setOverrideNameInput(`${folderName}_2`);
                    setConflictModalError(null);
                    setConflictModalOpen(true);
                    return;
                }
                throw new Error(data.error || "Chyba pri importe");
            }

            setSuccess(
                `Skrinka "${data.cabinet.name}" bola úspešne importovaná! ` +
                `${data.filesCount} súborov, ${data.parametersCount} parametrov.`
            );

            // Presmerovanie po 2 sekundách
            setTimeout(() => {
                router.push(`/dashboard/katalog/${data.cabinet.slug}`);
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Neznáma chyba");
        } finally {
            setImporting(false);
        }
    };

    const handleImportWithOverrideName = async () => {
        const newName = overrideNameInput.trim();
        if (!newName) {
            setConflictModalError("Zadajte názov skrinky");
            return;
        }
        if (!sourcePath.trim()) return;

        setImportingWithOverride(true);
        setConflictModalError(null);

        const w = defaultWidth.trim() ? Number(defaultWidth) : null;
        const h = defaultHeight.trim() ? Number(defaultHeight) : null;
        const d = defaultDepth.trim() ? Number(defaultDepth) : null;
        const body: Record<string, unknown> = {
            sourcePath,
            overrideName: newName,
        };
        if (w != null && w > 0) body.defaultWidth = w;
        if (h != null && h > 0) body.defaultHeight = h;
        if (d != null && d > 0) body.defaultDepth = d;
        if (categoryId.trim()) body.categoryId = categoryId;
        else body.categoryId = null;

        try {
            const response = await fetch("/api/catalog/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json();

            if (!response.ok) {
                if (data.code === "CABINET_EXISTS") {
                    setConflictExistingName(data.existingName ?? newName);
                    setConflictModalError(
                        data.error || "Skrinka s týmto názvom už existuje. Skúste iný názov."
                    );
                    return;
                }
                setConflictModalError(data.error || "Chyba pri importe");
                return;
            }

            setConflictModalOpen(false);
            setSuccess(
                `Skrinka "${data.cabinet.name}" bola úspešne importovaná! ` +
                `${data.filesCount} súborov, ${data.parametersCount} parametrov.`
            );
            setTimeout(() => {
                router.push(`/dashboard/katalog/${data.cabinet.slug}`);
            }, 2000);
        } catch (err) {
            setConflictModalError(err instanceof Error ? err.message : "Neznáma chyba");
        } finally {
            setImportingWithOverride(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/katalog">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Import skrinky</h1>
                    <p className="text-slate-600 mt-1">
                        Importuj skrinku z priečinka so .ganx súbormi
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Formulár */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            Výber priečinka
                        </CardTitle>
                        <CardDescription>
                            Zadaj cestu k priečinku obsahujúcemu .ganx súbory skrinky
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="sourcePath">Cesta k priečinku</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="sourcePath"
                                    placeholder="C:\cesta\k\skrinke alebo ./zakazka ganner programy/E001_TEK"
                                    value={sourcePath}
                                    onChange={(e) => setSourcePath(e.target.value)}
                                    disabled={scanning || importing}
                                    className="font-mono text-sm"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={() => setBrowserOpen(true)}
                                    disabled={scanning || importing}
                                    title="Vybrať priečinok"
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                                Príklad: ./zakazka ganner programy/E001_TEK
                            </p>
                        </div>

                        <FileBrowser
                            open={browserOpen}
                            onOpenChange={setBrowserOpen}
                            onSelect={handleBrowserSelect}
                            initialPath={sourcePath}
                        />

                        {/* Pred importom (voliteľné): default rozmer a kategória */}
                        <div className="space-y-4 pt-2 border-t border-slate-200">
                            <h3 className="text-sm font-medium text-slate-700">
                                Pred importom (voliteľné)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Ak nezadáš rozmery, použijú sa hodnoty z .ganx súborov. Kategóriu môžeš zadať rovno pri importe.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-1">
                                    <Label htmlFor="import-defaultWidth">Šírka – X (mm)</Label>
                                    <Input
                                        id="import-defaultWidth"
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        placeholder="z .ganx"
                                        value={defaultWidth}
                                        onChange={(e) => setDefaultWidth(e.target.value)}
                                        disabled={scanning || importing}
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="import-defaultHeight">Výška – Y (mm)</Label>
                                    <Input
                                        id="import-defaultHeight"
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        placeholder="z .ganx"
                                        value={defaultHeight}
                                        onChange={(e) => setDefaultHeight(e.target.value)}
                                        disabled={scanning || importing}
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="import-defaultDepth">Hĺbka – Z (mm)</Label>
                                    <Input
                                        id="import-defaultDepth"
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        placeholder="z .ganx"
                                        value={defaultDepth}
                                        onChange={(e) => setDefaultDepth(e.target.value)}
                                        disabled={scanning || importing}
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="import-category">Kategória</Label>
                                <select
                                    id="import-category"
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm min-w-0"
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    disabled={scanning || importing}
                                >
                                    <option value="">Žiadna</option>
                                    {categoryOptions.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md whitespace-pre-wrap">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {success}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleScan()}
                                disabled={scanning || importing || !sourcePath.trim()}
                            >
                                {scanning ? "Skenujem..." : "Skenovať priečinok"}
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={
                                    importing ||
                                    scanning ||
                                    !scanResult ||
                                    scanResult.totalFiles === 0
                                }
                            >
                                {importing ? "Importujem..." : "Importovať"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Náhľad súborov */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCode className="h-5 w-5" />
                            Náhľad súborov
                        </CardTitle>
                        <CardDescription>
                            {scanResult
                                ? `Priečinok: ${scanResult.folderName}`
                                : "Najprv naskenuj priečinok"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!scanResult ? (
                            <div className="text-center py-8 text-slate-400">
                                <FileCode className="mx-auto h-12 w-12 mb-2" />
                                <p>Žiadne súbory naskenované</p>
                            </div>
                        ) : scanResult.files.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p>Priečinok neobsahuje .ganx súbory</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {scanResult.files.map((file) => (
                                    <div
                                        key={file.filename}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileCode className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {file.filename}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm text-slate-600">
                                            {file.parametersCount} parametrov
                                        </span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t text-sm text-slate-600">
                                    Celkom: {scanResult.totalFiles} súborov
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal: skrinka s týmto názvom už existuje – možnosť prepísať názov */}
            <Dialog open={conflictModalOpen} onOpenChange={(open) => {
                setConflictModalOpen(open);
                if (!open) setConflictModalError(null);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Skrinka s týmto názvom už existuje</DialogTitle>
                        <DialogDescription>
                            V katalógu už je skrinka s názvom „{conflictExistingName}“. Môžeš zadať iný názov a importovať skrinku s novým názvom.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="override-name">Nový názov skrinky</Label>
                            <Input
                                id="override-name"
                                value={overrideNameInput}
                                onChange={(e) => setOverrideNameInput(e.target.value)}
                                placeholder="napr. názov_2"
                                disabled={importingWithOverride}
                                className="font-mono"
                            />
                        </div>
                        {conflictModalError && (
                            <p className="text-sm text-red-600">{conflictModalError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConflictModalOpen(false)}
                            disabled={importingWithOverride}
                        >
                            Zrušiť
                        </Button>
                        <Button
                            onClick={handleImportWithOverrideName}
                            disabled={!overrideNameInput.trim() || importingWithOverride}
                        >
                            {importingWithOverride ? "Importujem..." : "Importovať s novým názvom"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
