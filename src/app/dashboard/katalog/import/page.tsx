"use client";

import { useState } from "react";
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

export default function ImportPage() {
    const router = useRouter();
    const [sourcePath, setSourcePath] = useState("");
    const [browserOpen, setBrowserOpen] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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

        setImporting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/catalog/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ sourcePath }),
            });

            const data = await response.json();

            if (!response.ok) {
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
        </div>
    );
}
