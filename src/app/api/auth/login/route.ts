import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validácia vstupov
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email a heslo sú povinné" },
                { status: 400 }
            );
        }

        // Nájdi používateľa
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Neplatné prihlasovacie údaje" },
                { status: 401 }
            );
        }

        // Over heslo
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: "Neplatné prihlasovacie údaje" },
                { status: 401 }
            );
        }

        // Vytvor token
        const token = await createToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Nastav cookie
        await setAuthCookie(token);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Nastala chyba pri prihlásení" },
            { status: 500 }
        );
    }
}
