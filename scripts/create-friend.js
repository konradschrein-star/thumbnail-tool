const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createFriend() {
    const email = 'dualaryan@gmail.com';
    const password = 'password';
    const name = 'Aryan';
    const role = 'ADMIN';

    console.log('--- CREATING FRIEND ACCOUNT ---');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: role,
                name: name
            },
            create: {
                email,
                password: hashedPassword,
                name: name,
                role: role
            }
        });

        console.log('SUCCESS: Account created/updated');
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Password set to:', password);
    } catch (error) {
        console.error('FAILED to create account:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createFriend();
