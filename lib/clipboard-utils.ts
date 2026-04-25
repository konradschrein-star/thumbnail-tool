/**
 * Copy image to clipboard
 */
export async function copyImageToClipboard(imageUrl: string): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
  } catch (error) {
    console.error('Failed to copy image:', error);
    throw new Error('Failed to copy image to clipboard');
  }
}

/**
 * Copy text to clipboard
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy text:', error);
    throw new Error('Failed to copy text to clipboard');
  }
}

/**
 * Format job details as text
 */
export function formatJobDetails(job: any): string {
  return `Video Topic: ${job.videoTopic}
Thumbnail Text: ${job.thumbnailText}
Channel: ${job.channel?.name || job.channels?.name || 'Unknown'}
Archetype: ${job.archetype?.name || job.archetypes?.name || 'Unknown'}
Status: ${job.status}
Created: ${new Date(job.createdAt).toLocaleString()}
${job.completedAt ? `Completed: ${new Date(job.completedAt).toLocaleString()}` : ''}
${job.errorMessage ? `Error: ${job.errorMessage}` : ''}`;
}
