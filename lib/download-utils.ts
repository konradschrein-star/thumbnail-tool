/**
 * Generates a professional, descriptive filename for thumbnail downloads.
 * Format: [ChannelName]_[ArchetypeCategory]_[TopicSlug]_v[N].png
 */
export function generateProfessionalFilename(
    channelName: string,
    archetypeCategory: string,
    videoTopic: string,
    version: number = 1
): string {
    const sanitize = (text: string) =>
        text
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

    const channel = sanitize(channelName);
    const category = sanitize(archetypeCategory);
    const topic = sanitize(videoTopic).slice(0, 30);

    return `${channel}_${category}_${topic}_v${version}.png`;
}

/**
 * Initiates a download for a remote image URL with a specific filename.
 */
export async function downloadRemoteImage(url: string, filename: string) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback: just open in new tab
        window.open(url, '_blank');
    }
}
