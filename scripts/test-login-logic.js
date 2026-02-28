const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function simulateLogin(email, password) {
    console.log(`\n--- SIMULATING LOGIN FOR: ${email} ---`);

    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (!user) {
            console.log('FAIL: User not found in DB.');
            return;
        }

        if (!user.password) {
            console.log('FAIL: User has no password set.');
            return;
        }

        console.log('User found. Comparing passwords...');
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            console.log('FAIL: Password comparison failed.');
            console.log('Input Password:', password);
            console.log('Stored Hash:', user.password);
        } else {
            console.log('SUCCESS: Password matches!');
            console.log('User ID:', user.id);
            console.log('Role:', user.role);
        }
    } catch (error) {
        console.error('ERROR during logic simulation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Test with exactly how they should be
simulateLogin('dualaryan@gmail.com', 'password');
// Test with mixed case and spaces
simulateLogin(' DualAryan@gmail.com ', 'password');
// Test admin too
simulateLogin('admin@example.com', 'admin123');
