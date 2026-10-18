// worksinprogress.in — theme toggle, wordmark fit, filters, in-view video, lightbox. (v2)
(() => {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // light / dark
  document.querySelectorAll('.theme').forEach((b) => b.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('wip-theme', root.dataset.theme);
  }));

  // the wordmark spans the full width at any size
  const fit = () => document.querySelectorAll('[data-fit]').forEach((el) => {
    const span = el.firstElementChild;
    if (!span) return;
    el.style.fontSize = '100px';
    const w = el.clientWidth, sw = span.getBoundingClientRect().width;
    if (sw) el.style.fontSize = `${(100 * w) / sw}px`;
  });
  fit();
  addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);

  // videos play while on screen (tiles load their source lazily)
  const vids = document.querySelectorAll('video[data-src], video[data-inview]');
  const start = (v) => { if (v.dataset.src && !v.getAttribute('src')) v.src = v.dataset.src; };
  const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) {
      start(v);
      if (!reduce && !v.hasAttribute('data-audio') && !v.dataset.paused) v.play().catch(() => {});
    } else v.pause();
  }), { rootMargin: '150px 0px' });
  vids.forEach((v) => {
    if (io) io.observe(v); else start(v);
    if (v.hasAttribute('data-src') && reduce) {
      const a = v.closest('a');
      a?.addEventListener('mouseenter', () => { start(v); v.play().catch(() => {}); });
      a?.addEventListener('mouseleave', () => v.pause());
    }
  });
  // silent loops on a post: click to pause / resume
  document.querySelectorAll('.fig-video video:not([controls])').forEach((v) => v.addEventListener('click', () => {
    if (v.paused) { delete v.dataset.paused; v.play().catch(() => {}); } else { v.dataset.paused = '1'; v.pause(); }
  }));

  // index filters: #kind=sketch, #tag=c4d
  const feed = document.querySelector('.feed');
  if (feed) {
    const entries = [...feed.querySelectorAll('.entry')];
    const empty = document.querySelector('.empty');
    const state = { kind: '', tag: '' };
    const read = () => {
      const p = new URLSearchParams(location.hash.slice(1));
      state.kind = p.get('kind') || '';
      state.tag = p.get('tag') || '';
    };
    const apply = () => {
      let shown = 0;
      for (const e of entries) {
        const ok = (!state.kind || e.dataset.kind === state.kind) && (!state.tag || e.dataset.tags.includes(` ${state.tag} `));
        e.hidden = !ok;
        if (ok) shown++;
      }
      document.querySelectorAll('.chips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)));
      document.querySelectorAll('.tags button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tag === state.tag)));
      if (empty && entries.length) { empty.hidden = shown > 0; empty.textContent = 'Nothing matches that filter.'; }
    };
    const write = () => {
      const p = new URLSearchParams();
      if (state.kind) p.set('kind', state.kind);
      if (state.tag) p.set('tag', state.tag);
      const h = p.toString();
      history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
      apply();
    };
    document.querySelectorAll('.chips button').forEach((b) => b.addEventListener('click', () => { state.kind = b.dataset.kind; write(); }));
    document.querySelectorAll('.tags button').forEach((b) => b.addEventListener('click', () => {
      state.tag = state.tag === b.dataset.tag ? '' : b.dataset.tag;
      write();
    }));
    addEventListener('hashchange', () => { read(); apply(); });
    read();
    apply();
    if (state.kind || state.tag) document.getElementById('index')?.scrollIntoView();

    const setView = (v) => {
      feed.dataset.view = v;
      document.querySelectorAll('.views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    };
    const saved = store.get('wip-view');
    if (saved === 'log' || saved === 'grid') setView(saved);
    document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); store.set('wip-view', b.dataset.view); }));
  }

  // lightbox for figures
  let box = null;
  const close = () => { box?.remove(); box = null; };
  document.querySelectorAll('.fig img').forEach((img) => img.addEventListener('click', () => {
    box = document.createElement('div');
    box.className = 'lightbox';
    const big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    box.append(big);
    box.addEventListener('click', close);
    document.body.append(box);
  }));

  // keys: Esc closes, ←/→ step through posts
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return close();
    if (box || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
    const rel = e.key === 'ArrowLeft' ? 'prev' : e.key === 'ArrowRight' ? 'next' : null;
    const a = rel && document.querySelector(`.post-nav a[rel="${rel}"]`);
    if (a) location.href = a.href;
  });
})();
