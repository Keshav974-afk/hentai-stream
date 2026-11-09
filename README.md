# VoidFlix Hentai — Premium Anime Cinema Streaming

> Modern dark-themed streaming platform inspired by the **FlowFlix / VoidFlix** cinema architecture. Features dedicated full-page series & episode views (no popups), responsive FlowFlix Cinema video player with download button, in-player chapter drawer, audio/subtitle controls, adaptive HLS quality options, Top 10 rankings, and full A-Z catalogue discovery.

---

## ✨ Features & Architecture

### 1. 📄 Dedicated Full-Page Experience (No Popups)
- **Direct Series Page (`#/series/:id`):**
  - Full-page cinematic layout with wide backdrop, Japanese alternative title (`post_title_alternative`), 18+ mature badge, 98% match, view count, ratings, and synopsis.
  - Interactive clickable genre and category tags.
  - Complete episode selector grid with thumbnails, dates, and direct watch/download links.
  - "More Like This" recommendation grid.
- **Dedicated Watch Page (`#/watch/:seriesId/:episodeId`):**
  - Full-page cinema player with breadcrumbs, episode details, up-next carousel, and deep linking.
  - Shareable URLs: visiting an episode link immediately resumes or starts that exact chapter.

### 2. 🎬 FlowFlix Cinema Native Video Player (PC & Mobile)
- **Netflix-Style Scrubber & Time Display:**
  - Red scrubber line (`#E50914`) with hover preview tooltip.
  - Draggable red thumb indicator.
  - Remaining time countdown (e.g. `-14:20`) displayed tabular-nums on the right.
- **Download Episode Button:**
  - In-player download modal with 1-click M3U8 playlist file download (plays in VLC, PotPlayer, IINA, mpv).
  - Direct video stream open & copy.
  - Instant command-line copy for `yt-dlp` and `ffmpeg` downloaders.
- **Audio & Subtitles:**
  - Japanese original audio track.
  - Subtitle manager: detects HLS softsub tracks and displays English hardsubbed status.
- **Adaptive Quality Selector:**
  - Dynamic resolution picker (Auto, 1080p Full HD, 720p HD, 480p SD) populated directly from `hls.levels`.
- **Mobile Touch Gestures:**
  - Double-tap left side of video: **-10s seek** with ripple feedback.
  - Double-tap right side of video: **+10s seek** with ripple feedback.
  - Single tap toggles on-screen controls overlay smoothly without flashing.
- **In-Player Episode Drawer (`LayoutGrid` / Key <kbd>E</kbd>):**
  - Side drawer sliding in directly over the player canvas, showing all series episodes with thumbnails, titles, and dates for 1-click episode switching without leaving the player.
- **Playback Controls:**
  - Play/Pause toggle with center ripple animation.
  - Previous (<kbd>P</kbd>) & Next (<kbd>N</kbd>) episode quick navigation.
  - Variable playback speed (`0.5x` to `2.0x`).
  - Volume slider with memory across sessions and mute toggle (<kbd>M</kbd>).
  - Auto-play Next Episode with a 5-second countdown overlay and cancel option.
  - In-player resume prompt ("Resume from 14:20?").
  - Fullscreen (<kbd>F</kbd>) and Theater Mode (<kbd>T</kbd>).

### 3. 🎨 VoidFlix Cinema Matte & Frosted Glass Design
- **Color Palette:** Matte Carbon (`#0A0A0A`, `#121212`, `#161616`), Pure White, and signature Netflix/FlowFlix Dark Red (`#E50914`).
- **Typography:** `Bebas Neue` for display titles, `Plus Jakarta Sans` for headings, and `Inter` for body & labels.
- **Glassmorphic Surfaces:** Translucent panels (`glass-nav`, `glass-card`, `glass-strong`, `glass-chip`, `glass-btn`) with hardware-accelerated backdrop blur (`backdrop-filter: blur(20px)`).
- **Outlined Top 10 Today Row:** Oversized outlined rank numerals (`1`, `2`, `3` ... `10`) with poster cards.

### 4. 📚 Full Catalogue & Extended Metadata
- **Expanded Metadata (like HentaiHaven):**
  - Japanese original titles (`post_title_alternative`)
  - Age ratings (`18+`), `98% Match` score, HD 1080p indicators
  - View counters (`4.6M views`) and star rating with total votes (`★ 3.7 (9,081 votes)`)
  - Interactive genre & tag pills (Harem, School, Maid, Milf, Elf, Isekai, Succubus, Tsundere, Yuri, etc.)
  - "More Like This" recommendations powered by `post_related`
- **A-Z Letter Filter Index:**
  - Alphabetical index `[ALL] [#] [A] [B] [C] ... [Z]` to browse every title starting with any letter or digit.
- **Infinite Pagination:**
  - "Load More Titles" button that loads subsequent pages dynamically.

### 5. 🗂️ Streaming Platform Essentials
- **Continue Watching Shelf:** Shows in-progress episodes with progress percentages, circular play button, and remove options.
- **My List (Watchlist):** Instant 1-click bookmarking stored in `localStorage`.
- **Watch History:** Comprehensive timeline of watched episodes with completion percentages and resume options.
- **Live Search Autocomplete:** Real-time debounced dropdown with search suggestions and poster previews as you type (or press <kbd>/</kbd> to focus search).
- **Surprise Me (Shuffle):** One-click button to pick a random trending show.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> or <kbd>K</kbd> | Play / Pause |
| <kbd>←</kbd> or <kbd>J</kbd> | Rewind 10 Seconds |
| <kbd>→</kbd> or <kbd>L</kbd> | Fast-Forward 10 Seconds |
| <kbd>P</kbd> | Previous Episode |
| <kbd>N</kbd> | Next Episode |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up / Down (5%) |
| <kbd>M</kbd> | Toggle Mute |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>T</kbd> | Toggle Theater Mode |
| <kbd>E</kbd> | Toggle In-Player Episode Drawer |
| <kbd>/</kbd> | Focus Search Bar |
| <kbd>Esc</kbd> | Close Modals & Drawers |
| <kbd>?</kbd> | Open Controls Guide |

---

## 🚀 Quick Start (Local)

Runs out of the box with zero external dependencies:

```bash
# 1. Enter the project directory
cd hentai-stream

# 2. Start the local server & proxy
npm start
# or: node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment

### 1-Click Vercel Deployment
The repository includes `vercel.json` and `api/index.js` configured for Vercel Serverless Functions:
1. Push to your GitHub account.
2. Import into [Vercel](https://vercel.com).
3. Click **Deploy** — your proxy and frontend will be live immediately.

---

## ⚖️ License
MIT License. Created by [Keshav974-afk](https://github.com/Keshav974-afk).
