import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
    const user = await getCurrentUser();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">
                    Vitaj späť{user?.email ? `, ${user.email}` : ""}!
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Katalóg</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">0</p>
                    <p className="text-sm text-slate-600">skriniek</p>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Zákazky</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">0</p>
                    <p className="text-sm text-slate-600">aktívnych zákaziek</p>
                </div>

                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Programy</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">0</p>
                    <p className="text-sm text-slate-600">vygenerovaných</p>
                </div>
            </div>
        </div>
    );
}
