import Link from "next/link";
import { notFound } from "next/navigation";
import { getCabinetDetail } from "@/lib/cabinet-import";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, FileCode, Settings2 } from "lucide-react";

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

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Súbory */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCode className="h-5 w-5" />
                            Súbory ({cabinet.files.length})
                        </CardTitle>
                        <CardDescription>
                            .ganx programy pre jednotlivé dielce
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {cabinet.files.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileCode className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium text-slate-900">
                                            {file.filename}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Parametre */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5" />
                            Parametre ({cabinet.parameters.length})
                        </CardTitle>
                        <CardDescription>
                            Nastaviteľné parametre skrinky
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {cabinet.parameters.map((param) => (
                                <div
                                    key={param.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {param.paramName}
                                        </p>
                                        <p className="text-sm text-slate-500">{param.label}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-sm text-slate-700">
                                            {param.defaultValue}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {param.paramType}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
