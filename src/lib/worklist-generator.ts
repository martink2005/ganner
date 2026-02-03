/**
 * Generátor worklistov (.jblx) pre skrinky – XML zoznam programov pre CNC
 */

import { promises as fs } from "fs";
import path from "path";
import { getCncProgramsPath } from "@/lib/settings";
import { extractPrgrSet } from "@/lib/ganx-parser";

const JOBS_ROOT = "./zakazky";
const JBLX_NS = "http://tempuri.org/Joblst.xsd";

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function createSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export type JobItemForWorklist = {
    id: string;
    name: string;
    job: { name: string };
    cabinet: {
        files: Array<{ id: string; filename: string }>;
    };
    fileQuantities: Array<{ fileId: string; quantity: number }>;
};

/**
 * Vygeneruje worklist (.jblx) pre jednu položku zákazky (skrinku).
 * Predpokladá, že .ganx súbory už sú zapísané v itemDir.
 * Pri chybe loguje a nepadne – vráti false.
 */
export async function createWorklistForItem(
    item: JobItemForWorklist,
    itemDir: string
): Promise<boolean> {
    try {
        const cncPath = await getCncProgramsPath();
        const jobSlug = createSlug(item.job.name);
        const worklistsDir = path.join(path.dirname(itemDir), "worklists");
        await fs.mkdir(worklistsDir, { recursive: true });
        const outputPath = path.join(worklistsDir, `${item.name}.jblx`);

        const quantityByFileId: Record<string, number> = {};
        item.fileQuantities.forEach((fq) => {
            quantityByFileId[fq.fileId] = Math.max(1, Math.floor(fq.quantity));
        });

        const rows: string[] = [];
        for (const file of item.cabinet.files) {
            const baseName = file.filename.replace(/\.ganx$/i, "");
            const quantity = quantityByFileId[file.id] ?? 1;
            const ganxPath = path.join(itemDir, file.filename);
            let description = "";
            try {
                const content = await fs.readFile(ganxPath, "utf-8");
                const prgrSet = extractPrgrSet(content);
                description = prgrSet?.description ?? "";
            } catch (err) {
                console.warn(`Worklist: nepodarilo sa načítať Description z ${ganxPath}`, err);
            }
            const filePathForCnc = path.win32.join(
                cncPath.replace(/\/$/, ""),
                jobSlug,
                item.name,
                file.filename
            );
            rows.push(
                `  <JobLstTable>\n` +
                `    <Name>${escapeXml(baseName)}</Name>\n` +
                `    <File>${escapeXml(filePathForCnc)}</File>\n` +
                `    <Description>${escapeXml(description)}</Description>\n` +
                `    <Stueck>${quantity}</Stueck>\n` +
                `  </JobLstTable>`
            );
        }

        const xml =
            `<?xml version="1.0" ?>\n` +
            `<Joblst xmlns="${JBLX_NS}">\n` +
            rows.join("\n") +
            "\n</Joblst>\n";

        await fs.writeFile(outputPath, xml, "utf-8");
        return true;
    } catch (err) {
        console.error(`Worklist generation failed for item ${item.id}:`, err);
        return false;
    }
}
