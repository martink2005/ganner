import { SideMenu } from "@/components/SideMenu";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen">
            <SideMenu />
            <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
        </div>
    );
}
