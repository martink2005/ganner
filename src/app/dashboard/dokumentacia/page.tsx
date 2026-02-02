import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight } from "lucide-react";

export default function DokumentaciaPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dokumentácia</h1>
                <p className="mt-1 text-slate-600">
                    Návody a manuály pre programovanie a používanie aplikácie
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link
                    href="/dashboard/dokumentacia/manual"
                    className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Manuál – parametre pre programovanie
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Definícia parametrov *_C_* a HRUB v .ganx
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
