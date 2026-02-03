/**
 * Nastavenia aplikácie (key-value z DB)
 */

import prisma from "@/lib/prisma";

export const CNC_PROGRAMS_PATH_KEY = "cnc_programs_path";
const CNC_PROGRAMS_PATH_DEFAULT = "C:\\GannoMAT Programs";

/**
 * Načíta hodnotu nastavenia podľa kľúča.
 * Ak kľúč neexistuje, vráti predvolenú hodnotu pre známe kľúče, inak null.
 */
export async function getSetting(key: string): Promise<string | null> {
    const row = await prisma.setting.findUnique({
        where: { key },
    });
    if (row) return row.value;
    if (key === CNC_PROGRAMS_PATH_KEY) return CNC_PROGRAMS_PATH_DEFAULT;
    return null;
}

/**
 * Nastaví hodnotu pre kľúč (upsert).
 */
export async function setSetting(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
}

/**
 * Získa cestu k programom na CNC (pre worklisty).
 * Vždy vráti neprázdny reťazec – buď z DB alebo predvolenú hodnotu.
 */
export async function getCncProgramsPath(): Promise<string> {
    const value = await getSetting(CNC_PROGRAMS_PATH_KEY);
    return value ?? CNC_PROGRAMS_PATH_DEFAULT;
}
