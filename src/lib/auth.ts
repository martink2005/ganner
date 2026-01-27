import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";

const getJwtSecret = () =>
    new TextEncoder().encode(
        process.env.JWT_SECRET || "fallback-secret-change-in-production"
    );

const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "7d"; // 7 dní

export interface AuthPayload extends JWTPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Hash hesla pomocou bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

/**
 * Overí heslo proti hashu
 */
export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Vytvorí JWT token pre používateľa
 */
export async function createToken(payload: {
    userId: string;
    email: string;
    role: string;
}): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(getJwtSecret());
}

/**
 * Overí a dekóduje JWT token
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload as AuthPayload;
    } catch {
        return null;
    }
}

/**
 * Nastaví auth cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 dní
        path: "/",
    });
}

/**
 * Odstráni auth cookie
 */
export async function removeAuthCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

/**
 * Získa aktuálneho prihláseného používateľa z cookies
 */
export async function getCurrentUser(): Promise<AuthPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    return verifyToken(token);
}

/**
 * Získa token z cookies (pre middleware)
 */
export function getTokenFromCookies(
    cookieHeader: string | null
): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

    if (!authCookie) return null;

    return authCookie.split("=")[1];
}
