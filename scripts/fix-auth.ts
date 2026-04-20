import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const user = await prisma.users.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'USER' // Ensure it has the limit
            },
            create: {
                email,
                name: 'Demo Admin',
                password: hashedPassword,
                role: 'USER'
            }
        });

        console.log('-----------------------------------------');
        console.log('AUTH FIX COMPLETED');
        console.log(`User: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Status: Password reset to "admin123"`);
        console.log('-----------------------------------------');
    } catch (error) {
        console.error('Failed to fix auth:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
