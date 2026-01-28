"use server";

import { promises as fs } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import {
    parseGanxFile,
    extractOperations,
    GanxOperation,
    GanxPrgrSet,
} from "@/lib/ganx-parser";

export interface GanxFileDetail {
    filename: string;
    prgrSet: GanxPrgrSet | null;
    operations: GanxOperation[];
}

export async function getGanxFileDetail(
    cabinetSlug: string,
    fileId: string
): Promise<{ success: boolean; data?: GanxFileDetail; error?: string }> {
    try {
        const cabinet = await prisma.cabinet.findUnique({
            where: { slug: cabinetSlug },
            include: {
                files: {
                    where: { id: fileId },
                },
            },
        });

        if (!cabinet) {
            return { success: false, error: "Skrinka sa nenašla" };
        }

        const file = cabinet.files[0];
        if (!file) {
            return { success: false, error: "Súbor sa nenašiel" };
        }

        // Cesta k súboru v katalógu
        // catalogPath je napr. "catalog/skrinka-1"
        // Musíme použiť absolútnu cestu alebo relatívnu k rootu projektu
        const filePath = path.join(process.cwd(), cabinet.catalogPath, file.filename);

        try {
            const content = await fs.readFile(filePath, "utf-8");
            const parsed = parseGanxFile(content);
            const operations = extractOperations(content);

            return {
                success: true,
                data: {
                    filename: file.filename,
                    prgrSet: parsed.prgrSet,
                    operations,
                },
            };
        } catch (error) {
            console.error("Error reading file:", error);
            return { success: false, error: "Nepodarilo sa načítať súbor z disku" };
        }
    } catch (error) {
        console.error("Server action error:", error);
        return { success: false, error: "Nastala chyba na serveri" };
    }
}
