import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma
const mockPrisma = vi.hoisted(() => ({
    cabinet: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock("@/lib/prisma", () => ({
    default: mockPrisma,
}));

// Mock parser
vi.mock("../ganx-parser", () => ({
    parseGanxFile: vi.fn(() => ({
        prgrSet: { wsX: 100, wsY: 200, wsZ: 18 },
        parameters: [
            { paramName: "X_C_Y", value: "1", description: "Test", paramValue: "1", sortId: 1 },
            { paramName: "Y_C_X", value: "1", description: "Test", paramValue: "1", sortId: 2 },
            { paramName: "HRUB", value: "18", description: "Hrúbka", paramValue: "18", sortId: 3 },
        ],
    })),
    deduplicateParameters: vi.fn((params) => params),
    inferParameterType: vi.fn(() => "number"),
}));
describe("Cabinet Import Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe("createSlug", () => {
        it("should create valid slug", async () => {
            const { createSlug } = await import("../cabinet-import");
            expect(createSlug("Test Cabinet 123")).toBe("test-cabinet-123");
            expect(createSlug("E001_TEK")).toBe("e001-tek");
        });
    });

    describe("importCabinet", () => {
        it("should fail if cabinet already exists", async () => {
            const { importCabinet } = await import("../cabinet-import");
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce({ id: "existing" });

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain("už existuje");
        });

        it("should fail if folder has no ganx files", async () => {
            const { importCabinet } = await import("../cabinet-import");
            const fs = (await import("fs")).promises;
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);
            vi.spyOn(fs, "readdir").mockResolvedValueOnce([] as any);

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain("neobsahuje žiadne");
        });

        it("should successfully import cabinet", async () => {
            const { importCabinet } = await import("../cabinet-import");
            const fs = (await import("fs")).promises;
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);

            // Mock Folder content
            const mockFiles = [
                { name: "test.ganx", isFile: () => true },
            ];
            vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
            vi.spyOn(fs, "readFile").mockResolvedValue("mock content" as any);
            vi.spyOn(fs, "mkdir").mockResolvedValue(undefined as any);
            vi.spyOn(fs, "writeFile").mockResolvedValue(undefined as any);

            // Mock DB creation
            mockPrisma.cabinet.create.mockResolvedValueOnce({
                id: "new-id",
                name: "path",
                slug: "path",
                files: ["test.ganx"],
                parameters: ["TEST"],
            });

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(true);
            expect(result.cabinet?.slug).toBe("path");
            expect(mockPrisma.cabinet.create).toHaveBeenCalled();
            expect(fs.mkdir).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it("should fail if a file does not have at least 2 ^[XYZ]_C_[XYZ]$ params", async () => {
            const { importCabinet } = await import("../cabinet-import");
            const fs = (await import("fs")).promises;
            const { parseGanxFile } = await import("../ganx-parser");
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);

            const mockFiles = [{ name: "bad.ganx", isFile: () => true }];
            vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
            vi.spyOn(fs, "readFile").mockResolvedValue("mock content" as any);
            vi.spyOn(fs, "mkdir").mockResolvedValue(undefined as any);
            vi.spyOn(fs, "writeFile").mockResolvedValue(undefined as any);

            (parseGanxFile as any).mockReturnValueOnce({
                prgrSet: { wsX: 100, wsY: 200, wsZ: 18 },
                parameters: [
                    { paramName: "X_C_Y", value: "1", description: "Test", paramValue: "1", sortId: 1 },
                    { paramName: "HRUB", value: "18", description: "Hrúbka", paramValue: "18", sortId: 2 },
                ],
            });

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(false);
            expect(result.errors.join(" ")).toContain("bad.ganx");
            expect(result.errors.join(" ")).toContain("X_C_Y");
            expect(result.errors.join(" ")).toContain("aspoň 2");
            expect(mockPrisma.cabinet.create).not.toHaveBeenCalled();
            expect(fs.mkdir).not.toHaveBeenCalled();
            expect(fs.writeFile).not.toHaveBeenCalled();
        });

        it("should fail if a file does not have HRUB", async () => {
            const { importCabinet } = await import("../cabinet-import");
            const fs = (await import("fs")).promises;
            const { parseGanxFile } = await import("../ganx-parser");
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);

            const mockFiles = [{ name: "no-hrub.ganx", isFile: () => true }];
            vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
            vi.spyOn(fs, "readFile").mockResolvedValue("mock content" as any);
            vi.spyOn(fs, "mkdir").mockResolvedValue(undefined as any);
            vi.spyOn(fs, "writeFile").mockResolvedValue(undefined as any);

            (parseGanxFile as any).mockReturnValueOnce({
                prgrSet: { wsX: 100, wsY: 200, wsZ: 18 },
                parameters: [
                    { paramName: "X_C_Y", value: "1", description: "Test", paramValue: "1", sortId: 1 },
                    { paramName: "Y_C_X", value: "1", description: "Test", paramValue: "1", sortId: 2 },
                ],
            });

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(false);
            expect(result.errors.join(" ")).toContain("no-hrub.ganx");
            expect(result.errors.join(" ")).toContain("HRUB");
            expect(mockPrisma.cabinet.create).not.toHaveBeenCalled();
            expect(fs.mkdir).not.toHaveBeenCalled();
            expect(fs.writeFile).not.toHaveBeenCalled();
        });

        it("should not write CLX/CLY/CLZ/LX/LY/LZ parameters to DB", async () => {
            const { importCabinet } = await import("../cabinet-import");
            const fs = (await import("fs")).promises;
            const { parseGanxFile } = await import("../ganx-parser");
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);

            const mockFiles = [{ name: "test.ganx", isFile: () => true }];
            vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
            vi.spyOn(fs, "readFile").mockResolvedValue("mock content" as any);
            vi.spyOn(fs, "mkdir").mockResolvedValue(undefined as any);
            vi.spyOn(fs, "writeFile").mockResolvedValue(undefined as any);

            (parseGanxFile as any).mockReturnValueOnce({
                prgrSet: { wsX: 100, wsY: 200, wsZ: 18 },
                parameters: [
                    // required validations
                    { paramName: "X_C_Y", value: "1", description: "Test", paramValue: "1", sortId: 1 },
                    { paramName: "Y_C_X", value: "1", description: "Test", paramValue: "1", sortId: 2 },
                    { paramName: "HRUB", value: "18", description: "Hrúbka", paramValue: "18", sortId: 3 },
                    // excluded
                    { paramName: "LX", value: "500", description: "Length X", paramValue: "500", sortId: 10 },
                    { paramName: "LY", value: "300", description: "Length Y", paramValue: "300", sortId: 11 },
                    { paramName: "LZ", value: "18", description: "Length Z", paramValue: "18", sortId: 12 },
                    { paramName: "CLX", value: "250", description: "Center X", paramValue: "250", sortId: 13 },
                    { paramName: "CLY", value: "150", description: "Center Y", paramValue: "150", sortId: 14 },
                    { paramName: "CLZ", value: "9", description: "Center Z", paramValue: "9", sortId: 15 },
                ],
            });

            mockPrisma.cabinet.create.mockResolvedValueOnce({
                id: "new-id",
                name: "path",
                slug: "path",
                files: ["test.ganx"],
                parameters: ["X_C_Y", "Y_C_X", "HRUB"],
            });

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(true);

            const createArgs = mockPrisma.cabinet.create.mock.calls[0]?.[0];
            const createdParams = createArgs?.data?.parameters?.create ?? [];
            const createdNames = createdParams.map((p: any) => p.paramName);

            expect(createdNames).toContain("X_C_Y");
            expect(createdNames).toContain("Y_C_X");
            expect(createdNames).toContain("HRUB");

            expect(createdNames).not.toContain("LX");
            expect(createdNames).not.toContain("LY");
            expect(createdNames).not.toContain("LZ");
            expect(createdNames).not.toContain("CLX");
            expect(createdNames).not.toContain("CLY");
            expect(createdNames).not.toContain("CLZ");
        });
    });
});
