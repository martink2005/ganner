import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { ItemDetailClient } from "./client";

interface Props {
    params: Promise<{ id: string; itemId: string }>;
}

export default async function ItemDetailPage({ params }: Props) {
    const { id, itemId } = await params;

    const item = await prisma.jobItem.findUnique({
        where: { id: itemId },
        include: {
            cabinet: {
                include: {
                    parameters: {
                        orderBy: [{ groupId: "asc" }, { sortId: "asc" }],
                        include: { group: true },
                    },
                    parameterGroups: { orderBy: { sortOrder: "asc" } },
                    files: true,
                },
            },
            parameterValues: true,
            fileQuantities: true,
        },
    });

    if (!item) {
        notFound();
    }

    return <ItemDetailClient initialItem={item} jobId={id} />;
}
