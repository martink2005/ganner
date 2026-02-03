"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";

export default function NastaveniaPage() {
    const [cncProgramsPath, setCncProgramsPath] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    setCncProgramsPath(data.cncProgramsPath ?? "");
                }
            } catch (e) {
                setError("Nepodarilo sa načítať nastavenia");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setError(null);
        setSuccess(false);
        setSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cncProgramsPath: cncProgramsPath.trim() }),
            });
            if (res.ok) {
                setSuccess(true);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Nepodarilo sa uložiť");
            }
        } catch (e) {
            setError("Nastala chyba pri ukladaní");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Nastavenia</h1>
                <p className="mt-1 text-slate-600">
                    Cesta k programom na CNC stroji – používa sa vo worklistoch (.jblx)
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cesta k programom na CNC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cnc-path">Cesta k programom</Label>
                        <Input
                            id="cnc-path"
                            value={cncProgramsPath}
                            onChange={(e) => setCncProgramsPath(e.target.value)}
                            placeholder="C:\GannoMAT Programs"
                            className="font-mono"
                        />
                        <p className="text-xs text-slate-500">
                            Táto cesta sa zapíše do worklistov (.jblx) v elemente File – CNC stroj z nej načíta programy.
                        </p>
                    </div>
                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                    {success && (
                        <p className="text-sm text-green-600">Nastavenia boli uložené.</p>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Uložiť
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
