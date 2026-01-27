import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { importCabinet, createSlug } from "../cabinet-import";

// Mock dependencies
vi.mock("fs", () => ({
    promises: {
        readdir: vi.fn(),
        readFile: vi.fn(),
        stat: vi.fn(),
        mkdir: vi.fn(),
        writeFile: vi.fn(),
    },
}));

// Mock Prisma
const mockPrisma = {
    cabinet: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
};

vi.mock("@/lib/prisma", () => ({
    default: mockPrisma,
}));

// Mock parser
vi.mock("../ganx-parser", () => ({
    parseGanxFile: vi.fn(() => ({
        prgrSet: { wsX: 100, wsY: 200, wsZ: 18 },
        parameters: [
            { paramName: "TEST", value: "1", description: "Test", paramValue: "1", sortId: 1 }
        ],
    })),
    deduplicateParameters: vi.fn((params) => params),
    inferParameterType: vi.fn(() => "number"),
}));

import { promises as fs } from "fs";

describe("Cabinet Import Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createSlug", () => {
        it("should create valid slug", () => {
            expect(createSlug("Test Cabinet 123")).toBe("test-cabinet-123");
            expect(createSlug("E001_TEK")).toBe("e001-tek");
        });
    });

    describe("importCabinet", () => {
        it("should fail if cabinet already exists", async () => {
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce({ id: "existing" });

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain("už existuje");
        });

        it("should fail if folder has no ganx files", async () => {
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);
            (fs.readdir as any).mockResolvedValueOnce([]);

            const result = await importCabinet("./some/path");

            expect(result.success).toBe(false);
            expect(result.errors[0]).toContain("neobsahuje žiadne");
        });

        it("should successfully import cabinet", async () => {
            mockPrisma.cabinet.findUnique.mockResolvedValueOnce(null);

            // Mock Folder content
            const mockFiles = [
                { name: "test.ganx", isFile: () => true },
            ];
            (fs.readdir as any).mockResolvedValue(mockFiles);
            (fs.readFile as any).mockResolvedValue("mock content");

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
    });
});
