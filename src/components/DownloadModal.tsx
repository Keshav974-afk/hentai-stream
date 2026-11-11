import React, { useState } from 'react';
import { X, Download, Smartphone, Terminal, Check, Copy, HardDrive, ExternalLink } from 'lucide-react';
import { downloadMediaStream, get1DMIntentUrl, getYtDlpCommand, copyToClipboard } from '../utils/download';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl: string;
  seriesTitle: string;
  episodeTitle: string;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  streamUrl,
  seriesTitle,
  episodeTitle
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);

  if (!isOpen) return null;

  const fullTitle = `${seriesTitle} - ${episodeTitle}`;
  const ytDlpCmd = getYtDlpCommand(streamUrl, fullTitle);

  const handleCopyCmd = async () => {
    const ok = await copyToClipboard(ytDlpCmd);
    if (ok) {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    }
  };

  const handleCopyUrl = async () => {
    const ok = await copyToClipboard(streamUrl);
    if (ok) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleOpen1DM = () => {
    const intentUrl = get1DMIntentUrl(streamUrl);
    window.location.href = intentUrl;
  };

  const handleSaveM3U8 = async () => {
    setIsSavingFile(true);
    try {
      await downloadMediaStream(streamUrl, `${fullTitle}.m3u8`);
    } finally {
      setIsSavingFile(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#141414] border border-white/10 p-5 sm:p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E50914] text-white uppercase tracking-wider">
                Full Episode Download
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300">
                1080p FHD
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
              {seriesTitle}
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {episodeTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close download modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Notice explaining chunking */}
        <div className="my-4 rounded-xl bg-white/5 border border-white/5 p-3 text-xs text-gray-300 leading-relaxed">
          <p>
            HLS streaming videos are divided into hundreds of small chunks. Choose one of the verified methods below to download the <strong className="text-white">complete full MP4 video</strong> with all audio and subtitles intact.
          </p>
        </div>

        {/* Download Options */}
        <div className="space-y-3.5">
          {/* Method 1: Mobile 1DM / ADM Downloader */}
          <div className="rounded-xl border border-[#E50914]/40 bg-[#E50914]/10 p-3.5 transition">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="size-4 text-[#E50914]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Mobile Downloader (1DM / ADM)
              </h4>
              <span className="ml-auto text-[10px] font-bold text-[#E50914] bg-[#E50914]/20 px-1.5 py-0.5 rounded">
                Recommended for Mobile
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-normal mb-3">
              Automatically captures the full stream and downloads all chunks into a complete 1080p MP4 file in your Downloads.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleOpen1DM}
                className="flex-1 py-2 px-3 rounded-lg bg-[#E50914] hover:bg-[#b81d24] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow active:scale-95 cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
                <span>Open in 1DM / ADM</span>
              </button>
              <button
                onClick={handleCopyUrl}
                className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition border border-white/10 active:scale-95 cursor-pointer"
              >
                {copiedUrl ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                <span>{copiedUrl ? 'Copied Link!' : 'Copy Stream Link'}</span>
              </button>
            </div>
          </div>

          {/* Method 2: PC/Mac yt-dlp Command */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="size-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Full MP4 via yt-dlp (PC / Mac / Linux)
              </h4>
              <span className="ml-auto text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                Recommended for PC
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-normal mb-2.5">
              Downloads all chunks in 8 parallel threads and muxes them into a pristine MP4 file with sound.
            </p>
            <div className="relative mb-2">
              <div className="rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-gray-300 break-all select-all border border-white/5">
                {ytDlpCmd}
              </div>
            </div>
            <button
              onClick={handleCopyCmd}
              className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-white/10 active:scale-95 cursor-pointer"
            >
              {copiedCmd ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
              <span>{copiedCmd ? 'Command Copied to Clipboard!' : 'Copy yt-dlp Command'}</span>
            </button>
          </div>

          {/* Method 3: Offline Media Player Playlist */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <HardDrive className="size-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Offline Playlist (.m3u8) for VLC / MX Player
              </h4>
            </div>
            <p className="text-[11px] text-gray-300 leading-normal mb-2.5">
              Downloads the master streaming file. Open in VLC, MX Player, PotPlayer, or MPV to watch the entire episode seamlessly.
            </p>
            <button
              onClick={handleSaveM3U8}
              disabled={isSavingFile}
              className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-white/10 active:scale-95 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{isSavingFile ? 'Saving File...' : 'Download .m3u8 for VLC / MX Player'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
