/**
 * Job Service - Logika pre správu zákaziek a generovanie programov
 */

import { promises as fs } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import {
    extractParameters,
    updateGanxParameters,
    updateGanxPrgrSet,
} from "@/lib/ganx-parser";
import { createWorklistForItem } from "@/lib/worklist-generator";

const JOBS_ROOT = "./zakazky";

/** Parametre špecifické pre každý dielec (offset X_C_Y/Y_C_X, hrubka HRUB) – neukladajú sa do DB, čítajú sa z .ganx */
const PER_PART_PARAM_REGEX = /^[XYZ]_C_[XYZ]$/;
export function isPerPartParam(paramName: string): boolean {
    return paramName === "HRUB" || PER_PART_PARAM_REGEX.test(paramName);
}

export type JobStatus = "draft" | "generating" | "completed" | "error";
export type JobItemStatus = "pending" | "generating" | "generated" | "error";

/**
 * Vytvorí novú zákazku
 */
export async function createJob(name: string, description?: string) {
    return prisma.job.create({
        data: {
            name,
            description,
            status: "draft",
        },
    });
}

/**
 * Zmaže zákazku vrátane priečinka na disku (./zakazky/<slug>)
 */
export async function deleteJob(jobId: string) {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
    });
    if (!job) {
        throw new Error("Zákazka neexistuje");
    }
    const jobDir = path.join(JOBS_ROOT, createSlug(job.name));
    try {
        await fs.rm(jobDir, { recursive: true, force: true });
    } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
            console.error(`Failed to delete job directory ${jobDir}:`, err);
        }
        // Pokračujeme zmazaním z DB
    }
    await prisma.job.delete({
        where: { id: jobId },
    });
}

/**
 * Upraví zákazku (názov, popis). Pri zmene názvu premenuje priečinok na disku.
 */
export async function updateJob(
    jobId: string,
    data: { name?: string; description?: string }
) {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
    });
    if (!job) {
        throw new Error("Zákazka neexistuje");
    }
    const updateData: { name?: string; description?: string } = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.name !== undefined && data.name.trim() !== job.name) {
        const oldDir = path.join(JOBS_ROOT, createSlug(job.name));
        const newDir = path.join(JOBS_ROOT, createSlug(data.name.trim()));
        try {
            await fs.access(oldDir);
            await fs.rename(oldDir, newDir);
        } catch (err) {
            if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
                console.warn(
                    `Rename job folder failed: ${oldDir} -> ${newDir}`,
                    err
                );
            }
        }
        updateData.name = data.name.trim();
    } else if (data.name !== undefined) {
        updateData.name = data.name.trim();
    }
    return prisma.job.update({
        where: { id: jobId },
        data: updateData,
    });
}

/**
 * Pridá skrinku do zákazky
 * @param quantity - množstvo (evidencia), default 1
 * @param width, height, depth - rozmery skrinky v mm (voliteľné, inak z katalógu)
 */
export async function addCabinetToJob(
    jobId: string,
    cabinetId: string,
    options?: { quantity?: number; width?: number; height?: number; depth?: number }
) {
    const quantity = Math.max(1, Math.floor(options?.quantity ?? 1));
    const cabinet = await prisma.cabinet.findUnique({
        where: { id: cabinetId },
        include: {
            files: true,
            parameters: true,
        },
    });

    if (!cabinet) {
        throw new Error("Skrinka neexistuje");
    }

    const job = await prisma.job.findUnique({
        where: { id: jobId },
    });

    if (!job) {
        throw new Error("Zákazka neexistuje");
    }

    // Generovanie unikátneho názvu
    let baseName = cabinet.slug;
    let uniqueName = baseName;
    let counter = 1;

    while (
        await prisma.jobItem.findUnique({
            where: {
                jobId_name: {
                    jobId,
                    name: uniqueName,
                },
            },
        })
    ) {
        counter++;
        uniqueName = `${baseName}_${counter}`;
    }

    // Vytvorenie položky v DB (rozmery z options alebo z katalógu)
    const jobItem = await prisma.jobItem.create({
        data: {
            jobId,
            cabinetId,
            name: uniqueName,
            width: options?.width ?? cabinet.baseWidth,
            height: options?.height ?? cabinet.baseHeight,
            depth: options?.depth ?? cabinet.baseDepth,
            quantity,
            outputStatus: "pending",
            // Skopírujeme default hodnoty parametrov (bez per-dielcových: X_C_Y, Y_C_X, HRUB)
            parameterValues: {
                create: cabinet.parameters
                    .filter((p: any) => !isPerPartParam(p.paramName))
                    .map((p: any) => ({
                        paramName: p.paramName,
                        value: p.defaultValue || "",
                    })),
            },
            // Množstvá dielcov z katalógu (default z CabinetFile.quantity)
            fileQuantities: {
                create: cabinet.files.map((f: { id: string; quantity?: number }) => ({
                    fileId: f.id,
                    quantity: Math.max(1, Math.floor((f as any).quantity ?? 1)),
                })),
            },
        },
    });

    // Asynchrónne skopírovanie súborov a prvotný recalc (neblokuje response)
    recalcJobItem(jobItem.id).catch((err) => {
        console.error(`Error processing job item ${jobItem.id}:`, err);
    });

    return jobItem;
}

/**
 * Prepočíta položku zákazky (Recalc Engine)
 */
export async function recalcJobItem(jobItemId: string) {
    try {
        // 1. Načítanie dát
        const item = await prisma.jobItem.findUnique({
            where: { id: jobItemId },
            include: {
                job: true,
                cabinet: {
                    include: { files: true },
                },
                parameterValues: true,
                fileQuantities: true,
            },
        });

        if (!item) throw new Error("Položka neexistuje");

        const cabinetDims = {
            X: item.width,
            Y: item.height,
            Z: item.depth,
        } as const;

        for (const [axis, value] of Object.entries(cabinetDims)) {
            if (value === null || value === undefined || !Number.isFinite(value)) {
                throw new Error(
                    `Chýba rozmer skrinky ${axis} (X/Y/Z). Bez toho sa nedá prepočítať dielce.`
                );
            }
        }

        // Update status na generating
        await prisma.jobItem.update({
            where: { id: jobItemId },
            data: { outputStatus: "generating" },
        });

        // 2. Príprava ciest
        const sourceDir = item.cabinet.catalogPath;
        const jobDir = path.join(JOBS_ROOT, createSlug(item.job.name));
        const itemDir = path.join(jobDir, item.name);

        await fs.mkdir(itemDir, { recursive: true });

        // 3. Príprava parametrov na prepis (bez per-dielcových: offset a HRUB sa čítajú z každého .ganx)
        const paramsMap: Record<string, string> = {};
        item.parameterValues.forEach((p: any) => {
            if (!isPerPartParam(p.paramName)) {
                paramsMap[p.paramName] = p.value;
            }
        });

        // 4. Spracovanie súborov – na každom dielci sa rozmer (wsX/wsY/wsZ) počíta z prevodových
        // parametrov *_C_* a HRUB tohto dielca (z jeho .ganx), nie z DB
        for (const file of item.cabinet.files) {
            const sourcePath = path.join(sourceDir, file.filename);
            const destPath = path.join(itemDir, file.filename);

            const content = await fs.readFile(sourcePath, "utf-8");

            // 4a. Načítaj offset a HRUB z tohto dielca (pôvodný obsah) – každý dielec má svoje hodnoty
            const fileParams = extractParameters(content);
            const coordParams = fileParams.filter((p) =>
                /^[XYZ]_C_[XYZ]$/.test(p.paramName)
            );
            if (coordParams.length !== 2) {
                throw new Error(
                    `Súbor "${file.filename}" musí obsahovať presne 2 parametre ^[XYZ]_C_[XYZ]$ (napr. X_C_Y a Y_C_X). Našiel som ${coordParams.length}.`
                );
            }

            const hrub = fileParams.find((p) => p.paramName === "HRUB");
            if (!hrub) {
                throw new Error(
                    `Súbor "${file.filename}" musí obsahovať povinný parameter HRUB (hrúbka dielca).`
                );
            }

            const parseStrict = (raw: string, ctx: string) => {
                const normalized = (raw ?? "").toString().trim().replaceAll(",", ".");
                const num = Number(normalized);
                if (!Number.isFinite(num)) {
                    throw new Error(
                        `Súbor "${file.filename}": hodnota "${ctx}" nie je číslo (dostal som "${raw}").`
                    );
                }
                return num;
            };

            const hrubValue = parseStrict(hrub.paramValue || hrub.value, "HRUB");

            // 4b. Vypočítaj nové wsX/wsY podľa 2× *_C_*; wsZ je vždy HRUB
            let wsX: number | undefined;
            let wsY: number | undefined;
            let wsZ: number = hrubValue;

            for (const p of coordParams) {
                const [target, _c, base] = p.paramName.split("_") as [
                    "X" | "Y" | "Z",
                    "C",
                    "X" | "Y" | "Z"
                ];

                if (target === "Z") {
                    throw new Error(
                        `Súbor "${file.filename}": parameter "${p.paramName}" cieli na os Z, ale wsZ je rezervované pre HRUB.`
                    );
                }

                const offset = parseStrict(p.paramValue || p.value, p.paramName);
                const baseDim = cabinetDims[base] as number;
                const newValue = baseDim + offset;

                if (target === "X") wsX = newValue;
                if (target === "Y") wsY = newValue;
            }

            if (wsX === undefined || wsY === undefined) {
                throw new Error(
                    `Súbor "${file.filename}": z parametrov *_C_* sa nepodarilo vypočítať wsX aj wsY (target musí pokryť X aj Y).`
                );
            }

            // 4b. Prepíš používateľské parametre z DB (bez per-dielcových)
            let updatedContent = updateGanxParameters(content, paramsMap);
            updatedContent = updateGanxPrgrSet(updatedContent, {
                wsX,
                wsY,
                wsZ,
            });

            // 4c. Voliteľne: udrž konzistenciu parametrov LX/LY/LZ (+ CL* ak sú čisto číselné)
            const autoParamUpdates: Record<string, string> = {
                LX: String(wsX),
                LY: String(wsY),
                LZ: String(wsZ),
            };

            const paramsAfterUpdate = extractParameters(updatedContent);
            const maybeUpdateCenter = (
                name: "CLX" | "CLY" | "CLZ",
                value: number
            ) => {
                const param = paramsAfterUpdate.find((pp) => pp.paramName === name);
                if (!param) return;
                const raw = (param.paramValue || param.value || "").trim();
                // Ak je to výraz ({LX}/2), necháme ho tak – bude sa rátať z LX
                if (raw.includes("{") || raw.includes("}")) return;
                autoParamUpdates[name] = String(value);
            };

            maybeUpdateCenter("CLX", wsX / 2);
            maybeUpdateCenter("CLY", wsY / 2);
            maybeUpdateCenter("CLZ", wsZ / 2);

            updatedContent = updateGanxParameters(updatedContent, autoParamUpdates);

            await fs.writeFile(destPath, updatedContent, "utf-8");
        }

        // 5. Generovanie worklistu (.jblx) pre túto skrinku
        try {
            await createWorklistForItem(item as Parameters<typeof createWorklistForItem>[0], itemDir);
        } catch (worklistErr) {
            console.error(`Worklist failed for item ${jobItemId}:`, worklistErr);
            // Nepadáme recalc – status zostane generated
        }

        // 6. Update status na generated
        await prisma.jobItem.update({
            where: { id: jobItemId },
            data: { outputStatus: "generated" },
        });

        return true;
    } catch (error) {
        console.error(`Recalc failed for item ${jobItemId}:`, error);
        await prisma.jobItem.update({
            where: { id: jobItemId },
            data: { outputStatus: "error" },
        });
        throw error;
    }
}

/**
 * Aktualizuje parametre položky a spustí recalc
 */


/**
 * Aktualizuje údaje položky, rieši premenovanie priečinka a spúšťa recalc
 */
export async function updateJobItem(
    itemId: string,
    data: {
        name?: string;
        width?: number | null;
        height?: number | null;
        depth?: number | null;
        quantity?: number;
        parameters?: Record<string, string>;
        fileQuantities?: { fileId: string; quantity: number }[];
    }
) {
    const item = await prisma.jobItem.findUnique({
        where: { id: itemId },
        include: { job: true },
    });

    if (!item) throw new Error("Položka neexistuje");

    // Validácia quantity (evidencia: celé číslo >= 1)
    let quantityUpdate: number | undefined;
    if (data.quantity !== undefined) {
        const q = Math.floor(Number(data.quantity));
        if (!Number.isFinite(q) || q < 1) {
            throw new Error("Množstvo musí byť aspoň 1");
        }
        quantityUpdate = q;
    }

    // 1. Riešenie zmeny názvu (premenovanie priečinka a worklistu)
    if (data.name && data.name !== item.name) {
        const jobDir = path.join(JOBS_ROOT, createSlug(item.job.name));
        const oldPath = path.join(jobDir, item.name);
        const newPath = path.join(jobDir, data.name);

        try {
            await fs.access(oldPath);
            await fs.rename(oldPath, newPath);
        } catch (err) {
            console.warn(`Rename folder failed or folder not found: ${oldPath} -> ${newPath}`, err);
        }

        const oldWorklistPath = path.join(jobDir, "worklists", `${item.name}.jblx`);
        try {
            await fs.unlink(oldWorklistPath);
        } catch (err) {
            if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
                console.warn(`Failed to remove old worklist ${oldWorklistPath}:`, err);
            }
        }
    }

    // 2. Update DB záznamu (základné údaje)
    if (
        data.name ||
        quantityUpdate !== undefined ||
        data.width !== undefined ||
        data.height !== undefined ||
        data.depth !== undefined
    ) {
        await prisma.jobItem.update({
            where: { id: itemId },
            data: {
                name: data.name,
                quantity: quantityUpdate,
                width: data.width,
                height: data.height,
                depth: data.depth,
            },
        });
    }

    // 3. Update parametrov (neukladáme per-dielcové: X_C_Y, Y_C_X, HRUB)
    if (data.parameters) {
        const filteredEntries = Object.entries(data.parameters).filter(
            ([key]) => !isPerPartParam(key)
        );
        if (filteredEntries.length > 0) {
            const updates = filteredEntries.map(([key, value]) =>
                prisma.jobItemParameterValue.upsert({
                    where: {
                        itemId_paramName: {
                            itemId,
                            paramName: key,
                        },
                    },
                    update: { value },
                    create: {
                        itemId,
                        paramName: key,
                        value,
                    },
                })
            );
            await prisma.$transaction(updates);
        }
    }

    // 3b. Update množstiev dielcov (fileQuantities)
    if (data.fileQuantities && data.fileQuantities.length > 0) {
        for (const { fileId, quantity } of data.fileQuantities) {
            const q = Math.max(1, Math.floor(quantity));
            await prisma.jobItemFileQuantity.upsert({
                where: {
                    itemId_fileId: { itemId, fileId },
                },
                update: { quantity: q },
                create: { itemId, fileId, quantity: q },
            });
        }
    }

    // 4. Spustenie recalcu (ak sa zmenili parametre alebo rozmery/meno)
    // Recalc používame vždy pri update, aby sa prejavili zmeny (napr. nové meno v ceste, nové parametry)
    recalcJobItem(itemId).catch((err) => {
        console.error(`Error triggering recalc for ${itemId}:`, err);
    });

    return { success: true };
}

/**
 * Odstráni položku zákazky vrátane priečinka
 */
export async function deleteJobItem(itemId: string) {
    const item = await prisma.jobItem.findUnique({
        where: { id: itemId },
        include: { job: true },
    });

    if (!item) {
        return { success: false, error: "Item not found" }; // Alebo throw, ale pre delete je idempotentnosť OK
    }

    const jobDir = path.join(JOBS_ROOT, createSlug(item.job.name));
    const itemDir = path.join(jobDir, item.name);
    const worklistPath = path.join(jobDir, "worklists", `${item.name}.jblx`);

    // 1. Zmazanie worklistu (.jblx) ak existuje
    try {
        await fs.unlink(worklistPath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
            console.error(`Failed to delete worklist ${worklistPath}:`, err);
        }
    }

    // 2. Zmazanie priečinka skrinky
    try {
        await fs.rm(itemDir, { recursive: true, force: true });
    } catch (err) {
        console.error(`Failed to delete directory ${itemDir}:`, err);
        // Pokračujeme zmazaním z DB
    }

    // 3. Zmazanie z DB
    await prisma.jobItem.delete({
        where: { id: itemId },
    });

    return { success: true };
}

// Helper
function createSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
