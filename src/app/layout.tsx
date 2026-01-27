import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
    title: "Gannomat ProTec",
    description: "Webová aplikácia na automatizáciu CNC programov",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="sk">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
