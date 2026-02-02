import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { LastJobsTable } from "./LastJobsTable";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
    const user = await getCurrentUser();

    const [cabinetCount, jobCount, generatedCount, lastJobs] = await Promise.all([
        prisma.cabinet.count(),
        prisma.job.count(),
        prisma.jobItem.count({ where: { outputStatus: "generated" } }),
        prisma.job.findMany({
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, name: true, updatedAt: true },
        }),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">
                    Vitaj späť{user?.email ? `, ${user.email}` : ""}!
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link
                    href="/dashboard/katalog"
                    className={cn(
                        "rounded-lg border border-slate-200 bg-white p-6 shadow-sm",
                        "cursor-pointer transition-colors hover:border-slate-400"
                    )}
                >
                    <h3 className="text-sm font-medium text-slate-500">Katalóg</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {cabinetCount}
                    </p>
                    <p className="text-sm text-slate-600">skriniek</p>
                </Link>

                <Link
                    href="/dashboard/zakazky"
                    className={cn(
                        "rounded-lg border border-slate-200 bg-white p-6 shadow-sm",
                        "cursor-pointer transition-colors hover:border-slate-400"
                    )}
                >
                    <h3 className="text-sm font-medium text-slate-500">Zákazky</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {jobCount}
                    </p>
                    <p className="text-sm text-slate-600">aktívnych zákaziek</p>
                </Link>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Programy</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {generatedCount}
                    </p>
                    <p className="text-sm text-slate-600">programov</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Posledné zákazky</CardTitle>
                    <CardDescription>
                        Posledných 5 zákaziek podľa dátumu úpravy
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {lastJobs.length > 0 ? (
                        <LastJobsTable jobs={lastJobs} />
                    ) : (
                        <p className="py-6 text-center text-muted-foreground">
                            Zatiaľ žiadne zákazky.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
