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
            cabinet: true,
            parameterValues: true,
        },
    });

    if (!item) {
        notFound();
    }

    return <ItemDetailClient initialItem={item} jobId={id} />;
}
