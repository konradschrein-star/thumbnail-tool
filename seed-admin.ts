// seed-admin.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetEmail = process.argv[2] || 'dualaryan@gmail.com';

    console.log(`Looking up user with email: ${targetEmail}`);

    try {
        const user = await prisma.users.update({
            where: {
                email: targetEmail,
            },
            data: {
                role: 'ADMIN',
            },
        });

        console.log(`Success! Updated user ${user.name} (${user.email}) to role ADMIN.`);
    } catch (e: any) {
        if (e.code === 'P2025') {
            console.log(`\nERROR: User with email "${targetEmail}" does not exist in the database yet.\nThey must log in or sign up first before they can be promoted to ADMIN.`);
        } else {
            console.error(e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
