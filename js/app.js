// Main App Logic

const app = document.getElementById('app');
const loading = document.getElementById('loading');

function showLoading(show = true) {
  loading.classList.toggle('hidden', !show);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== HOME ====================
async function showHome() {
  showLoading(true);
  try {
    const res = await API.getHome();
    const data = res.data || {};

    const latest = data.last || [];
    // Some responses have more sections; we use what is available
    const sections = [
      { title: 'Recently Updated', items: latest }
    ];

    app.innerHTML = `
      <div class="space-y-10">
        ${sections.map(section => `
          <section>
            <h2 class="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span class="w-1 h-6 bg-cyan rounded"></span>
              ${escapeHtml(section.title)}
            </h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              ${section.items.map(item => cardHTML(item)).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="text-center py-20 text-red-400">Failed to load homepage.<br><small>${err.message}</small></div>`;
  } finally {
    showLoading(false);
  }
}

function cardHTML(item) {
  const id = item.post_ID || item.id;
  const title = item.post_title || item.title || 'Unknown';
  const thumb = item.post_thumbnail || item.thumbnail || item.cover || '';
  
  return `
    <a href="#" onclick="showSeries(${id}); return false;" 
       class="group block bg-steel rounded-lg overflow-hidden card-hover transition duration-200">
      <div class="aspect-[3/4] bg-ink relative overflow-hidden">
        <img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" 
             class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x400/1F2833/66FCF1?text=No+Image'">
      </div>
      <div class="p-3">
        <h3 class="text-sm font-medium text-white line-clamp-2 leading-snug">${escapeHtml(title)}</h3>
      </div>
    </a>
  `;
}

// ==================== SEARCH ====================
async function doSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  showLoading(true);
  try {
    const res = await API.search(query);
    const items = res.data || [];

    app.innerHTML = `
      <div>
        <h2 class="text-xl font-semibold text-white mb-6">
          Search results for “${escapeHtml(query)}”
          <span class="text-frost text-base font-normal ml-2">(${items.length})</span>
        </h2>
        ${items.length === 0 
          ? '<p class="text-frost py-12 text-center">No results found.</p>'
          : `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
               ${items.map(item => cardHTML(item)).join('')}
             </div>`
        }
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="text-center py-20 text-red-400">Search failed.<br><small>${err.message}</small></div>`;
  } finally {
    showLoading(false);
  }
}

// ==================== SERIES DETAIL ====================
async function showSeries(id) {
  showLoading(true);
  try {
    const res = await API.getSeries(id);
    const data = res.data || {};

    const title = data.post_title || 'Unknown';
    const alt = data.post_title_alternative || '';
    const desc = data.post_content || 'No description available.';
    const thumb = data.post_thumbnail || '';
    const rating = data.post_rating?.rating || 'N/A';
    const votes = data.post_rating?.votes || 0;
    const views = data.post_views || 0;
    const genres = (data.post_genres || []).map(g => g.name).join(', ');
    const episodes = data.post_episodes || [];

    app.innerHTML = `
      <div class="grid lg:grid-cols-[280px_1fr] gap-8">
        <!-- Poster -->
        <div>
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}"
               class="w-full rounded-xl shadow-lg border border-steel"
               onerror="this.src='https://via.placeholder.com/300x400/1F2833/66FCF1?text=No+Image'">
        </div>

        <!-- Info -->
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-white mb-1">${escapeHtml(title)}</h1>
          ${alt ? `<p class="text-frost text-sm mb-4">${escapeHtml(alt)}</p>` : ''}

          <div class="flex flex-wrap gap-4 text-sm mb-5">
            <span class="flex items-center gap-1">
              <span class="text-yellow-400">★</span> ${rating} <span class="text-frost">(${votes} votes)</span>
            </span>
            <span>${Number(views).toLocaleString()} views</span>
          </div>

          ${genres ? `<p class="text-sm mb-4"><span class="text-cyan">Genres:</span> ${escapeHtml(genres)}</p>` : ''}

          <p class="text-frost leading-relaxed mb-8 text-sm md:text-base">${escapeHtml(desc)}</p>

          <h2 class="text-lg font-semibold text-white mb-4">Episodes (${episodes.length})</h2>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            ${episodes.map((ep, idx) => `
              <button onclick="playEpisode(${id}, ${ep.chapter_id}, ${idx})"
                      class="bg-steel hover:bg-accent/30 border border-steel hover:border-cyan rounded-lg p-3 text-left transition group">
                <div class="aspect-video bg-ink rounded mb-2 overflow-hidden">
                  <img src="${escapeHtml(ep.chapter_thumbnail || thumb)}" 
                       class="w-full h-full object-cover group-hover:scale-105 transition"
                       loading="lazy"
                       onerror="this.style.display='none'">
                </div>
                <p class="text-sm font-medium text-white truncate">${escapeHtml(ep.chapter_name || 'Episode ' + (idx+1))}</p>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="text-center py-20 text-red-400">Failed to load series.<br><small>${err.message}</small></div>`;
  } finally {
    showLoading(false);
  }
}

// ==================== VIDEO PLAYER ====================
async function playEpisode(seriesId, chapterId, index = 0) {
  showLoading(true);
  try {
    // We already have episode data from series, but we can also fetch single episode if needed.
    // For simplicity we re-fetch series (or you can cache it).
    const res = await API.getSeries(seriesId);
    const data = res.data || {};
    const episodes = data.post_episodes || [];
    const ep = episodes.find(e => e.chapter_id == chapterId) || episodes[index];

    if (!ep || !ep.chapter_content) {
      throw new Error('No video source found for this episode');
    }

    const title = data.post_title || '';
    const epTitle = ep.chapter_name || `Episode ${index + 1}`;
    const videoUrl = ep.chapter_content;

    app.innerHTML = `
      <div class="max-w-5xl mx-auto">
        <div class="mb-4">
          <button onclick="showSeries(${seriesId})" class="text-sm text-cyan hover:underline">← Back to series</button>
          <h1 class="text-xl font-bold text-white mt-2">${escapeHtml(title)}</h1>
          <p class="text-frost">${escapeHtml(epTitle)}</p>
        </div>

        <div class="bg-black rounded-xl overflow-hidden shadow-2xl border border-steel">
          <video id="video-player" class="w-full aspect-video" controls autoplay playsinline></video>
        </div>

        <div class="mt-6">
          <h3 class="text-white font-medium mb-3">All Episodes</h3>
          <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            ${episodes.map((e, i) => `
              <button onclick="playEpisode(${seriesId}, ${e.chapter_id}, ${i})"
                      class="flex-shrink-0 px-4 py-2 rounded-full text-sm border transition
                             ${e.chapter_id == chapterId 
                               ? 'bg-cyan text-ink border-cyan font-medium' 
                               : 'bg-steel border-steel hover:border-cyan text-frost'}">
                ${escapeHtml(e.chapter_name || `Ep ${i+1}`)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Initialize HLS player
    const video = document.getElementById('video-player');
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false
      });
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS error', data);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = videoUrl;
      video.play().catch(() => {});
    } else {
      video.insertAdjacentHTML('afterend', 
        '<p class="text-red-400 text-center mt-4">Your browser does not support HLS playback.</p>');
    }

  } catch (err) {
    app.innerHTML = `<div class="text-center py-20 text-red-400">Failed to load video.<br><small>${err.message}</small></div>`;
  } finally {
    showLoading(false);
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  showHome();
});
