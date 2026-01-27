import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Hash hesla pre admin používateľa
    const hashedPassword = await bcrypt.hash("admin123", 12);

    // Vytvor alebo aktualizuj admin používateľa
    const admin = await prisma.user.upsert({
        where: { email: "admin@gannomat.local" },
        update: {
            password: hashedPassword,
            name: "Administrator",
            role: "admin",
        },
        create: {
            email: "admin@gannomat.local",
            password: hashedPassword,
            name: "Administrator",
            role: "admin",
        },
    });

    console.log("✅ Admin user created:", admin.email);
    console.log("📧 Email: admin@gannomat.local");
    console.log("🔑 Password: admin123");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
