"use client";

import { useEffect, useRef, useState } from "react";
import { GanxOperation } from "@/lib/ganx-parser";

interface PartPreviewProps {
    width: number;
    height: number;
    depth?: number;
    operations: GanxOperation[];
}

export function PartPreview({ width, height, operations }: PartPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Výpočet škály pre "fit to view"
    useEffect(() => {
        if (!containerRef.current || width === 0 || height === 0) return;

        const container = containerRef.current;
        const padding = 40; // Odstup od okrajov
        const availableWidth = container.clientWidth - padding;
        const availableHeight = container.clientHeight - padding;

        const scaleX = availableWidth / width;
        const scaleY = availableHeight / height;

        // Použijeme menšiu z mierok aby sa zmestilo celé
        setScale(Math.min(scaleX, scaleY));

        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth - padding;
            const h = containerRef.current.clientHeight - padding;
            setScale(Math.min(w / width, h / height));
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [width, height]);

    // Filtrácia iba vŕtaní (Type B)
    const drillings = operations.filter((op) => op.type === "B");

    return (
        <div
            ref={containerRef}
            className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative"
        >
            <div
                style={{
                    width: width * scale,
                    height: height * scale,
                    position: "relative",
                }}
                className="bg-white shadow-lg transition-all duration-300"
            >
                {/* SVG Vykreslenie */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${width} ${height}`}
                    // Otáčame súradnicový systém aby Y išlo hore (ak je to v GANX bežné)
                    // Ale HTML/SVG má Y dole. Väčšina CNC má Y hore.
                    // Pre vizualizáciu zachováme SVG štandard (Y dole) a len vykreslíme ako je.
                    // Ak by to bolo naopak, použili by sme transform="scale(1, -1)"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Okraj dosky */}
                    <rect
                        x="0"
                        y="0"
                        width={width}
                        height={height}
                        fill="#f8fafc" // Slate 50
                        stroke="#64748b" // Slate 500
                        strokeWidth="1"
                    />

                    {/* Vŕtania */}
                    {drillings.map((op, index) => (
                        <g key={index}>
                            <circle
                                cx={op.x}
                                cy={op.y} // V Ganx môže byť Y opačne, zatiaľ predpokladáme štandard
                                r={(op.diameter || 5) / 2}
                                fill="#e2e8f0" // Slate 200
                                stroke="#ef4444" // Red 500
                                strokeWidth="0.5"
                            />
                            {/* Stredový krížik pre lepšiu viditeľnosť */}
                            <line
                                x1={op.x - (op.diameter || 5) / 2}
                                y1={op.y}
                                x2={op.x + (op.diameter || 5) / 2}
                                y2={op.y}
                                stroke="#ef4444"
                                strokeWidth="0.2"
                            />
                            <line
                                x1={op.x}
                                y1={op.y - (op.diameter || 5) / 2}
                                x2={op.x}
                                y2={op.y + (op.diameter || 5) / 2}
                                stroke="#ef4444"
                                strokeWidth="0.2"
                            />
                        </g>
                    ))}
                </svg>

                {/* Rozmery label */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono">
                    {width} mm
                </div>
                <div className="absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-xs text-slate-500 font-mono">
                    {height} mm
                </div>
            </div>

            <div className="absolute top-2 right-2 bg-white/80 p-2 rounded text-xs text-slate-500 font-mono">
                Mierka: {scale.toFixed(2)}x
            </div>
        </div>
    );
}
