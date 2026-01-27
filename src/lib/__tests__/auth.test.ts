import { describe, it, expect, vi, beforeAll } from "vitest";

// Set env before importing auth module
beforeAll(() => {
    vi.stubEnv("JWT_SECRET", "test-secret-key-for-testing");
});

// Import after stubbing env
import {
    hashPassword,
    verifyPassword,
    createToken,
    verifyToken,
    getTokenFromCookies,
} from "../auth";

describe("Auth Utilities", () => {
    describe("hashPassword", () => {
        it("should hash a password", async () => {
            const password = "testPassword123";
            const hash = await hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(0);
        });

        it("should produce different hashes for same password", async () => {
            const password = "testPassword123";
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);

            // bcrypt produces different hashes due to random salt
            expect(hash1).not.toBe(hash2);
        });
    });

    describe("verifyPassword", () => {
        it("should return true for correct password", async () => {
            const password = "testPassword123";
            const hash = await hashPassword(password);

            const result = await verifyPassword(password, hash);
            expect(result).toBe(true);
        });

        it("should return false for incorrect password", async () => {
            const password = "testPassword123";
            const wrongPassword = "wrongPassword456";
            const hash = await hashPassword(password);

            const result = await verifyPassword(wrongPassword, hash);
            expect(result).toBe(false);
        });
    });

    describe("createToken and verifyToken", () => {
        it("should create a valid JWT token", async () => {
            const payload = {
                userId: "user123",
                email: "test@example.com",
                role: "admin",
            };

            const token = await createToken(payload);

            expect(token).toBeDefined();
            expect(typeof token).toBe("string");
            expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
        });

        it("should verify and decode a valid token", async () => {
            const payload = {
                userId: "user123",
                email: "test@example.com",
                role: "admin",
            };

            const token = await createToken(payload);
            const decoded = await verifyToken(token);

            expect(decoded).not.toBeNull();
            expect(decoded?.userId).toBe(payload.userId);
            expect(decoded?.email).toBe(payload.email);
            expect(decoded?.role).toBe(payload.role);
        });

        it("should return null for invalid token", async () => {
            const invalidToken = "invalid.token.here";

            const decoded = await verifyToken(invalidToken);
            expect(decoded).toBeNull();
        });

        it("should return null for empty token", async () => {
            const decoded = await verifyToken("");
            expect(decoded).toBeNull();
        });
    });

    describe("getTokenFromCookies", () => {
        it("should extract token from cookie header", () => {
            const cookieHeader = "auth_token=mytoken123; other_cookie=value";
            const token = getTokenFromCookies(cookieHeader);

            expect(token).toBe("mytoken123");
        });

        it("should return null if auth_token is not present", () => {
            const cookieHeader = "other_cookie=value; another=test";
            const token = getTokenFromCookies(cookieHeader);

            expect(token).toBeNull();
        });

        it("should return null for null cookie header", () => {
            const token = getTokenFromCookies(null);
            expect(token).toBeNull();
        });

        it("should return null for empty cookie header", () => {
            const token = getTokenFromCookies("");
            expect(token).toBeNull();
        });

        it("should handle token as only cookie", () => {
            const cookieHeader = "auth_token=singletoken";
            const token = getTokenFromCookies(cookieHeader);

            expect(token).toBe("singletoken");
        });
    });
});
