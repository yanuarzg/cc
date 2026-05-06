(() => {
  'use strict';
  const TARGET_URL = 'https://harianexpress.com';
  const links = document.querySelectorAll('.logo_link');
  Array.from(links).forEach(link => {
    if (link.getAttribute('href') !== TARGET_URL) {
      link.href = TARGET_URL;
    }
  });
})();

// ============================================================
// DOMAIN GROUPS — definisi sekali, pakai di semua widget
// ============================================================
const DOMAIN_GROUPS = {
  'all'  : 'banten.harianexpress.com, blitar.harianexpress.com, bogor.harianexpress.com, bola.harianexpress.com, depok.harianexpress.com, edu.harianexpress.com, en.harianexpress.com, entertainment.harianexpress.com, finance.harianexpress.com, foto.harianexpress.com, health.harianexpress.com, humaniora.harianexpress.com, klaten.harianexpress.com, lampung.harianexpress.com, lifestyle.harianexpress.com, nature.harianexpress.com, olahraga.harianexpress.com, otomotif.harianexpress.com, properti.harianexpress.com, tangsel.harianexpress.com, tekno.harianexpress.com, travel.harianexpress.com, umkm.harianexpress.com, www.harianexpress.com',

  'daerah' : 'banten.harianexpress.com, blitar.harianexpress.com, bogor.harianexpress.com, depok.harianexpress.com, klaten.harianexpress.com, lampung.harianexpress.com, tangsel.harianexpress.com',
};

document.addEventListener("DOMContentLoaded", function () {

  // ============================================================
  // DNS PRECONNECT (jalankan sekali saat load)
  // ============================================================
  function addPreconnect(domains) {
    const head = document.head;
    domains.forEach(domain => {
      if (!document.querySelector(`link[href*="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = `https://${domain}`;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
        const dnsLink = document.createElement('link');
        dnsLink.rel = 'dns-prefetch';
        dnsLink.href = `https://${domain}`;
        head.appendChild(dnsLink);
      }
    });
  }

  // ============================================================
  // CONFIG
  // ============================================================
  const config = {
    CACHE_DURATION : 5 * 60 * 1000,  // 5 menit — lebih baik untuk cache hit
    FETCH_TIMEOUT  : 20 * 1000,       // 20 detik — cukup untuk koneksi lambat
    RETRY_DELAY    : 3 * 1000,        // jeda sebelum retry otomatis
    ERROR_MESSAGE  : '<p style="text-align:center;color:#888;padding:12px 0;">Koneksi lambat, memuat ulang…</p>',
    PLACEHOLDER    : 'https://harianexpress.com/wp-content/uploads/2024/12/HE-Logo-Besar.png'
  };

  // ============================================================
  // REQUEST DEDUPLICATION TRACKER
  // ============================================================
  const pendingRequests = new Map();
  const pendingBloggerRequests = new Map();

  // ============================================================
  // HELPER: Escape HTML
  // ============================================================
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ============================================================
  // SKELETON LOADER HTML
  // ============================================================
  function renderSkeleton() {
    const skeletonHTML = `
      <li style="display:flex;gap:16px;margin-bottom:15px;align-items:center;">
        <div class="skeleton-img" style="aspect-ratio:16/9;width:-moz-available;width:-webkit-fill-available;height:auto;max-height:124px!important;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton-loading 1.5s infinite;border-radius:4px;"></div>
        <div class='dn' style="flex:1;">
          <div class="skeleton-title" style="height:14px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton-loading 1.5s infinite;border-radius:3px;width:80%;margin-bottom:8px;"></div>
          <div class="skeleton-date" style="height:10px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:skeleton-loading 1.5s infinite;border-radius:3px;width:40%;"></div>
        </div>
      </li>
    `;

    // Desktop: 4, Mobile: 2
    const count = window.innerWidth >= 768 ? 4 : 2;
    const items = Array(count).fill(skeletonHTML).join('');

    return `
      <style>
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
      <ul style="list-style:none;padding:0;margin:0;">${items}</ul>
    `;
  }

  // ============================================================
  // HELPER: Render List
  // ============================================================  
  function renderList(items) {
    if (!items.length) return '<p>Tidak ada konten.</p>';
    return '<ul style="list-style:none;padding:0;margin:0;">' +
      items.map(item => {
        const label = item.source.startsWith('www.') ? 'NEWS' : item.source.split('.')[0];
        return `
          <li style="display:flex;gap:16px;margin-bottom:15px;align-items:center;">
            <a href="${escapeHTML(item.link)}" aria-label="${escapeHTML(item.title)}" class="post-img">
              <img src="${item.img}"
                 alt="${escapeHTML(item.title)}"
                 style="width:70px;height:50px;object-fit:cover;border-radius:4px;"
                 loading="lazy"
                 onerror="this.src='${config.PLACEHOLDER}'"/>
            </a>
            <div style="flex:1;">
              <h3 class="jl_fe_title jl_txt_2row" style="text-decoration:none;font-size:18px;display:block;line-height:1.25;">
                <a href="${escapeHTML(item.link)}" target="_blank">${escapeHTML(item.title)}</a>
              </h3>
              <small style="font-size:11px;display:flex;gap:6px;align-items:center;margin-top:0.5rem;">
                <time datetime="${escapeHTML(item.rawDate)}">${escapeHTML(item.date)}</time>
                <span style="background:#e8f0fe;color:#1a73e8;font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;letter-spacing:.3px;text-transform:uppercase;">
                  ${escapeHTML(label)}
                </span>
              </small>
            </div>
          </li>`;
      }).join('') +
      '</ul>';
  }

  // ============================================================
  // CACHE HELPER
  // ============================================================
  function getCached(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > config.CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data.value;
    } catch {
      return null;
    }
  }

  function setCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({
        value: value,
        timestamp: Date.now()
      }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        localStorage.clear();
      }
    }
  }

  // ============================================================
  // EXTRACT WORDPRESS THUMBNAIL
  // ============================================================
  function extractWPThumbnail(post, mediaMap) {
    try {
      const embedded = post._embedded?.['wp:featuredmedia']?.[0];
      if (embedded) {
        return embedded.media_details?.sizes?.medium?.source_url
            || embedded.media_details?.sizes?.thumbnail?.source_url
            || embedded.source_url
            || null;
      }
    } catch { /* lanjut ke fallback */ }

    if (post.featured_media && mediaMap[post.featured_media]) {
      return mediaMap[post.featured_media];
    }
    return null;
  }

  // ============================================================
  // WORDPRESS OPTIMIZED FETCH (direct ke WP REST API)
  // ============================================================
  async function fetchWPCore(source, catId, count, offset, container, attempt = 1) {
    let url = `https://${source}/wp-json/wp/v2/posts`
            + `?per_page=${count}&offset=${offset}`
            + `&orderby=date&order=desc`
            + `&_embed=wp:featuredmedia`
            + `&_fields=id,title,link,date,featured_media,_embedded,_links`;
    if (catId) url += `&categories=${catId}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.FETCH_TIMEOUT);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache'
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const posts = await res.json();

      const missingEmbedIds = posts
        .filter(p => p.featured_media && !p._embedded?.['wp:featuredmedia']?.[0])
        .map(p => p.featured_media);

      let mediaMap = {};
      if (missingEmbedIds.length > 0) {
        try {
          const uniqueIds = [...new Set(missingEmbedIds)];
          const mediaUrl = `https://${source}/wp-json/wp/v2/media`
                         + `?include=${uniqueIds.join(',')}`
                         + `&_fields=id,source_url,media_details`;
          const mediaRes = await fetch(mediaUrl, { cache: 'no-cache' });
          const mediaData = await mediaRes.json();
          mediaData.forEach(m => {
            mediaMap[m.id] = m.media_details?.sizes?.medium?.source_url
                          || m.media_details?.sizes?.thumbnail?.source_url
                          || m.source_url;
          });
        } catch { /* lanjut tanpa thumbnail */ }
      }

      const mapped = posts.map(post => ({
        title   : post.title.rendered || post.title,
        link    : post.link,
        rawDate : post.date,
        date    : new Date(post.date).toLocaleDateString('id-ID'),
        source  : source,
        img     : extractWPThumbnail(post, mediaMap) || config.PLACEHOLDER
      }));

      return mapped;

    } catch (err) {
      clearTimeout(timeout);
      if (attempt < 2) {
        console.warn(`WP fetch gagal (${source}), retry dalam ${config.RETRY_DELAY / 1000}s…`);
        await new Promise(r => setTimeout(r, config.RETRY_DELAY));
        return fetchWPCore(source, catId, count, offset, container, 2);
      }
      console.error(`WP fetch failed (${source}):`, err.message);
      return [];
    }
  }

  // Wrapper with deduplication
  async function fetchWPOptimized(source, catId, count, offset, container, attempt = 1) {
    const cacheKey = `wp_${source}_${catId || 'all'}_${count}_${offset}`;
    
    const cached = getCached(cacheKey);
    if (cached) return cached;

    if (pendingRequests.has(cacheKey)) {
      console.log(`Reusing pending request for: ${source}`);
      return pendingRequests.get(cacheKey);
    }

    const promise = fetchWPCore(source, catId, count, offset, container, attempt);
    pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      if (result && result.length > 0) {
        setCache(cacheKey, result);
      }
      return result;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  }

  // ============================================================
  // BLOGGER OPTIMIZED FETCH
  // ============================================================
  function loadBloggerOptimized(source, category, count, startIndex, callback, container, attempt = 1) {
    const cacheKey = `blg_${source}_${category || 'all'}_${count}_${startIndex}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      callback(cached);
      return;
    }

    if (pendingBloggerRequests.has(cacheKey)) {
      console.log(`Reusing pending Blogger request for: ${source}`);
      pendingBloggerRequests.get(cacheKey).push(callback);
      return;
    }

    pendingBloggerRequests.set(cacheKey, [callback]);

    const cbName = 'blgCb_' + Math.random().toString(36).slice(2);

    const timer = setTimeout(() => {
      cleanupJSONP(cbName);
      
      const callbacks = pendingBloggerRequests.get(cacheKey) || [];
      pendingBloggerRequests.delete(cacheKey);

      if (attempt < 2) {
        console.warn(`Blogger JSONP timeout (${source}), retry…`);
        setTimeout(() => {
          if (callbacks.length > 0) {
            loadBloggerOptimized(source, category, count, startIndex, callbacks[0], container, 2);
            for (let i = 1; i < callbacks.length; i++) {
              setTimeout(() => {
                loadBloggerOptimized(source, category, count, startIndex, callbacks[i], container, 2);
              }, 100);
            }
          }
        }, config.RETRY_DELAY);
      } else {
        console.error(`Blogger fetch failed (${source}): timeout`);
        callbacks.forEach(cb => cb([]));
      }
    }, config.FETCH_TIMEOUT);

    window[cbName] = function (data) {
      clearTimeout(timer);
      cleanupJSONP(cbName);

      const entries = data.feed.entry || [];
      const mapped = entries.map(entry => ({
        title   : entry.title.$t,
        link    : entry.link.find(l => l.rel === 'alternate').href,
        rawDate : entry.published.$t,
        date    : new Date(entry.published.$t).toLocaleDateString('id-ID'),
        source  : source,
        img     : entry.media$thumbnail
                    ? entry.media$thumbnail.url.replace(/\/s\d+-c\//, '/s320-c/')
                    : config.PLACEHOLDER
      }));

      if (mapped.length > 0) {
        setCache(cacheKey, mapped);
      }

      const callbacks = pendingBloggerRequests.get(cacheKey) || [];
      pendingBloggerRequests.delete(cacheKey);
      
      callbacks.forEach(cb => cb(mapped));
    };

    const labelPath = category ? `/-/${encodeURIComponent(category)}/` : '/';
    const script = document.createElement('script');
    script.id = cbName;
    script.src = `https://${source}/feeds/posts/default${labelPath}?alt=json&max-results=${count}&start-index=${startIndex}&callback=${cbName}`;
    script.onerror = () => {
      clearTimeout(timer);
      cleanupJSONP(cbName);
      
      const callbacks = pendingBloggerRequests.get(cacheKey) || [];
      pendingBloggerRequests.delete(cacheKey);

      if (attempt < 2) {
        console.warn(`Blogger JSONP error (${source}), retry…`);
        setTimeout(() => {
          if (callbacks.length > 0) {
            loadBloggerOptimized(source, category, count, startIndex, callbacks[0], container, 2);
            for (let i = 1; i < callbacks.length; i++) {
              setTimeout(() => {
                loadBloggerOptimized(source, category, count, startIndex, callbacks[i], container, 2);
              }, 100);
            }
          }
        }, config.RETRY_DELAY);
      } else {
        console.error(`Blogger fetch failed (${source}): script error`);
        callbacks.forEach(cb => cb([]));
      }
    };
    document.body.appendChild(script);
  }

  function cleanupJSONP(cbName) {
    const scriptEl = document.getElementById(cbName);
    if (scriptEl) scriptEl.remove();
    if (window[cbName]) delete window[cbName];
  }

  // ============================================================
  // FEED MANAGER: Mengelompokkan widget multi-source WP
  // ============================================================
  const FeedManager = {
    wpGroups: new Map(),

    // Resolusi domain groups
    resolveDomains(value) {
      if (DOMAIN_GROUPS[value.trim()]) {
        return DOMAIN_GROUPS[value.trim()].split(',').map(s => s.trim());
      }
      return value.split(',').map(s => s.trim()).filter(Boolean);
    },

    registerWPContainer(container) {
      const sourcesRaw = container.dataset.sources || 'all';
      const sources = this.resolveDomains(sourcesRaw);
      const category = container.dataset.category || '';
      const start = parseInt(container.dataset.start) || 1;
      const count = parseInt(container.dataset.items) || 10;

      const key = `${sources.sort().join(',')}::${category}`;
      if (!this.wpGroups.has(key)) {
        this.wpGroups.set(key, {
          sources,
          category,
          containers: [],
          totalNeeded: 0,
          data: null
        });
      }
      const group = this.wpGroups.get(key);
      group.containers.push({ container, start, count });
      group.totalNeeded = Math.max(group.totalNeeded, start + count - 1);
    },

    async init() {
      // Preconnect domains dari semua grup
      const allDomains = new Set();
      for (const [_, group] of this.wpGroups) {
        group.sources.forEach(d => allDomains.add(d));
      }
      addPreconnect(Array.from(allDomains));

      // Fetch tiap grup (berjalan paralel)
      const promises = [];
      for (const [key, group] of this.wpGroups.entries()) {
        promises.push(this.fetchGroup(key, group));
      }
      await Promise.allSettled(promises);
    },

    async fetchGroup(key, group) {
      const cacheKey = `feed_mgr_${key}`;
      let allPosts = getCached(cacheKey);
      if (allPosts) {
        this.distributeToWidgets(group, allPosts);
        return;
      }

      const fetchCount = group.totalNeeded;
      const posts = await this.fetchFromSources(group.sources, group.category, fetchCount);

      if (posts.length > 0) {
        posts.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
        setCache(cacheKey, posts, config.CACHE_DURATION);
      }
      group.data = posts;
      this.distributeToWidgets(group, posts);
    },

    async fetchFromSources(sources, category, count) {
      const CONCURRENCY = 6;
      let catIds = {};
      // Resolve category ID untuk semua sumber sekaligus (paralel)
      if (category) {
        const catPromises = sources.map(async src => {
          const cid = await this.getCatId(src, category);
          if (cid) catIds[src] = cid;
        });
        await Promise.allSettled(catPromises);
      }

      const results = [];
      for (let i = 0; i < sources.length; i += CONCURRENCY) {
        const batch = sources.slice(i, i + CONCURRENCY);
        const batchPromises = batch.map(src =>
          fetchWPOptimized(src, category ? (catIds[src] || null) : null, count, 0, null)
        );
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(r => {
          if (r.status === 'fulfilled') results.push(...r.value);
        });
      }
      return results;
    },

    async getCatId(source, categoryName) {
      const catCacheKey = `catid_${source}_${categoryName}`;
      let catId = getCached(catCacheKey);
      if (catId !== null && catId !== undefined) return catId;
      try {
        const res = await fetch(
          `https://${source}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}&per_page=1&_fields=id`
        );
        if (!res.ok) return null;
        const cats = await res.json();
        catId = cats[0]?.id || null;
        setCache(catCacheKey, catId, 30 * 60 * 1000); // cache 30 menit untuk kategori
        return catId;
      } catch {
        return null;
      }
    },

    distributeToWidgets(group, allPosts) {
      group.containers.forEach(({ container, start, count }) => {
        const offset = start - 1;
        const sliced = allPosts.slice(offset, offset + count);
        if (sliced.length > 0) {
          container.innerHTML = renderList(sliced);
        } else {
          container.innerHTML = config.ERROR_MESSAGE;
        }
        container.removeAttribute('aria-busy');
      });
    }
  };

  // ============================================================
  // MAIN INITIALIZATION
  // ============================================================
  // Tangani semua jenis widget setelah DOM siap

  // Daftarkan multi-source WP
  document.querySelectorAll('.recent-wp-multi').forEach(container => {
    if (container.dataset.loaded) return;
    container.dataset.loaded = '1';
    container.innerHTML = renderSkeleton();
    container.setAttribute('aria-busy', 'true');
    FeedManager.registerWPContainer(container);
  });

  // Single WP
  document.querySelectorAll('.recent-wp').forEach(container => {
    if (container.dataset.loaded) return;
    container.dataset.loaded = '1';
    container.innerHTML = renderSkeleton();
    container.setAttribute('aria-busy', 'true');
    window.loadSingleWP(container);
  });

  // Single Blogger
  document.querySelectorAll('.recent-blg').forEach(container => {
    if (container.dataset.loaded) return;
    container.dataset.loaded = '1';
    container.innerHTML = renderSkeleton();
    container.setAttribute('aria-busy', 'true');
    window.loadSingleBlogger(container);
  });

  // Multi Blogger (tetap pakai loadMultiBlogger asli)
  document.querySelectorAll('.recent-blg-multi').forEach(container => {
    if (container.dataset.loaded) return;
    container.dataset.loaded = '1';
    container.innerHTML = renderSkeleton();
    container.setAttribute('aria-busy', 'true');
    window.loadMultiBlogger(container);
  });

  // Mulai FeedManager (multi WP terkelompok)
  FeedManager.init();

  // ============================================================
  // SINGLE WP (tetap ada untuk widget non-grup)
  // ============================================================
  window.loadSingleWP = async function(container) {
    const source = container.getAttribute('data-source');
    const count  = parseInt(container.getAttribute('data-items')) || 5;
    const start  = parseInt(container.getAttribute('data-start'))  || 1;
    const offset = start - 1;

    const posts = await fetchWPOptimized(source, null, count, offset, container);
    if (posts.length) {
      container.innerHTML = renderList(posts);
    } else {
      container.innerHTML = config.ERROR_MESSAGE;
    }
    container.removeAttribute('aria-busy');
  };

  // ============================================================
  // SINGLE BLOGGER
  // ============================================================
  window.loadSingleBlogger = function(container) {
    const source     = container.getAttribute('data-source');
    const count      = parseInt(container.getAttribute('data-items')) || 5;
    const startIndex = parseInt(container.getAttribute('data-start'))  || 1;

    loadBloggerOptimized(source, null, count, startIndex, posts => {
      if (posts.length) {
        container.innerHTML = renderList(posts);
      } else {
        container.innerHTML = config.ERROR_MESSAGE;
      }
      container.removeAttribute('aria-busy');
    }, container);
  };

  // ============================================================
  // MULTI BLOGGER (fungsi asli dipertahankan)
  // ============================================================
  window.loadMultiBlogger = function(container) {
    const raw = container.getAttribute('data-sources') || '';
    const sourceAttr = DOMAIN_GROUPS[raw.trim()] || raw;
    const sources       = sourceAttr.split(',').map(s => s.trim()).filter(Boolean);
    const category      = container.getAttribute('data-category') || '';
    const total         = parseInt(container.getAttribute('data-items')) || 10;
    const sort          = container.getAttribute('data-sort') || 'date';
    const start         = parseInt(container.getAttribute('data-start')) || 1;
    const globalOffset  = start - 1;

    const fetchCount = total + globalOffset;

    if (!sources.length) return;

    addPreconnect(sources);

    let allEntries = [];
    let completed  = 0;

    sources.forEach(source => {
      loadBloggerOptimized(source, category, fetchCount, 1, entries => {
        allEntries = allEntries.concat(entries);
        completed++;

        if (completed === sources.length) {
          if (sort === 'date') {
            allEntries.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
          }
          const slicedEntries = allEntries.slice(globalOffset, globalOffset + total);
          if (slicedEntries.length) {
            container.innerHTML = renderList(slicedEntries);
          } else {
            container.innerHTML = config.ERROR_MESSAGE;
          }
          container.removeAttribute('aria-busy');
        }
      }, container);
    });
  };

  // ============================================================
  // MULTI WP (dijalankan oleh FeedManager, tidak diperlukan lagi)
  // ============================================================
  window.loadMultiWP = function() {
    // kosong, sudah ditangani FeedManager
  };

});

/**
 * CENTRALIZED BANNER WIDGET
 * Pasang script ini di semua website (20+ sites)
 * Banner akan auto-update dari central config
 * 
 * IMPORTANT: Script ini HANYA memproses <div id="banner-event">
 * Tidak akan interferensi dengan widget lain seperti .recent-wp-multi
 */

(function() {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  const CONFIG_URL = 'https://yanuarzg.github.io/cc/he/banner-config.json';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 menit cache
  const BANNER_NAMESPACE = 'centralizedBanner'; // Unique namespace

  // ============================================================
  // CACHE HELPER (Namespaced untuk avoid conflict)
  // ============================================================
  function getCachedConfig() {
    try {
      const cached = localStorage.getItem(BANNER_NAMESPACE + '_config');
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(BANNER_NAMESPACE + '_config');
        return null;
      }
      return data.config;
    } catch {
      return null;
    }
  }

  function setCachedConfig(config) {
    try {
      localStorage.setItem(BANNER_NAMESPACE + '_config', JSON.stringify({
        config: config,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Storage full or disabled
    }
  }

  // ============================================================
  // LOAD CONFIG
  // ============================================================
  async function loadBannerConfig() {
    const container = document.getElementById('banner-event');
    if (!container) return;

    let config = getCachedConfig();
    
    if (!config) {
      try {
        const response = await fetch(CONFIG_URL + '?v=' + Date.now(), {
          cache: 'no-cache'
        });
        config = await response.json();
        setCachedConfig(config);
      } catch (err) {
        console.error('Failed to load banner config:', err);
        return;
      }
    }

    renderBanner(container, config);
  }

  // ============================================================
  // RENDER BANNER
  // ============================================================
  function renderBanner(container, config) {
    const currentHost = window.location.hostname;
    if (config.display.showOnSites && config.display.showOnSites.length > 0) {
      const shouldShow = config.display.showOnSites.some(site => 
        currentHost.includes(site.trim())
      );
      if (!shouldShow) {
        container.style.display = 'none';
        return;
      }
    }

    let html = `
      <div class="centralized-banner" style="
        width: -moz-available;
        width: -webkit-fill-available;
        height: fit-content;
        border-radius: 0.5rem;
        overflow: hidden;
        background-image: url('${config.background.image}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        display: flex!important;
        position: relative;
        gap: 1rem;
        margin-block: 2rem;
      ">
    `;

    if (config.event.image) {
      html += `
        <img 
          src="${config.event.image}" 
          alt="Event Banner"
        >
      `;
    }

    if (config.slider && config.slider.enabled && config.slider.subdomain) {
      html += `
        <div id="banner-slider" style="flex: 1; min-width: 0; padding: 8px 0;">
          <div id="slider-track" style="
            display: flex;
            gap: 10px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding: 4px 4px 8px 4px;
          "></div>
        </div>
      `;
    }

    html += '</div>';

    if (!document.getElementById('banner-scroll-style')) {
      const style = document.createElement('style');
      style.id = 'banner-scroll-style';
      style.textContent = '#slider-track::-webkit-scrollbar { display: none; }';
      document.head.appendChild(style);
    }

    container.innerHTML = html;

    if (config.slider && config.slider.enabled && config.slider.subdomain) {
      initSlider(config.slider);
    }
  }

  // ============================================================
  // POSITION HELPER (tidak digunakan di versi ini, tapi tersedia)
  // ============================================================
  function getPositionStyles(position) {
    let horizontal = '';
    let vertical = '';

    switch (position.horizontal) {
      case 'left':   horizontal = 'left: 20px;'; break;
      case 'right':  horizontal = 'right: 20px;'; break;
      case 'center': horizontal = 'left: 50%; transform: translateX(-50%);'; break;
    }

    switch (position.vertical) {
      case 'top':    vertical = 'top: 20px;'; break;
      case 'bottom': vertical = 'bottom: 20px;'; break;
      case 'center':
        vertical = 'top: 50%; transform: translateY(-50%);';
        if (position.horizontal === 'center') {
          vertical = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        }
        break;
    }

    return horizontal + vertical;
  }

  // ============================================================
  // SLIDER LOGIC — CSS scroll-snap, no JS navigation
  // ============================================================
  function initSlider(sliderConfig) {
    if (!sliderConfig.subdomain || !sliderConfig.filterType || !sliderConfig.filterValue) {
      console.warn('Slider config incomplete - subdomain, filterType, and filterValue required');
      return;
    }

    function renderSlide(articles) {
      const track = document.getElementById('slider-track');
      if (!track || articles.length === 0) return;

      track.innerHTML = '';

      articles.forEach(article => {
        const card = document.createElement('a');
        card.href = article.link;
        card.target = '_blank';
        card.rel = 'noopener';
        card.style.cssText = `
          flex: 0 0 calc(33.333% - 7px);
          min-width: 0;
          scroll-snap-align: start;
          display: block;
          text-decoration: none;
          color: white;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.15);
        `;
        card.innerHTML = `
          <div style="width:100%;aspect-ratio:16/10;overflow:hidden;background:rgba(0,0,0,0.3);">
            <img src="${article.thumbnail || ''}" alt=""
              style="width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none'"/>
          </div>
          <div style="padding:8px 10px 10px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;line-height:1.4;
              display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${article.title}
            </p>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="font-size:10px;opacity:0.7;">${article.source}</span>
              <span style="font-size:10px;opacity:0.5;">${article.date}</span>
            </div>
          </div>
        `;
        track.appendChild(card);
      });
    }

    if (sliderConfig.type === 'wordpress') {
      loadWordPressArticles(sliderConfig).then(data => {
        if (data.length > 0) {
          renderSlide(data);
        } else {
          const track = document.getElementById('slider-track');
          if (track) track.innerHTML = '<div style="font-size:12px;opacity:0.7;padding:8px;">Tidak ada artikel</div>';
        }
      });
    } else if (sliderConfig.type === 'blogger') {
      loadBloggerArticles(sliderConfig).then(data => {
        if (data.length > 0) {
          renderSlide(data);
        } else {
          const track = document.getElementById('slider-track');
          if (track) track.innerHTML = '<div style="font-size:12px;opacity:0.7;padding:8px;">Tidak ada artikel</div>';
        }
      });
    }
  }

  // ============================================================
  // WORDPRESS LOADER (Banner)
  // ============================================================
  async function loadWordPressArticles(config) {
    try {
      let url = `https://${config.subdomain}/wp-json/wp/v2/posts?per_page=${config.count}`;
  
      if (config.filterType === 'category') {
        const catRes = await fetch(`https://${config.subdomain}/wp-json/wp/v2/categories?search=${encodeURIComponent(config.filterValue)}&per_page=1`);
        const cats = await catRes.json();
        if (cats.length > 0) url += `&categories=${cats[0].id}`;
      } else if (config.filterType === 'tags') {
        const tagRes = await fetch(`https://${config.subdomain}/wp-json/wp/v2/tags?search=${encodeURIComponent(config.filterValue)}&per_page=1`);
        const tags = await tagRes.json();
        if (tags.length > 0) url += `&tags=${tags[0].id}`;
      }
  
      const res = await fetch(url);
      const posts = await res.json();
  
      const results = await Promise.all(posts.map(async post => {
        let thumbnail = '';
  
        if (post.featured_media && post.featured_media > 0) {
          try {
            const mediaRes = await fetch(
              `https://${config.subdomain}/wp-json/wp/v2/media/${post.featured_media}?_fields=source_url,media_details`
            );
            const media = await mediaRes.json();
            thumbnail =
              media?.media_details?.sizes?.medium?.source_url ||
              media?.media_details?.sizes?.thumbnail?.source_url ||
              media?.source_url ||
              '';
          } catch(e) {}
        }
  
        return {
          title: post.title.rendered,
          link: post.link,
          date: new Date(post.date).toLocaleDateString('id-ID'),
          source: config.subdomain,
          thumbnail: thumbnail
        };
      }));
  
      return results;
  
    } catch (err) {
      console.warn(`Failed to load from ${config.subdomain}:`, err);
      return [];
    }
  }

  // ============================================================
  // BLOGGER LOADER (Banner)
  // ============================================================
  function loadBloggerArticles(config) {
    return new Promise((resolve) => {
      const cbName = BANNER_NAMESPACE + '_blg_' + Math.random().toString(36).slice(2);

      window[cbName] = function(data) {
        document.getElementById(cbName)?.remove();
        delete window[cbName];

        const entries = data.feed.entry || [];
        resolve(entries.map(entry => {
          let thumbnail = '';
          try {
            thumbnail = entry.media$thumbnail?.url?.replace('/s72-c/', '/s400-c/') || '';
          } catch(e) {}

          return {
            title: entry.title.$t,
            link: entry.link.find(l => l.rel === 'alternate').href,
            date: new Date(entry.published.$t).toLocaleDateString('id-ID'),
            source: config.subdomain,
            thumbnail: thumbnail
          };
        }));
      };

      const labelPath = config.filterValue ? `/-/${encodeURIComponent(config.filterValue)}/` : '/';
      const script = document.createElement('script');
      script.id = cbName;
      script.src = `https://${config.subdomain}/feeds/posts/default${labelPath}?alt=json&max-results=${config.count}&callback=${cbName}`;
      script.onerror = () => {
        document.getElementById(cbName)?.remove();
        delete window[cbName];
        resolve([]);
      };
      document.body.appendChild(script);
    });
  }

  // ============================================================
  // INITIALIZE ON PAGE LOAD
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBannerConfig);
  } else {
    loadBannerConfig();
  }

})();




/* Scroll Control (Passive for Performance) */
(function() {
  let lastS = 0;
  let timeout;
  window.addEventListener('scroll', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      let currS = window.pageYOffset;
      if (Math.abs(currS - lastS) < 50) return;
      document.body.classList.toggle('dw', currS > lastS && currS > 100);
      document.body.classList.toggle('up', currS < lastS);
      lastS = currS;
    }, 100);
  }, { passive: true });
})();

var d = new Date(); var n = d.getFullYear(); var yearElement = document.getElementById('getYear'); if (yearElement) { yearElement.innerHTML = n; }

document.addEventListener('DOMContentLoaded', function() {
    const target = document.querySelector('#redaksi');
    const elementToMove = document.querySelector('.lh-normal');

    if (target && elementToMove) {
        target.appendChild(elementToMove);
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const footerContainer = document.querySelector('.he-footer-menu');

    if (footerContainer) {
        const menuHTML = `
            <ul id="menu-main" class="menu">
                <li class="menu-item"><a href="https://harianexpress.com/news/">News</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/global/">Global</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/nasional/">Nasional</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/daerah/">Daerah</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/politik/">Politik</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/pemilu/">Pemilu</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/kementrian/">Kementrian</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/bumn/">BUMN</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/korporasi/">Korporasi</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/selebriti/">Selebriti</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/surat-pembaca/">Surat Pembaca</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/kolom/">Kolom</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/netizen/">Netizen</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/cek-fakta/">Cek Fakta</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/hankam/">Hankam</a></li>
                <li class="menu-item"><a href="https://humaniora.harianexpress.com/">Humaniora</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/hukum/">Hukum</a></li>
                <li class="menu-item"><a href="https://tekno.harianexpress.com">Tekno</a></li>
                <li class="menu-item"><a href="https://wanita.harianexpress.com/">Wanita</a></li>
                <li class="menu-item"><a href="https://properti.harianexpress.com/">Properti</a></li>
                <li class="menu-item"><a href="https://travel.harianexpress.com/">Travel</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/komunitas/">Komunitas</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/event/">Event</a></li>
                <li class="menu-item"><a href="https://otomotif.harianexpress.com/">Otomotif</a></li>
                <li class="menu-item"><a href="https://bola.harianexpress.com/">Bola</a></li>
                <li class="menu-item"><a href="https://olahraga.harianexpress.com/">Olahraga</a></li>
                <li class="menu-item"><a href="https://umkm.harianexpress.com/">UMKM</a></li>
                <li class="menu-item"><a href="https://edu.harianexpress.com/">Edukasi</a></li>
                <li class="menu-item"><a href="https://finance.harianexpress.com/">Finance</a></li>
                <li class="menu-item"><a href="https://foto.harianexpress.com/">Foto</a></li>
                <li class="menu-item"><a href="https://video.harianexpress.com/">Video</a></li>
                <li class="menu-item"><a href="https://health.harianexpress.com/">Health</a></li>
                <li class="menu-item"><a href="https://lifestyle.harianexpress.com/">Lifestyle</a></li>
                <li class="menu-item"><a href="https://nature.harianexpress.com/">Nature</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/indeks/?khusus=headline">Headline</a></li>
                <li class="menu-item"><a href="https://harianexpress.com/trending/">Trending</a></li>
            </ul>`;
        
        footerContainer.innerHTML = menuHTML;
    }
});

document.addEventListener("DOMContentLoaded", function() {
    const telegramIcon = document.querySelector('footer #HTML3 .telegram');

    if (telegramIcon) {
        const parentLink = telegramIcon.closest('a');
        
        if (parentLink) {
            parentLink.setAttribute('href', 'https://www.linkedin.com/in/harianexpress');
        }

        telegramIcon.outerHTML = '<svg class="linkedin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002M7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z"/></svg>';
    }
});
