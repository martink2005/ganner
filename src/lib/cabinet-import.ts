/**
 * Cabinet Import Service
 *
 * Logika pre import skriniek z priečinka do katalógu.
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import {
    parseGanxFile,
    deduplicateParameters,
    inferParameterType,
    GanxParameter,
} from "@/lib/ganx-parser";
import { isPerPartParam } from "@/lib/job-service";

/**
 * Výsledok importu skrinky
 */
export interface ImportResult {
    success: boolean;
    cabinet?: {
        id: string;
        name: string;
        slug: string;
    };
    filesCount: number;
    parametersCount: number;
    errors: string[];
}

/**
 * Info o .ganx súbore pred importom
 */
export interface GanxFileInfo {
    filename: string;
    path: string;
    size: number;
    parametersCount: number;
}

/**
 * Vytvorí slug z názvu
 */
export function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Vypočíta hash obsahu súboru
 */
export function calculateHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Naskenuje priečinok a vráti info o .ganx súboroch
 */
export async function scanCabinetFolder(
    sourcePath: string
): Promise<GanxFileInfo[]> {
    const files: GanxFileInfo[] = [];

    try {
        const entries = await fs.readdir(sourcePath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith(".ganx")) {
                const filePath = path.join(sourcePath, entry.name);
                const stats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, "utf-8");
                const parsed = parseGanxFile(content);

                files.push({
                    filename: entry.name,
                    path: filePath,
                    size: stats.size,
                    parametersCount: parsed.parameters.length,
                });
            }
        }
    } catch (error) {
        console.error("Error scanning cabinet folder:", error);
    }

    return files;
}

/**
 * Importuje skrinku z priečinka do katalógu
 */
export async function importCabinet(
    sourcePath: string,
    catalogRoot: string = "./catalog"
): Promise<ImportResult> {
    const errors: string[] = [];

    try {
        // 1. Získaj názov z názvu priečinka
        const cabinetName = path.basename(sourcePath);
        const slug = createSlug(cabinetName);

        // 2. Skontroluj či skrinka už existuje
        const existing = await prisma.cabinet.findUnique({
            where: { slug },
        });

        if (existing) {
            return {
                success: false,
                filesCount: 0,
                parametersCount: 0,
                errors: [`Skrinka s názvom "${cabinetName}" už existuje v katalógu.`],
            };
        }

        // 3. Nájdi všetky .ganx súbory
        const ganxFiles: string[] = [];
        const entries = await fs.readdir(sourcePath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith(".ganx")) {
                ganxFiles.push(entry.name);
            }
        }

        if (ganxFiles.length === 0) {
            return {
                success: false,
                filesCount: 0,
                parametersCount: 0,
                errors: ["Priečinok neobsahuje žiadne .ganx súbory."],
            };
        }

        // 4. Parsuj všetky súbory a zbieraj parametre
        const allParameters: GanxParameter[] = [];
        const fileContents: Map<string, string> = new Map();
        let baseWidth: number | null = null;
        let baseHeight: number | null = null;
        let baseDepth: number | null = null;

        for (const filename of ganxFiles) {
            const filePath = path.join(sourcePath, filename);
            const content = await fs.readFile(filePath, "utf-8");
            fileContents.set(filename, content);

            const parsed = parseGanxFile(content);
            allParameters.push(...parsed.parameters);

            // Validácie pre každý .ganx (fail-safe)
            // - musí obsahovať aspoň 2 parametre typu X_C_Y, Y_C_X, Z_C_Z (kombinácie X/Y/Z, C fixne v strede)
            // - musí obsahovať povinný parameter HRUB
            const issues: string[] = [];

            const coordParamCount = parsed.parameters.filter((p) =>
                /^[XYZ]_C_[XYZ]$/.test(p.paramName)
            ).length;

            if (coordParamCount !== 2) {
                issues.push(
                    `parametre v tvare X_C_Y (kde X/Y/Z) musia byť presne 2, našiel som ${coordParamCount}. Príklad: X_C_Y, Y_C_X.`
                );
            }

            const hasHrub = parsed.parameters.some((p) => p.paramName === "HRUB");
            if (!hasHrub) {
                issues.push(`chýba povinný parameter HRUB.`);
            }

            if (issues.length > 0) {
                errors.push(
                    `Súbor "${filename}" sa nedá importovať:\n  - ${issues.join(
                        "\n  - "
                    )}`
                );
            }

            // Získaj rozmery z prvého súboru
            if (parsed.prgrSet && baseWidth === null) {
                baseWidth = parsed.prgrSet.wsX;
                baseHeight = parsed.prgrSet.wsY;
                baseDepth = parsed.prgrSet.wsZ;
            }
        }

        // Ak validácie zlyhali, skonči pred zápisom na disk/DB
        if (errors.length > 0) {
            return {
                success: false,
                filesCount: 0,
                parametersCount: 0,
                errors,
            };
        }

        // 5. Deduplikuj parametre (bez EXCLUDED a bez per-dielcových: *_C_*, HRUB)
        const uniqueParameters = deduplicateParameters(allParameters);
        const EXCLUDED_PARAMS = new Set(["CLX", "CLY", "CLZ", "LX", "LY", "LZ"]);
        const dbParameters = uniqueParameters.filter(
            (param) =>
                !EXCLUDED_PARAMS.has(param.paramName) &&
                !isPerPartParam(param.paramName)
        );

        // 6. Vytvor priečinok v katalógu
        const catalogPath = path.join(catalogRoot, slug);
        await fs.mkdir(catalogPath, { recursive: true });

        // 7. Skopíruj súbory do katalógu
        for (const [filename, content] of Array.from(fileContents.entries())) {
            const destPath = path.join(catalogPath, filename);
            await fs.writeFile(destPath, content, "utf-8");
        }

        // 8. Ulož do databázy
        const cabinet = await prisma.cabinet.create({
            data: {
                name: cabinetName,
                slug,
                catalogPath,
                baseWidth,
                baseHeight,
                baseDepth,
                files: {
                    create: ganxFiles.map((filename) => ({
                        filename,
                        relativePath: filename,
                        hash: calculateHash(fileContents.get(filename) || ""),
                    })),
                },
                parameters: {
                    create: dbParameters.map((param) => ({
                        paramName: param.paramName,
                        label: param.description || param.paramName,
                        paramType: inferParameterType(param.value, param.description),
                        defaultValue: param.paramValue,
                        sortId: param.sortId,
                    })),
                },
            },
            include: {
                files: true,
                parameters: true,
            },
        });

        return {
            success: true,
            cabinet: {
                id: cabinet.id,
                name: cabinet.name,
                slug: cabinet.slug,
            },
            filesCount: cabinet.files.length,
            parametersCount: cabinet.parameters.length,
            errors: [],
        };
    } catch (error) {
        console.error("Import error:", error);
        errors.push(
            error instanceof Error ? error.message : "Neznáma chyba pri importe"
        );

        return {
            success: false,
            filesCount: 0,
            parametersCount: 0,
            errors,
        };
    }
}

/**
 * Získa všetky skrinky z katalógu
 */
export async function getAllCabinets() {
    return prisma.cabinet.findMany({
        include: {
            category: true,
            _count: {
                select: {
                    files: true,
                    parameters: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

/**
 * Získa detail skrinky vrátane súborov a parametrov
 */
export async function getCabinetDetail(slug: string) {
    return prisma.cabinet.findUnique({
        where: { slug },
        include: {
            category: true,
            files: {
                orderBy: { filename: "asc" },
            },
            parameters: {
                orderBy: { sortId: "asc" },
            },
        },
    });
}
