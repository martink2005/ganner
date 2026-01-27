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
        const { cabinetId } = body;

        if (!cabinetId) {
            return NextResponse.json(
                { error: "Cabinet ID je povinné" },
                { status: 400 }
            );
        }

        const jobItem = await addCabinetToJob(jobId, cabinetId);

        return NextResponse.json({ item: jobItem });
    } catch (error) {
        console.error("Add Job Item API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Nastala chyba" },
            { status: 500 }
        );
    }
}


