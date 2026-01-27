import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * GET /api/fs/list?path=...
 * Zoznam priečinkov a súborov v danej ceste
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const queryPath = searchParams.get("path");

        // Default to current working directory if not specified
        const currentPath = queryPath ? path.resolve(queryPath) : process.cwd();

        // Security check (v produkcii by mal byť prísnejší, pre lokálne dev ok)
        // Zistime parent path pre navigáciu nahor
        const parentPath = path.dirname(currentPath);

        try {
            const stats = await fs.stat(currentPath);
            if (!stats.isDirectory()) {
                return NextResponse.json(
                    { error: "Cesta nie je priečinok" },
                    { status: 400 }
                );
            }

            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            const dirs = entries
                .filter(e => e.isDirectory() && !e.name.startsWith("."))
                .map(e => e.name);

            const files = entries
                .filter(e => e.isFile() && !e.name.startsWith("."))
                .map(e => ({
                    name: e.name,
                    isGanx: e.name.toLowerCase().endsWith(".ganx")
                }));

            return NextResponse.json({
                path: currentPath,
                parent: parentPath !== currentPath ? parentPath : null,
                dirs,
                files
            });

        } catch (err) {
            return NextResponse.json(
                { error: "Priečinok neexistuje alebo nie je prístupný" },
                { status: 404 }
            );
        }

    } catch (error) {
        console.error("FS List API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní priečinka" },
            { status: 500 }
        );
    }
}
