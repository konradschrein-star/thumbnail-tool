import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
    console.log('--- Database Connection Test ---');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[REDACTED]' : 'MISSING');
    console.log('DIRECT_URL:', process.env.DIRECT_URL ? '[REDACTED]' : 'MISSING');

    const testConnection = async (url: string | undefined, name: string) => {
        if (!url) {
            console.log(`\n⚠️  Skipping ${name} (Missing variable)`);
            return;
        }

        console.log(`\nAttempting to connect to ${name}...`);
        const client = new PrismaClient({
            datasources: { db: { url } }
        });

        try {
            const userCount = await client.users.count();
            console.log(`✅ ${name} Success! (User count: ${userCount})`);
        } catch (error: any) {
            console.error(`❌ ${name} Failed!`);
            console.error('Error:', error.message);
        } finally {
            await client.$disconnect();
        }
    };

    await testConnection(process.env.DATABASE_URL, 'DATABASE_URL (Transaction/Pool)');
    await testConnection(process.env.DIRECT_URL, 'DIRECT_URL (Session/Direct)');
}

main();
