const { Resend } = require('resend');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    console.log('Testing Resend email with API Key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
    try {
        const data = await resend.emails.send({
            from: 'Titan Studio <onboarding@resend.dev>',
            to: 'konrad.schrein@gmail.com',
            subject: 'Test Onboarding Email',
            html: '<h1>Success!</h1><p>This is a test email from your local dev environment.</p>'
        });
        console.log('Email sent result:', data);
    } catch (error) {
        console.error('Email send failed:', error);
    }
}

testEmail();
