import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
    console.log('--- Database Connection Test ---');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[REDACTED]' : 'MISSING');
    console.log('DIRECT_URL:', process.env.DIRECT_URL ? '[REDACTED]' : 'MISSING');

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });

    try {
        console.log('\nAttempting to connect to database...');
        // Simple query to test connection
        const userCount = await prisma.user.count();
        console.log('✅ Successfully connected to database!');
        console.log(`User count in DB: ${userCount}`);
    } catch (error: any) {
        console.error('\n❌ Connection failed!');
        console.error('Error Code:', error.code || 'N/A');
        console.error('Error Message:', error.message);

        if (error.message.includes('Can\'t reach database server')) {
            console.log('\n💡 TROUBLESHOOTING TIP:');
            console.log('1. Check if your Supabase project is PAUSED (log in to Supabase dashboard).');
            console.log('2. Verify your IP is allowed in the database firewall settings.');
            console.log('3. If using port 6543 (PgBouncer), ensure ?pgbouncer=true is in the URL.');
            console.log('4. Ensure your internet connection is stable.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
