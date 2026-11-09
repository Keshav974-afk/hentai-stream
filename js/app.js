// ==========================================================================
// VOIDFLIX HENTAI STREAMING ENGINE — Complete Web Platform Logic
// Matches FlowFlix Central Architecture: Matte Carbon, Pure White & Netflix Red
// Features: Full-Page Dedicated Series & Watch Pages (NO POPUPS),
// Responsive FlowFlix Cinema Player, Downloader, Subtitles, Quality Selector,
// In-Player Episodes Drawer, Double-Tap Seek, Top 10, and A-Z Directory.
// ==========================================================================

const app = document.getElementById('app');

// ==================== GLOBAL STATE ====================
function safeGetArray(primaryKey, fallbackKey) {
  try {
    const raw = localStorage.getItem(primaryKey) || (fallbackKey ? localStorage.getItem(fallbackKey) : null);
    const val = JSON.parse(raw || '[]');
    return Array.isArray(val) ? val : [];
  } catch (e) {
    return [];
  }
}

const state = {
  route: 'home',
  homeData: null,
  heroIndex: 0,
  heroTimer: null,
  currentSeries: null,
  currentEpisode: null,
  currentEpisodeIndex: 0,
  hls: null,
  playerControlsTimer: null,
  hoverPreviewTimer: null,
  searchDebounceTimer: null,
  singleTapTimer: null,
  lastTapTime: 0,

  // Player Settings
  player: {
    isPlaying: false,
    volume: parseFloat(localStorage.getItem('voidflix_volume') || localStorage.getItem('flowflix_volume') || '1'),
    isMuted: (localStorage.getItem('voidflix_muted') || localStorage.getItem('flowflix_muted')) === 'true',
    isTheater: false,
    speed: 1,
    levels: [],
    currentLevel: -1,
    subtitleTracks: [],
    currentSubtitle: -1,
    autoPlayNext: localStorage.getItem('voidflix_autoplay') !== 'false',
    hoverPreview: localStorage.getItem('voidflix_hover_preview') !== 'false',
    isDrawerOpen: false,
    isSettingsOpen: false,
    settingsSection: null,
    isScrubbing: false
  },

  // Catalogue & Pagination State
  catalogue: {
    items: [],
    activeLetter: 'ALL',
    activeTag: 'all',
    page: 1,
    hasMore: true,
    isLoading: false,
    sort: 'views'
  },

  // Persistent Collections (LocalStorage)
  watchlist: safeGetArray('voidflix_watchlist', 'flowflix_watchlist'),
  history: safeGetArray('voidflix_history', 'flowflix_history'),
  continueWatching: safeGetArray('voidflix_continue_watching', 'flowflix_continue_watching')
};

// ==================== POSTER & THUMBNAIL ERROR HANDLING ====================
const POSTER_UNAVAILABLE_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="100%" height="100%">
  <defs>
    <linearGradient id="vfPosterBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#191920"/>
      <stop offset="100%" stop-color="#0E0E12"/>
    </linearGradient>
    <linearGradient id="vfGlow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E50914" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="300" height="450" fill="url(#vfPosterBg)"/>
  <rect width="300" height="450" fill="url(#vfGlow)"/>
  <rect x="12" y="12" width="276" height="426" rx="8" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1.5"/>
  <g transform="translate(150, 215)" text-anchor="middle">
    <rect x="-32" y="-45" width="64" height="48" rx="6" fill="#202028" stroke="#353545" stroke-width="1.5"/>
    <path d="M-32 -25 L32 -25" stroke="#353545" stroke-width="1.5"/>
    <path d="M-22 -45 L-14 -25 M-6 -45 L2 -25 M10 -45 L18 -25" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5"/>
    <circle cx="0" cy="-2" r="3.5" fill="#E50914"/>
    <text y="32" fill="#888899" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="2.5">POSTER</text>
    <text y="50" fill="#E50914" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" letter-spacing="2">UNAVAILABLE</text>
  </g>
</svg>`);

const THUMB_UNAVAILABLE_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" width="100%" height="100%">
  <defs>
    <linearGradient id="vfThumbBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#191920"/>
      <stop offset="100%" stop-color="#0E0E12"/>
    </linearGradient>
    <linearGradient id="vfGlowWide" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E50914" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="400" height="225" fill="url(#vfThumbBg)"/>
  <rect width="400" height="225" fill="url(#vfGlowWide)"/>
  <rect x="10" y="10" width="380" height="205" rx="6" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1.5"/>
  <g transform="translate(200, 110)" text-anchor="middle">
    <rect x="-28" y="-36" width="56" height="42" rx="5" fill="#202028" stroke="#353545" stroke-width="1.5"/>
    <path d="M-28 -18 L28 -18" stroke="#353545" stroke-width="1.5"/>
    <path d="M-18 -36 L-10 -18 M-2 -36 L6 -18 M14 -36 L22 -18" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5"/>
    <circle cx="0" cy="3" r="3" fill="#E50914"/>
    <text y="30" fill="#888899" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="2">THUMBNAIL</text>
    <text y="46" fill="#E50914" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" letter-spacing="1.8">UNAVAILABLE</text>
  </g>
</svg>`);

function handlePosterError(img, isLandscape = false) {
  if (!img) return;
  const fallback = img.getAttribute('data-fallback');
  if (fallback && fallback !== img.src && !img.dataset.secondaryTried) {
    img.dataset.secondaryTried = 'true';
    img.src = fallback;
    return;
  }
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = 'true';
  img.removeAttribute('alt');
  img.classList.add('poster-fallback');
  img.src = isLandscape ? THUMB_UNAVAILABLE_SVG : POSTER_UNAVAILABLE_SVG;
}

// ==================== HELPERS & UTILITIES ====================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatViews(views) {
  const n = Number(views) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity || seconds === null) return '00:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'error' ? 'border-red-500/50' : type === 'success' ? 'border-emerald-500/50' : 'border-white/15';

  toast.className = `glass-strong text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-lg shadow-2xl backdrop-blur-xl border ${borderCol} flex items-center gap-2 pointer-events-auto fade-enter`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'all 0.25s ease-out';
    setTimeout(() => toast.remove(), 260);
  }, 3000);
}

function copyToClipboard(text, msg = 'Copied to clipboard!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg, 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function navigateTo(hash) {
  if (window.location.hash === hash) {
    handleRoute();
  } else {
    window.location.hash = hash;
  }
}

function updateNavHighlight(route) {
  state.route = route;
  ['home', 'series', 'trending', 'uncensored', 'browse', 'watchlist', 'history'].forEach(r => {
    const el = document.getElementById(`nav-${r}`);
    if (el) {
      if (r === route) {
        el.className = 'text-white font-bold py-1 transition';
      } else {
        el.className = 'text-gray-400 hover:text-white py-1 transition';
      }
    }
  });

  // Mobile Bottom Tab Bar Highlight & Visibility (hidden during video playback like FlowFlix)
  const bottomNav = document.getElementById('mobile-bottom-nav');
  if (bottomNav) {
    if (route === 'player') {
      bottomNav.classList.add('hidden');
    } else {
      bottomNav.classList.remove('hidden');
    }
  }

  ['home', 'trending', 'browse', 'watchlist', 'history'].forEach(r => {
    const mobEl = document.getElementById(`mobile-nav-${r}`);
    if (mobEl) {
      const isActive = (r === route) || (r === 'browse' && (route === 'series' || route === 'uncensored'));
      if (isActive) {
        mobEl.className = 'flex flex-col items-center gap-1 text-brand-red font-bold transition';
      } else {
        mobEl.className = 'flex flex-col items-center gap-1 text-gray-400 hover:text-white transition';
      }
    }
  });

  const badge = document.getElementById('nav-watchlist-count');
  if (badge) {
    if (state.watchlist.length > 0) {
      badge.textContent = state.watchlist.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function scrollRow(rowId, direction) {
  const el = document.getElementById(rowId);
  if (!el) return;
  const distance = el.clientWidth * 0.75;
  el.scrollBy({ left: direction * distance, behavior: 'smooth' });
}

// ==================== WATCHLIST & PROGRESS LOGIC ====================
function isWatchlisted(seriesId) {
  return state.watchlist.some(w => String(w.id) === String(seriesId));
}

function toggleWatchlist(item, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  const id = String(item.id || item.post_ID);
  const title = item.title || item.post_title || 'Untitled';
  const thumb = item.thumbnail || item.post_thumbnail || '';

  const index = state.watchlist.findIndex(w => String(w.id) === id);
  if (index >= 0) {
    state.watchlist.splice(index, 1);
    showToast(`Removed from My List: "${title}"`);
  } else {
    state.watchlist.unshift({ id, title, thumbnail: thumb, addedAt: Date.now() });
    showToast(`Added to My List: "${title}"`, 'success');
  }

  localStorage.setItem('voidflix_watchlist', JSON.stringify(state.watchlist));
  updateNavHighlight(state.route);

  document.querySelectorAll(`[data-watchlist-id="${id}"]`).forEach(btn => {
    updateWatchlistButtonUI(btn, index < 0);
  });

  if (state.route === 'watchlist') {
    showWatchlist();
  }
}

function updateWatchlistButtonUI(btn, inList) {
  if (!btn) return;
  if (btn.classList.contains('btn-compact')) {
    btn.innerHTML = inList
      ? `<svg class="w-3.5 h-3.5 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`
      : `<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`;
  } else {
    btn.innerHTML = inList
      ? `<svg class="w-4 h-4 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> <span>Added to My List</span>`
      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> <span>Add to My List</span>`;
  }
}

function saveWatchProgress(seriesId, chapterId, chapterIndex, seriesTitle, chapterName, thumbnail, currentTime, duration) {
  if (!duration || duration <= 0) return;
  const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));

  const record = {
    seriesId: String(seriesId),
    chapterId: String(chapterId),
    chapterIndex,
    title: seriesTitle,
    chapterName,
    thumbnail,
    currentTime: Math.floor(currentTime),
    duration: Math.floor(duration),
    progressPercent,
    updatedAt: Date.now()
  };

  const existingIdx = state.continueWatching.findIndex(c => String(c.chapterId) === String(chapterId));
  if (existingIdx >= 0) {
    if (progressPercent >= 92) {
      state.continueWatching.splice(existingIdx, 1);
    } else {
      state.continueWatching[existingIdx] = record;
    }
  } else if (progressPercent < 92 && currentTime > 10) {
    state.continueWatching.unshift(record);
    if (state.continueWatching.length > 25) state.continueWatching.pop();
  }
  localStorage.setItem('voidflix_continue_watching', JSON.stringify(state.continueWatching));

  const histIdx = state.history.findIndex(h => String(h.chapterId) === String(chapterId));
  if (histIdx >= 0) state.history.splice(histIdx, 1);
  state.history.unshift(record);
  if (state.history.length > 50) state.history.pop();
  localStorage.setItem('voidflix_history', JSON.stringify(state.history));
}

function removeContinueWatching(chapterId, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  state.continueWatching = state.continueWatching.filter(c => String(c.chapterId) !== String(chapterId));
  localStorage.setItem('voidflix_continue_watching', JSON.stringify(state.continueWatching));
  showToast('Removed from Continue Watching');
  if (state.route === 'home') {
    showHome();
  }
}

// ==================== CARD COMPONENTS ====================
function renderFlowCard(item, options = {}) {
  const id = item.post_ID || item.id;
  const title = item.post_title || item.title || 'Untitled';
  const thumb = item.post_thumbnail || item.thumbnail || '';
  const views = item.post_views || item.views || 0;
  const inList = isWatchlisted(id);

  const previewUrl = options.preview || item.preview || '';
  const chapterId = options.chapterId || item.chapter_id;
  const chapterName = options.chapterName || item.chapter_name;
  const isEpisode = !!chapterId;

  const cardWidth = options.width || 'w-28 sm:w-36 md:w-44 lg:w-48';
  const clickAction = isEpisode ? `navigateTo('#/watch/${id}/${chapterId}')` : `navigateTo('#/series/${id}')`;

  return `
    <div class="group relative flex-shrink-0 ${cardWidth} rounded-md overflow-hidden bg-carbon-800 border border-white/[0.08] hover:border-white/30 transition-all duration-300 hover:scale-105 active:scale-95 hover:z-20 cursor-pointer shadow-lg"
         onclick="${clickAction}"
         onmouseenter="handleCardMouseEnter(this, '${escapeHtml(previewUrl)}')"
         onmouseleave="handleCardMouseLeave(this)">
      
      <!-- Poster Container -->
      <div class="relative aspect-[2/3] bg-carbon-850 overflow-hidden">
        <img src="${escapeHtml(thumb || POSTER_UNAVAILABLE_SVG)}"
             data-fallback="${escapeHtml(thumb)}"
             class="card-img w-full h-full object-cover transition-transform duration-500"
             loading="lazy"
             onerror="handlePosterError(this, false)">

        <!-- Video Hover Preview -->
        <video class="card-video hidden absolute inset-0 w-full h-full object-cover" muted loop playsinline></video>

        <!-- Top Badges -->
        <div class="absolute top-2 left-2 flex items-center gap-1 z-10 pointer-events-none">
          <span class="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[9px] font-bold text-gray-200 border border-white/10 uppercase">HD</span>
          ${isEpisode ? `<span class="px-1.5 py-0.5 rounded bg-brand-red text-white text-[9px] font-bold">${escapeHtml(chapterName)}</span>` : ''}
        </div>

        <!-- Watchlist Quick Toggle Button -->
        <button onclick="toggleWatchlist({ id: ${id}, title: '${escapeHtml(title).replace(/'/g, "\\'")}', thumbnail: '${escapeHtml(thumb)}' }, event)"
                title="${inList ? 'Remove from My List' : 'Add to My List'}"
                data-watchlist-id="${id}"
                class="btn-compact absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur border border-white/15 flex items-center justify-center transition">
          ${inList
            ? `<svg class="w-3.5 h-3.5 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`
            : `<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`}
        </button>

        <!-- Bottom Scrim Gradient -->
        <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-carbon-900 via-carbon-900/60 to-transparent pointer-events-none"></div>

        <!-- Center Quick Play Button on Hover -->
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div class="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
            <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>

      <!-- Card Title & Metadata Bar -->
      <div class="p-2 sm:p-2.5 bg-carbon-800">
        <h4 class="font-heading font-semibold text-xs text-white truncate group-hover:text-gray-200" title="${escapeHtml(title)}">
          ${escapeHtml(title)}
        </h4>
        <div class="flex items-center justify-between text-[11px] text-gray-400 mt-1">
          <span class="text-emerald-400 font-bold">98% Match</span>
          <span>${views ? formatViews(views) : '18+'}</span>
        </div>
      </div>

    </div>
  `;
}

function handleCardMouseEnter(card, previewUrl) {
  if (!state.player.hoverPreview || !previewUrl) return;

  clearTimeout(state.hoverPreviewTimer);
  state.hoverPreviewTimer = setTimeout(() => {
    const video = card.querySelector('.card-video');
    const img = card.querySelector('.card-img');
    if (!video) return;

    if (!video.src) video.src = previewUrl;
    video.play().then(() => {
      video.classList.remove('hidden');
      if (img) img.style.opacity = '0';
    }).catch(() => {});
  }, 220);
}

function handleCardMouseLeave(card) {
  clearTimeout(state.hoverPreviewTimer);
  const video = card.querySelector('.card-video');
  const img = card.querySelector('.card-img');
  if (video) {
    video.pause();
    video.classList.add('hidden');
    video.currentTime = 0;
  }
  if (img) img.style.opacity = '1';
}

// ==================== FLOWFLIX MOBILE CATEGORY CHIPS ====================
function renderMobileCategoryChips() {
  const chips = [
    { label: 'All Titles', onclick: "showHome()" },
    { label: 'Trending', onclick: "navigateTo('#/browse/trending')" },
    { label: 'New Episodes', onclick: "document.getElementById('row-episodes')?.scrollIntoView({ behavior: 'smooth' })" },
    { label: 'Uncensored', onclick: "navigateTo('#/browse/uncensored')" },
    { label: 'Yuri', onclick: "navigateTo('#/browse/yuri')" },
    { label: 'Ecchi', onclick: "navigateTo('#/browse/ecchi')" },
    { label: 'Tentacle', onclick: "navigateTo('#/browse/tentacle')" },
    { label: 'A-Z Catalogue', onclick: "navigateTo('#/browse/all')" },
    { label: 'My List', onclick: "navigateTo('#/watchlist')" }
  ];

  return `
    <div class="lg:hidden flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 mb-4">
      ${chips.map((c, i) => `
        <button onclick="${c.onclick}" 
                class="shrink-0 rounded-full border border-white/20 bg-carbon-800/80 px-3.5 py-1 text-xs font-semibold text-gray-200 active:scale-95 transition hover:border-white/40 ${i === 0 ? 'bg-white text-black font-bold' : ''}">
          ${escapeHtml(c.label)}
        </button>
      `).join('')}
    </div>
  `;
}

// ==================== VOIDFLIX HERO BANNER (MOBILE & DESKTOP DUAL LAYOUT) ====================
function renderVoidflixHero(items) {
  if (!items || items.length === 0) return '';
  const item = items[state.heroIndex % items.length];
  const id = item.post_ID || item.id;
  const title = item.post_title || item.title || 'Featured Series';
  const thumb = item.post_thumbnail || item.thumbnail || '';
  const views = item.post_views || item.views || 0;
  const inList = isWatchlisted(id);

  return `
    <!-- Mobile FlowFlix Hero (< 1024px) -->
    <section class="lg:hidden px-1 pt-1 pb-3">
      <div class="relative mx-auto aspect-[2/3] w-full max-w-[290px] sm:max-w-xs overflow-hidden rounded-2xl bg-carbon-850 shadow-2xl border border-white/10 select-none">
        <img src="${escapeHtml(thumb || POSTER_UNAVAILABLE_SVG)}" class="absolute inset-0 w-full h-full object-cover" loading="eager" onerror="handlePosterError(this, false)">
        <div class="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/40 to-transparent"></div>
        
        <div class="absolute inset-x-0 bottom-0 p-4 space-y-3">
          <h2 class="font-display text-2xl sm:text-3xl text-white text-center tracking-wide leading-tight drop-shadow-md line-clamp-2">${escapeHtml(title)}</h2>
          
          <div class="flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-300">
            <span class="text-brand-red font-bold">18+ Mature</span>
            <span class="text-white/40">•</span>
            <span class="text-emerald-400 font-bold">98% Match</span>
            <span class="text-white/40">•</span>
            <span class="text-gray-300">1080p FHD</span>
          </div>

          <div class="flex gap-2 pt-1">
            <button onclick="navigateTo('#/series/${id}')" 
                    class="flex-1 py-2.5 px-3 rounded-md bg-white hover:bg-gray-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-xl">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play
            </button>
            <button onclick="toggleWatchlist({ id: ${id}, title: '${escapeHtml(title).replace(/'/g, "\\'")}', thumbnail: '${escapeHtml(thumb)}' }, event)" 
                    data-watchlist-id="${id}" 
                    class="flex-1 py-2.5 px-3 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition">
              ${inList 
                ? `<svg class="w-4 h-4 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> In List` 
                : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> My List`}
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination Dots -->
      <div class="mt-3 flex items-center justify-center gap-1.5">
        ${items.slice(0, 5).map((_, idx) => `
          <button onclick="setHeroSlide(${idx})" class="p-1">
            <span class="block h-1 rounded-full transition-all duration-300 ${idx === (state.heroIndex % items.length) ? 'w-6 bg-brand-red' : 'w-2.5 bg-white/30'}"></span>
          </button>
        `).join('')}
      </div>
    </section>

    <!-- Desktop FlowFlix Hero (>= 1024px) -->
    <section class="hidden lg:block relative w-full aspect-[21/9] max-h-[580px] rounded-2xl overflow-hidden bg-carbon-850 shadow-2xl border border-white/[0.08] group select-none">
      <img src="${escapeHtml(thumb || THUMB_UNAVAILABLE_SVG)}"
           class="absolute inset-0 w-full h-full object-cover filter brightness-[0.72] group-hover:scale-105 transition-transform duration-700 ease-out"
           loading="eager"
           onerror="handlePosterError(this, true)">

      <div class="absolute inset-0 bg-gradient-to-t from-carbon-900 via-carbon-900/50 to-transparent"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-carbon-900/95 via-carbon-900/40 to-transparent"></div>

      <div class="relative z-10 p-12 max-w-3xl space-y-4">
        <div class="flex items-center gap-2.5 text-xs">
          <span class="px-2 py-0.5 rounded bg-brand-red text-white font-bold tracking-wider uppercase text-[10px]">
            18+ Mature
          </span>
          <span class="text-emerald-400 font-bold">98% Match</span>
          <span class="text-gray-300 font-semibold">2026</span>
          <span class="px-1.5 py-0.2 rounded bg-carbon-800 text-gray-300 border border-white/15 text-[10px] font-bold">Ultra HD</span>
          ${views ? `<span class="text-gray-400 text-xs">${formatViews(views)} Views</span>` : ''}
        </div>

        <h1 class="font-display text-6xl xl:text-7xl text-white tracking-wide uppercase leading-none drop-shadow-md line-clamp-2">
          ${escapeHtml(title)}
        </h1>

        <p class="text-gray-300 text-sm leading-relaxed line-clamp-3 max-w-xl drop-shadow">
          Stream the complete episodes in 1080p Full HD with VoidFlix. Featuring responsive cinema playback, chapter navigation, and adaptive quality.
        </p>

        <div class="flex items-center gap-3 pt-2">
          <button onclick="navigateTo('#/series/${id}')" 
                  class="px-8 py-3 rounded-md bg-white hover:bg-gray-200 text-black font-bold text-base flex items-center gap-2 transition active:scale-95 shadow-xl">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Watch Now
          </button>

          <button onclick="toggleWatchlist({ id: ${id}, title: '${escapeHtml(title).replace(/'/g, "\\'")}', thumbnail: '${escapeHtml(thumb)}' }, event)"
                  data-watchlist-id="${id}"
                  class="glass-btn px-6 py-3 rounded-md text-white font-semibold text-sm flex items-center gap-2 transition active:scale-95">
            ${inList
              ? `<svg class="w-4 h-4 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> <span>Added to My List</span>`
              : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> <span>Add to My List</span>`}
          </button>
        </div>
      </div>

      <!-- Desktop Slide Indicators -->
      <div class="absolute bottom-10 right-10 z-20 flex items-center gap-2">
        <button onclick="prevHeroSlide()" class="p-2 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 text-white transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div class="flex items-center gap-1.5 px-1">
          ${items.slice(0, 5).map((_, idx) => `
            <button onclick="setHeroSlide(${idx})" class="h-1 rounded-sm transition-all duration-300 ${idx === (state.heroIndex % items.length) ? 'w-8 bg-brand-red' : 'w-3 bg-white/30 hover:bg-white/60'}"></button>
          `).join('')}
        </div>
        <button onclick="nextHeroSlide()" class="p-2 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 text-white transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </section>
  `;
}

function setHeroSlide(idx) {
  state.heroIndex = idx;
  startHeroTimer();
  const wrapper = document.getElementById('hero-wrapper');
  if (wrapper && state.homeData && state.homeData.trending_month) {
    wrapper.innerHTML = renderVoidflixHero(state.homeData.trending_month.slice(0, 5));
  }
}

function nextHeroSlide() {
  if (!state.homeData || !state.homeData.trending_month) return;
  const count = Math.min(5, state.homeData.trending_month.length);
  setHeroSlide((state.heroIndex + 1) % count);
}

function prevHeroSlide() {
  if (!state.homeData || !state.homeData.trending_month) return;
  const count = Math.min(5, state.homeData.trending_month.length);
  setHeroSlide((state.heroIndex - 1 + count) % count);
}

function startHeroTimer() {
  clearInterval(state.heroTimer);
  state.heroTimer = setInterval(() => {
    nextHeroSlide();
  }, 7500);
}

// ==================== CONTINUE WATCHING ROW ====================
function renderVoidflixContinueWatching() {
  if (!state.continueWatching || !Array.isArray(state.continueWatching) || state.continueWatching.length === 0) return '';

  return `
    <section class="mb-10 relative group">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-heading font-bold text-lg sm:text-xl text-white">
          Continue Watching for You
        </h2>
        <span class="text-xs text-gray-400">${state.continueWatching.length} in progress</span>
      </div>

      <div class="relative">
        <button onclick="scrollRow('row-continue', -1)" class="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-2xl">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onclick="scrollRow('row-continue', 1)" class="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-2xl">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <div id="row-continue" class="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          ${state.continueWatching.map(item => `
            <div class="flex-shrink-0 w-56 sm:w-64 rounded-md overflow-hidden bg-carbon-800 border border-white/10 shadow-lg group/item cursor-pointer"
                 onclick="navigateTo('#/watch/${item.seriesId}/${item.chapterId}')">
              
              <div class="relative aspect-video bg-carbon-850 overflow-hidden">
                <img src="${escapeHtml(item.thumbnail)}" class="w-full h-full object-cover group-hover/item:scale-105 transition duration-300">
                <div class="absolute inset-0 bg-black/30"></div>

                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/40 flex items-center justify-center text-white shadow-xl group-hover/item:scale-110 transition">
                    <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>

                <div class="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                  <div class="h-full bg-brand-red" style="width: ${item.progressPercent}%"></div>
                </div>
              </div>

              <div class="p-2.5 flex items-center justify-between text-xs bg-carbon-750">
                <div class="min-w-0 pr-2">
                  <h4 class="font-heading font-semibold text-white truncate text-xs">${escapeHtml(item.title)}</h4>
                  <p class="text-[11px] text-gray-400 truncate">${escapeHtml(item.chapterName || 'Episode')} • ${formatTime(item.currentTime)}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button onclick="navigateTo('#/series/${item.seriesId}'); event.stopPropagation();" title="Details" class="p-1 text-gray-400 hover:text-white rounded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </button>
                  <button onclick="removeContinueWatching(${item.chapterId}, event)" title="Remove" class="p-1 text-gray-400 hover:text-white rounded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ==================== TOP 10 RANKING ROW ====================
function renderTop10Row(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return '';
  const top10 = items.slice(0, 10);

  return `
    <section class="mb-10 relative group">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-heading font-bold text-lg sm:text-xl text-white flex items-center gap-2">
          Top 10 Series Today
        </h2>
      </div>

      <div class="relative">
        <button onclick="scrollRow('row-top10', -1)" class="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-2xl">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onclick="scrollRow('row-top10', 1)" class="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-2xl">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <div id="row-top10" class="flex gap-2 sm:gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          ${top10.map((item, idx) => {
            const id = item.post_ID || item.id;
            const title = item.post_title || item.title || 'Untitled';
            const thumb = item.post_thumbnail || item.thumbnail || '';
            const rank = idx + 1;

            return `
              <div class="flex-shrink-0 flex items-center cursor-pointer group/rank active:scale-95 transition" onclick="navigateTo('#/series/${id}')">
                <span class="rank-number -mr-3 sm:-mr-5 z-10 font-bold group-hover/rank:scale-110 transition-transform duration-300 text-5xl sm:text-7xl">${rank}</span>
                <div class="w-24 sm:w-32 md:w-36 aspect-[2/3] rounded-md overflow-hidden bg-carbon-800 border border-white/10 group-hover/rank:border-white/40 transition shadow-xl relative">
                  <img src="${escapeHtml(thumb || POSTER_UNAVAILABLE_SVG)}" class="w-full h-full object-cover" onerror="handlePosterError(this, false)">
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <p class="font-heading font-semibold text-[10px] sm:text-[11px] text-white truncate">${escapeHtml(title)}</p>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

// Media Shelf
function renderMediaShelf(rowId, title, items, options = {}) {
  if (!items || !Array.isArray(items) || items.length === 0) return '';

  return `
    <section class="mb-10 relative group">
      <div class="flex items-center justify-between mb-3 px-1">
        <h2 class="font-heading font-bold text-lg sm:text-xl text-white">
          ${escapeHtml(title)}
        </h2>
        ${options.viewAllCategory ? `
          <button onclick="navigateTo('#/browse/${options.viewAllCategory}')" class="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
            Explore All <span>›</span>
          </button>
        ` : ''}
      </div>

      <div class="relative">
        <button onclick="scrollRow('${rowId}', -1)" class="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-2xl">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onclick="scrollRow('${rowId}', 1)" class="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-2xl">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <div id="${rowId}" class="flex gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
          ${items.map((it, idx) => renderFlowCard(it, {
            chapterId: it.chapter_id,
            chapterName: it.chapter_name,
            chapterIndex: idx,
            preview: it.preview
          })).join('')}
        </div>
      </div>
    </section>
  `;
}

// ==================== HOME VIEW ====================
async function showHome() {
  updateNavHighlight('home');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (state.homeData) {
    renderHomeLayout(state.homeData);
    return;
  }

  app.innerHTML = `
    <div class="space-y-8 fade-enter">
      <div class="w-full h-96 bg-carbon-800 rounded-2xl shimmer"></div>
      <div class="flex gap-4 overflow-hidden">
        ${Array.from({ length: 6 }).map(() => `<div class="w-48 aspect-[2/3] bg-carbon-800 rounded-md shimmer flex-shrink-0"></div>`).join('')}
      </div>
    </div>
  `;

  try {
    const res = await API.getHome();
    state.homeData = res.data || {};
    renderHomeLayout(state.homeData);
  } catch (err) {
    renderErrorView('Failed to load VoidFlix homepage', err, () => showHome());
  }
}

function renderHomeLayout(data) {
  const trending = Array.isArray(data?.trending_month) ? data.trending_month : [];
  const latestEpisodes = Array.isArray(data?.last_episodes) ? data.last_episodes : [];
  const recent = Array.isArray(data?.last) ? data.last : [];
  const uncensored = Array.isArray(data?.uncensored) ? data.uncensored : [];
  const ecchi = Array.isArray(data?.ecchi) ? data.ecchi : [];

  app.innerHTML = `
    <div class="fade-enter space-y-4 sm:space-y-6">
      ${renderMobileCategoryChips()}

      <div id="hero-wrapper">
        ${renderVoidflixHero(trending.slice(0, 5))}
      </div>

      ${renderVoidflixContinueWatching()}
      ${renderTop10Row(trending)}
      ${renderMediaShelf('row-episodes', 'Latest Episode Releases', latestEpisodes)}
      ${renderMediaShelf('row-trending', 'Trending Now', trending, { viewAllCategory: 'trending' })}
      ${renderMediaShelf('row-recent', 'Recently Added Series', recent, { viewAllCategory: 'recent' })}
      ${renderMediaShelf('row-uncensored', 'Uncensored Vault', uncensored, { viewAllCategory: 'uncensored' })}
      ${renderMediaShelf('row-ecchi', 'Ecchi Highlights', ecchi, { viewAllCategory: 'ecchi' })}
    </div>
  `;

  startHeroTimer();
}

// ==================== DEDICATED SERIES DETAIL PAGE (SEPARATE FULL PAGE) ====================
async function showSeriesPage(id) {
  state.route = 'series';
  updateNavHighlight('series');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Clean up any existing video player
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  app.innerHTML = `
    <div class="space-y-8 fade-enter max-w-[1400px] mx-auto">
      <div class="w-full aspect-[21/9] min-h-[320px] bg-carbon-800 rounded-2xl shimmer"></div>
      <div class="space-y-4">
        <div class="h-8 w-72 bg-carbon-800 rounded shimmer"></div>
        <div class="h-4 w-96 bg-carbon-800 rounded shimmer"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
          ${Array.from({ length: 6 }).map(() => `<div class="aspect-video bg-carbon-800 rounded-lg shimmer"></div>`).join('')}
        </div>
      </div>
    </div>
  `;

  try {
    const res = await API.getSeries(id);
    const data = res.data || {};
    state.currentSeries = data;

    const title = data.post_title || 'Untitled';
    const alt = data.post_title_alternative || '';
    const desc = data.post_content || 'No synopsis provided for this series.';
    const thumb = data.post_thumbnail || '';
    const rating = data.post_rating?.rating || '4.0';
    const votes = Number(data.post_rating?.votes || 0);
    const views = Number(data.post_views || 0);
    const genres = Array.isArray(data.post_genres) ? data.post_genres : [];
    const tags = Array.isArray(data.post_tags) ? data.post_tags : [];
    const episodes = Array.isArray(data.post_episodes) ? data.post_episodes : [];
    const related = Array.isArray(data.post_related) ? data.post_related : [];
    const inList = isWatchlisted(id);

    // Check if user has saved progress
    const saved = state.continueWatching.find(c => String(c.seriesId) === String(id));
    const firstEpId = episodes.length > 0 ? episodes[0].chapter_id : null;
    const playTargetId = saved ? saved.chapterId : firstEpId;
    const playBtnText = saved ? `Resume (${formatTime(saved.currentTime)})` : 'Play Episode 1';

    app.innerHTML = `
      <div class="space-y-6 sm:space-y-8 fade-enter max-w-[1400px] mx-auto pb-12">
        
        <!-- Mobile Series View (< 640px) -->
        <div class="block sm:hidden space-y-3 px-1">
          <div class="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-carbon-850 shadow-xl border border-white/10">
            <img src="${escapeHtml(thumb || THUMB_UNAVAILABLE_SVG)}" class="w-full h-full object-cover" onerror="handlePosterError(this, true)">
            <div class="absolute inset-0 bg-gradient-to-t from-carbon-900 via-carbon-900/30 to-transparent"></div>
            <button onclick="window.history.length > 1 ? window.history.back() : navigateTo('#/')" 
                    class="absolute top-3 left-3 px-3 py-1.5 rounded-md bg-black/75 backdrop-blur border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 shadow-lg">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back
            </button>
          </div>

          <div class="space-y-2.5 pt-1">
            <h1 class="font-display text-2xl text-white uppercase tracking-wide leading-tight">${escapeHtml(title)}</h1>
            ${alt ? `<p class="text-xs text-gray-400 italic">${escapeHtml(alt)}</p>` : ''}

            <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span class="px-1.5 py-0.5 rounded bg-brand-red text-white font-bold uppercase">18+ Mature</span>
              <span class="text-emerald-400 font-bold">98% Match</span>
              <span class="text-amber-400 font-medium">★ ${rating}</span>
              <span class="text-gray-400">• ${episodes.length} Episodes</span>
            </div>

            ${episodes.length > 0 ? `
              <button onclick="navigateTo('#/watch/${id}/${playTargetId}')"
                      class="w-full py-3 rounded-lg bg-white hover:bg-gray-200 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                ${playBtnText}
              </button>
            ` : ''}

            <div class="grid grid-cols-3 gap-2 pt-1">
              <button onclick="toggleWatchlist({ id: ${id}, title: '${escapeHtml(title).replace(/'/g, "\\'")}', thumbnail: '${escapeHtml(thumb)}' }, event)"
                      data-watchlist-id="${id}"
                      class="glass-btn py-2 px-2 rounded-lg text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition">
                ${inList
                  ? `<svg class="w-4 h-4 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg><span class="text-[10px]">Saved</span>`
                  : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg><span class="text-[10px]">My List</span>`}
              </button>
              ${firstEpId ? `
                <button onclick="openDownloadModal('${escapeHtml(title).replace(/'/g, "\\'")}', 'Episode 1', '${escapeHtml(episodes[0].chapter_content || '')}', '${escapeHtml(episodes[0].chapter_thumbnail || thumb)}')"
                        class="glass-btn py-2 px-2 rounded-lg text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  <span class="text-[10px]">Download</span>
                </button>
              ` : ''}
              <button onclick="copyToClipboard(window.location.href, 'Series link copied to clipboard!')"
                      class="glass-btn py-2 px-2 rounded-lg text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                <span class="text-[10px]">Share</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop Series Banner (>= 640px) -->
        <div class="hidden sm:block relative w-full aspect-[21/9] min-h-[360px] max-h-[500px] rounded-2xl overflow-hidden bg-carbon-850 shadow-2xl border border-white/10 group">
          <img src="${escapeHtml(thumb || THUMB_UNAVAILABLE_SVG)}" class="w-full h-full object-cover filter brightness-[0.7] transform group-hover:scale-105 transition-transform duration-700" onerror="handlePosterError(this, true)">
          <div class="absolute inset-0 bg-gradient-to-t from-carbon-900 via-carbon-900/60 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-carbon-900/90 via-carbon-900/40 to-transparent"></div>

          <!-- Top Back Button -->
          <div class="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
            <button onclick="window.history.length > 1 ? window.history.back() : navigateTo('#/')" 
                    class="px-3.5 py-2 rounded-md bg-black/60 hover:bg-black/90 backdrop-blur border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition active:scale-95">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back
            </button>
          </div>

          <!-- Banner Bottom Content -->
          <div class="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 z-20 space-y-3 sm:space-y-4 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="px-2 py-0.5 rounded bg-brand-red text-white text-[10px] font-bold uppercase tracking-wider">18+ Mature</span>
              <span class="text-emerald-400 font-bold">98% Match</span>
              <span class="px-1.5 py-0.2 rounded bg-white/20 text-white font-mono text-[10px] font-bold">Ultra HD</span>
              <span class="text-amber-400 font-medium">★ ${rating} <span class="text-gray-400 font-normal">(${votes.toLocaleString()} votes)</span></span>
              <span class="text-gray-300 font-medium">${formatViews(views)} Views</span>
              <span class="text-gray-400">${episodes.length} Episodes</span>
            </div>

            <h1 class="font-display text-3xl sm:text-5xl lg:text-6xl text-white uppercase tracking-wide leading-tight drop-shadow-md">
              ${escapeHtml(title)}
            </h1>

            ${alt ? `<p class="text-xs sm:text-sm text-gray-300 italic max-w-2xl drop-shadow">${escapeHtml(alt)}</p>` : ''}

            <div class="flex flex-wrap items-center gap-3 pt-2">
              ${episodes.length > 0 ? `
                <button onclick="navigateTo('#/watch/${id}/${playTargetId}')"
                        class="px-6 sm:px-8 py-2.5 sm:py-3 rounded-md bg-white hover:bg-gray-200 text-black font-bold text-sm sm:text-base flex items-center gap-2 shadow-2xl transition active:scale-95">
                  <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  ${playBtnText}
                </button>
              ` : ''}

              <button onclick="toggleWatchlist({ id: ${id}, title: '${escapeHtml(title).replace(/'/g, "\\'")}', thumbnail: '${escapeHtml(thumb)}' }, event)"
                      data-watchlist-id="${id}"
                      class="glass-btn px-5 py-2.5 sm:py-3 rounded-md text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95">
                ${inList
                  ? `<svg class="w-4 h-4 text-brand-red fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> <span>Added to My List</span>`
                  : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> <span>Add to My List</span>`}
              </button>

              ${firstEpId ? `
                <button onclick="openDownloadModal('${escapeHtml(title).replace(/'/g, "\\'")}', 'Episode 1', '${escapeHtml(episodes[0].chapter_content || '')}', '${escapeHtml(episodes[0].chapter_thumbnail || thumb)}')"
                        class="glass-btn p-2.5 sm:p-3 rounded-md text-white transition hover:text-brand-red" title="Download Options">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </button>
              ` : ''}

              <button onclick="copyToClipboard(window.location.href, 'Series link copied to clipboard!')" 
                      class="glass-btn p-2.5 sm:p-3 rounded-md text-white transition hover:text-gray-200" title="Share Series Link">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Series Synopsis & Metadata Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 bg-carbon-850 p-6 sm:p-8 rounded-xl border border-white/10">
          <div class="space-y-4">
            <h3 class="font-heading font-bold text-base text-white uppercase tracking-wider">Synopsis & Details</h3>
            <p class="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">${escapeHtml(desc)}</p>
          </div>

          <div class="space-y-4 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8 pt-4 lg:pt-0 text-xs">
            <div>
              <span class="text-gray-500 font-bold block mb-1.5 uppercase tracking-wider text-[11px]">Genres</span>
              <div class="flex flex-wrap gap-1.5">
                ${genres.map(g => `
                  <button onclick="navigateTo('#/browse/${encodeURIComponent(g.name.toLowerCase())}')" 
                          class="px-2.5 py-1 rounded bg-carbon-800 hover:bg-carbon-700 text-gray-300 hover:text-white border border-white/10 text-xs transition">
                    ${escapeHtml(g.name)}
                  </button>
                `).join('')}
              </div>
            </div>

            ${tags.length > 0 ? `
              <div>
                <span class="text-gray-500 font-bold block mb-1.5 uppercase tracking-wider text-[11px]">Category Tags</span>
                <div class="flex flex-wrap gap-1.5">
                  ${tags.slice(0, 12).map(t => `
                    <button onclick="navigateTo('#/browse/${encodeURIComponent(t.name.toLowerCase())}')" 
                            class="px-2 py-0.5 rounded bg-carbon-800 hover:bg-carbon-700 text-gray-400 hover:text-white border border-white/5 text-[11px] transition">
                      ${escapeHtml(t.name)}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="pt-2 text-gray-400 space-y-1 text-xs">
              <p><span class="text-gray-500 font-semibold">Total Chapters:</span> ${episodes.length}</p>
              <p><span class="text-gray-500 font-semibold">Quality:</span> 1080p FHD, 720p HD</p>
              <p><span class="text-gray-500 font-semibold">Audio:</span> Japanese Original</p>
              <p><span class="text-gray-500 font-semibold">Subtitles:</span> English (Hardsubbed / Embedded)</p>
            </div>
          </div>
        </div>

        <!-- Episodes Selector Grid -->
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-white/10">
            <h2 class="font-heading font-bold text-xl text-white">Episodes (${episodes.length})</h2>
            <span class="text-xs text-gray-400">Select an episode to watch</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${episodes.map((ep, idx) => {
              const epNum = idx + 1;
              const epName = ep.chapter_name || `Episode ${epNum}`;
              const epThumb = ep.chapter_thumbnail || thumb;
              const epDate = ep.chapter_date ? ep.chapter_date.split(' ')[0] : 'HD';

              return `
                <div class="group/ep bg-carbon-800 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition shadow-lg flex flex-row sm:flex-col cursor-pointer active:scale-[0.98]"
                     onclick="navigateTo('#/watch/${id}/${ep.chapter_id}')">
                  
                  <div class="relative w-28 sm:w-full aspect-video bg-carbon-850 overflow-hidden flex-shrink-0">
                    <img src="${escapeHtml(epThumb)}" class="w-full h-full object-cover group-hover/ep:scale-105 transition-transform duration-300" loading="lazy">
                    <div class="absolute inset-0 bg-black/30 group-hover/ep:bg-black/10 transition"></div>
                    <span class="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 text-[9px] sm:text-[10px] bg-black/80 px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wider">EP ${epNum}</span>
                  </div>

                  <div class="p-2 sm:p-3 flex items-center justify-between gap-2 flex-1 bg-carbon-750 min-w-0">
                    <div class="min-w-0 flex-1">
                      <h4 class="font-heading font-semibold text-xs sm:text-sm text-white truncate group-hover/ep:text-brand-red transition">${escapeHtml(epName)}</h4>
                      <p class="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate">${escapeHtml(epDate)} • 1080p HD</p>
                    </div>
                    
                    <button onclick="event.stopPropagation(); openDownloadModal('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(epName).replace(/'/g, "\\'")}', '${escapeHtml(ep.chapter_content || '')}', '${escapeHtml(epThumb)}');"
                            title="Download Episode"
                            class="p-1.5 sm:p-2 rounded hover:bg-carbon-600 text-gray-400 hover:text-white transition flex-shrink-0">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </button>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Related Recommendations -->
        ${related.length > 0 ? `
          <div class="space-y-4 pt-6 border-t border-white/10">
            <h2 class="font-heading font-bold text-xl text-white">More Like This</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              ${related.map(it => renderFlowCard(it, { width: 'w-full' })).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;

  } catch (err) {
    renderErrorView('Failed to load series page', err, () => showSeriesPage(id));
  }
}

// ==================== DEDICATED WATCH PAGE & FLOWFLIX CINEMA PLAYER ====================
async function showWatchPage(seriesId, chapterId) {
  state.route = 'player';
  updateNavHighlight('series');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Hide mobile bottom navigation on video player view (like FlowFlix)
  document.getElementById('mobile-bottom-nav')?.classList.add('hidden');

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  app.innerHTML = `
    <div class="max-w-[1500px] mx-auto space-y-4 fade-enter">
      <div class="w-full aspect-video bg-carbon-800 rounded-xl shimmer"></div>
    </div>
  `;

  try {
    const res = await API.getSeries(seriesId);
    const data = res.data || {};
    state.currentSeries = data;
    const episodes = Array.isArray(data.post_episodes) ? data.post_episodes : [];

    if (episodes.length === 0) {
      throw new Error('This series has no available episode streams.');
    }

    let epIndex = episodes.findIndex(e => String(e.chapter_id) === String(chapterId));
    if (epIndex < 0) {
      const saved = state.continueWatching.find(c => String(c.seriesId) === String(seriesId));
      if (saved && saved.chapterIndex < episodes.length) {
        epIndex = saved.chapterIndex;
      } else {
        epIndex = 0;
      }
    }

    const ep = episodes[epIndex];
    if (!ep || !ep.chapter_content) {
      throw new Error('No stream manifest URL found for this episode.');
    }

    state.currentEpisode = ep;
    state.currentEpisodeIndex = epIndex;
    const activeChapterId = ep.chapter_id;

    // Sync URL hash
    if (String(chapterId) !== String(activeChapterId)) {
      window.location.hash = `#/watch/${seriesId}/${activeChapterId}`;
    }

    const title = data.post_title || 'Untitled';
    const epTitle = ep.chapter_name || `Episode ${epIndex + 1}`;
    const videoUrl = ep.chapter_content;
    const hasNext = epIndex + 1 < episodes.length;
    const hasPrev = epIndex > 0;

    const saved = state.continueWatching.find(c => String(c.chapterId) === String(activeChapterId));
    const resumeTime = saved && saved.currentTime > 10 ? saved.currentTime : 0;

    const thumbForDl = ep.chapter_thumbnail || data.post_thumbnail || '';
    const dlCall = `openDownloadModal('${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(epTitle).replace(/'/g, "\\'")}', '${escapeHtml(videoUrl)}', '${escapeHtml(thumbForDl)}')`;
    const nextEp = hasNext ? episodes[epIndex + 1] : null;
    const prevEp = hasPrev ? episodes[epIndex - 1] : null;
    const ICON = {
      back: '<svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>',
      rew: '<svg class="w-7 h-7 sm:w-9 sm:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">10</text></svg>',
      fwd: '<svg class="w-7 h-7 sm:w-9 sm:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 3v5h-5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">10</text></svg>',
      next: '<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
      prev: '<svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
      eps: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke-width="2"/></svg>',
      subs: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M7 13h4M13 13h4M7 16h7"/></svg>',
      gear: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
      dl: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>',
      fs: '<svg id="fs-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
      theater: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" stroke-width="2"/></svg>',
      close: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
    };

    // Reset per-episode player UI state
    state.player.isDrawerOpen = false;
    state.player.isSettingsOpen = false;

    app.innerHTML = `
      <div class="max-w-[1500px] mx-auto fade-enter relative space-y-4 sm:space-y-6" id="player-container">

        <!-- Desktop breadcrumb strip -->
        <div class="hidden sm:flex items-center justify-between text-xs text-gray-400">
          <button onclick="navigateTo('#/series/${seriesId}')" class="hover:text-white flex items-center gap-1.5 transition min-w-0">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span class="truncate">Back to ${escapeHtml(title)}</span>
          </button>
          <div class="flex items-center gap-4 flex-shrink-0">
            <button onclick="toggleTheaterMode()" class="hover:text-white flex items-center gap-1.5 transition">${ICON.theater}<span id="theater-text">Theater</span></button>
            <button onclick="showShortcutsModal(true)" class="hover:text-white transition">Shortcuts (?)</button>
          </div>
        </div>

        <!-- ============ VOIDFLIX NATIVE PLAYER ============ -->
        <div class="-mx-3 -mt-3 sm:mx-0 sm:mt-0">
          <div id="video-frame" class="vf-frame relative w-full aspect-video bg-black sm:rounded-xl overflow-hidden select-none sm:border sm:border-white/10 shadow-2xl"
               onmousemove="revealPlayerControls()" onmouseleave="scheduleHideControls(600)">

            <video id="video-player" class="absolute inset-0 w-full h-full object-contain bg-black" playsinline webkit-playsinline preload="auto"
                   poster="${escapeHtml(thumbForDl || THUMB_UNAVAILABLE_SVG)}"></video>

            <!-- Tap / click surface (sits under the controls) -->
            <div id="tap-layer" class="absolute inset-0 z-10" onclick="handlePlayerTap(event)" ondblclick="handlePlayerDblClick(event)"></div>

            <!-- Buffering spinner -->
            <div id="player-spinner" class="hidden pointer-events-none absolute inset-0 z-[15] flex items-center justify-center">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] border-white/20 border-t-brand-red animate-spin"></div>
            </div>

            <!-- Double-tap seek flashes -->
            <div id="seek-flash-left" class="seek-flash left-0"><div class="seek-flash-pill">${ICON.rew}<span>10s</span></div></div>
            <div id="seek-flash-right" class="seek-flash right-0"><div class="seek-flash-pill">${ICON.fwd}<span>10s</span></div></div>

            <!-- ============ CONTROLS OVERLAY ============ -->
            <div id="player-controls" class="vf-controls absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">

              <!-- Top bar -->
              <div class="vf-top pointer-events-auto flex items-center gap-2 sm:gap-3 px-2 sm:px-5 pt-2 sm:pt-4 pb-8">
                <button onclick="navigateTo('#/series/${seriesId}')" class="vf-icon-btn" title="Back">${ICON.back}</button>
                <div class="min-w-0 flex-1">
                  <h3 class="font-heading font-bold text-[13px] sm:text-base text-white truncate leading-tight">${escapeHtml(title)}</h3>
                  <p class="text-[11px] sm:text-xs text-gray-300 truncate">${escapeHtml(epTitle)} <span class="text-gray-500">• ${epIndex + 1} of ${episodes.length}</span></p>
                </div>
                <button onclick="${dlCall}" class="vf-icon-btn" title="Download">${ICON.dl}</button>
              </div>

              <!-- Center transport -->
              <div class="vf-center pointer-events-none absolute inset-0 flex items-center justify-center gap-8 sm:gap-16">
                <button onclick="seekRelative(-10); flashSeek('left')" class="vf-transport pointer-events-auto" title="Back 10s">${ICON.rew}</button>
                <button onclick="togglePlayPause()" id="center-play-btn" class="vf-transport vf-transport-main pointer-events-auto" title="Play / Pause">
                  <svg id="center-play-icon" class="w-8 h-8 sm:w-11 sm:h-11 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button onclick="seekRelative(10); flashSeek('right')" class="vf-transport pointer-events-auto" title="Forward 10s">${ICON.fwd}</button>
              </div>

              <!-- Bottom bar -->
              <div class="vf-bottom pointer-events-auto px-2.5 sm:px-5 pb-2 sm:pb-4 pt-10 space-y-1 sm:space-y-2">

                <!-- Scrubber row -->
                <div class="flex items-center gap-2.5 sm:gap-3">
                  <div id="timeline-container" class="vf-timeline relative flex-1 h-6 flex items-center cursor-pointer touch-none">
                    <div class="vf-track relative w-full h-[3px] rounded-full bg-white/25 overflow-visible">
                      <div id="player-buffer-bar" class="absolute inset-y-0 left-0 bg-white/35 rounded-full" style="width:0"></div>
                      <div id="player-progress-bar" class="absolute inset-y-0 left-0 bg-brand-red rounded-full" style="width:0"></div>
                    </div>
                    <div id="player-scrubber-thumb" class="vf-thumb absolute top-1/2 w-3.5 h-3.5 rounded-full bg-brand-red pointer-events-none" style="left:0"></div>
                    <div id="player-hover-tooltip" class="hidden absolute bottom-full mb-1.5 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/15 text-white text-[11px] font-mono pointer-events-none">00:00</div>
                  </div>
                  <span id="player-time-remaining" class="text-[11px] sm:text-xs font-semibold text-white tabular-nums min-w-[42px] text-right">--:--</span>
                </div>

                <!-- Button row -->
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-0.5 sm:gap-2 min-w-0">
                    <button onclick="togglePlayPause()" class="vf-icon-btn hidden sm:inline-flex" title="Play / Pause (Space)">
                      <svg id="ctrl-play-icon" class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    ${prevEp ? `<button onclick="navigateTo('#/watch/${seriesId}/${prevEp.chapter_id}')" class="vf-icon-btn hidden sm:inline-flex" title="Previous Episode (P)">${ICON.prev}</button>` : ''}
                    <div class="vf-volume flex items-center">
                      <button id="btn-volume-mute" onclick="toggleMute()" class="vf-icon-btn" title="Mute (M)">
                        <svg id="vol-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"></svg>
                      </button>
                      <input id="volume-slider" type="range" min="0" max="1" step="0.05" value="${state.player.volume}"
                             oninput="handleVolumeChange(this.value)" class="scrubber vf-volume-slider hidden md:block h-1 rounded-full cursor-pointer">
                    </div>
                    <div class="text-[11px] sm:text-xs font-mono text-gray-300 tabular-nums whitespace-nowrap pl-1">
                      <span id="player-time-current">00:00</span><span class="text-gray-500"> / </span><span id="player-time-duration">00:00</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
                    ${nextEp ? `<button onclick="navigateTo('#/watch/${seriesId}/${nextEp.chapter_id}')" class="vf-bar-btn" title="Next Episode (N)">${ICON.next}<span class="hidden sm:inline">Next</span></button>` : ''}
                    ${episodes.length > 1 ? `<button onclick="toggleInPlayerDrawer()" class="vf-bar-btn" title="Episodes (E)">${ICON.eps}<span class="hidden sm:inline">Episodes</span></button>` : ''}
                    <button onclick="togglePlayerSettings('subs')" class="vf-bar-btn" title="Audio & Subtitles">${ICON.subs}<span class="hidden lg:inline">Audio</span></button>
                    <button onclick="togglePlayerSettings('quality')" class="vf-bar-btn" title="Quality & Speed">
                      ${ICON.gear}<span id="btn-quality" class="hidden sm:inline text-[11px] font-bold px-1.5 py-px rounded bg-white/15">AUTO</span>
                    </button>
                    <button onclick="toggleFullscreen()" class="vf-icon-btn" title="Fullscreen (F)">${ICON.fs}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ============ SETTINGS SHEET (Quality / Speed / Audio / Subtitles) ============ -->
            <div id="player-settings-backdrop" class="hidden absolute inset-0 z-30 bg-black/40" onclick="togglePlayerSettings(false)"></div>
            <div id="player-settings" class="vf-sheet hidden absolute z-40 glass-strong overflow-y-auto no-scrollbar">
              <div class="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-[rgba(14,14,18,0.96)] z-10">
                <h4 class="font-heading font-bold text-sm text-white">Playback Settings</h4>
                <button onclick="togglePlayerSettings(false)" class="vf-icon-btn -mr-2">${ICON.close}</button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-2 px-2 pb-3">
                <section id="settings-sec-quality">
                  <h5 class="vf-sheet-title">Quality</h5>
                  <div id="quality-dropdown" class="space-y-0.5"><p class="px-3 py-2 text-xs text-gray-500">Loading stream levels…</p></div>
                </section>
                <section>
                  <h5 class="vf-sheet-title">Playback Speed</h5>
                  <div id="speed-dropdown" class="grid grid-cols-3 gap-1.5 px-2"></div>
                </section>
                <section id="settings-sec-subs">
                  <h5 class="vf-sheet-title">Audio &amp; Subtitles</h5>
                  <div id="subtitles-dropdown" class="space-y-0.5"></div>
                </section>
                <section>
                  <h5 class="vf-sheet-title">Preferences</h5>
                  <label class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer text-sm text-gray-200">
                    <span>Auto-play next episode</span>
                    <input type="checkbox" ${state.player.autoPlayNext ? 'checked' : ''} onchange="state.player.autoPlayNext=this.checked; localStorage.setItem('voidflix_autoplay', String(this.checked));" class="w-4 h-4 accent-[#E50914]">
                  </label>
                </section>
              </div>
            </div>

            <!-- ============ EPISODE DRAWER ============ -->
            <div id="in-player-drawer" class="vf-drawer absolute top-0 bottom-0 right-0 z-40 w-full sm:w-80 bg-carbon-950/95 backdrop-blur-xl border-l border-white/10 flex flex-col">
              <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h4 class="font-heading font-bold text-xs uppercase tracking-wider text-white">Episodes · ${episodes.length}</h4>
                <button onclick="toggleInPlayerDrawer()" class="vf-icon-btn -mr-2">${ICON.close}</button>
              </div>
              <div class="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
                ${episodes.map((e, i) => `
                  <button onclick="navigateTo('#/watch/${seriesId}/${e.chapter_id}')"
                          class="w-full text-left flex items-center gap-3 p-2 rounded-lg transition ${i === epIndex ? 'bg-white/10 ring-1 ring-brand-red' : 'hover:bg-white/5'}">
                    <div class="relative w-24 aspect-video rounded-md overflow-hidden bg-carbon-800 flex-shrink-0">
                      <img src="${escapeHtml(e.chapter_thumbnail || data.post_thumbnail || THUMB_UNAVAILABLE_SVG)}" data-fallback="${escapeHtml(data.post_thumbnail || '')}" class="w-full h-full object-cover" loading="lazy" onerror="handlePosterError(this, true)">
                      ${i === epIndex ? '<span class="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-bold text-white uppercase tracking-wider">Playing</span>' : ''}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-xs truncate ${i === epIndex ? 'text-brand-red' : 'text-white'}">${escapeHtml(e.chapter_name || `Episode ${i + 1}`)}</p>
                      <span class="text-[10px] text-gray-500">${e.chapter_date ? e.chapter_date.split(' ')[0] : 'HD'}</span>
                    </div>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Resume prompt -->
            ${resumeTime > 0 ? `
              <div id="resume-banner" class="absolute left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24 z-30 glass-strong rounded-lg px-3 py-2 flex items-center gap-3 border border-white/15 fade-enter w-max max-w-[92%]">
                <p class="text-[11px] sm:text-xs text-gray-200 whitespace-nowrap">Resume from <b class="text-white">${formatTime(resumeTime)}</b>?</p>
                <button onclick="resumePlayback(${resumeTime})" class="px-3 py-1 bg-brand-red text-white text-[11px] font-bold rounded">Resume</button>
                <button onclick="dismissResumeBanner()" class="text-[11px] text-gray-400 hover:text-white">Dismiss</button>
              </div>
            ` : ''}

            <!-- Up-next countdown -->
            <div id="next-countdown-overlay" class="hidden absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-2 sm:gap-4 px-4 text-center">
              <span class="text-[10px] sm:text-xs font-bold text-brand-red uppercase tracking-widest">Up Next</span>
              <h3 class="font-display text-2xl sm:text-4xl text-white max-w-lg leading-tight">${nextEp ? escapeHtml(nextEp.chapter_name || `Episode ${epIndex + 2}`) : 'End of Series'}</h3>
              <p class="text-[11px] sm:text-xs text-gray-400">Playing in <span id="countdown-number" class="text-white font-bold font-mono">5</span>s</p>
              <div class="flex items-center gap-2 sm:gap-3 pt-1">
                <button onclick="executePlayNextNow(${seriesId}, ${epIndex + 1})" class="px-5 py-2 rounded bg-white text-black font-bold text-xs hover:bg-gray-200 transition">Play Now</button>
                <button onclick="cancelNextCountdown()" class="px-4 py-2 rounded bg-white/10 text-gray-200 text-xs hover:bg-white/20 border border-white/10 transition">Cancel</button>
              </div>
            </div>

          </div>
        </div>

        <!-- ============ BELOW PLAYER: INFO ============ -->
        <div class="bg-carbon-850 rounded-xl border border-white/10 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6">
          <div class="space-y-2.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-[11px]">
              <span class="px-1.5 py-0.5 rounded bg-brand-red text-white font-bold">18+</span>
              <span class="text-emerald-400 font-bold">98% Match</span>
              <span class="text-gray-400">${ep.chapter_date ? ep.chapter_date.split(' ')[0] : 'HD'}</span>
              <span class="px-1.5 py-0.5 rounded border border-white/20 text-gray-300 font-semibold">HD</span>
            </div>
            <h2 class="font-heading font-bold text-lg sm:text-2xl text-white leading-snug">${escapeHtml(title)} <span class="text-gray-400 font-semibold">· ${escapeHtml(epTitle)}</span></h2>
            <p id="watch-synopsis" class="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-3">${escapeHtml(data.post_content || 'Stream all episodes in high definition with VoidFlix.')}</p>
            <button onclick="document.getElementById('watch-synopsis').classList.toggle('line-clamp-3'); this.textContent = this.textContent === 'More' ? 'Less' : 'More';" class="text-[11px] font-semibold text-gray-400 hover:text-white">More</button>
          </div>
          <div class="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:border-l lg:border-white/10 lg:pl-6 content-center">
            <button onclick="${dlCall}" class="vf-action-btn">${ICON.dl}<span>Download</span></button>
            <button onclick="toggleWatchlist({ id: ${seriesId}, title: '${escapeHtml(title).replace(/'/g, "\\'")}', thumbnail: '${escapeHtml(data.post_thumbnail || '')}' }, event)" data-watchlist-id="${seriesId}" class="vf-action-btn">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg><span>My List</span>
            </button>
            <button onclick="copyToClipboard(window.location.href, 'Episode link copied!')" class="vf-action-btn">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg><span>Share</span>
            </button>
          </div>
        </div>

        <!-- ============ EPISODE LIST ============ -->
        <div class="space-y-3 pb-6">
          <div class="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 class="font-heading font-bold text-base text-white">Episodes <span class="text-gray-500 font-semibold">(${episodes.length})</span></h3>
            <button onclick="navigateTo('#/series/${seriesId}')" class="text-xs text-gray-400 hover:text-white font-semibold">Series details ›</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            ${episodes.map((e, idx) => `
              <button onclick="navigateTo('#/watch/${seriesId}/${e.chapter_id}')"
                      class="text-left flex sm:flex-col gap-3 sm:gap-0 rounded-lg overflow-hidden bg-carbon-800 border transition active:scale-[0.98] ${idx === epIndex ? 'border-brand-red ring-1 ring-brand-red' : 'border-white/10 hover:border-white/30'}">
                <div class="relative w-32 sm:w-full aspect-video bg-carbon-850 flex-shrink-0">
                  <img src="${escapeHtml(e.chapter_thumbnail || data.post_thumbnail || THUMB_UNAVAILABLE_SVG)}" data-fallback="${escapeHtml(data.post_thumbnail || '')}" class="w-full h-full object-cover" loading="lazy" onerror="handlePosterError(this, true)">
                  <span class="absolute bottom-1 left-1 text-[9px] bg-black/80 px-1.5 py-0.5 rounded font-bold text-white">EP ${idx + 1}</span>
                  ${idx === epIndex ? '<span class="absolute top-1 left-1 text-[9px] bg-brand-red px-1.5 py-0.5 rounded font-bold text-white uppercase">Now Playing</span>' : ''}
                </div>
                <div class="py-2 pr-3 sm:px-3 min-w-0 flex flex-col justify-center">
                  <p class="font-semibold text-xs sm:text-sm truncate ${idx === epIndex ? 'text-brand-red' : 'text-white'}">${escapeHtml(e.chapter_name || `Episode ${idx + 1}`)}</p>
                  <span class="text-[10px] text-gray-500">${e.chapter_date ? e.chapter_date.split(' ')[0] : 'HD'} · 1080p</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    initVideoPlayer(videoUrl, seriesId, activeChapterId, epIndex, title, epTitle, data.post_thumbnail);

  } catch (err) {
    renderErrorView('Failed to start playback', err, () => showWatchPage(seriesId, chapterId));
  }
}

// ==================== VOIDFLIX NATIVE PLAYER ENGINE ====================
const PLAY_PATH = '<path d="M8 5v14l11-7z"/>';
const PAUSE_PATH = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
const isTouchDevice = () => window.matchMedia('(hover: none)').matches;

function initVideoPlayer(videoUrl, seriesId, chapterId, index, seriesTitle, chapterTitle, thumbnail) {
  const video = document.getElementById('video-player');
  if (!video) return;

  video.volume = state.player.volume;
  video.muted = state.player.isMuted;
  video.playbackRate = state.player.speed || 1;
  updateVolumeUI(video.volume, video.muted);
  renderSpeedOptions();
  populateSubtitlesMenu();
  bindTimelineScrubbing();
  setSpinner(true);

  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true, lowLatencyMode: false, capLevelToPlayerSize: true });
    state.hls = hls;
    hls.loadSource(videoUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      state.player.levels = data.levels || [];
      populateQualityMenu();
      video.play().catch(() => { setSpinner(false); updatePlayPauseUI(false); });
    });
    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
      state.player.subtitleTracks = data.subtitleTracks || [];
      populateSubtitlesMenu();
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      state.player.currentLevel = data.level;
      updateQualityLabel();
      populateQualityMenu();
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
      else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      else { hls.destroy(); showToast('Playback error — stream unavailable', 'error'); setSpinner(false); }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoUrl;
    populateQualityMenu();
    video.play().catch(() => { setSpinner(false); updatePlayPauseUI(false); });
  }

  video.addEventListener('play', () => { state.player.isPlaying = true; updatePlayPauseUI(true); scheduleHideControls(); });
  video.addEventListener('pause', () => { state.player.isPlaying = false; updatePlayPauseUI(false); revealPlayerControls(true); });
  video.addEventListener('waiting', () => setSpinner(true));
  video.addEventListener('playing', () => setSpinner(false));
  video.addEventListener('canplay', () => setSpinner(false));
  video.addEventListener('loadedmetadata', () => updateTimeUI(video));

  let lastSave = 0;
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    if (!state.player.isScrubbing) updateTimeUI(video);
    const now = Date.now();
    if (now - lastSave > 5000) {
      lastSave = now;
      saveWatchProgress(seriesId, chapterId, index, seriesTitle, chapterTitle, thumbnail, video.currentTime, video.duration);
    }
  });

  video.addEventListener('progress', () => {
    if (video.buffered.length > 0 && video.duration > 0) {
      const pct = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
      const bBar = document.getElementById('player-buffer-bar');
      if (bBar) bBar.style.width = `${pct}%`;
    }
  });

  video.addEventListener('ended', () => {
    saveWatchProgress(seriesId, chapterId, index, seriesTitle, chapterTitle, thumbnail, video.duration, video.duration);
    if (state.player.autoPlayNext) startNextEpisodeCountdown(seriesId, index + 1);
  });

  revealPlayerControls(true);
}

function updateTimeUI(video, overrideTime) {
  const duration = video.duration || 0;
  const current = overrideTime != null ? overrideTime : video.currentTime;
  const pct = duration ? (current / duration) * 100 : 0;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('player-time-current', formatTime(current));
  set('player-time-duration', formatTime(duration));
  set('player-time-remaining', duration ? '-' + formatTime(Math.max(0, duration - current)) : '--:--');
  const pBar = document.getElementById('player-progress-bar');
  const thumb = document.getElementById('player-scrubber-thumb');
  if (pBar) pBar.style.width = `${pct}%`;
  if (thumb) thumb.style.left = `${pct}%`;
}

function setSpinner(on) {
  document.getElementById('player-spinner')?.classList.toggle('hidden', !on);
}

// ---- Controls visibility ----
function revealPlayerControls(sticky) {
  const frame = document.getElementById('video-frame');
  if (!frame) return;
  frame.classList.remove('controls-hidden');
  if (!sticky) scheduleHideControls();
  else clearTimeout(state.playerControlsTimer);
}

function scheduleHideControls(delay = 3000) {
  clearTimeout(state.playerControlsTimer);
  state.playerControlsTimer = setTimeout(() => {
    const frame = document.getElementById('video-frame');
    const video = document.getElementById('video-player');
    if (!frame || !video || video.paused || state.player.isDrawerOpen || state.player.isSettingsOpen || state.player.isScrubbing) return;
    frame.classList.add('controls-hidden');
  }, delay);
}

function hidePlayerControlsNow() {
  const video = document.getElementById('video-player');
  if (!video || video.paused) return;
  clearTimeout(state.playerControlsTimer);
  document.getElementById('video-frame')?.classList.add('controls-hidden');
}

// ---- Tap / click handling (touch: tap toggles controls, double-tap seeks; mouse: click toggles play) ----
function handlePlayerTap(e) {
  const frame = document.getElementById('video-frame');
  if (!frame) return;

  if (!isTouchDevice()) {
    clearTimeout(state.singleTapTimer);
    state.singleTapTimer = setTimeout(() => togglePlayPause(), 200);
    revealPlayerControls();
    return;
  }

  const now = Date.now();
  const isDouble = now - state.lastTapTime < 280;
  state.lastTapTime = now;
  const rect = frame.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;

  if (isDouble && (x < 0.35 || x > 0.65)) {
    clearTimeout(state.singleTapTimer);
    const side = x < 0.35 ? 'left' : 'right';
    seekRelative(side === 'left' ? -10 : 10);
    flashSeek(side);
    revealPlayerControls();
    return;
  }

  clearTimeout(state.singleTapTimer);
  state.singleTapTimer = setTimeout(() => {
    if (frame.classList.contains('controls-hidden')) revealPlayerControls();
    else hidePlayerControlsNow();
  }, 220);
}

function handlePlayerDblClick() {
  if (isTouchDevice()) return;
  clearTimeout(state.singleTapTimer);
  toggleFullscreen();
}

function flashSeek(side) {
  const el = document.getElementById(`seek-flash-${side}`);
  if (!el) return;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 550);
}
// Backwards compat
function showSeekRipple(side) { flashSeek(side); }

// ---- Drawer & settings sheet ----
function toggleInPlayerDrawer(force) {
  state.player.isDrawerOpen = typeof force === 'boolean' ? force : !state.player.isDrawerOpen;
  document.getElementById('in-player-drawer')?.classList.toggle('open', state.player.isDrawerOpen);
  if (state.player.isDrawerOpen) { togglePlayerSettings(false); revealPlayerControls(true); }
  else scheduleHideControls();
}

function togglePlayerSettings(section) {
  const sheet = document.getElementById('player-settings');
  const backdrop = document.getElementById('player-settings-backdrop');
  if (!sheet) return;
  const open = section === false ? false : (section === true || typeof section === 'string') ? !(state.player.isSettingsOpen && state.player.settingsSection === section) : !state.player.isSettingsOpen;
  state.player.isSettingsOpen = open;
  state.player.settingsSection = open ? section : null;
  sheet.classList.toggle('hidden', !open);
  backdrop?.classList.toggle('hidden', !open);
  if (open) {
    if (state.player.isDrawerOpen) toggleInPlayerDrawer(false);
    revealPlayerControls(true);
    const target = section === 'subs' ? 'settings-sec-subs' : 'settings-sec-quality';
    const sec = document.getElementById(target);
    if (sec && sheet.scrollHeight > sheet.clientHeight) sheet.scrollTop = sec.offsetTop - 48;
  } else {
    scheduleHideControls();
  }
}

function closeAllPlayerDropdowns() { togglePlayerSettings(false); }
function toggleSubtitlesMenu() { togglePlayerSettings('subs'); }
function toggleQualityMenu() { togglePlayerSettings('quality'); }
function toggleSpeedMenu() { togglePlayerSettings('quality'); }

function sheetOption(label, active, onclick, sub) {
  return `
    <button onclick="${onclick}" class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition hover:bg-white/5 ${active ? 'text-white font-semibold' : 'text-gray-400'}">
      <svg class="w-4 h-4 flex-shrink-0 ${active ? 'text-brand-red opacity-100' : 'opacity-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
      <span class="flex-1 truncate">${label}</span>
      ${sub ? `<span class="text-[10px] text-gray-500 font-normal">${sub}</span>` : ''}
    </button>`;
}

// ---- Playback ----
function updatePlayPauseUI(isPlaying) {
  const path = isPlaying ? PAUSE_PATH : PLAY_PATH;
  const a = document.getElementById('ctrl-play-icon');
  const b = document.getElementById('center-play-icon');
  if (a) a.innerHTML = path;
  if (b) b.innerHTML = path;
}

function togglePlayPause() {
  const video = document.getElementById('video-player');
  if (!video) return;
  if (video.paused) video.play().catch(() => {});
  else video.pause();
}

function seekRelative(delta) {
  const video = document.getElementById('video-player');
  if (!video || !video.duration) return;
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
  updateTimeUI(video);
}

// ---- Timeline scrubbing (mouse + touch via pointer events) ----
function bindTimelineScrubbing() {
  const tl = document.getElementById('timeline-container');
  const video = document.getElementById('video-player');
  const tooltip = document.getElementById('player-hover-tooltip');
  if (!tl || !video) return;

  const posFromEvent = (e) => {
    const rect = tl.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };
  const showTip = (pos) => {
    if (!tooltip || !video.duration) return;
    tooltip.textContent = formatTime(pos * video.duration);
    tooltip.style.left = `${pos * 100}%`;
    tooltip.classList.remove('hidden');
  };

  tl.addEventListener('pointerdown', (e) => {
    if (!video.duration) return;
    e.preventDefault();
    state.player.isScrubbing = true;
    tl.classList.add('scrubbing');
    tl.setPointerCapture?.(e.pointerId);
    const pos = posFromEvent(e);
    updateTimeUI(video, pos * video.duration);
    showTip(pos);
    revealPlayerControls(true);
  });
  tl.addEventListener('pointermove', (e) => {
    if (!video.duration) return;
    const pos = posFromEvent(e);
    if (state.player.isScrubbing) updateTimeUI(video, pos * video.duration);
    if (state.player.isScrubbing || e.pointerType === 'mouse') showTip(pos);
  });
  const end = (e) => {
    if (!state.player.isScrubbing) return;
    state.player.isScrubbing = false;
    tl.classList.remove('scrubbing');
    video.currentTime = posFromEvent(e) * video.duration;
    tooltip?.classList.add('hidden');
    scheduleHideControls();
  };
  tl.addEventListener('pointerup', end);
  tl.addEventListener('pointercancel', end);
  tl.addEventListener('pointerleave', (e) => { if (!state.player.isScrubbing && e.pointerType === 'mouse') tooltip?.classList.add('hidden'); });
}

// Legacy handlers (kept for compatibility)
function handleTimelineClick() {}
function handleTimelineHover() {}
function handleTimelineLeave() {}
function handlePlayerClick(e) { handlePlayerTap(e); }
function handlePlayerMouseMove() { revealPlayerControls(); }
function handlePlayerMouseLeave() { scheduleHideControls(600); }

// ---- Volume ----
function handleVolumeChange(val) {
  const video = document.getElementById('video-player');
  if (!video) return;
  video.volume = parseFloat(val);
  video.muted = (video.volume === 0);
  state.player.volume = video.volume;
  state.player.isMuted = video.muted;
  localStorage.setItem('voidflix_volume', String(video.volume));
  localStorage.setItem('voidflix_muted', String(video.muted));
  updateVolumeUI(video.volume, video.muted);
}

function toggleMute() {
  const video = document.getElementById('video-player');
  if (!video) return;
  video.muted = !video.muted;
  if (!video.muted && video.volume === 0) video.volume = 0.5;
  state.player.isMuted = video.muted;
  localStorage.setItem('voidflix_muted', String(video.muted));
  updateVolumeUI(video.volume, video.muted);
}

function updateVolumeUI(volume, isMuted) {
  const icon = document.getElementById('vol-icon');
  const slider = document.getElementById('volume-slider');
  const level = isMuted ? 0 : volume;
  if (slider) {
    slider.value = level;
    slider.style.background = `linear-gradient(to right, #fff ${level * 100}%, rgba(255,255,255,0.25) ${level * 100}%)`;
  }
  if (!icon) return;
  const speaker = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>';
  if (isMuted || volume === 0) {
    icon.innerHTML = speaker + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>';
  } else {
    icon.innerHTML = speaker + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072"/>' + (volume > 0.5 ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728"/>' : '');
  }
}

// ---- Audio & Subtitles ----
function populateSubtitlesMenu() {
  const box = document.getElementById('subtitles-dropdown');
  if (!box) return;
  const tracks = state.player.subtitleTracks || [];
  box.innerHTML = `
    <p class="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Audio</p>
    ${sheetOption('Japanese', true, '', 'Original')}
    <p class="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Subtitles</p>
    ${tracks.length > 0
      ? tracks.map((t, idx) => sheetOption(escapeHtml(t.name || t.lang || `Track ${idx + 1}`), state.player.currentSubtitle === idx, `setSubtitleTrack(${idx})`)).join('') +
        sheetOption('Off', state.player.currentSubtitle === -1, 'setSubtitleTrack(-1)')
      : sheetOption('English', true, '', 'Burned-in') +
        `<p class="px-3 pb-1 text-[10px] text-gray-500 leading-snug">English subtitles are embedded in the video and can't be turned off.</p>`}
  `;
}

function setSubtitleTrack(trackIndex) {
  if (state.hls) state.hls.subtitleTrack = trackIndex;
  state.player.currentSubtitle = trackIndex;
  populateSubtitlesMenu();
}

// ---- Quality ----
function qualityLabel(h) {
  if (!h) return 'HD';
  return `${h}p`;
}

function populateQualityMenu() {
  const box = document.getElementById('quality-dropdown');
  if (!box) return;
  if (!state.hls) {
    box.innerHTML = sheetOption('Auto', true, '', 'Native HLS');
    return;
  }
  const levels = (state.player.levels || []).map((l, idx) => ({ ...l, idx })).sort((a, b) => (b.height || 0) - (a.height || 0));
  const auto = state.hls.autoLevelEnabled;
  const cur = state.hls.currentLevel;
  const autoSub = auto && state.player.levels[cur] ? qualityLabel(state.player.levels[cur].height) : '';
  box.innerHTML = sheetOption('Auto', auto, 'setQualityLevel(-1)', autoSub) +
    levels.map(l => sheetOption(qualityLabel(l.height), !auto && cur === l.idx, `setQualityLevel(${l.idx})`,
      l.height >= 1080 ? 'Full HD' : l.height >= 720 ? 'HD' : 'SD')).join('');
}

function updateQualityLabel() {
  const btn = document.getElementById('btn-quality');
  if (!btn || !state.hls) return;
  if (state.hls.autoLevelEnabled) btn.textContent = 'AUTO';
  else {
    const l = state.player.levels[state.hls.currentLevel];
    btn.textContent = l ? qualityLabel(l.height) : 'HD';
  }
}

function setQualityLevel(levelIndex) {
  if (!state.hls) return;
  state.hls.currentLevel = levelIndex;
  updateQualityLabel();
  populateQualityMenu();
}

// ---- Speed ----
function renderSpeedOptions() {
  const box = document.getElementById('speed-dropdown');
  if (!box) return;
  const cur = state.player.speed || 1;
  box.innerHTML = [0.5, 0.75, 1, 1.25, 1.5, 2].map(s => `
    <button onclick="setPlaybackSpeed(${s})" class="py-2 rounded-lg text-xs font-semibold transition border ${s === cur ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}">
      ${s === 1 ? 'Normal' : s + 'x'}
    </button>`).join('');
}

function setPlaybackSpeed(s) {
  const video = document.getElementById('video-player');
  if (video) video.playbackRate = s;
  state.player.speed = s;
  renderSpeedOptions();
}

// ---- Theater & Fullscreen ----
function toggleTheaterMode() {
  state.player.isTheater = !state.player.isTheater;
  const container = document.getElementById('player-container');
  const txt = document.getElementById('theater-text');
  if (container) {
    container.classList.toggle('max-w-[1500px]', !state.player.isTheater);
    container.classList.toggle('max-w-full', state.player.isTheater);
  }
  if (txt) txt.textContent = state.player.isTheater ? 'Standard' : 'Theater';
}

function toggleFullscreen() {
  const frame = document.getElementById('video-frame');
  const video = document.getElementById('video-player');
  if (!frame) return;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    return;
  }
  const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
  if (req) {
    Promise.resolve(req.call(frame)).then(() => {
      try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) {}
    }).catch(() => {});
  } else if (video?.webkitEnterFullscreen) {
    video.webkitEnterFullscreen(); // iOS Safari
  }
}

['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => document.addEventListener(evt, () => {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  document.getElementById('video-frame')?.classList.toggle('is-fullscreen', isFs);
  const icon = document.getElementById('fs-icon');
  if (icon) {
    icon.innerHTML = isFs
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>';
  }
  if (!isFs) { try { screen.orientation?.unlock?.(); } catch (e) {} }
}));

// ---- Resume & Up Next ----
function resumePlayback(time) {
  const video = document.getElementById('video-player');
  if (video) {
    video.currentTime = time;
    video.play().catch(() => {});
  }
  dismissResumeBanner();
  showToast(`Resumed at ${formatTime(time)}`, 'success');
}

function dismissResumeBanner() {
  document.getElementById('resume-banner')?.remove();
}

let countdownInterval = null;
function startNextEpisodeCountdown(seriesId, nextIndex) {
  const episodes = Array.isArray(state.currentSeries?.post_episodes) ? state.currentSeries.post_episodes : [];
  if (nextIndex >= episodes.length) return;
  const overlay = document.getElementById('next-countdown-overlay');
  const countEl = document.getElementById('countdown-number');
  if (!overlay || !countEl) return;

  let timeLeft = 5;
  overlay.classList.remove('hidden');
  countEl.textContent = timeLeft;

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    timeLeft--;
    countEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      executePlayNextNow(seriesId, nextIndex);
    }
  }, 1000);
}

function cancelNextCountdown() {
  clearInterval(countdownInterval);
  document.getElementById('next-countdown-overlay')?.classList.add('hidden');
}

function executePlayNextNow(seriesId, nextIndex) {
  clearInterval(countdownInterval);
  if (!state.currentSeries) return;
  const episodes = Array.isArray(state.currentSeries.post_episodes) ? state.currentSeries.post_episodes : [];
  if (nextIndex < episodes.length) {
    navigateTo(`#/watch/${seriesId}/${episodes[nextIndex].chapter_id}`);
  } else {
    showToast('End of series');
  }
}



// ==================== VOIDFLIX DOWNLOAD MODAL ====================
function openDownloadModal(seriesTitle, chapterName, streamUrl, thumbnail) {
  const modal = document.getElementById('download-modal');
  const content = document.getElementById('download-modal-content');
  if (!modal || !content) return;

  const safeTitle = (seriesTitle || 'Anime').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEp = (chapterName || 'Episode').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeTitle}_${safeEp}.m3u8`;

  content.innerHTML = `
    <div class="flex items-center gap-3 p-3 rounded-lg bg-carbon-800 border border-white/10">
      <img src="${escapeHtml(thumbnail || THUMB_UNAVAILABLE_SVG)}" class="w-16 aspect-video object-cover rounded bg-carbon-850" onerror="handlePosterError(this, true)">
      <div class="min-w-0 flex-1">
        <h4 class="font-heading font-semibold text-white text-xs truncate">${escapeHtml(seriesTitle)}</h4>
        <p class="text-[11px] text-gray-400 truncate">${escapeHtml(chapterName)}</p>
        <span class="text-[10px] text-emerald-400 font-bold">1080p / 720p HLS Stream Available</span>
      </div>
    </div>

    <div class="space-y-2">
      <label class="block text-gray-300 font-semibold text-[11px]">Download Options:</label>
      
      <button onclick="downloadM3u8File('${escapeHtml(streamUrl)}', '${fileName}')" class="w-full py-2.5 px-3 rounded-md bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        Download M3U8 Playlist (VLC / PotPlayer / IDM)
      </button>
    </div>

    <div class="space-y-1.5 pt-2 border-t border-white/10">
      <span class="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">Fast Command-Line Download:</span>
      <div class="relative bg-carbon-900 border border-white/10 rounded p-2 text-[10px] font-mono text-gray-300 select-all overflow-x-auto">
        yt-dlp "${escapeHtml(streamUrl)}" -o "${safeTitle} - ${safeEp}.mp4"
      </div>
      <button onclick="copyToClipboard('yt-dlp &quot;${escapeHtml(streamUrl)}&quot; -o &quot;${safeTitle} - ${safeEp}.mp4&quot;', 'yt-dlp command copied!')" class="text-[10px] text-brand-red hover:underline font-semibold">
        Copy yt-dlp command
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeDownloadModal() {
  document.getElementById('download-modal')?.classList.add('hidden');
}

function downloadM3u8File(url, fileName) {
  const blob = new Blob([`#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=5000000\n${url}\n`], { type: 'application/vnd.apple.mpegurl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Playlist file downloaded!', 'success');
}

// Close download modal on backdrop click
document.getElementById('download-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'download-modal') {
    closeDownloadModal();
  }
});

// ==================== BROWSE & FULL CATALOGUE (EVERY TITLE A-Z) ====================
const ALPHABET_KEYS = ['ALL', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

async function showBrowse(category = 'all', sort = 'views', letter = 'ALL', page = 1) {
  updateNavHighlight(category === 'series' ? 'series' : category === 'trending' ? 'trending' : category === 'uncensored' ? 'uncensored' : 'browse');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  state.catalogue.activeLetter = letter;
  state.catalogue.activeTag = category;
  state.catalogue.sort = sort;
  state.catalogue.page = page;

  app.innerHTML = `
    <div class="space-y-6 fade-enter">
      <div class="h-8 w-48 bg-carbon-800 rounded shimmer"></div>
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        ${Array.from({ length: 12 }).map(() => `<div class="aspect-[2/3] bg-carbon-800 rounded-md shimmer"></div>`).join('')}
      </div>
    </div>
  `;

  try {
    let items = [];

    if (category === 'trending' || category === 'series' || category === 'uncensored') {
      const res = await API.getHome();
      state.homeData = res.data || {};
      const d = state.homeData;
      if (category === 'trending') items = Array.isArray(d.trending_month) ? d.trending_month : [];
      else if (category === 'series') items = Array.isArray(d.last) ? d.last : [];
      else if (category === 'uncensored') items = Array.isArray(d.uncensored) ? d.uncensored : [];
    } else {
      // General Catalogue search by Letter or Tag
      const query = letter !== 'ALL' 
        ? (letter === '#' ? '1' : letter) 
        : (category !== 'all' ? category : 'a');
      const res = await API.search(query, page);
      items = Array.isArray(res?.data) ? res.data : [];
    }

    state.catalogue.items = items;
    renderCatalogueView();

  } catch (err) {
    renderErrorView('Failed to load catalogue', err, () => showBrowse(category, sort, letter, page));
  }
}

function showTagFilter(tagName) {
  showBrowse(tagName.toLowerCase());
}

function renderCatalogueView() {
  const { items, activeLetter, activeTag, sort } = state.catalogue;
  const headingTitle = activeTag !== 'all' 
    ? `GENRE: ${activeTag.toUpperCase()}` 
    : (activeLetter !== 'ALL' ? `INDEX: ${activeLetter}` : 'CATALOGUE DIRECTORY');
  const headingSubtitle = activeTag !== 'all'
    ? `Showing popular and recent anime matching tag "${activeTag}"`
    : (activeLetter !== 'ALL' ? `Showing titles starting with index "${activeLetter}"` : 'Discover all titles alphabetically and by category');

  app.innerHTML = `
    <div class="space-y-6 fade-enter">
      
      <!-- Catalogue Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 class="font-display text-3xl sm:text-4xl uppercase text-white tracking-wide">
            ${escapeHtml(headingTitle)}
          </h1>
          <p class="text-xs text-gray-400">${escapeHtml(headingSubtitle)}</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">Sort:</span>
          <select onchange="handleSortChange(this.value)" class="bg-carbon-800 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none">
            <option value="views" ${sort === 'views' ? 'selected' : ''}>Most Popular</option>
            <option value="title" ${sort === 'title' ? 'selected' : ''}>Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Quick Category Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        ${[
          ['all', 'All Titles'],
          ['trending', 'Trending'],
          ['uncensored', 'Uncensored'],
          ['harem', 'Harem'],
          ['school', 'School'],
          ['maid', 'Maid'],
          ['milf', 'Milf'],
          ['elf', 'Elf'],
          ['isekai', 'Isekai'],
          ['succubus', 'Succubus'],
          ['sister', 'Sister'],
          ['ecchi', 'Ecchi'],
          ['vanilla', 'Vanilla'],
          ['creampie', 'Creampie']
        ].map(([tag, label]) => `
          <button onclick="showBrowse('${tag}', '${sort}', 'ALL', 1)" 
                  class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${activeTag === tag ? 'bg-brand-red text-white border-transparent' : 'bg-carbon-800 text-gray-300 border-white/10 hover:bg-carbon-700'}">
            ${label}
          </button>
        `).join('')}
      </div>

      <!-- A-Z Alphabet Filter Strip (Exact HentaiHaven Catalogue Feature) -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar text-xs font-bold text-gray-300">
        <span class="text-gray-500 mr-1 text-[11px] uppercase tracking-wider">Index:</span>
        ${ALPHABET_KEYS.map(l => `
          <button onclick="showBrowse('${activeTag}', '${sort}', '${l}', 1)"
                  class="w-7 h-7 rounded flex items-center justify-center transition border ${activeLetter === l ? 'bg-white text-black border-white' : 'bg-carbon-800 hover:bg-carbon-700 border-white/10 text-gray-300'}">
            ${l}
          </button>
        `).join('')}
      </div>

      <!-- Catalogue Titles Grid -->
      ${items.length === 0 ? `
        <div class="text-center py-24 text-gray-400 text-sm">No titles found for this filter.</div>
      ` : `
        <div id="catalogue-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          ${items.map(it => renderFlowCard(it, { width: 'w-full' })).join('')}
        </div>
      `}

      <!-- Load More Titles Button (Pagination) -->
      <div class="text-center pt-6 pb-12">
        <button id="btn-load-more" onclick="loadMoreCatalogueTitles()" 
                class="px-8 py-3 rounded-md bg-carbon-800 hover:bg-carbon-700 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition">
          Load More Titles
        </button>
      </div>

    </div>
  `;
}

async function loadMoreCatalogueTitles() {
  const btn = document.getElementById('btn-load-more');
  const grid = document.getElementById('catalogue-grid');
  if (!btn || !grid) return;

  btn.disabled = true;
  btn.innerHTML = `<span class="inline-block animate-spin mr-2">⟳</span> Loading More...`;

  try {
    state.catalogue.page += 1;
    const query = state.catalogue.activeLetter !== 'ALL' 
      ? (state.catalogue.activeLetter === '#' ? '1' : state.catalogue.activeLetter)
      : (state.catalogue.activeTag !== 'all' ? state.catalogue.activeTag : 'a');

    const res = await API.search(query, state.catalogue.page);
    const newItems = Array.isArray(res?.data) ? res.data : [];

    if (newItems.length === 0) {
      btn.innerText = 'All Titles Loaded';
      btn.disabled = true;
    } else {
      state.catalogue.items.push(...newItems);
      newItems.forEach(item => {
        grid.insertAdjacentHTML('beforeend', renderFlowCard(item, { width: 'w-full' }));
      });
      btn.disabled = false;
      btn.innerText = 'Load More Titles';
    }
  } catch (err) {
    btn.innerText = 'Load More Titles';
    btn.disabled = false;
    showToast('Failed to load more titles: ' + err.message, 'error');
  }
}

function handleSortChange(sort) {
  state.catalogue.sort = sort;
  if (sort === 'views') {
    state.catalogue.items.sort((a, b) => Number(b.post_views || 0) - Number(a.post_views || 0));
  } else if (sort === 'title') {
    state.catalogue.items.sort((a, b) => (a.post_title || a.title || '').localeCompare(b.post_title || b.title || ''));
  }
  const grid = document.getElementById('catalogue-grid');
  if (grid) {
    grid.innerHTML = state.catalogue.items.map(it => renderFlowCard(it, { width: 'w-full' })).join('');
  }
}

// ==================== SEARCH ====================
function handleSearchInput(e) {
  const query = e.target.value.trim();
  const clearBtn = document.getElementById('search-clear-btn');
  const dropdown = document.getElementById('search-dropdown');
  const resultsContainer = document.getElementById('search-dropdown-results');

  if (clearBtn) clearBtn.classList.toggle('hidden', !query);
  clearTimeout(state.searchDebounceTimer);

  if (!query) {
    dropdown?.classList.add('hidden');
    return;
  }

  state.searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await API.search(query);
      const items = Array.isArray(res?.data) ? res.data.slice(0, 5) : [];

      if (items.length === 0) {
        resultsContainer.innerHTML = `<div class="p-3 text-xs text-gray-400 text-center">No quick results found.</div>`;
      } else {
        resultsContainer.innerHTML = items.map(it => {
          const id = it.post_ID || it.id;
          const title = it.post_title || it.title;
          const thumb = it.post_thumbnail || it.thumbnail;
          return `
            <div onclick="navigateTo('#/series/${id}'); closeSearchDropdown();" class="flex items-center gap-3 p-2 rounded hover:bg-carbon-700 cursor-pointer transition">
              <img src="${escapeHtml(thumb || POSTER_UNAVAILABLE_SVG)}" class="w-9 h-12 object-cover rounded bg-carbon-800 flex-shrink-0" onerror="handlePosterError(this, false)">
              <div class="min-w-0 flex-1">
                <p class="font-heading font-semibold text-xs text-white truncate">${escapeHtml(title)}</p>
                <span class="text-[10px] text-gray-400">View Series Info ›</span>
              </div>
            </div>
          `;
        }).join('') + `
          <div onclick="submitSearch()" class="p-2 text-center text-xs text-gray-300 hover:text-white cursor-pointer font-bold border-t border-white/5">
            View all matching results →
          </div>
        `;
      }
      dropdown.classList.remove('hidden');
    } catch (err) {}
  }, 250);
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  document.getElementById('search-clear-btn')?.classList.add('hidden');
  closeSearchDropdown();
}

function closeSearchDropdown() {
  document.getElementById('search-dropdown')?.classList.add('hidden');
}

async function submitSearch() {
  const query = document.getElementById('search-input').value.trim();
  closeSearchDropdown();
  if (!query) return;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  app.innerHTML = `
    <div class="space-y-6 fade-enter">
      <div class="h-8 w-64 bg-carbon-800 rounded shimmer"></div>
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        ${Array.from({ length: 6 }).map(() => `<div class="aspect-[2/3] bg-carbon-800 rounded-md shimmer"></div>`).join('')}
      </div>
    </div>
  `;

  try {
    const res = await API.search(query);
    const items = Array.isArray(res?.data) ? res.data : [];

    app.innerHTML = `
      <div class="space-y-6 fade-enter">
        <div class="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h1 class="font-display text-3xl text-white uppercase tracking-wide">Search Results</h1>
            <p class="text-xs text-gray-400">${items.length} titles matching "${escapeHtml(query)}"</p>
          </div>
          <button onclick="navigateTo('#/')" class="text-xs text-gray-400 hover:text-white transition">← Return Home</button>
        </div>

        ${items.length === 0 ? `
          <div class="text-center py-24 text-gray-400 text-sm space-y-3">
            <p class="font-heading font-bold text-base text-white">No titles found</p>
            <p class="text-xs text-gray-400 max-w-sm mx-auto">No results matched your search for "${escapeHtml(query)}". Try searching by alternative Japanese title, category tag, or explore the A-Z directory.</p>
            <button onclick="navigateTo('#/browse/all')" class="px-5 py-2.5 rounded-md bg-brand-red text-white font-bold text-xs hover:bg-brand-darkRed transition">Browse Full Catalogue</button>
          </div>
        ` : `
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            ${items.map(it => renderFlowCard(it, { width: 'w-full' })).join('')}
          </div>
        `}
      </div>
    `;
  } catch (err) {
    renderErrorView(`Search failed`, err, () => submitSearch());
  }
}

async function playRandomSeries() {
  try {
    showToast('Picking a random title...', 'info');
    const res = await API.getHome();
    const d = res.data || {};
    const pool = [...(Array.isArray(d.trending_month) ? d.trending_month : []), ...(Array.isArray(d.last) ? d.last : [])];
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      navigateTo(`#/series/${pick.post_ID || pick.id}`);
    }
  } catch (err) {
    showToast('Randomizer error: ' + err.message, 'error');
  }
}

// ==================== WATCHLIST & HISTORY ====================
function showWatchlist() {
  updateNavHighlight('watchlist');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const items = Array.isArray(state.watchlist) ? state.watchlist : [];

  app.innerHTML = `
    <div class="space-y-6 fade-enter">
      <div class="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 class="font-display text-3xl sm:text-4xl uppercase text-white tracking-wide">My List</h1>
          <p class="text-xs text-gray-400">${items.length} bookmarked titles</p>
        </div>
        ${items.length > 0 ? `
          <button onclick="clearWatchlistData()" class="px-3 py-1.5 rounded bg-carbon-800 text-xs text-gray-400 hover:text-white border border-white/10">Clear List</button>
        ` : ''}
      </div>

      ${items.length === 0 ? `
        <div class="text-center py-28 space-y-3">
          <p class="font-heading font-bold text-lg text-white">Your list is empty.</p>
          <p class="text-xs text-gray-400">Save shows while exploring to watch them anytime.</p>
          <button onclick="navigateTo('#/')" class="px-5 py-2.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-200 transition">Browse Popular Titles</button>
        </div>
      ` : `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          ${items.map(it => renderFlowCard(it, { width: 'w-full' })).join('')}
        </div>
      `}
    </div>
  `;
}

function clearWatchlistData() {
  if (confirm('Clear all titles from My List?')) {
    state.watchlist = [];
    localStorage.removeItem('voidflix_watchlist');
    localStorage.removeItem('flowflix_watchlist');
    showToast('My List cleared');
    showWatchlist();
  }
}

function showHistory() {
  updateNavHighlight('history');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const items = Array.isArray(state.history) ? state.history : [];

  app.innerHTML = `
    <div class="space-y-6 fade-enter">
      <div class="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 class="font-display text-3xl sm:text-4xl uppercase text-white tracking-wide">Watch History</h1>
          <p class="text-xs text-gray-400">${items.length} playback sessions</p>
        </div>
        ${items.length > 0 ? `
          <button onclick="clearWatchHistory()" class="px-3 py-1.5 rounded bg-carbon-800 text-xs text-red-400 hover:text-red-300 border border-white/10">Clear History</button>
        ` : ''}
      </div>

      ${items.length === 0 ? `
        <div class="text-center py-28 text-gray-400 text-sm">No watch history yet.</div>
      ` : `
        <div class="divide-y divide-white/10 glass-card rounded-lg overflow-hidden border border-white/10">
          ${items.map(it => `
            <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-carbon-750 transition cursor-pointer"
                 onclick="navigateTo('#/watch/${it.seriesId}/${it.chapterId}')">
              
              <div class="flex items-center gap-4">
                <div class="w-32 aspect-video rounded overflow-hidden bg-carbon-850 flex-shrink-0 relative">
                  <img src="${escapeHtml(it.thumbnail || THUMB_UNAVAILABLE_SVG)}" class="w-full h-full object-cover" onerror="handlePosterError(this, true)">
                  <span class="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 rounded font-mono text-white">${formatTime(it.currentTime)}</span>
                </div>
                <div>
                  <h4 class="font-heading font-semibold text-sm text-white">${escapeHtml(it.title)}</h4>
                  <p class="text-xs text-gray-400 mt-0.5">${escapeHtml(it.chapterName || 'Episode')} • ${it.progressPercent}% completed</p>
                </div>
              </div>

              <button class="px-4 py-1.5 rounded bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-gray-200 transition self-end sm:self-center">
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Resume
              </button>

            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function clearWatchHistory() {
  if (confirm('Clear your entire watch history?')) {
    state.history = [];
    state.continueWatching = [];
    localStorage.removeItem('voidflix_history');
    localStorage.removeItem('voidflix_continue_watching');
    localStorage.removeItem('flowflix_history');
    localStorage.removeItem('flowflix_continue_watching');
    showToast('History cleared');
    showHistory();
  }
}

// ==================== GLOBAL KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

  if (e.key === '/') {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
    return;
  }

  if (state.route === 'player') {
    const video = document.getElementById('video-player');
    if (!video) return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
      case 'j':
      case 'J':
        e.preventDefault();
        seekRelative(-10);
        break;
      case 'ArrowRight':
      case 'l':
      case 'L':
        e.preventDefault();
        seekRelative(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleVolumeChange(Math.min(1, video.volume + 0.05));
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleVolumeChange(Math.max(0, video.volume - 0.05));
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 't':
      case 'T':
        e.preventDefault();
        toggleTheaterMode();
        break;
      case 'e':
      case 'E':
        e.preventDefault();
        toggleInPlayerDrawer();
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        if (state.currentSeries) {
          const episodes = Array.isArray(state.currentSeries.post_episodes) ? state.currentSeries.post_episodes : [];
          if (state.currentEpisodeIndex + 1 < episodes.length) {
            navigateTo(`#/watch/${state.currentSeries.post_ID}/${episodes[state.currentEpisodeIndex + 1].chapter_id}`);
          }
        }
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        if (state.currentSeries) {
          const episodes = Array.isArray(state.currentSeries.post_episodes) ? state.currentSeries.post_episodes : [];
          if (state.currentEpisodeIndex > 0) {
            navigateTo(`#/watch/${state.currentSeries.post_ID}/${episodes[state.currentEpisodeIndex - 1].chapter_id}`);
          }
        }
        break;
    }
  }

  if (e.key === '?') showShortcutsModal(true);
  if (e.key === 'Escape') {
    closeDownloadModal();
    toggleSettingsModal(false);
    showShortcutsModal(false);
    if (state.player.isSettingsOpen) togglePlayerSettings(false);
    if (state.player.isDrawerOpen) toggleInPlayerDrawer(false);
  }
});

// ==================== SETTINGS & PROFILE ====================
function toggleSettingsModal(open) {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.toggle('hidden', !open);

  if (open) {
    document.getElementById('setting-gateway-input').value = API.getGateway();
    document.getElementById('setting-autoplay').checked = state.player.autoPlayNext;
    document.getElementById('setting-hover-preview').checked = state.player.hoverPreview;
    testGatewayConnection();
  }
}

function showShortcutsModal(open) {
  document.getElementById('shortcuts-modal')?.classList.toggle('hidden', !open);
}

function toggleProfileMenu() {
  document.getElementById('profile-dropdown')?.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#profile-dropdown') && !e.target.closest('button[onclick*="toggleProfileMenu"]')) {
    document.getElementById('profile-dropdown')?.classList.add('hidden');
  }
});

function updateSetting(key, val) {
  state.player[key] = val;
  if (key === 'autoplay') localStorage.setItem('voidflix_autoplay', String(val));
  if (key === 'hoverPreview') localStorage.setItem('voidflix_hover_preview', String(val));
  showToast('Settings updated', 'success');
}

function setGatewayPreset(url) {
  document.getElementById('setting-gateway-input').value = url;
}

async function testAndSaveGateway() {
  const url = document.getElementById('setting-gateway-input').value.trim();
  API.setGateway(url);
  showToast('Testing gateway connection...');
  await testGatewayConnection();
}

async function testGatewayConnection() {
  const statusEl = document.getElementById('gateway-status');
  if (!statusEl) return;
  statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></span> Checking...`;

  const health = await API.checkHealth();
  if (health.ok) {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> <span class="text-emerald-300">Connected (${health.mode})</span>`;
  } else {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-400"></span> <span class="text-red-300">${escapeHtml(health.error || 'Gateway error')}</span>`;
  }
}

function resetAllData() {
  if (confirm('Reset all saved watch progress, list, and preferences?')) {
    localStorage.clear();
    showToast('Platform reset complete', 'success');
    setTimeout(() => window.location.reload(), 500);
  }
}

function renderErrorView(title, err, retryFn) {
  app.innerHTML = `
    <div class="glass-strong max-w-md mx-auto rounded-xl p-8 text-center space-y-4 my-20 border border-red-500/30 fade-enter">
      <h2 class="font-heading font-bold text-lg text-white">${escapeHtml(title)}</h2>
      <p class="text-xs text-red-300/80 bg-carbon-800 p-3 rounded font-mono text-left">${escapeHtml(err.message)}</p>
      <p class="text-xs text-gray-400">Start the local server with <code class="text-white">npm start</code> or update gateway in settings.</p>
      <div class="flex items-center justify-center gap-2 pt-2">
        <button onclick="(${retryFn.toString()})()" class="px-4 py-2 bg-brand-red text-white text-xs font-bold rounded">Retry</button>
        <button onclick="toggleSettingsModal(true)" class="px-4 py-2 bg-carbon-800 text-gray-300 text-xs rounded border border-white/10">Gateway Settings</button>
      </div>
    </div>
  `;
}

// ==================== ROUTING SYSTEM (HASH BASED) ====================
function handleRoute() {
  const hash = window.location.hash || '#/';
  
  if (hash.startsWith('#/series/')) {
    const seriesId = hash.replace('#/series/', '').split('?')[0].split('/')[0];
    showSeriesPage(seriesId);
  } else if (hash.startsWith('#/watch/')) {
    const parts = hash.replace('#/watch/', '').split('?')[0].split('/');
    const seriesId = parts[0];
    const chapterId = parts[1] || null;
    showWatchPage(seriesId, chapterId);
  } else if (hash.startsWith('#/browse/')) {
    const cat = decodeURIComponent(hash.replace('#/browse/', '').split('?')[0]);
    showBrowse(cat);
  } else if (hash.startsWith('#/browse')) {
    showBrowse('all');
  } else if (hash.startsWith('#/watchlist')) {
    showWatchlist();
  } else if (hash.startsWith('#/history')) {
    showHistory();
  } else {
    showHome();
  }
}

window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', handleRoute);
