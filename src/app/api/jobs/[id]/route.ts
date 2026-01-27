import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/jobs/[id] - Detail zákazky
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const jobId = params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                items: {
                    include: {
                        cabinet: true,
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!job) {
            return NextResponse.json(
                { error: "Zákazka neexistuje" },
                { status: 404 }
            );
        }

        return NextResponse.json({ job });
    } catch (error) {
        console.error("Get Job API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní zákazky" },
            { status: 500 }
        );
    }
}
