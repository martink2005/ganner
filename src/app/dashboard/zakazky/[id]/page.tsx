import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { JobDetailClient } from "./client";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
    const { id } = await params;

    const job = await prisma.job.findUnique({
        where: { id },
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
        notFound();
    }

    // Serializácia pre Client Component (Next.js potrebuje plain objects)
    // Dátumy musíme previesť na stringy pre istotu, ale Prisma vracia Date objekty ktoré Server Components vedia preposlať Client Components ak sú serialized?
    // V default Next.js setup áno, ale pre istotu fetchujeme dáta v Client Componente alebo ich passneme ako initialData.
    // Tu použijeme Server Component na fetch a Client Component na interaktivitu.

    return <JobDetailClient initialJob={job} />;
}
