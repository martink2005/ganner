import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ManualParametrePage() {
    return (
        <div className="space-y-8">
            <div>
                <Link
                    href="/dashboard/dokumentacia"
                    className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Späť na dokumentáciu
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">
                    Manuál – parametre pre programovanie
                </h1>
                <p className="mt-1 text-slate-600">
                    Parametre pre rozmery: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">*_C_*</code>, <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">HRUB</code>; pre počet polic: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">POLMN</code>.
                </p>
            </div>

            <section className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Čo znamenajú parametre (jednoducho)</h2>
                <p className="mt-2 text-slate-600">
                    Potrebujete presne <strong>3</strong> parametre: dva v tvare <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">X_C_Y</code> / <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">Y_C_X</code> a jeden <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">HRUB</code>.
                </p>
                <ul className="mt-4 space-y-4 text-slate-600">
                    <li>
                        <strong className="text-slate-800">X_C_Y</strong> (alebo Y_C_X, Z_C_X, …):
                        <ul className="mt-2 list-inside list-disc space-y-1 pl-2 text-sm">
                            <li><strong>Prvé písmeno</strong> (X alebo Y) = ktorý rozmer dielca sa počíta (šírka alebo výška).</li>
                            <li><strong>C</strong> = len oddelovač (stred), nič nemení.</li>
                            <li><strong>Tretie písmeno</strong> (X, Y alebo Z) = z ktorého rozmeru skrinky berieme základ.</li>
                            <li><strong>Hodnota</strong> = offset, ktorý sa pripočíta k rozmeru skrinky.</li>
                        </ul>
                        <p className="mt-2 text-sm">Príklad: <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">X_C_Y</code> = 10 znamená: šírka dielca = výška skrinky + 10.</p>
                    </li>
                    <li>
                        <strong className="text-slate-800">Y_C_X</strong> – to isté, len pre druhý rozmer dielca (výška dielca = šírka skrinky + hodnota).
                    </li>
                    <li>
                        <strong className="text-slate-800">HRUB</strong> = hrúbka dielca. Jedna hodnota v mm – hrúbka materiálu.
                    </li>
                </ul>
            </section>

            <section className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Pravidlá</h2>
                <ul className="mt-3 list-inside list-disc space-y-2 text-slate-600">
                    <li>
                        <strong>*_C_*</strong>: Názov v tvare <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">X_C_Y</code> (X, Y, Z v rôznych kombináciách).
                        Presne <strong>2</strong> takéto parametre v každom .ganx. Prvá časť = cieľová os rozmeru dielca (wsX/wsY),
                        tretia = os rozmeru skrinky, z ktorej sa berie základ. <strong>Z</strong> ako cieľová os nie je dovolená
                        (os Z je rezervovaná pre HRUB).
                    </li>
                    <li>
                        <strong>HRUB</strong>: Jeden parameter s názvom presne <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">HRUB</code>;
                        jeho hodnota = hrúbka dielca (wsZ).
                    </li>
                </ul>
            </section>

            <section className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Príklad kombinácie</h2>
                <p className="mt-2 text-slate-600">
                    Typická kombinácia <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">X_C_Y</code> a{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm">Y_C_X</code> – napr. pre bočný dielec:
                    dĺžka v smere X z výšky skrinky, dĺžka v smere Y zo šírky skrinky, hrúbka = HRUB.
                </p>
            </section>

            <section className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Parameter pre počet polic – POLMN</h2>
                <p className="mt-2 text-slate-600">
                    Počet polic sa v .ganx definuje parametrom s názvom <strong>POLMN</strong> (v <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">&lt;ParameterListe&gt;</code> ako <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">ParamName</code> POLMN).
                    Používateľ ho nastavuje v zákazke pri skrinke. Systém pri generovaní programov podľa hodnoty POLMN nastavuje v operáciách (v tagoch <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">&lt;PrgrFile&gt;</code>, kde je použitý <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">{`{POLMN}`}</code>) hodnotu <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">&lt;int2&gt;</code>: párna hodnota POLMN → 1, neparná → 0 – pre správny prepočet rozostupu vŕtania a podobných operácií.
                </p>
            </section>
        </div>
    );
}
