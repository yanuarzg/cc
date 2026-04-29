/**
 * OPTIMIZED FEEDS LOADER WITH SKELETON v2.0
 * -------------------------------------------------
 * [1] cache: no-cache — artikel baru muncul saat refresh
 * [2] Above-the-fold langsung dimuat, sisanya tunggu scroll
 * [3] Thumbnail WP: batch per-source tanpa _embed (lebih ringan)
 * [4] <style> skeleton diinjek sekali ke <head>
 * [5] Concurrency limit JSONP Blogger (max 5 paralel)
 * [6] fetchWPCategory pakai AbortController + timeout
 * [7] localStorage hapus selektif per prefix, bukan clear semua
 * [8] Cache key menyertakan versi JS
 * [9] Pre-compute timestamp sebelum sort
 */

// ============================================================
// LOGO LINK FIX
// ============================================================
(() => {
  'use strict';
  const TARGET_URL = 'https://harianexpress.com';
  document.querySelectorAll('.logo_link').forEach(link => {
    if (link.getAttribute('href') !== TARGET_URL) link.href = TARGET_URL;
  });
})();


document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // CONFIG
  // ============================================================
  const config = {
    CACHE_VERSION       : 'v2',            // [8] bump saat struktur data cache berubah
    CACHE_DURATION      : 5 * 60 * 1000,  // 5 menit
    CACHE_PREFIX        : 'he_feed_',     // [7] prefix selektif, tidak ganggu script lain
    FETCH_TIMEOUT       : 20 * 1000,      // 20 detik
    RETRY_DELAY         : 3 * 1000,       // jeda sebelum retry
    BLOGGER_CONCURRENCY : 5,              // [5] max JSONP paralel ke Blogger
    ERROR_MESSAGE       : '<p style="text-align:center;color:#888;padding:12px 0;">Gagal memuat konten. Silakan coba lagi nanti.</p>'
  };

  // ============================================================
  // [4] INJECT SKELETON STYLE SEKALI KE <HEAD>
  // ============================================================
  if (!document.getElementById('he-skeleton-style')) {
    const s = document.createElement('style');
    s.id = 'he-skeleton-style';
    s.textContent = `
      @keyframes he-skeleton {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .he-skel {
        background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
        background-size: 200% 100%;
        animation: he-skeleton 1.5s infinite;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(s);
  }

  // ============================================================
  // HELPER: Escape HTML
  // ============================================================
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ============================================================
  // SKELETON LOADER — pakai class .he-skel, tanpa inline style duplikat
  // ============================================================
  function renderSkeleton() {
    const item = `
      <li style="display:flex;gap:12px;margin-bottom:15px;align-items:center;">
        <div class="he-skel" style="flex-shrink:0;width:70px;height:50px;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="he-skel" style="height:14px;width:80%;"></div>
          <div class="he-skel" style="height:10px;width:40%;"></div>
        </div>
      </li>`;
    const count = window.innerWidth >= 768 ? 4 : 2;
    return `<ul style="list-style:none;padding:0;margin:0;">${item.repeat(count)}</ul>`;
  }

  // ============================================================
  // HELPER: Render List
  // ============================================================
  function renderList(items) {
    if (!items.length) return '<p>Tidak ada konten.</p>';
    const lis = items.map(item => `
      <li style="display:flex;gap:12px;margin-bottom:15px;align-items:center;">
        <a href="${escapeHTML(item.link)}" aria-label="${escapeHTML(item.title)}" class="post-img">
          <img src="${item.img}"
               alt="${escapeHTML(item.title)}"
               loading="lazy"
               style="width:70px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0;"
               onerror="this.src='https://placehold.co/70x50'"/>
        </a>
        <div style="flex:1;min-width:0;">
          <h3 class="jl_fe_title jl_txt_2row" style="text-decoration:none;font-size:18px;display:block;line-height:1.5;margin:0;">
            <a href="${escapeHTML(item.link)}" target="_blank">${escapeHTML(item.title)}</a>
          </h3>
          <small style="font-size:11px;">
            <time datetime="${item.rawDate}">${item.date}</time>
          </small>
        </div>
      </li>`).join('');
    return `<ul style="list-style:none;padding:0;margin:0;">${lis}</ul>`;
  }

  // ============================================================
  // [7][8] CACHE HELPER — prefix selektif + versi di key
  // ============================================================
  function mkKey(raw) {
    return `${config.CACHE_PREFIX}${config.CACHE_VERSION}_${raw}`;
  }

  function getCached(raw) {
    try {
      const item = localStorage.getItem(mkKey(raw));
      if (!item) return null;
      const data = JSON.parse(item);
      if (Date.now() - data.ts > config.CACHE_DURATION) {
        localStorage.removeItem(mkKey(raw));
        return null;
      }
      return data.v;
    } catch { return null; }
  }

  function setCache(raw, value) {
    try {
      localStorage.setItem(mkKey(raw), JSON.stringify({ v: value, ts: Date.now() }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // [7] Hapus hanya entry milik kita, jangan ganggu script lain
        Object.keys(localStorage)
          .filter(k => k.startsWith(config.CACHE_PREFIX))
          .forEach(k => localStorage.removeItem(k));
        try {
          localStorage.setItem(mkKey(raw), JSON.stringify({ v: value, ts: Date.now() }));
        } catch {}
      }
    }
  }

  // ============================================================
  // DNS PRECONNECT
  // ============================================================
  function addPreconnect(domains) {
    domains.forEach(domain => {
      if (document.querySelector(`link[href*="${domain}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = `https://${domain}`; l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
      const d = document.createElement('link');
      d.rel = 'dns-prefetch'; d.href = `https://${domain}`;
      document.head.appendChild(d);
    });
  }

  // ============================================================
  // [2] LAZY LOAD — above-the-fold langsung, sisanya on scroll
  // ============================================================
  let remainingLoaded = false;

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function loadFeedContainer(container) {
    if (container.dataset.loaded) return;
    container.dataset.loaded = '1';
    container.innerHTML = renderSkeleton();
    container.setAttribute('aria-busy', 'true');
    const loader = container.dataset.loader;
    if (loader && window[loader]) {
      window[loader](container);
      delete container.dataset.loader;
    }
  }

  function loadAllFeeds() {
    if (remainingLoaded) return;
    remainingLoaded = true;
    document.querySelectorAll('.recent-wp,.recent-blg,.recent-wp-multi,.recent-blg-multi')
      .forEach(loadFeedContainer);
  }

  // Above-the-fold: langsung dimuat sebelum ada scroll
  document.querySelectorAll('.recent-wp,.recent-blg,.recent-wp-multi,.recent-blg-multi')
    .forEach(container => { if (isInViewport(container)) loadFeedContainer(container); });

  // Sisanya: tunggu scroll pertama
  window.addEventListener('scroll', function onFirstScroll() {
    window.removeEventListener('scroll', onFirstScroll);
    loadAllFeeds();
  }, { passive: true });

  // Fallback 3 detik jika tidak ada scroll
  setTimeout(loadAllFeeds, 3000);

  // ============================================================
  // HELPER: Ekstrak thumbnail WP
  // ============================================================
  function extractWPThumbnail(post, mediaMap) {
    try {
      const emb = post._embedded?.['wp:featuredmedia']?.[0];
      if (emb) {
        return emb.media_details?.sizes?.medium?.source_url
            || emb.media_details?.sizes?.thumbnail?.source_url
            || emb.source_url || null;
      }
    } catch {}
    if (post.featured_media && mediaMap[post.featured_media])
      return mediaMap[post.featured_media];
    return null;
  }

  // ============================================================
  // [1][3] WORDPRESS FETCH
  // [1] cache: no-cache — artikel baru muncul saat refresh
  // [3] Thumbnail: batch 1 request per source (tanpa _embed di URL utama)
  // [9] Pre-compute .ts untuk sort
  // ============================================================
  async function fetchWPOptimized(source, catId, count, offset, attempt = 1) {
    const key = `wp_${source}_${catId || 'all'}_${count}_${offset}`;
    const cached = getCached(key);
    if (cached) return cached;

    let url = `https://${source}/wp-json/wp/v2/posts`
            + `?per_page=${count}&offset=${offset}`
            + `&orderby=date&order=desc`
            + `&_fields=id,title,link,date,featured_media`;
    if (catId) url += `&categories=${catId}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.FETCH_TIMEOUT);

    try {
      // [1] no-cache: selalu verifikasi ke server, browser pakai 304 jika tidak berubah
      const res = await fetch(url, { signal: ctrl.signal, mode: 'cors', cache: 'no-cache' });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const posts = await res.json();

      // [3] Satu batch request untuk semua thumbnail sekaligus
      const mediaIds = [...new Set(posts.filter(p => p.featured_media).map(p => p.featured_media))];
      let mediaMap = {};
      if (mediaIds.length) {
        try {
          const mRes = await fetch(
            `https://${source}/wp-json/wp/v2/media?include=${mediaIds.join(',')}&_fields=id,source_url,media_details`,
            { cache: 'no-cache' }
          );
          (await mRes.json()).forEach(m => {
            mediaMap[m.id] = m.media_details?.sizes?.medium?.source_url
                          || m.media_details?.sizes?.thumbnail?.source_url
                          || m.source_url;
          });
        } catch {}
      }

      const mapped = posts.map(p => ({
        title   : p.title.rendered || p.title,
        link    : p.link,
        rawDate : p.date,
        ts      : new Date(p.date).getTime(),  // [9]
        date    : new Date(p.date).toLocaleDateString('id-ID'),
        source  : source,
        img     : extractWPThumbnail(p, mediaMap) || 'https://placehold.co/70x50'
      }));

      setCache(key, mapped);
      return mapped;

    } catch (err) {
      clearTimeout(timer);
      if (attempt < 2) {
        console.warn(`WP retry (${source})…`);
        await new Promise(r => setTimeout(r, config.RETRY_DELAY));
        return fetchWPOptimized(source, catId, count, offset, 2);
      }
      console.error(`WP failed (${source}):`, err.message);
      return [];
    }
  }

  // ============================================================
  // [6] fetchWPCategory — dengan AbortController + timeout
  // ============================================================
  async function fetchWPCategory(source, categoryName) {
    const key = `cat_${source}_${categoryName}`;
    const cached = getCached(key);
    if (cached) return cached;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.FETCH_TIMEOUT);

    try {
      const res = await fetch(
        `https://${source}/wp-json/wp/v2/categories?search=${encodeURIComponent(categoryName)}&per_page=5&_fields=id,slug,name`,
        { signal: ctrl.signal, cache: 'no-cache' }
      );
      clearTimeout(timer);
      const cats = await res.json();
      if (!cats.length) return null;
      const catId = (
        cats.find(c => c.slug === categoryName.toLowerCase()) ||
        cats.find(c => c.name.toLowerCase() === categoryName.toLowerCase()) ||
        cats[0]
      ).id;
      setCache(key, catId);
      return catId;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  // ============================================================
  // [5] BLOGGER FETCH — concurrency queue, max 5 paralel
  // [9] Pre-compute .ts untuk sort
  // ============================================================
  const bloggerQueue = [];
  let bloggerRunning = 0;

  function bloggerEnqueue(task) {
    bloggerQueue.push(task);
    bloggerDrain();
  }

  function bloggerDrain() {
    while (bloggerRunning < config.BLOGGER_CONCURRENCY && bloggerQueue.length) {
      bloggerRunning++;
      bloggerQueue.shift()(() => { bloggerRunning--; bloggerDrain(); });
    }
  }

  function loadBloggerOptimized(source, category, count, startIndex, callback, attempt = 1) {
    const key = `blg_${source}_${category || 'all'}_${count}_${startIndex}`;
    const cached = getCached(key);
    if (cached) { callback(cached); return; }

    bloggerEnqueue(done => {
      const cbName = 'blgCb_' + Math.random().toString(36).slice(2);

      const timer = setTimeout(() => {
        document.getElementById(cbName)?.remove();
        delete window[cbName];
        done();
        if (attempt < 2) {
          console.warn(`Blogger timeout (${source}), retry…`);
          setTimeout(() => loadBloggerOptimized(source, category, count, startIndex, callback, 2), config.RETRY_DELAY);
        } else {
          console.error(`Blogger failed (${source}): timeout`);
          callback([]);
        }
      }, config.FETCH_TIMEOUT);

      window[cbName] = function (data) {
        clearTimeout(timer);
        document.getElementById(cbName)?.remove();
        delete window[cbName];
        done();

        const entries = data.feed.entry || [];
        const mapped = entries.map(e => ({
          title   : e.title.$t,
          link    : e.link.find(l => l.rel === 'alternate').href,
          rawDate : e.published.$t,
          ts      : new Date(e.published.$t).getTime(),  // [9]
          date    : new Date(e.published.$t).toLocaleDateString('id-ID'),
          source  : source,
          img     : e.media$thumbnail
                      ? e.media$thumbnail.url.replace(/\/s\d+-c\//, '/s320-c/')
                      : 'https://placehold.co/70x50'
        }));

        setCache(key, mapped);
        callback(mapped);
      };

      const labelPath = category ? `/-/${encodeURIComponent(category)}/` : '/';
      const script = document.createElement('script');
      script.id = cbName;
      script.src = `https://${source}/feeds/posts/default${labelPath}?alt=json&max-results=${count}&start-index=${startIndex}&callback=${cbName}`;
      script.onerror = () => {
        clearTimeout(timer);
        document.getElementById(cbName)?.remove();
        delete window[cbName];
        done();
        if (attempt < 2) {
          console.warn(`Blogger error (${source}), retry…`);
          setTimeout(() => loadBloggerOptimized(source, category, count, startIndex, callback, 2), config.RETRY_DELAY);
        } else {
          console.error(`Blogger failed (${source}): script error`);
          callback([]);
        }
      };
      document.body.appendChild(script);
    });
  }

  // ============================================================
  // SINGLE WP
  // ============================================================
  window.loadSingleWP = async function (container) {
    const source = container.getAttribute('data-source');
    const count  = parseInt(container.getAttribute('data-items')) || 5;
    const start  = parseInt(container.getAttribute('data-start'))  || 1;
    const posts  = await fetchWPOptimized(source, null, count, start - 1);
    container.innerHTML = posts.length ? renderList(posts) : config.ERROR_MESSAGE;
    container.removeAttribute('aria-busy');
  };
  document.querySelectorAll('.recent-wp').forEach(c => { c.dataset.loader = 'loadSingleWP'; });

  // ============================================================
  // SINGLE BLOGGER
  // ============================================================
  window.loadSingleBlogger = function (container) {
    const source = container.getAttribute('data-source');
    const count  = parseInt(container.getAttribute('data-items')) || 5;
    const start  = parseInt(container.getAttribute('data-start'))  || 1;
    loadBloggerOptimized(source, null, count, start, posts => {
      container.innerHTML = posts.length ? renderList(posts) : config.ERROR_MESSAGE;
      container.removeAttribute('aria-busy');
    });
  };
  document.querySelectorAll('.recent-blg').forEach(c => { c.dataset.loader = 'loadSingleBlogger'; });

  // ============================================================
  // MULTI-SOURCE WP
  // [9] sort pakai .ts (pre-computed), bukan new Date() per compare
  // ============================================================
  window.loadMultiWP = async function (container) {
    const sourceAttr = container.getAttribute('data-sources');
    if (!sourceAttr) return;
    const sources      = sourceAttr.split(',').map(s => s.trim()).filter(Boolean);
    const category     = container.getAttribute('data-category') || '';
    const total        = parseInt(container.getAttribute('data-items')) || 10;
    const sort         = container.getAttribute('data-sort') || 'date';
    const start        = parseInt(container.getAttribute('data-start')) || 1;
    const globalOffset = start - 1;
    const fetchCount   = total + globalOffset;

    if (!sources.length) return;
    addPreconnect(sources);

    const results = await Promise.allSettled(sources.map(async source => {
      const catId = category ? await fetchWPCategory(source, category) : null;
      if (category && !catId) return [];
      return fetchWPOptimized(source, catId, fetchCount, 0);
    }));

    let all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    if (sort === 'date') all.sort((a, b) => b.ts - a.ts);  // [9]

    const sliced = all.slice(globalOffset, globalOffset + total);
    container.innerHTML = sliced.length ? renderList(sliced) : config.ERROR_MESSAGE;
    container.removeAttribute('aria-busy');
  };
  document.querySelectorAll('.recent-wp-multi').forEach(c => { c.dataset.loader = 'loadMultiWP'; });

  // ============================================================
  // MULTI-SOURCE BLOGGER
  // [5] concurrency via queue, [9] sort pakai .ts
  // ============================================================
  window.loadMultiBlogger = function (container) {
    const sourceAttr = container.getAttribute('data-sources');
    if (!sourceAttr) return;
    const sources      = sourceAttr.split(',').map(s => s.trim()).filter(Boolean);
    const category     = container.getAttribute('data-category') || '';
    const total        = parseInt(container.getAttribute('data-items')) || 10;
    const sort         = container.getAttribute('data-sort') || 'date';
    const start        = parseInt(container.getAttribute('data-start')) || 1;
    const globalOffset = start - 1;
    const fetchCount   = total + globalOffset;

    if (!sources.length) return;
    addPreconnect(sources);

    let all = [], completed = 0;

    sources.forEach(source => {
      loadBloggerOptimized(source, category, fetchCount, 1, entries => {
        all = all.concat(entries);
        completed++;
        if (completed === sources.length) {
          if (sort === 'date') all.sort((a, b) => b.ts - a.ts);  // [9]
          const sliced = all.slice(globalOffset, globalOffset + total);
          container.innerHTML = sliced.length ? renderList(sliced) : config.ERROR_MESSAGE;
          container.removeAttribute('aria-busy');
        }
      });
    });
  };
  document.querySelectorAll('.recent-blg-multi').forEach(c => { c.dataset.loader = 'loadMultiBlogger'; });

});


// ============================================================
// CENTRALIZED BANNER WIDGET
// ============================================================
(function () {
  'use strict';

  const CONFIG_URL       = 'https://yanuarzg.github.io/cc/he/banner-config.json';
  const CACHE_DURATION   = 5 * 60 * 1000;
  const BANNER_NAMESPACE = 'centralizedBanner';

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
    } catch { return null; }
  }

  function setCachedConfig(cfg) {
    try {
      localStorage.setItem(BANNER_NAMESPACE + '_config',
        JSON.stringify({ config: cfg, timestamp: Date.now() }));
    } catch {}
  }

  async function loadBannerConfig() {
    const container = document.getElementById('banner-event');
    if (!container) return;
    let cfg = getCachedConfig();
    if (!cfg) {
      try {
        const res = await fetch(CONFIG_URL + '?v=' + Date.now(), { cache: 'no-cache' });
        cfg = await res.json();
        setCachedConfig(cfg);
      } catch (err) { console.error('Banner config failed:', err); return; }
    }
    renderBanner(container, cfg);
  }

  function renderBanner(container, cfg) {
    const currentHost = window.location.hostname;
    if (cfg.display.showOnSites?.length) {
      if (!cfg.display.showOnSites.some(s => currentHost.includes(s.trim()))) {
        container.style.display = 'none';
        return;
      }
    }

    let html = `<div class="centralized-banner" style="
      width:-moz-available;width:-webkit-fill-available;height:fit-content;
      border-radius:0.5rem;overflow:hidden;
      background-image:url('${cfg.background.image}');
      background-size:cover;background-position:center;background-repeat:no-repeat;
      display:flex!important;position:relative;gap:1rem;margin-block:2rem;">`;

    if (cfg.event.image) html += `<img src="${cfg.event.image}" alt="Event Banner">`;

    if (cfg.slider?.enabled && cfg.slider.subdomain) {
      html += `<div id="banner-slider" style="flex:1;min-width:0;padding:8px 0;">
        <div id="slider-track" style="display:flex;gap:10px;overflow-x:auto;
          scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;
          scrollbar-width:none;-ms-overflow-style:none;padding:4px 4px 8px 4px;"></div>
      </div>`;
    }
    html += '</div>';

    if (!document.getElementById('banner-scroll-style')) {
      const s = document.createElement('style');
      s.id = 'banner-scroll-style';
      s.textContent = '#slider-track::-webkit-scrollbar{display:none}';
      document.head.appendChild(s);
    }

    container.innerHTML = html;
    if (cfg.slider?.enabled && cfg.slider.subdomain) initSlider(cfg.slider);
  }

  function initSlider(sliderConfig) {
    if (!sliderConfig.subdomain || !sliderConfig.filterType || !sliderConfig.filterValue) {
      console.warn('Slider config incomplete');
      return;
    }

    function renderSlide(articles) {
      const track = document.getElementById('slider-track');
      if (!track || !articles.length) return;
      track.innerHTML = '';
      articles.forEach(article => {
        const card = document.createElement('a');
        card.href = article.link; card.target = '_blank'; card.rel = 'noopener';
        card.style.cssText = `flex:0 0 calc(33.333% - 7px);min-width:0;scroll-snap-align:start;
          display:block;text-decoration:none;color:white;background:rgba(255,255,255,0.1);
          border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);`;
        card.innerHTML = `
          <div style="width:100%;aspect-ratio:16/10;overflow:hidden;background:rgba(0,0,0,0.3);">
            <img src="${article.thumbnail || ''}" alt="" loading="lazy"
              style="width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none'"/>
          </div>
          <div style="padding:8px 10px 10px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;line-height:1.4;
              display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${article.title}</p>
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="font-size:10px;opacity:0.7;">${article.source}</span>
              <span style="font-size:10px;opacity:0.5;">${article.date}</span>
            </div>
          </div>`;
        track.appendChild(card);
      });
    }

    const loader = sliderConfig.type === 'wordpress'
      ? loadWordPressArticles(sliderConfig)
      : loadBloggerArticles(sliderConfig);

    loader.then(data => {
      if (data.length) {
        renderSlide(data);
      } else {
        const track = document.getElementById('slider-track');
        if (track) track.innerHTML = '<div style="font-size:12px;opacity:0.7;padding:8px;">Tidak ada artikel</div>';
      }
    });
  }

  async function loadWordPressArticles(cfg) {
    try {
      let url = `https://${cfg.subdomain}/wp-json/wp/v2/posts?per_page=${cfg.count}`;
      if (cfg.filterType === 'category') {
        const cats = await fetch(`https://${cfg.subdomain}/wp-json/wp/v2/categories?search=${encodeURIComponent(cfg.filterValue)}&per_page=1`).then(r => r.json());
        if (cats.length) url += `&categories=${cats[0].id}`;
      } else if (cfg.filterType === 'tags') {
        const tags = await fetch(`https://${cfg.subdomain}/wp-json/wp/v2/tags?search=${encodeURIComponent(cfg.filterValue)}&per_page=1`).then(r => r.json());
        if (tags.length) url += `&tags=${tags[0].id}`;
      }
      const posts = await fetch(url).then(r => r.json());
      return await Promise.all(posts.map(async post => {
        let thumbnail = '';
        if (post.featured_media > 0) {
          try {
            const media = await fetch(
              `https://${cfg.subdomain}/wp-json/wp/v2/media/${post.featured_media}?_fields=source_url,media_details`
            ).then(r => r.json());
            thumbnail = media?.media_details?.sizes?.medium?.source_url
                     || media?.media_details?.sizes?.thumbnail?.source_url
                     || media?.source_url || '';
          } catch {}
        }
        return {
          title     : post.title.rendered,
          link      : post.link,
          date      : new Date(post.date).toLocaleDateString('id-ID'),
          source    : cfg.subdomain,
          thumbnail
        };
      }));
    } catch (err) { console.warn(`Banner WP failed (${cfg.subdomain}):`, err); return []; }
  }

  function loadBloggerArticles(cfg) {
    return new Promise(resolve => {
      const cbName = BANNER_NAMESPACE + '_blg_' + Math.random().toString(36).slice(2);
      window[cbName] = function (data) {
        document.getElementById(cbName)?.remove();
        delete window[cbName];
        resolve((data.feed.entry || []).map(entry => ({
          title     : entry.title.$t,
          link      : entry.link.find(l => l.rel === 'alternate').href,
          date      : new Date(entry.published.$t).toLocaleDateString('id-ID'),
          source    : cfg.subdomain,
          thumbnail : entry.media$thumbnail?.url?.replace('/s72-c/', '/s400-c/') || ''
        })));
      };
      const labelPath = cfg.filterValue ? `/-/${encodeURIComponent(cfg.filterValue)}/` : '/';
      const script = document.createElement('script');
      script.id = cbName;
      script.src = `https://${cfg.subdomain}/feeds/posts/default${labelPath}?alt=json&max-results=${cfg.count}&callback=${cbName}`;
      script.onerror = () => {
        document.getElementById(cbName)?.remove();
        delete window[cbName];
        resolve([]);
      };
      document.body.appendChild(script);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBannerConfig);
  } else {
    loadBannerConfig();
  }
})();


// ============================================================
// SCROLL CONTROL
// ============================================================
(function () {
  let lastS = 0, timeout;
  window.addEventListener('scroll', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const currS = window.pageYOffset;
      if (Math.abs(currS - lastS) < 50) return;
      document.body.classList.toggle('dw', currS > lastS && currS > 100);
      document.body.classList.toggle('up', currS < lastS);
      lastS = currS;
    }, 100);
  }, { passive: true });
})();

// YEAR
var yearElement = document.getElementById('getYear');
if (yearElement) yearElement.innerHTML = new Date().getFullYear();

// DOM UTILITIES
document.addEventListener('DOMContentLoaded', function () {
  // Pindah .lh-normal ke #redaksi
  const target = document.querySelector('#redaksi');
  const elementToMove = document.querySelector('.lh-normal');
  if (target && elementToMove) target.appendChild(elementToMove);

  // Footer menu
  const footerContainer = document.querySelector('.he-footer-menu');
  if (footerContainer) {
    footerContainer.innerHTML = `
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
  }

  // LinkedIn icon
  const telegramIcon = document.querySelector('footer #HTML3 .telegram');
  if (telegramIcon) {
    telegramIcon.closest('a')?.setAttribute('href', 'https://www.linkedin.com/in/harianexpress');
    telegramIcon.outerHTML = '<svg class="linkedin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002M7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z"/></svg>';
  }
});
