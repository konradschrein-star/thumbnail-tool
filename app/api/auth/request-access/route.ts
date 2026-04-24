import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, reason } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. SAVE TO DATABASE
        try {
            await prisma.access_requests.create({
                data: {
                    id: require('crypto').randomUUID(),
                    name: name || null,
                    email: email,
                    reason: reason || null,
                    status: 'pending',
                    updatedAt: new Date()
                }
            });
            console.log(`Access request saved to DB for: ${email}`);
        } catch (dbError) {
            console.error('Failed to save access request to DB:', dbError);
        }

        // 2. SAVE TO LOCAL FILE (for local admin visibility)
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'ACCOUNT_REQUESTS.md');
            const date = new Date().toLocaleString();

            // Ensure file exists with header
            if (!fs.existsSync(logPath)) {
                fs.writeFileSync(logPath, '# Account Access Requests\n\n| Name | Email | Reason | Status | Date |\n|------|-------|--------|--------|------|\n');
            }

            const row = `| ${name || 'N/A'} | ${email} | ${reason || 'N/A'} | pending | ${date} |\n`;
            fs.appendFileSync(logPath, row);
        } catch (fsError) {
            console.error('Failed to save to local requests file:', fsError);
        }

        // 3. SEND EMAIL NOTIFICATION (to Konrad)
        let emailSent = false;
        if (resend) {
            try {
                await resend.emails.send({
                    from: 'Titan Studio <onboarding@resend.dev>',
                    to: 'konrad.schrein@gmail.com',
                    subject: `New Access Request: ${name || email}`,
                    html: `
                        <h2>New Access Request</h2>
                        <p><strong>Name:</strong> ${name || 'Not provided'}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
                        <hr />
                        <p>You can manage this request in the database or the <code>ACCOUNT_REQUESTS.md</code> file.</p>
                    `
                });
                emailSent = true;
                console.log('Email notification sent successfully to konrad.schrein@gmail.com');
            } catch (emailError) {
                console.error('Failed to send email via Resend:', emailError);
            }
        } else {
            console.warn('RESEND_API_KEY is missing. Email notification skipped.');
        }

        return NextResponse.json({
            success: true,
            message: emailSent
                ? 'Your request has been sent to the administrator. We will get back to you soon.'
                : 'Your request has been recorded. (Admin note: Please configure RESEND_API_KEY for email notifications).'
        });
    } catch (error: any) {
        console.error('Account request error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
