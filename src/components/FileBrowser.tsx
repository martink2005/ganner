"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Folder,
    File,
    FileCode,
    ChevronUp,
    FolderOpen,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileEntry {
    name: string;
    isGanx: boolean;
}

interface FSData {
    path: string;
    parent: string | null;
    dirs: string[];
    files: FileEntry[];
}

interface FileBrowserProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (path: string) => void;
    initialPath?: string;
}

export function FileBrowser({
    open,
    onOpenChange,
    onSelect,
    initialPath
}: FileBrowserProps) {
    const [currentPath, setCurrentPath] = useState(initialPath || "");
    const [data, setData] = useState<FSData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            loadPath(currentPath);
        }
    }, [open, currentPath]);

    const loadPath = async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const url = path
                ? `/api/fs/list?path=${encodeURIComponent(path)}`
                : `/api/fs/list`;

            const res = await fetch(url);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Chyba pri načítaní priečinka");
            }

            setData(json);
            // Update local state if we loaded default path
            if (!path && json.path) {
                setCurrentPath(json.path);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Neznáma chyba");
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (dirName: string) => {
        if (!data) return;
        // Simple path join handling (works for Windows/Unix for API param)
        // The API handles path.resolve, so constructing path manually is tricky cross-platform in JS
        // Better to rely on the API, but here we need to append.
        // Assuming backend returns absolute paths, we can just join.
        // But separator differs. Let's try to infer separator from current path.
        const isWindows = data.path.includes("\\");
        const sep = isWindows ? "\\" : "/";
        const newPath = data.path.endsWith(sep)
            ? `${data.path}${dirName}`
            : `${data.path}${sep}${dirName}`;

        setCurrentPath(newPath);
    };

    const handleUp = () => {
        if (data?.parent) {
            setCurrentPath(data.parent);
        }
    };

    const handleSelect = () => {
        if (data) {
            onSelect(data.path);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Výber priečinka</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 p-2 bg-slate-100 rounded border text-sm font-mono overflow-x-auto whitespace-nowrap">
                    <FolderOpen className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    {currentPath || "Načítavam..."}
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-500 p-4 text-center">
                            {error}
                            <Button variant="outline" size="sm" className="mt-2 block mx-auto" onClick={() => loadPath("")}>
                                Reset na domovský priečinok
                            </Button>
                        </div>
                    ) : (
                        <div className="p-1">
                            {data?.parent && (
                                <div
                                    className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer rounded text-slate-600"
                                    onClick={handleUp}
                                >
                                    <ChevronUp className="h-5 w-5" />
                                    <span className="font-medium">.. (Prejsť nahor)</span>
                                </div>
                            )}

                            {data?.dirs.map(dir => (
                                <div
                                    key={dir}
                                    className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer rounded group"
                                    onClick={() => handleNavigate(dir)}
                                >
                                    <Folder className="h-5 w-5 text-yellow-500 group-hover:text-yellow-600" />
                                    <span>{dir}</span>
                                </div>
                            ))}

                            {data?.files.length === 0 && data.dirs.length === 0 && (
                                <div className="text-center p-8 text-slate-400 italic">
                                    Prázdny priečinok
                                </div>
                            )}

                            {data?.files.map(file => (
                                <div
                                    key={file.name}
                                    className={cn(
                                        "flex items-center gap-2 p-2 rounded text-sm",
                                        file.isGanx ? "text-slate-900" : "text-slate-400"
                                    )}
                                >
                                    {file.isGanx ? (
                                        <FileCode className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <File className="h-4 w-4" />
                                    )}
                                    <span>{file.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
                    <div className="text-xs text-slate-500">
                        {data?.files.filter(f => f.isGanx).length || 0} .ganx súborov
                    </div>
                    <Button onClick={handleSelect} disabled={!data || loading}>
                        Vybrať tento priečinok
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
