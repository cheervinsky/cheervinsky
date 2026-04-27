// Tiny store with localStorage persistence + GitHub sync.
//
// Reads:
//   - On load, immediately renders from localStorage (so the UI is never blank).
//   - In the background, fetches the latest posts.json from GitHub. If newer
//     data is found, replaces state and broadcasts a change.
//
// Writes (admin only):
//   - Updates state, writes to localStorage, AND pushes posts.json back to GitHub
//     using the PAT held by window.cheerSync. Also externalises any newly-uploaded
//     image (data: URLs and 'media:<id>' IndexedDB refs) by committing it to the
//     repo and rewriting the post field to 'ghmedia/<filename>'.
//
// Exposes window.cheerStore.{get, getPosts, getProducts, getPinnedPost,
//   addPost, updatePost, deletePost, setPinned, reset, exportData, importData,
//   refreshFromRemote}.
(function () {
  const KEY = 'cheervinsky_v1';
  const D = window.CHEERVINSKY_DEFAULTS;
  const SYNC = window.cheerSync;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(D);
      const parsed = JSON.parse(raw);
      const posts = (parsed.posts || clone(D.posts)).map(p => ({
        published: true,
        status: 'blog',
        coverPosition: '50% 0%',
        coverZoom: 100,
        homeImage: '',
        productIconSize: 34,
        ...p,
      }));
      return {
        products: parsed.products || clone(D.products),
        posts,
      };
    } catch (e) {
      return clone(D);
    }
  }
  function saveLocal(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      const message = e && e.name === 'QuotaExceededError'
        ? 'This post is too large for browser storage. Please use video links instead of uploading video files, and keep uploaded images/GIFs small.'
        : 'The post could not be saved in browser storage.';
      alert(message);
      window.dispatchEvent(new CustomEvent('cheer-store-save-error', { detail: { message } }));
      return false;
    }
  }
  function broadcast() {
    window.dispatchEvent(new CustomEvent('cheer-store-changed'));
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  let state = load();
  let inFlightSync = null;

  // ---- Background pull from GitHub ----
  // Fires once on page load, then again when admin token becomes available.
  async function refreshFromRemote() {
    if (!SYNC) return;
    try {
      const remote = await SYNC.fetchPosts();
      if (!remote) return; // 404 or fetch failed — keep current state
      // Normalize shape, in case the file is older
      const normalized = {
        products: Array.isArray(remote.products) ? remote.products : [],
        posts: Array.isArray(remote.posts) ? remote.posts.map(p => ({
          published: true,
          status: 'blog',
          coverPosition: '50% 0%',
          coverZoom: 100,
          homeImage: '',
          productIconSize: 34,
          ...p,
        })) : [],
      };
      state = normalized;
      saveLocal(state); // cache for next offline open
      broadcast();
    } catch (e) {
      // Stay quiet — the UI keeps working from localStorage
    }
  }

  // Kick off initial pull (don't await — UI renders from localStorage immediately).
  if (SYNC) {
    inFlightSync = refreshFromRemote();
  }
  window.addEventListener('cheer-admin-token-changed', () => {
    inFlightSync = refreshFromRemote();
  });

  // ---- Externalising images before commit ----
  // Walks a post object and replaces any 'data:' URL or 'media:<id>' reference
  // with a 'ghmedia/<filename>' reference (uploading the bytes to the repo).
  async function externaliseImages(post) {
    if (!SYNC || !SYNC.hasToken()) return post;
    const fields = ['cover', 'homeImage', 'productIcon'];
    const next = { ...post };
    for (const field of fields) {
      const value = next[field];
      if (!value || typeof value !== 'string') continue;

      // Already a GitHub-committed asset? skip.
      if (value.startsWith('ghmedia/')) continue;
      // External URL? skip.
      if (/^https?:\/\//i.test(value)) continue;

      let blob = null;
      let hint = field;
      if (value.startsWith('data:')) {
        blob = dataUrlToBlob(value);
        hint = field + (mimeExt(blob.type) || '');
      } else if (value.startsWith('media:')) {
        const id = value.slice(6);
        try {
          const asset = await window.cheerMedia.get(id);
          if (asset && asset.blob) {
            blob = asset.blob;
            hint = (asset.name || (field + mimeExt(blob.type) || '')) || field;
          }
        } catch (e) {}
      }
      if (!blob) continue;
      try {
        const ref = await SYNC.uploadMedia(hint, blob);
        next[field] = ref;
      } catch (e) {
        throw new Error('Could not upload ' + field + ' to GitHub: ' + (e && e.message ? e.message : e));
      }
    }

    // Also walk the body for {{image:data:...}} or {{image:media:...}} refs
    if (typeof next.body === 'string') {
      next.body = await externaliseBodyMedia(next.body);
    }

    return next;
  }
  async function externaliseBodyMedia(body) {
    // Match {{type:src|...}} blocks. src is the part between : and |.
    const re = /\{\{(image|video|gallery|youtube):([^|}]+)([^}]*)\}\}/g;
    let out = '';
    let i = 0;
    let match;
    while ((match = re.exec(body)) !== null) {
      out += body.slice(i, match.index);
      const [_, type, srcRaw, rest] = match;
      // gallery uses comma-separated URI-encoded items
      let newSrc = srcRaw;
      if (type === 'gallery') {
        const items = srcRaw.split(',').map(decodeURIComponent);
        const replaced = [];
        for (const item of items) {
          replaced.push(await maybeExternaliseSingle(item));
        }
        newSrc = replaced.map(encodeURIComponent).join(',');
      } else {
        newSrc = await maybeExternaliseSingle(srcRaw);
      }
      out += '{{' + type + ':' + newSrc + (rest || '') + '}}';
      i = re.lastIndex;
    }
    return out + body.slice(i);
  }
  async function maybeExternaliseSingle(src) {
    if (!src) return src;
    if (src.startsWith('ghmedia/')) return src;
    if (/^https?:\/\//i.test(src)) return src;
    let blob = null;
    let hint = 'asset';
    if (src.startsWith('data:')) {
      blob = dataUrlToBlob(src);
      hint = 'body' + (mimeExt(blob.type) || '');
    } else if (src.startsWith('media:')) {
      const id = src.slice(6);
      try {
        const asset = await window.cheerMedia.get(id);
        if (asset && asset.blob) {
          blob = asset.blob;
          hint = asset.name || 'body';
        }
      } catch (e) {}
    }
    if (!blob) return src;
    try {
      return await SYNC.uploadMedia(hint, blob);
    } catch (e) {
      throw e;
    }
  }
  function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.slice(5, comma); // strip 'data:'
    const isBase64 = /;base64$/.test(meta);
    const mime = meta.replace(/;base64$/, '') || 'application/octet-stream';
    const data = dataUrl.slice(comma + 1);
    if (isBase64) {
      const bin = atob(data);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  }
  function mimeExt(mime) {
    switch (mime) {
      case 'image/png': return '.png';
      case 'image/jpeg': return '.jpg';
      case 'image/gif': return '.gif';
      case 'image/webp': return '.webp';
      case 'image/svg+xml': return '.svg';
      case 'video/mp4': return '.mp4';
      case 'video/webm': return '.webm';
      default: return '';
    }
  }

  // ---- Push the whole state to GitHub (admin only) ----
  // Returns { ok, message }. If no token, returns { ok: true, message: '' }
  // — silent skip so non-admin code paths don't break.
  async function pushToRemote() {
    if (!SYNC || !SYNC.hasToken()) return { ok: true, message: '' };
    return SYNC.savePosts(state);
  }

  function notifySaveError(message) {
    window.dispatchEvent(new CustomEvent('cheer-store-save-error', { detail: { message } }));
    alert(message);
  }
  function notifyRemoteSync(detail) {
    window.dispatchEvent(new CustomEvent('cheer-store-remote-sync', { detail }));
  }

  // Wraps a synchronous mutation with: local save -> async externalise+push.
  async function commitMutation(mutator, opts = {}) {
    const previous = clone(state);
    let mutated;
    try {
      mutated = mutator(state); // mutates `state` in place; returns whatever caller wants
    } catch (e) {
      state = previous;
      notifySaveError('Could not apply this change.');
      return null;
    }
    if (!saveLocal(state)) {
      state = previous;
      return null;
    }
    broadcast();

    // If admin token is held, externalise any new images and push posts.json.
    if (SYNC && SYNC.hasToken() && opts.externaliseId) {
      try {
        const idx = state.posts.findIndex(p => p.id === opts.externaliseId);
        if (idx >= 0) {
          const externalised = await externaliseImages(state.posts[idx]);
          if (externalised !== state.posts[idx]) {
            state.posts[idx] = externalised;
            saveLocal(state);
            broadcast();
          }
        }
      } catch (e) {
        notifyRemoteSync({ ok: false, message: 'Could not upload images: ' + (e && e.message ? e.message : e) });
        // We'll still try to push the JSON so the text changes aren't lost.
      }
    }
    if (SYNC && SYNC.hasToken()) {
      const result = await pushToRemote();
      notifyRemoteSync(result);
      if (!result.ok) {
        // Keep local change so the user doesn't lose work; surface the failure.
        // (We don't roll back state — they can retry by editing again.)
      }
    }
    return mutated;
  }

  const api = {
    get() { return state; },
    exportData() { return clone(state); },
    importData(payload) {
      if (!payload || typeof payload !== 'object') return false;
      const nextState = {
        products: Array.isArray(payload.products) ? payload.products : [],
        posts: Array.isArray(payload.posts) ? payload.posts : [],
      };
      const previousState = clone(state);
      state = nextState;
      if (!saveLocal(state)) { state = previousState; return false; }
      broadcast();
      // Push to GitHub if admin
      if (SYNC && SYNC.hasToken()) pushToRemote().then(notifyRemoteSync);
      return true;
    },
    getPosts() { return state.posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
    getProducts() { return state.products; },
    getPinnedPost() { return state.posts.find(p => p.pinned) || null; },
    refreshFromRemote,

    addPost(post) {
      const id = post.id || ('post-' + Date.now().toString(36));
      const newPost = {
        id,
        title: post.title || 'Untitled',
        excerpt: post.excerpt || '',
        cover: post.cover || '',
        coverPosition: post.coverPosition || '50% 0%',
        coverZoom: post.coverZoom || 100,
        homeImage: post.homeImage || '',
        productIcon: post.productIcon || '',
        productIconSize: post.productIconSize || 34,
        appStore: post.appStore || '',
        googlePlay: post.googlePlay || '',
        includeInCarousel: !!post.includeInCarousel,
        author: post.author || 'Cheervinsky',
        date: post.date || new Date().toISOString().slice(0, 10),
        pinned: !!post.pinned,
        published: post.published !== false,
        status: post.status === 'product' ? 'product' : 'blog',
        tags: post.tags || [],
        body: post.body || '',
      };
      if (newPost.status === 'product') newPost.pinned = false;
      if (!newPost.published) newPost.pinned = false;

      commitMutation(s => {
        if (newPost.pinned && newPost.published) s.posts.forEach(p => p.pinned = false);
        s.posts.unshift(newPost);
        return newPost;
      }, { externaliseId: id });
      return newPost;
    },
    updatePost(id, patch) {
      const idx = state.posts.findIndex(p => p.id === id);
      if (idx < 0) return null;
      if (patch.status === 'product') patch.pinned = false;
      if (patch.published === false) patch.pinned = false;
      commitMutation(s => {
        if (patch.pinned && patch.published !== false) s.posts.forEach(p => p.pinned = false);
        s.posts[idx] = { ...s.posts[idx], ...patch };
        return s.posts[idx];
      }, { externaliseId: id });
      return state.posts[idx];
    },
    deletePost(id) {
      commitMutation(s => { s.posts = s.posts.filter(p => p.id !== id); });
    },
    setPinned(id) {
      commitMutation(s => {
        s.posts.forEach(p => p.pinned = (p.id === id && p.published !== false && p.status !== 'product'));
      });
    },
    reset() {
      const fresh = clone(D);
      commitMutation(s => { s.products = fresh.products; s.posts = fresh.posts; });
    },
  };

  window.cheerStore = api;
})();
