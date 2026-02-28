import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

/**
 * Uploads a buffer to Cloudflare R2
 * @param buffer The image buffer to upload
 * @param filename The destination filename
 * @param contentType The MIME type (default image/png)
 * @returns The public URL of the uploaded asset
 */
export async function uploadToR2(
    buffer: Buffer,
    filename: string,
    contentType: string = 'image/png'
): Promise<string> {
    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME is not configured');
    }

    try {
        await r2Client.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filename,
                Body: buffer,
                ContentType: contentType,
            })
        );

        const publicUrl = process.env.R2_PUBLIC_URL || '';
        return `${publicUrl.replace(/\/$/, '')}/${filename}`;
    } catch (error) {
        console.error('R2 Upload Error:', error);
        throw new Error(`Failed to upload to R2: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deletes an object from Cloudflare R2
 * @param filename The key of the object to delete
 */
export async function deleteFromR2(filename: string): Promise<void> {
    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME is not configured');
    }

    try {
        await r2Client.send(
            new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filename,
            })
        );
    } catch (error) {
        console.error('R2 Delete Error:', error);
        throw new Error(`Failed to delete from R2: ${error instanceof Error ? error.message : String(error)}`);
    }
}
