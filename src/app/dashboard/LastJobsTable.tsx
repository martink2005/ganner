"use client";

import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Job = { id: string; name: string; updatedAt: Date | string };

export function LastJobsTable({ jobs }: { jobs: Job[] }) {
    const router = useRouter();

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead className="text-right">Upravené</TableHead>
                    <TableHead className="w-10" />
                </TableRow>
            </TableHeader>
            <TableBody>
                {jobs.map((job) => (
                    <TableRow
                        key={job.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/50",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                        onClick={() =>
                            router.push(`/dashboard/zakazky/${job.id}`)
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/dashboard/zakazky/${job.id}`);
                            }
                        }}
                    >
                        <TableCell className="font-medium">{job.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {new Date(job.updatedAt).toLocaleDateString(
                                "sk-SK",
                                {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                }
                            )}
                        </TableCell>
                        <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
