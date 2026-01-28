import Link from "next/link";
import { notFound } from "next/navigation";
import { getCabinetDetail } from "@/lib/cabinet-import";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CabinetDetailClient } from "./client";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function CabinetDetailPage({ params }: Props) {
    const { slug } = await params;
    const cabinet = await getCabinetDetail(slug);

    if (!cabinet) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/katalog">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{cabinet.name}</h1>
                    <p className="text-slate-600 mt-1">
                        {cabinet.baseWidth && cabinet.baseHeight && cabinet.baseDepth
                            ? `Základné rozmery: ${cabinet.baseWidth} × ${cabinet.baseHeight} × ${cabinet.baseDepth} mm`
                            : "Detail skrinky z katalógu"}
                    </p>
                </div>
            </div>

            <CabinetDetailClient cabinet={cabinet} />
        </div>
    );
}
