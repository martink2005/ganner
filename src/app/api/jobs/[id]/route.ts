import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteJob, updateJob } from "@/lib/job-service";

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

/**
 * DELETE /api/jobs/[id] - Vymazanie zákazky vrátane priečinka (cascade vymaže JobItem)
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        await deleteJob(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Job DELETE API error:", error);
        const isNotFound =
            (error &&
                typeof error === "object" &&
                "code" in error &&
                (error as { code: string }).code === "P2025") ||
            (error instanceof Error &&
                error.message === "Zákazka neexistuje");
        if (isNotFound) {
            return NextResponse.json(
                { error: "Zákazka neexistuje" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Nastala chyba pri mazaní zákazky" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/jobs/[id] - Úprava názvu a popisu zákazky
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { name, description } = body as { name?: string; description?: string };

        if (name !== undefined && typeof name !== "string") {
            return NextResponse.json(
                { error: "Názov musí byť reťazec" },
                { status: 400 }
            );
        }
        if (name !== undefined && !name.trim()) {
            return NextResponse.json(
                { error: "Názov je povinný" },
                { status: 400 }
            );
        }
        if (description !== undefined && typeof description !== "string") {
            return NextResponse.json(
                { error: "Popis musí byť reťazec" },
                { status: 400 }
            );
        }

        const data: { name?: string; description?: string } = {};
        if (name !== undefined) data.name = name.trim();
        if (description !== undefined) data.description = description;

        const job = await updateJob(id, data);
        return NextResponse.json({ job });
    } catch (error) {
        console.error("Job PATCH API error:", error);
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code: string }).code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Zákazka neexistuje" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { error: "Nastala chyba pri úprave zákazky" },
            { status: 500 }
        );
    }
}
