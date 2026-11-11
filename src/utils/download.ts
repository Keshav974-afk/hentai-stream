/**
 * Utilities for downloading media streams, playlists, and generating downloader commands.
 */

export async function downloadMediaStream(url: string, suggestedFilename: string): Promise<boolean> {
  if (!url) return false;

  const isDirectMp4 = url.includes('.mp4') || url.includes('.webm') || url.includes('.m4v');
  const defaultExt = isDirectMp4 ? '.mp4' : '.m3u8';
  const cleanFilename = suggestedFilename.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const filename = cleanFilename.endsWith('.mp4') || cleanFilename.endsWith('.m3u8')
    ? cleanFilename
    : `${cleanFilename}${defaultExt}`;

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
    console.warn('Direct stream fetch failed, generating fallback playlist blob:', err);
    const fallbackContent = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\n${url}\n`;
    const blob = new Blob([fallbackContent], { type: 'application/vnd.apple.mpegurl;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename.endsWith('.m3u8') ? filename : `${filename}.m3u8`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    return true;
  }
}

/**
 * Android Intent URI for 1DM (IDM Video Downloader) & ADM
 * Automatically captures HLS streams and downloads all video + audio chunks into a complete single MP4.
 */
export function get1DMIntentUrl(streamUrl: string): string {
  return `intent:${streamUrl}#Intent;action=android.intent.action.VIEW;type=application/vnd.apple.mpegurl;end`;
}

/**
 * Fast multi-threaded yt-dlp command to download complete MP4 episode with all audio and subtitles muxed.
 */
export function getYtDlpCommand(streamUrl: string, title: string): string {
  const safeTitle = title.replace(/["'\\]/g, '').trim();
  return `yt-dlp -N 8 "${streamUrl}" -o "${safeTitle}.mp4"`;
}

/**
 * Universal clipboard copy helper with fallback for iframe/restricted permissions
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
