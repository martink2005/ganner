import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addCabinetToJob } from "@/lib/job-service";

/**
 * POST /api/jobs/[id]/items - Pridanie skrinky do zákazky
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const jobId = params.id;
        const body = await request.json();
        const { cabinetId, quantity, width, height, depth } = body;

        if (!cabinetId) {
            return NextResponse.json(
                { error: "Cabinet ID je povinné" },
                { status: 400 }
            );
        }

        // Množstvo: voliteľné, celé číslo >= 1 (evidencia)
        const qty =
            quantity !== undefined
                ? Math.max(1, Math.floor(Number(quantity)))
                : 1;

        // Rozmery: voliteľné čísla v mm; ak uvedené, musia byť kladné
        const parseDim = (v: unknown): number | undefined => {
            if (v === undefined || v === null || v === "") return undefined;
            const n = Number(v);
            if (Number.isNaN(n) || n <= 0) return undefined;
            return n;
        };
        const w = parseDim(width);
        const h = parseDim(height);
        const d = parseDim(depth);
        if (
            (width !== undefined && width !== "" && w === undefined) ||
            (height !== undefined && height !== "" && h === undefined) ||
            (depth !== undefined && depth !== "" && d === undefined)
        ) {
            return NextResponse.json(
                { error: "Rozmery musia byť kladné čísla (mm)" },
                { status: 400 }
            );
        }

        const jobItem = await addCabinetToJob(jobId, cabinetId, {
            quantity: qty,
            width: w,
            height: h,
            depth: d,
        });

        return NextResponse.json({ item: jobItem });
    } catch (error) {
        console.error("Add Job Item API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Nastala chyba" },
            { status: 500 }
        );
    }
}


