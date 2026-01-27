import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createJob } from "@/lib/job-service";

/**
 * GET /api/jobs - Zoznam zákaziek
 */
export async function GET() {
    try {
        const jobs = await prisma.job.findMany({
            include: {
                _count: {
                    select: { items: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error("Jobs API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri načítaní zákaziek" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/jobs - Vytvorenie zákazky
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Názov zákazky je povinný" },
                { status: 400 }
            );
        }

        const job = await createJob(name, description);

        return NextResponse.json({ job });
    } catch (error) {
        console.error("Create Job API error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri vytváraní zákazky" },
            { status: 500 }
        );
    }
}
