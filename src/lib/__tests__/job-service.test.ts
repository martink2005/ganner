import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
    jobItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
    },
    job: {
        findUnique: vi.fn(),
    },
    cabinet: {
        findUnique: vi.fn(),
    },
}));

vi.mock("@/lib/prisma", () => ({
    default: mockPrisma,
}));

// Mock fs.promises so recalcJobItem (mkdir, readFile, writeFile) doesn't throw
vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("fs")>();
    return {
        ...actual,
        promises: {
            mkdir: vi.fn().mockResolvedValue(undefined),
            readFile: vi.fn().mockResolvedValue("<xml/>"),
            writeFile: vi.fn().mockResolvedValue(undefined),
            access: vi.fn().mockResolvedValue(undefined),
            rm: vi.fn().mockResolvedValue(undefined),
            rename: vi.fn().mockResolvedValue(undefined),
        },
    };
});

// Mock ganx-parser so recalcJobItem doesn't throw
vi.mock("@/lib/ganx-parser", () => ({
    extractParameters: vi.fn(() => [
        { paramName: "X_C_Y", paramValue: "0", value: "0" },
        { paramName: "Y_C_X", paramValue: "0", value: "0" },
        { paramName: "HRUB", paramValue: "18", value: "18" },
    ]),
    updateGanxParameters: vi.fn((content: string) => content),
    updateGanxPrgrSet: vi.fn((content: string) => content),
}));

describe("Job Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("updateJobItem", () => {
        const minimalItem = {
            id: "item-1",
            name: "cab_1",
            jobId: "job-1",
            cabinetId: "cab-1",
            quantity: 1,
            width: 100,
            height: 200,
            depth: 50,
            outputStatus: "pending",
            job: { name: "Test Job" },
        };

        it("throws when quantity is less than 1", async () => {
            const { updateJobItem } = await import("../job-service");
            mockPrisma.jobItem.findUnique
                .mockResolvedValueOnce(minimalItem)
                .mockResolvedValueOnce(minimalItem);

            await expect(
                updateJobItem("item-1", { quantity: 0 })
            ).rejects.toThrow("Množstvo musí byť aspoň 1");

            await expect(
                updateJobItem("item-1", { quantity: -1 })
            ).rejects.toThrow("Množstvo musí byť aspoň 1");
        });

        it("persists valid quantity and calls update with quantity", async () => {
            const { updateJobItem } = await import("../job-service");
            mockPrisma.jobItem.findUnique
                .mockResolvedValueOnce(minimalItem)
                .mockResolvedValueOnce({
                    ...minimalItem,
                    job: { name: "Test Job" },
                    cabinet: { catalogPath: ".", files: [] },
                    parameterValues: [],
                });
            mockPrisma.jobItem.update.mockResolvedValue(undefined);

            await updateJobItem("item-1", { quantity: 2 });

            const updateCalls = mockPrisma.jobItem.update.mock.calls as { 0: { data?: { quantity?: number } } }[];
            const dataCall = updateCalls.find((c) => c[0]?.data?.quantity === 2);
            expect(dataCall).toBeDefined();
            expect(dataCall![0].data.quantity).toBe(2);
        });
    });

    describe("addCabinetToJob", () => {
        it("creates job item with default quantity 1 when not provided", async () => {
            const { addCabinetToJob } = await import("../job-service");
            mockPrisma.job.findUnique.mockResolvedValue({ id: "job-1", name: "Job" });
            mockPrisma.cabinet.findUnique.mockResolvedValue({
                id: "cab-1",
                slug: "cab",
                baseWidth: 100,
                baseHeight: 200,
                baseDepth: 50,
                catalogPath: ".",
                files: [],
                parameters: [],
            });
            mockPrisma.jobItem.findUnique.mockResolvedValue(null);
            mockPrisma.jobItem.create.mockResolvedValue({
                id: "new-item",
                name: "cab_1",
                jobId: "job-1",
                cabinetId: "cab-1",
                job: { name: "Job" },
                cabinet: { catalogPath: ".", files: [] },
                parameterValues: [],
            });

            await addCabinetToJob("job-1", "cab-1");

            expect(mockPrisma.jobItem.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        quantity: 1,
                    }),
                })
            );
        });

        it("creates job item with provided quantity", async () => {
            const { addCabinetToJob } = await import("../job-service");
            mockPrisma.job.findUnique.mockResolvedValue({ id: "job-1", name: "Job" });
            mockPrisma.cabinet.findUnique.mockResolvedValue({
                id: "cab-1",
                slug: "cab",
                baseWidth: 100,
                baseHeight: 200,
                baseDepth: 50,
                catalogPath: ".",
                files: [],
                parameters: [],
            });
            mockPrisma.jobItem.findUnique.mockResolvedValue(null);
            mockPrisma.jobItem.create.mockResolvedValue({
                id: "new-item",
                name: "cab_1",
                jobId: "job-1",
                cabinetId: "cab-1",
                job: { name: "Job" },
                cabinet: { catalogPath: ".", files: [] },
                parameterValues: [],
            });

            await addCabinetToJob("job-1", "cab-1", { quantity: 5 });

            expect(mockPrisma.jobItem.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        quantity: 5,
                    }),
                })
            );
        });

        it("clamps quantity to at least 1 when invalid value passed", async () => {
            const { addCabinetToJob } = await import("../job-service");
            mockPrisma.job.findUnique.mockResolvedValue({ id: "job-1", name: "Job" });
            mockPrisma.cabinet.findUnique.mockResolvedValue({
                id: "cab-1",
                slug: "cab",
                baseWidth: 100,
                baseHeight: 200,
                baseDepth: 50,
                catalogPath: ".",
                files: [],
                parameters: [],
            });
            mockPrisma.jobItem.findUnique.mockResolvedValue(null);
            mockPrisma.jobItem.create.mockResolvedValue({
                id: "new-item",
                name: "cab_1",
                jobId: "job-1",
                cabinetId: "cab-1",
                job: { name: "Job" },
                cabinet: { catalogPath: ".", files: [] },
                parameterValues: [],
            });

            await addCabinetToJob("job-1", "cab-1", { quantity: 0 });

            expect(mockPrisma.jobItem.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        quantity: 1,
                    }),
                })
            );
        });

        it("does not create JobItemParameterValue for per-part params (X_C_Y, Y_C_X, HRUB)", async () => {
            const { addCabinetToJob } = await import("../job-service");
            mockPrisma.job.findUnique.mockResolvedValue({ id: "job-1", name: "Job" });
            mockPrisma.cabinet.findUnique.mockResolvedValue({
                id: "cab-1",
                slug: "cab",
                baseWidth: 100,
                baseHeight: 200,
                baseDepth: 50,
                catalogPath: ".",
                files: [],
                parameters: [
                    { paramName: "X_C_Y", defaultValue: "5" },
                    { paramName: "Y_C_X", defaultValue: "0" },
                    { paramName: "HRUB", defaultValue: "18" },
                    { paramName: "LX", defaultValue: "600" },
                ],
            });
            mockPrisma.jobItem.findUnique.mockResolvedValue(null);
            mockPrisma.jobItem.create.mockResolvedValue({
                id: "new-item",
                name: "cab_1",
                jobId: "job-1",
                cabinetId: "cab-1",
                job: { name: "Job" },
                cabinet: { catalogPath: ".", files: [] },
                parameterValues: [],
            });

            await addCabinetToJob("job-1", "cab-1");

            const createCall = mockPrisma.jobItem.create.mock.calls[0];
            const paramCreates = (createCall[0] as { data: { parameterValues?: { create: { paramName: string }[] } } })
                .data.parameterValues?.create ?? [];
            const paramNames = paramCreates.map((p) => p.paramName);

            expect(paramNames).not.toContain("X_C_Y");
            expect(paramNames).not.toContain("Y_C_X");
            expect(paramNames).not.toContain("HRUB");
            expect(paramNames).toContain("LX");
            expect(paramNames).toHaveLength(1);
        });
    });
});
