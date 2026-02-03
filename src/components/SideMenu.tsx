"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ClipboardList, FileText, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
    },
    {
        href: "/dashboard/katalog",
        label: "Katalóg",
        icon: BookOpen,
    },
    {
        href: "/dashboard/zakazky",
        label: "Zákazky",
        icon: ClipboardList,
    },
    {
        href: "/dashboard/dokumentacia",
        label: "Dokumentácia",
        icon: FileText,
    },
    {
        href: "/dashboard/nastavenia",
        label: "Nastavenia",
        icon: Settings,
    },
];

export function SideMenu() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
            {/* Logo / Header */}
            <div className="flex h-16 items-center border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-sm">
                <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-extrabold text-slate-900 shadow-sm">
                    GP
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold tracking-wide text-slate-100">
                        Gannomat ProTec
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {menuItems.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="border-t border-slate-700 p-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5" />
                    Odhlásiť sa
                </Button>
            </div>
        </aside>
    );
}
