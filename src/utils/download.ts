/**
 * Triggers a real browser file download for streaming playlists or media files.
 * Uses fetch() + Blob URL to bypass cross-origin browser navigation.
 */
export async function downloadMediaStream(url: string, suggestedFilename: string): Promise<boolean> {
  if (!url) return false;

  const cleanFilename = suggestedFilename.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const filename = cleanFilename.endsWith('.m3u8') ? cleanFilename : `${cleanFilename}.m3u8`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return true;
  } catch (err) {
    console.warn('Direct stream fetch failed, generating standalone playlist blob:', err);
    const fallbackContent = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\n${url}\n`;
    const blob = new Blob([fallbackContent], { type: 'application/vnd.apple.mpegurl;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return true;
  }
}
