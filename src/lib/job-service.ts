/**
 * Job Service - Logika pre správu zákaziek a generovanie programov
 */

import { promises as fs } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { updateGanxParameters } from "@/lib/ganx-parser";

const JOBS_ROOT = "./zakazky";

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
 * Pridá skrinku do zákazky
 */
export async function addCabinetToJob(jobId: string, cabinetId: string) {
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

    // Vytvorenie položky v DB
    const jobItem = await prisma.jobItem.create({
        data: {
            jobId,
            cabinetId,
            name: uniqueName,
            width: cabinet.baseWidth,
            height: cabinet.baseHeight,
            depth: cabinet.baseDepth,
            outputStatus: "pending",
            // Skopírujeme default hodnoty parametrov
            parameterValues: {
                create: cabinet.parameters.map((p: any) => ({
                    paramName: p.paramName,
                    value: p.defaultValue || "",
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
            },
        });

        if (!item) throw new Error("Položka neexistuje");

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

        // 3. Príprava parametrov na prepis
        const paramsMap: Record<string, string> = {};
        item.parameterValues.forEach((p: any) => {
            paramsMap[p.paramName] = p.value;
        });

        // Pridáme aj hlavné rozmery ak sú definované v parametroch (napr. LX, LY, LZ)
        // Toto závisí od logiky mapovania, zatiaľ prepisujeme len explicitné parametre.
        // Ak "LX" je parameter, už je v paramsMap.

        // 4. Spracovanie súborov
        for (const file of item.cabinet.files) {
            const sourcePath = path.join(sourceDir, file.filename);
            const destPath = path.join(itemDir, file.filename);

            try {
                const content = await fs.readFile(sourcePath, "utf-8");
                const updatedContent = updateGanxParameters(content, paramsMap);
                await fs.writeFile(destPath, updatedContent, "utf-8");
            } catch (err) {
                console.error(`Failed to process file ${file.filename}:`, err);
                // Pokračujeme ďalšími súbormi, ale zaznamenáme chybu
            }
        }

        // 5. Update status na generated
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
    }
) {
    const item = await prisma.jobItem.findUnique({
        where: { id: itemId },
        include: { job: true },
    });

    if (!item) throw new Error("Položka neexistuje");

    // 1. Riešenie zmeny názvu (premenovanie priečinka)
    if (data.name && data.name !== item.name) {
        const jobDir = path.join(JOBS_ROOT, createSlug(item.job.name));
        const oldPath = path.join(jobDir, item.name);
        const newPath = path.join(jobDir, data.name);

        try {
            // Skontrolujeme či starý priečinok existuje
            await fs.access(oldPath);
            // Premenujeme
            await fs.rename(oldPath, newPath);
        } catch (err) {
            // Ak startý priečinok neexistuje (napr. ešte nebol vygenerovaný), nevadí.
            // Ak nastala iná chyba, logneme ju, ale pokračujeme v DB update (recalc vytvorí nový priečinok)
            console.warn(`Rename folder failed or folder not found: ${oldPath} -> ${newPath}`, err);
        }
    }

    // 2. Update DB záznamu (základné údaje)
    if (
        data.name ||
        data.quantity !== undefined ||
        data.width !== undefined ||
        data.height !== undefined ||
        data.depth !== undefined
    ) {
        await prisma.jobItem.update({
            where: { id: itemId },
            data: {
                name: data.name,
                quantity: data.quantity,
                width: data.width,
                height: data.height,
                depth: data.depth,
            },
        });
    }

    // 3. Update parametrov
    if (data.parameters) {
        const updates = Object.entries(data.parameters).map(([key, value]) =>
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

    // 1. Zmazanie priečinka
    const jobDir = path.join(JOBS_ROOT, createSlug(item.job.name));
    const itemDir = path.join(jobDir, item.name);

    try {
        await fs.rm(itemDir, { recursive: true, force: true });
    } catch (err) {
        console.error(`Failed to delete directory ${itemDir}:`, err);
        // Pokračujeme zmazaním z DB
    }

    // 2. Zmazanie z DB
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
