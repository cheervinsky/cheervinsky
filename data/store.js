// Tiny store with localStorage persistence.
// Exposes window.cheerStore.{get,setPosts,addPost,updatePost,deletePost,setPinned,reset}
(function () {
  const KEY = 'cheervinsky_v1';
  const D = window.CHEERVINSKY_DEFAULTS;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(D);
      const parsed = JSON.parse(raw);
      const posts = (parsed.posts || clone(D.posts)).map(p => ({
        published: true,
        status: 'blog',
        ...p,
      }));
      // Backfill missing keys
      return {
        products: parsed.products || clone(D.products),
        posts,
      };
    } catch (e) {
      return clone(D);
    }
  }
  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('cheer-store-changed'));
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
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  let state = load();

  const api = {
    get() { return state; },
    getPosts() { return state.posts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
    getProducts() { return state.products; },
    getPinnedPost() { return state.posts.find(p => p.pinned) || null; },
    addPost(post) {
      const id = post.id || ('post-' + Date.now().toString(36));
      const newPost = {
        id,
        title: post.title || 'Untitled',
        excerpt: post.excerpt || '',
        cover: post.cover || '',
        productIcon: post.productIcon || '',
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
      const previousPosts = clone(state.posts);
      if (newPost.pinned && newPost.published) {
        // Unpin all others first
        state.posts.forEach(p => p.pinned = false);
      }
      if (!newPost.published) newPost.pinned = false;
      state.posts.unshift(newPost);
      if (!save(state)) {
        state.posts = previousPosts;
        return null;
      }
      return newPost;
    },
    updatePost(id, patch) {
      const idx = state.posts.findIndex(p => p.id === id);
      if (idx < 0) return null;
      const previousPosts = clone(state.posts);
      if (patch.status === 'product') patch.pinned = false;
      if (patch.published === false) patch.pinned = false;
      if (patch.pinned && patch.published !== false) {
        state.posts.forEach(p => p.pinned = false);
      }
      state.posts[idx] = { ...state.posts[idx], ...patch };
      if (!save(state)) {
        state.posts = previousPosts;
        return null;
      }
      return state.posts[idx];
    },
    deletePost(id) {
      const previousPosts = clone(state.posts);
      state.posts = state.posts.filter(p => p.id !== id);
      if (!save(state)) state.posts = previousPosts;
    },
    setPinned(id) {
      const previousPosts = clone(state.posts);
      state.posts.forEach(p => p.pinned = (p.id === id && p.published !== false && p.status !== 'product'));
      if (!save(state)) state.posts = previousPosts;
    },
    reset() {
      const previousState = clone(state);
      state = clone(D);
      if (!save(state)) state = previousState;
    },
  };

  window.cheerStore = api;
})();
