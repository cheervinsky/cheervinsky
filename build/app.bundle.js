window.CHEERVINSKY_DEFAULTS = {
  products: [],
  posts: [
    {
      id: "neurodream-features",
      title: "NeuroDream \u2014 new features",
      excerpt: "A handful of small, careful additions to the dream journal \u2014 gentler nudges, a new pattern view, and the long-promised export.",
      cover: "assets/iphone-mockup.png",
      author: "The Cheervinsky Studio",
      date: "2026-04-18",
      pinned: true,
      tags: ["release", "mira"],
      body: `# A few small things

We shipped a small update to the dream journal this week. Nothing flashy \u2014 just three things we've been quietly working on for a while.

## Gentler nudges

The old reminder was a small bell. The new one is a soft chime that fades in over four seconds. You can almost ignore it, which is the point.

## Pattern view

A new lens on your last twelve weeks. We don't draw conclusions for you \u2014 we just show what was there.

## Export

Finally. Markdown, PDF, or plain text. Your data, your file, no account required.`
    },
    {
      id: "why-paper",
      title: "Why we still design like it's paper",
      excerpt: "On warm cream backgrounds, soft shadows, and the surprisingly modern feeling of an old notebook.",
      cover: "",
      author: "Anya, design",
      date: "2026-03-22",
      pinned: false,
      tags: ["design", "studio"],
      body: `Software doesn't have to feel like software. We use a warm paper background, hairline rules, and shadows that look like they came from sunlight rather than a CSS box-shadow generator. It sounds small. It changes everything.`
    },
    {
      id: "kiln-launch",
      title: "Kiln is here",
      excerpt: "A timer that doesn't want anything from you. Available now on iOS and Android.",
      cover: "",
      author: "The Cheervinsky Studio",
      date: "2026-02-14",
      pinned: false,
      tags: ["release", "kiln"],
      body: `Kiln has been on our desks for the better part of a year. It is a focus timer that does almost nothing, and we're a little proud of that.`
    },
    {
      id: "team-letter",
      title: "A small letter from the studio",
      excerpt: "Five apps. One small studio. Here's how we're thinking about the next year.",
      cover: "",
      author: "Anya & Roma",
      date: "2026-01-09",
      pinned: false,
      tags: ["studio"],
      body: `Hello. We started Cheervinsky as a place to make small, careful tools for the kind of life we want to live. Twelve months in, we are five apps, two people, and a long list of things we still want to make.`
    }
  ]
};
(function() {
  const CONFIG = {
    owner: "itmaryna",
    repo: "cheervinsky",
    branch: "main",
    dataPath: "data/posts.json",
    mediaDir: "data/media"
  };
  let token = "";
  let lastSha = null;
  function configure(next) {
    Object.assign(CONFIG, next || {});
  }
  function setToken(value) {
    token = (value || "").trim();
  }
  function getToken() {
    return token;
  }
  function clearToken() {
    token = "";
  }
  function hasToken() {
    return !!token;
  }
  function rawUrl(ref) {
    if (!ref || typeof ref !== "string") return null;
    if (!ref.startsWith("ghmedia/")) return null;
    const filename = ref.slice("ghmedia/".length);
    return "https://raw.githubusercontent.com/" + CONFIG.owner + "/" + CONFIG.repo + "/" + CONFIG.branch + "/" + CONFIG.mediaDir + "/" + filename;
  }
  async function fetchPosts() {
    try {
      if (token) {
        const res2 = await fetch(apiUrl(CONFIG.dataPath) + "?ref=" + encodeURIComponent(CONFIG.branch), {
          headers: authHeaders()
        });
        if (res2.status === 404) {
          lastSha = null;
          return null;
        }
        if (!res2.ok) return null;
        const json = await res2.json();
        lastSha = json.sha || null;
        return parseJsonContent(json.content);
      }
      const url = "https://raw.githubusercontent.com/" + CONFIG.owner + "/" + CONFIG.repo + "/" + CONFIG.branch + "/" + CONFIG.dataPath + "?t=" + Date.now();
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }
  async function savePosts(state) {
    if (!token) return { ok: false, message: "No admin token. Open the secret URL to enable saving to GitHub." };
    try {
      if (lastSha === null) {
        const probe = await fetch(apiUrl(CONFIG.dataPath) + "?ref=" + encodeURIComponent(CONFIG.branch), {
          headers: authHeaders()
        });
        if (probe.status === 200) {
          const probeJson = await probe.json();
          lastSha = probeJson.sha || null;
        } else if (probe.status !== 404) {
          return { ok: false, message: "GitHub responded " + probe.status + " when checking the data file. Is your token correct?" };
        }
      }
      const body = {
        message: "Update posts.json from admin",
        content: encodeUtf8Base64(JSON.stringify(state, null, 2)),
        branch: CONFIG.branch
      };
      if (lastSha) body.sha = lastSha;
      const res = await fetch(apiUrl(CONFIG.dataPath), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, message: "GitHub save failed (" + res.status + "). " + text.slice(0, 200) };
      }
      const out = await res.json();
      lastSha = out.content && out.content.sha ? out.content.sha : null;
      return { ok: true, message: "Saved to GitHub." };
    } catch (e) {
      return { ok: false, message: "Network error saving to GitHub: " + (e && e.message ? e.message : e) };
    }
  }
  async function uploadMedia(filenameHint, blob) {
    if (!token) throw new Error("No admin token");
    const ext = guessExt(blob && blob.type, filenameHint);
    const safeBase = (filenameHint || "asset").replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "asset";
    const stamp = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    const filename = safeBase + "-" + stamp + ext;
    const path = CONFIG.mediaDir + "/" + filename;
    const base64 = await blobToBase64(blob);
    const res = await fetch(apiUrl(path), {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Add media: " + filename,
        content: base64,
        branch: CONFIG.branch
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error("Media upload failed (" + res.status + "): " + text.slice(0, 200));
    }
    return "ghmedia/" + filename;
  }
  function apiUrl(path) {
    return "https://api.github.com/repos/" + CONFIG.owner + "/" + CONFIG.repo + "/contents/" + path.split("/").map(encodeURIComponent).join("/");
  }
  function authHeaders() {
    return {
      Authorization: "token " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }
  function parseJsonContent(b64) {
    try {
      const text = decodeUtf8Base64((b64 || "").replace(/\n/g, ""));
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
  function encodeUtf8Base64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }
  function decodeUtf8Base64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  function guessExt(mime, hint) {
    if (mime === "image/png") return ".png";
    if (mime === "image/jpeg") return ".jpg";
    if (mime === "image/gif") return ".gif";
    if (mime === "image/webp") return ".webp";
    if (mime === "image/svg+xml") return ".svg";
    if (hint && /\.[a-z0-9]+$/i.test(hint)) return hint.slice(hint.lastIndexOf(".")).toLowerCase();
    return ".bin";
  }
  window.cheerSync = {
    configure,
    setToken,
    getToken,
    clearToken,
    hasToken,
    fetchPosts,
    savePosts,
    uploadMedia,
    rawUrl,
    config: CONFIG
  };
})();
(function() {
  const DB_NAME = "cheervinsky_media";
  const STORE_NAME = "assets";
  const VERSION = 1;
  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function withStore(mode, callback) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  async function saveFile(file) {
    const id = "media-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    await withStore("readwrite", (store) => store.put({
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }));
    return id;
  }
  async function get(id) {
    return withStore("readonly", (store) => {
      const request = store.get(id);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }
  async function getUrl(id) {
    const asset = await get(id);
    return asset ? URL.createObjectURL(asset.blob) : "";
  }
  window.cheerMedia = { saveFile, get, getUrl };
})();
(function() {
  const KEY = "cheervinsky_v1";
  const D = window.CHEERVINSKY_DEFAULTS;
  const SYNC = window.cheerSync;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(D);
      const parsed = JSON.parse(raw);
      const posts = (parsed.posts || clone(D.posts)).map((p) => ({
        published: true,
        status: "blog",
        coverPosition: "50% 0%",
        coverZoom: 100,
        homeImage: "",
        homeImagePosition: "50% 50%",
        homeImageZoom: 100,
        productIconSize: 34,
        productIconGap: 8,
        productIconShiftX: 0,
        productIconShiftY: 0,
        ...p
      }));
      return {
        products: parsed.products || clone(D.products),
        posts
      };
    } catch (e) {
      return clone(D);
    }
  }
  function saveLocal(state2) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state2));
      return true;
    } catch (e) {
      const isQuota = e && (e.name === "QuotaExceededError" || /quota/i.test(String(e.message || "")));
      const haveDiskDest = !!localApi || SYNC && SYNC.hasToken && SYNC.hasToken();
      if (haveDiskDest && isQuota) {
        console.warn("[cheerStore] localStorage cache full; relying on disk save instead.");
        return false;
      }
      const message = isQuota ? "This post is too large for browser storage. Start the local dev server (node serve.js) so changes can be saved to disk instead." : "The post could not be saved in browser storage.";
      alert(message);
      window.dispatchEvent(new CustomEvent("cheer-store-save-error", { detail: { message } }));
      return false;
    }
  }
  function broadcast() {
    window.dispatchEvent(new CustomEvent("cheer-store-changed"));
  }
  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }
  let state = load();
  let inFlightSync = null;
  let localApi = null;
  let localApiProbe = null;
  function probeLocalApi() {
    if (localApiProbe) return localApiProbe;
    const proto = window.location && window.location.protocol || "";
    const host = window.location && window.location.hostname || "";
    if (proto !== "http:" || host !== "localhost" && host !== "127.0.0.1") {
      localApi = false;
      return Promise.resolve(false);
    }
    localApiProbe = fetch("/api/status", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((j) => {
      localApi = !!(j && j.ok);
      return localApi;
    }).catch(() => {
      localApi = false;
      return false;
    });
    return localApiProbe;
  }
  probeLocalApi();
  async function refreshFromRemote() {
    await probeLocalApi();
    if (localApi) {
      try {
        const res = await fetch("/data/posts.json?t=" + Date.now(), { cache: "no-store" });
        if (res.ok) {
          const remote = await res.json();
          state = normalizeRemoteState(remote);
          saveLocal(state);
          broadcast();
        }
      } catch (e) {
      }
      return;
    }
    if (!SYNC) return;
    try {
      const remote = await SYNC.fetchPosts();
      if (!remote) return;
      state = normalizeRemoteState(remote);
      saveLocal(state);
      broadcast();
    } catch (e) {
    }
  }
  function normalizeRemoteState(remote) {
    return {
      products: Array.isArray(remote.products) ? remote.products : [],
      posts: Array.isArray(remote.posts) ? remote.posts.map((p) => ({
        published: true,
        status: "blog",
        coverPosition: "50% 0%",
        coverZoom: 100,
        homeImage: "",
        homeImagePosition: "50% 50%",
        homeImageZoom: 100,
        productIconSize: 34,
        productIconGap: 8,
        productIconShiftX: 0,
        productIconShiftY: 0,
        ...p
      })) : []
    };
  }
  if (SYNC) {
    inFlightSync = refreshFromRemote();
  }
  window.addEventListener("cheer-admin-token-changed", () => {
    inFlightSync = refreshFromRemote();
  });
  async function uploadMediaLocal(filenameHint, blob) {
    const ext = mimeExt(blob && blob.type) || "";
    const safeBase = (filenameHint || "asset").replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "asset";
    const stamp = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
    const filename = safeBase + "-" + stamp + ext;
    const base64 = await blobToBase64(blob);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, base64 })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.message || "Upload failed (" + res.status + ")");
    return j.ref;
  }
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  async function externaliseImages(post) {
    const useLocal = !!localApi;
    const useGh = !useLocal && SYNC && SYNC.hasToken();
    if (!useLocal && !useGh) return post;
    const fields = ["cover", "homeImage", "productIcon"];
    const next = { ...post };
    for (const field of fields) {
      const value = next[field];
      if (!value || typeof value !== "string") continue;
      if (value.startsWith("ghmedia/")) continue;
      if (/^https?:\/\//i.test(value)) continue;
      let blob = null;
      let hint = field;
      if (value.startsWith("data:")) {
        blob = dataUrlToBlob(value);
        hint = field + (mimeExt(blob.type) || "");
      } else if (value.startsWith("media:")) {
        const id = value.slice(6);
        try {
          const asset = await window.cheerMedia.get(id);
          if (asset && asset.blob) {
            blob = asset.blob;
            hint = asset.name || (field + mimeExt(blob.type) || "") || field;
          }
        } catch (e) {
        }
      }
      if (!blob) continue;
      try {
        const ref = useLocal ? await uploadMediaLocal(hint, blob) : await SYNC.uploadMedia(hint, blob);
        next[field] = ref;
      } catch (e) {
        throw new Error("Could not upload " + field + ": " + (e && e.message ? e.message : e));
      }
    }
    if (typeof next.body === "string") {
      next.body = await externaliseBodyMedia(next.body);
    }
    return next;
  }
  async function externaliseBodyMedia(body) {
    const re = /\{\{(image|video|gallery|youtube):([^|}]+)([^}]*)\}\}/g;
    let out = "";
    let i = 0;
    let match;
    while ((match = re.exec(body)) !== null) {
      out += body.slice(i, match.index);
      const [_, type, srcRaw, rest] = match;
      let newSrc = srcRaw;
      if (type === "gallery") {
        const items = srcRaw.split(",").map(decodeURIComponent);
        const replaced = [];
        for (const item of items) {
          replaced.push(await maybeExternaliseSingle(item));
        }
        newSrc = replaced.map(encodeURIComponent).join(",");
      } else {
        newSrc = await maybeExternaliseSingle(srcRaw);
      }
      out += "{{" + type + ":" + newSrc + (rest || "") + "}}";
      i = re.lastIndex;
    }
    return out + body.slice(i);
  }
  async function maybeExternaliseSingle(src) {
    if (!src) return src;
    if (src.startsWith("ghmedia/")) return src;
    if (src.startsWith("data/media/")) return src;
    if (/^https?:\/\//i.test(src)) return src;
    let blob = null;
    let hint = "asset";
    if (src.startsWith("data:")) {
      blob = dataUrlToBlob(src);
      hint = "body" + (mimeExt(blob.type) || "");
    } else if (src.startsWith("media:")) {
      const id = src.slice(6);
      try {
        const asset = await window.cheerMedia.get(id);
        if (asset && asset.blob) {
          blob = asset.blob;
          hint = asset.name || "body";
        }
      } catch (e) {
      }
    }
    if (!blob) return src;
    try {
      return localApi ? await uploadMediaLocal(hint, blob) : await SYNC.uploadMedia(hint, blob);
    } catch (e) {
      throw e;
    }
  }
  function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(",");
    const meta = dataUrl.slice(5, comma);
    const isBase64 = /;base64$/.test(meta);
    const mime = meta.replace(/;base64$/, "") || "application/octet-stream";
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
      case "image/png":
        return ".png";
      case "image/jpeg":
        return ".jpg";
      case "image/gif":
        return ".gif";
      case "image/webp":
        return ".webp";
      case "image/svg+xml":
        return ".svg";
      case "video/mp4":
        return ".mp4";
      case "video/webm":
        return ".webm";
      default:
        return "";
    }
  }
  async function pushToRemote() {
    await probeLocalApi();
    if (localApi) {
      try {
        const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state)
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) return { ok: false, message: j.message || "Local save failed (" + res.status + ")" };
        return { ok: true, message: j.message || "Saved to data/posts.json" };
      } catch (e) {
        return { ok: false, message: "Local save failed: " + (e && e.message || e) };
      }
    }
    if (!SYNC || !SYNC.hasToken()) return { ok: true, message: "" };
    return SYNC.savePosts(state);
  }
  function notifySaveError(message) {
    window.dispatchEvent(new CustomEvent("cheer-store-save-error", { detail: { message } }));
    alert(message);
  }
  function notifyRemoteSync(detail) {
    window.dispatchEvent(new CustomEvent("cheer-store-remote-sync", { detail }));
  }
  async function commitMutation(mutator, opts = {}) {
    const previous = clone(state);
    let mutated;
    try {
      mutated = mutator(state);
    } catch (e) {
      state = previous;
      notifySaveError("Could not apply this change.");
      return null;
    }
    broadcast();
    await probeLocalApi();
    const canExternalise = !!localApi || SYNC && SYNC.hasToken();
    if (canExternalise && opts.externaliseId) {
      try {
        const idx = state.posts.findIndex((p) => p.id === opts.externaliseId);
        if (idx >= 0) {
          const externalised = await externaliseImages(state.posts[idx]);
          if (externalised !== state.posts[idx]) {
            state.posts[idx] = externalised;
            broadcast();
          }
        }
      } catch (e) {
        notifyRemoteSync({ ok: false, message: "Could not upload images: " + (e && e.message ? e.message : e) });
      }
    }
    if (!saveLocal(state)) {
    }
    if (canExternalise) {
      const result = await pushToRemote();
      notifyRemoteSync(result);
    } else {
      notifyRemoteSync({ ok: false, message: "Save was kept only in browser memory. Start the local dev server (node serve.js) to write changes to disk." });
    }
    return mutated;
  }
  const api = {
    get() {
      return state;
    },
    exportData() {
      return clone(state);
    },
    importData(payload) {
      if (!payload || typeof payload !== "object") return false;
      const nextState = {
        products: Array.isArray(payload.products) ? payload.products : [],
        posts: Array.isArray(payload.posts) ? payload.posts : []
      };
      const previousState = clone(state);
      state = nextState;
      if (!saveLocal(state)) {
        state = previousState;
        return false;
      }
      broadcast();
      probeLocalApi().then(() => {
        if (localApi || SYNC && SYNC.hasToken()) pushToRemote().then(notifyRemoteSync);
      });
      return true;
    },
    getPosts() {
      return state.posts.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    },
    getProducts() {
      return state.products;
    },
    getPinnedPost() {
      return state.posts.find((p) => p.pinned) || null;
    },
    refreshFromRemote,
    addPost(post) {
      const id = post.id || "post-" + Date.now().toString(36);
      const newPost = {
        id,
        title: post.title || "Untitled",
        excerpt: post.excerpt || "",
        cover: post.cover || "",
        coverPosition: post.coverPosition || "50% 0%",
        coverZoom: post.coverZoom || 100,
        homeImage: post.homeImage || "",
        homeImagePosition: post.homeImagePosition || "50% 50%",
        homeImageZoom: post.homeImageZoom || 100,
        productIcon: post.productIcon || "",
        productIconSize: post.productIconSize || 34,
        productIconGap: post.productIconGap || 8,
        productIconShiftX: post.productIconShiftX || 0,
        productIconShiftY: post.productIconShiftY || 0,
        appStore: post.appStore || "",
        googlePlay: post.googlePlay || "",
        includeInCarousel: !!post.includeInCarousel,
        author: post.author || "Cheervinsky",
        date: post.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        pinned: !!post.pinned,
        published: post.published !== false,
        status: post.status === "product" ? "product" : "blog",
        tags: post.tags || [],
        body: post.body || ""
      };
      if (newPost.status === "product") newPost.pinned = false;
      if (!newPost.published) newPost.pinned = false;
      commitMutation((s) => {
        if (newPost.pinned && newPost.published) s.posts.forEach((p) => p.pinned = false);
        s.posts.unshift(newPost);
        return newPost;
      }, { externaliseId: id });
      return newPost;
    },
    updatePost(id, patch) {
      const idx = state.posts.findIndex((p) => p.id === id);
      if (idx < 0) return null;
      if (patch.status === "product") patch.pinned = false;
      if (patch.published === false) patch.pinned = false;
      commitMutation((s) => {
        if (patch.pinned && patch.published !== false) s.posts.forEach((p) => p.pinned = false);
        s.posts[idx] = { ...s.posts[idx], ...patch };
        return s.posts[idx];
      }, { externaliseId: id });
      return state.posts[idx];
    },
    deletePost(id) {
      commitMutation((s) => {
        s.posts = s.posts.filter((p) => p.id !== id);
      });
    },
    setPinned(id) {
      commitMutation((s) => {
        s.posts.forEach((p) => p.pinned = p.id === id && p.published !== false && p.status !== "product");
      });
    },
    reset() {
      const fresh = clone(D);
      commitMutation((s) => {
        s.products = fresh.products;
        s.posts = fresh.posts;
      });
    }
  };
  window.cheerStore = api;
})();
const { useEffect, useState, useRef, useMemo, useCallback } = React;
function parseHash() {
  const h = window.location.hash.replace(/^#/, "") || "home";
  const [primary, hidden = ""] = h.split("#");
  const [route, ...rest] = primary.split("/");
  return { route: route || "home", param: rest.join("/") || "", hidden };
}
function navigate(route) {
  window.location.hash = "#" + route;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function useRoute() {
  const [r, setR] = useState(parseHash());
  useEffect(() => {
    const fn = () => setR(parseHash());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return r;
}
function useStore() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const fn = () => setVersion((v) => v + 1);
    window.addEventListener("cheer-store-changed", fn);
    return () => window.removeEventListener("cheer-store-changed", fn);
  }, []);
  return useMemo(() => window.cheerStore.get(), [version]);
}
function CrowLogo({ size = 84 }) {
  return /* @__PURE__ */ React.createElement(
    "img",
    {
      src: "assets/crow-logo.png",
      alt: "Cheervinsky",
      className: "crow",
      style: { height: size, width: "auto" }
    }
  );
}
function IconYouTube() {
  return /* @__PURE__ */ React.createElement("img", { src: "assets/youtube_icon.png", alt: "" });
}
function IconInstagram() {
  return /* @__PURE__ */ React.createElement("img", { src: "assets/instagram_icon.png", alt: "" });
}
function IconArrow({ left }) {
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", style: { transform: left ? "rotate(180deg)" : "" } }, /* @__PURE__ */ React.createElement("path", { d: "M5 12h14M13 5l7 7-7 7" }));
}
function IconPin() {
  return /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M12 2L9 8H4l4 4-2 7 6-3 6 3-2-7 4-4h-5z" }));
}
function IconTrash() {
  return /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" }));
}
function IconEdit() {
  return /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" }), /* @__PURE__ */ React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4z" }));
}
function StoreButton({ kind, href = "#" }) {
  if (kind === "apple") {
    return /* @__PURE__ */ React.createElement("a", { href, className: "store-btn", "aria-label": "Download on the App Store", target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement("svg", { className: "store-svg", viewBox: "0 0 24 24", fill: "currentColor" }, /* @__PURE__ */ React.createElement("path", { d: "M17.05 12.04c-.03-2.93 2.4-4.34 2.5-4.4-1.36-1.99-3.49-2.27-4.24-2.3-1.81-.18-3.53 1.06-4.45 1.06-.93 0-2.34-1.04-3.85-1.01-1.97.03-3.81 1.16-4.83 2.93-2.06 3.58-.53 8.86 1.48 11.77.98 1.42 2.16 3.02 3.7 2.96 1.49-.06 2.05-.96 3.85-.96 1.79 0 2.31.96 3.88.93 1.6-.03 2.62-1.45 3.59-2.88 1.13-1.65 1.6-3.25 1.62-3.34-.04-.02-3.1-1.19-3.13-4.72zM14.36 3.6c.81-.99 1.36-2.36 1.21-3.72-1.17.05-2.59.78-3.43 1.76-.75.87-1.41 2.27-1.23 3.6 1.31.1 2.65-.66 3.45-1.64z" })), /* @__PURE__ */ React.createElement("span", { className: "label" }, /* @__PURE__ */ React.createElement("span", { className: "small" }, "Download on the"), /* @__PURE__ */ React.createElement("span", { className: "big" }, "App Store")));
  }
  return /* @__PURE__ */ React.createElement("a", { href, className: "store-btn", "aria-label": "Get it on Google Play", target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement("svg", { className: "store-svg", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "gp1", x1: "0", x2: "1", y1: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#00D4FF" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#00B0FF" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "gp2", x1: "0", x2: "1", y1: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#00F076" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#00C264" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "gp3", x1: "0", x2: "1", y1: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#FFE000" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#FF9100" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "gp4", x1: "0", x2: "1", y1: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#FF3A44" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#C31162" }))), /* @__PURE__ */ React.createElement("path", { d: "M3.6 2.7C3.2 3.05 3 3.5 3 4v16c0 .5.2.95.6 1.3L13 12 3.6 2.7z", fill: "url(#gp1)" }), /* @__PURE__ */ React.createElement("path", { d: "M16.4 8.85L13 12l3.4 3.15 3.5-2.05c.95-.55.95-1.65 0-2.2l-3.5-2.05z", fill: "url(#gp3)" }), /* @__PURE__ */ React.createElement("path", { d: "M3.6 2.7L13 12l3.4-3.15L4.7 2.05c-.4-.2-.8-.2-1.1.05z", fill: "url(#gp2)" }), /* @__PURE__ */ React.createElement("path", { d: "M3.6 21.3c.3.25.7.25 1.1.05l11.7-6.8L13 12 3.6 21.3z", fill: "url(#gp4)" })), /* @__PURE__ */ React.createElement("span", { className: "label" }, /* @__PURE__ */ React.createElement("span", { className: "small" }, "GET IT ON"), /* @__PURE__ */ React.createElement("span", { className: "big" }, "Google Play")));
}
function Header({ route }) {
  const [isScrolled, setIsScrolled] = useState(route !== "home");
  useEffect(() => {
    if (route !== "home") {
      setIsScrolled(true);
      return;
    }
    const onScroll = () => setIsScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [route]);
  const links = [
    { id: "products", label: "PRODUCTS" },
    { id: "blog", label: "BLOG" },
    { id: "contacts", label: "CONTACTS" }
  ];
  return /* @__PURE__ */ React.createElement("header", { className: "site-header header-" + route + (route === "home" ? " home-header" : "") + (route === "home" && isScrolled ? " home-header-scrolled" : "") }, route === "home" && !isScrolled ? /* @__PURE__ */ React.createElement("div", { className: "header-spacer", "aria-hidden": "true" }) : /* @__PURE__ */ React.createElement("a", { href: "#home", className: "brand-mini" }, /* @__PURE__ */ React.createElement("img", { src: "assets/crow-logo.png", alt: "" }), /* @__PURE__ */ React.createElement("span", null, "cheervinsky")), /* @__PURE__ */ React.createElement("nav", { className: "nav" }, links.map((l) => /* @__PURE__ */ React.createElement(
    "a",
    {
      key: l.id,
      href: "#" + l.id,
      className: route === l.id ? "active" : ""
    },
    l.label
  )), /* @__PURE__ */ React.createElement("span", { className: "socials" }, /* @__PURE__ */ React.createElement("a", { href: "https://www.youtube.com/@cheervinsky", "aria-label": "YouTube", target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(IconYouTube, null)), /* @__PURE__ */ React.createElement("a", { href: "https://www.instagram.com/cheervinsky/", "aria-label": "Instagram", target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(IconInstagram, null)))));
}
function Footer({ route }) {
  return /* @__PURE__ */ React.createElement("footer", { className: "site-footer" + (route === "home" ? " home-footer" : "") }, /* @__PURE__ */ React.createElement("nav", { className: "nav" }, /* @__PURE__ */ React.createElement("a", { href: "#products" }, "PRODUCTS"), /* @__PURE__ */ React.createElement("a", { href: "#blog" }, "BLOG"), /* @__PURE__ */ React.createElement("a", { href: "#contacts" }, "CONTACTS")), /* @__PURE__ */ React.createElement("a", { href: "https://itmaryna.github.io/", className: "terms", target: "_blank", rel: "noopener noreferrer" }, "Terms and Conditions and Privacy Policy"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 18, fontSize: 12, color: "var(--ink-2)", fontFamily: "'Vollkorn SC', serif", letterSpacing: "0.08em" } }, "\xA9 2026 Cheervinsky Studio \xB7 Made with care"));
}
function LiquidGlassDefs() {
  return /* @__PURE__ */ React.createElement("svg", { className: "svg-filter-defs", width: "0", height: "0", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: "liquid-glass-distortion", x: "-20%", y: "-20%", width: "140%", height: "140%" }, /* @__PURE__ */ React.createElement(
    "feTurbulence",
    {
      type: "fractalNoise",
      baseFrequency: "0.01 0.022",
      numOctaves: "1",
      seed: "7",
      result: "noise"
    },
    /* @__PURE__ */ React.createElement(
      "animate",
      {
        attributeName: "baseFrequency",
        values: "0.01 0.022;0.008 0.018;0.01 0.022",
        dur: "14s",
        repeatCount: "indefinite"
      }
    )
  ), /* @__PURE__ */ React.createElement("feGaussianBlur", { in: "noise", stdDeviation: "0.7", result: "softNoise" }), /* @__PURE__ */ React.createElement(
    "feDisplacementMap",
    {
      in: "SourceGraphic",
      in2: "softNoise",
      scale: "6",
      xChannelSelector: "R",
      yChannelSelector: "G"
    }
  ))));
}
function CurvyDivider() {
  return /* @__PURE__ */ React.createElement("div", { className: "curvy-divider", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 1440 120", preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement(
    "path",
    {
      className: "curvy-path",
      d: "M -80 74 C 92 44, 194 94, 272 72 C 330 54, 352 46, 348 72 C 344 98, 292 92, 308 66 C 326 38, 386 54, 452 72 C 570 104, 616 38, 704 68 C 752 84, 764 104, 738 100 C 706 96, 712 50, 762 52 C 826 54, 886 90, 980 72 C 1048 58, 1084 48, 1096 68 C 1112 94, 1058 98, 1070 70 C 1084 38, 1160 56, 1238 76 S 1392 92, 1520 68"
    }
  )));
}
function resolveImageRef(ref) {
  if (!ref || typeof ref !== "string") return "";
  if (ref.startsWith("ghmedia/") && window.cheerSync && window.cheerSync.rawUrl) {
    return window.cheerSync.rawUrl(ref) || "";
  }
  return ref;
}
function PhoneMockup({ src, alt = "", className = "", innerStyle = {} }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => src && src.startsWith("media:") ? "" : resolveImageRef(src));
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!src || !src.startsWith("media:")) {
      setResolvedSrc(resolveImageRef(src));
      return () => {
        active = false;
      };
    }
    const mediaId = src.slice(6);
    window.cheerMedia.getUrl(mediaId).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setResolvedSrc(url || "");
    }).catch(() => {
      if (!active) return;
      setResolvedSrc("");
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return /* @__PURE__ */ React.createElement("div", { className: "phone-frame " + className, style: { position: "relative", height: "100%", aspectRatio: "0.49" } }, resolvedSrc ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: resolvedSrc,
      alt,
      style: {
        position: "absolute",
        top: "2.6%",
        left: "5.4%",
        width: "89%",
        height: "94.8%",
        objectFit: "contain",
        borderRadius: "7%",
        zIndex: 1,
        ...innerStyle
      }
    }
  ) : null);
}
Object.assign(window, {
  parseHash,
  navigate,
  useRoute,
  useStore,
  resolveImageRef,
  CrowLogo,
  StoreButton,
  Header,
  Footer,
  LiquidGlassDefs,
  CurvyDivider,
  PhoneMockup,
  IconYouTube,
  IconInstagram,
  IconArrow,
  IconPin,
  IconTrash,
  IconEdit
});
const { useEffect: useEffect2, useState: useState2, useRef: useRef2 } = React;
function Carousel() {
  const store = useStore();
  const productPosts = store.posts.filter((p) => p.published !== false && p.status === "product" && p.includeInCarousel).map((p) => ({
    id: p.id,
    name: p.title,
    title: p.title,
    tagline: p.excerpt,
    description: p.excerpt || p.body,
    hero: p.homeImage || p.cover || "",
    heroPosition: p.homeImagePosition || "50% 50%",
    heroZoom: p.homeImageZoom || 100,
    productIcon: p.productIcon || "",
    productIconSize: Math.max(12, Math.min(140, parseInt(p.productIconSize, 10) || 34)),
    productIconGap: Math.max(-80, Math.min(80, parseInt(p.productIconGap, 10) || 8)),
    productIconShiftX: Math.max(-120, Math.min(120, parseInt(p.productIconShiftX, 10) || 0)),
    productIconShiftY: Math.max(-90, Math.min(90, parseInt(p.productIconShiftY, 10) || 0)),
    appStore: p.appStore || "",
    googlePlay: p.googlePlay || "",
    eyebrow: "PRODUCT",
    monogram: p.title ? p.title[0] : "P",
    detailHref: "#post/" + p.id
  }));
  const products = productPosts;
  const [idx, setIdx] = useState2(0);
  const [phase, setPhase] = useState2("in");
  const timerRef = useRef2(null);
  useEffect2(() => {
    if (!products.length) return void 0;
    timerRef.current = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setIdx((i) => (i + 1 + products.length) % products.length);
        setPhase("enter");
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in")));
      }, 1150);
    }, 1e4);
    return () => clearInterval(timerRef.current);
  }, [idx, products.length]);
  if (!products.length) return null;
  const advance = (next) => {
    setPhase("out");
    setTimeout(() => {
      setIdx((next + products.length) % products.length);
      setPhase("enter");
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in")));
    }, 1150);
  };
  const goto = (i) => {
    clearInterval(timerRef.current);
    advance(i);
  };
  const product = products[idx];
  const phoneClass = phase === "out" ? "exiting" : phase === "enter" ? "entering" : "";
  const glassClass = phase === "out" ? " exiting" : phase === "enter" ? " entering" : "";
  const loopLineClass = phase === "in" ? "carousel-loop-line" : "carousel-loop-line visible";
  return /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement("div", { className: "carousel" }, /* @__PURE__ */ React.createElement("div", { className: "phone-stage" }, /* @__PURE__ */ React.createElement("div", { className: "phone-shadow" }), /* @__PURE__ */ React.createElement(PhoneMockup, { src: product.hero, alt: product.name, className: phoneClass, innerStyle: getHomeImageStyle(product.heroPosition, product.heroZoom) })), /* @__PURE__ */ React.createElement("div", { className: "glass carousel-glass" + glassClass }, /* @__PURE__ */ React.createElement("div", { className: "carousel-glass-content" }, /* @__PURE__ */ React.createElement("p", { className: "glass-eyebrow" }, product.eyebrow || "CHEERVINSKY APP"), /* @__PURE__ */ React.createElement("h2", null, product.detailHref ? /* @__PURE__ */ React.createElement("a", { href: product.detailHref, className: "carousel-title-link" }, product.productIcon ? /* @__PURE__ */ React.createElement(
    "img",
    {
      className: "carousel-title-icon",
      src: product.productIcon,
      alt: "",
      style: {
        width: product.productIconSize,
        height: product.productIconSize,
        marginRight: product.productIconGap,
        transform: `translate(${product.productIconShiftX}px, ${product.productIconShiftY}px)`
      }
    }
  ) : null, product.name) : /* @__PURE__ */ React.createElement(React.Fragment, null, product.name)), product.detailHref ? /* @__PURE__ */ React.createElement("a", { href: product.detailHref, className: "carousel-description-link" }, product.description) : /* @__PURE__ */ React.createElement("p", null, product.description), /* @__PURE__ */ React.createElement("div", { className: "cta-row" }, product.detailHref ? /* @__PURE__ */ React.createElement(React.Fragment, null, product.googlePlay ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "google", href: product.googlePlay }) : null, product.appStore ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "apple", href: product.appStore }) : null, /* @__PURE__ */ React.createElement("a", { href: product.detailHref, className: "btn dark product-read-about-btn" }, "Read about product")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(StoreButton, { kind: "google", href: product.googlePlay }), /* @__PURE__ */ React.createElement(StoreButton, { kind: "apple", href: product.appStore }))))), /* @__PURE__ */ React.createElement("div", { className: loopLineClass, "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 120 110", preserveAspectRatio: "xMidYMid meet" }, /* @__PURE__ */ React.createElement("path", { d: "M60 94 C34 73, 18 56, 18 38 C18 23, 28 14, 41 14 C50 14, 56 20, 60 28 C64 20, 70 14, 79 14 C92 14, 102 23, 102 38 C102 56, 86 73, 60 94 Z" })))), /* @__PURE__ */ React.createElement("div", { className: "carousel-controls" }, /* @__PURE__ */ React.createElement("button", { className: "arrow-btn", onClick: () => goto(idx - 1), "aria-label": "Previous" }, /* @__PURE__ */ React.createElement(IconArrow, { left: true })), /* @__PURE__ */ React.createElement("div", { className: "dots" }, products.map((_, i) => /* @__PURE__ */ React.createElement("button", { key: i, className: i === idx ? "active" : "", onClick: () => goto(i), "aria-label": "Go to slide " + (i + 1) }))), /* @__PURE__ */ React.createElement("button", { className: "arrow-btn", onClick: () => goto(idx + 1), "aria-label": "Next" }, /* @__PURE__ */ React.createElement(IconArrow, null))));
}
function PinnedPost() {
  const store = useStore();
  const publishedPosts = store.posts.filter((p) => p.published !== false && p.status !== "product");
  const post = publishedPosts.find((p) => p.pinned) || publishedPosts[0];
  if (!post) return null;
  return /* @__PURE__ */ React.createElement("section", { className: "section" }, /* @__PURE__ */ React.createElement(CurvyDivider, null), /* @__PURE__ */ React.createElement("div", { className: "pinned-blog" }, /* @__PURE__ */ React.createElement("div", { className: "phone-stage pinned-phone-stage" }, /* @__PURE__ */ React.createElement("div", { className: "phone-shadow" }), /* @__PURE__ */ React.createElement(
    PhoneMockup,
    {
      src: post.homeImage || post.cover || "",
      alt: post.title,
      className: "pinned-phone",
      innerStyle: getHomeImageStyle(post.homeImagePosition, post.homeImageZoom)
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "glass pinned-glass" }, /* @__PURE__ */ React.createElement("div", { className: "carousel-glass-content pinned-glass-content" }, /* @__PURE__ */ React.createElement("p", { className: "glass-eyebrow" }, "FROM THE BLOG \xB7 PINNED"), /* @__PURE__ */ React.createElement("h2", null, post.title), /* @__PURE__ */ React.createElement("p", null, post.excerpt), /* @__PURE__ */ React.createElement("div", { className: "cta-row pinned-cta-row" }, /* @__PURE__ */ React.createElement("a", { href: "#post/" + post.id, className: "btn" }, "Read in Blog"))))));
}
function FeaturesStrip() {
  const items = [
    {
      title: /* @__PURE__ */ React.createElement(React.Fragment, null, "TRUSTED BY ", /* @__PURE__ */ React.createElement("span", { className: "feature-highlight" }, "20,000+ USERS"), " WORLDWIDE"),
      icon: /* @__PURE__ */ React.createElement("img", { src: "assets/first_place_icon.png", alt: "" })
    },
    {
      title: "BUILT ON REAL NEUROSCIENCE & EVIDENCE-BASED RESEARCH",
      icon: /* @__PURE__ */ React.createElement("img", { src: "assets/unique_apps_icon.png", alt: "" })
    },
    {
      title: "NO TRUE ALTERNATIVES ON THE MARKET",
      icon: /* @__PURE__ */ React.createElement("img", { src: "assets/user_selection_icon.png", alt: "" })
    }
  ];
  return /* @__PURE__ */ React.createElement("section", { className: "features-strip" }, /* @__PURE__ */ React.createElement("div", { className: "features-grid" }, items.map((it, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "feature" }, /* @__PURE__ */ React.createElement("div", { className: "ico" }, it.icon), /* @__PURE__ */ React.createElement("h3", null, it.title)))));
}
function MoreFeatures() {
  const items = [
    { num: "01 \xB7 ONE ECOSYSTEM", title: "Everything, in harmony.", body: "All apps live within one cohesive ecosystem - one philosophy, one visual language, one seamless experience. Move between them effortlessly. Nothing breaks your flow." },
    { num: "02 \xB7 OFFLINE FIRST", title: "Yours, on your device.", body: "No accounts, no sync server, no telemetry. Your journal, your timer, your habits - they live where they belong." },
    { num: "03 \xB7 SLOW BY DESIGN", title: "Nothing is in a hurry.", body: "Every interaction is shaped around human psychology and natural behavior patterns. Animations breathe. Reminders arrive gently. Tools that respect your pace - not fight it." },
    { num: "04 \xB7 BUILT FOR MODERN LIFE", title: "Clarity in a noisy world.", body: "Continuously updated with the latest scientific insights and shaped by the realities of modern life - from social media overload to AI acceleration. Designed to help you disconnect, regain control, and think clearly again." },
    { num: "05 \xB7 HONEST PRICING", title: "Fair, and made to be accessible.", body: "Pricing is kept simple and considerate - designed to be available to as many people as possible. Minimal advertising, no manipulation, no pressure." },
    { num: "06 \xB7 OPEN ROADMAP", title: "You'll know what's next.", body: "We share what we're building, exploring, and questioning - openly, every month." }
  ];
  return /* @__PURE__ */ React.createElement("section", { className: "section", style: { paddingTop: 96, paddingBottom: 96 } }, /* @__PURE__ */ React.createElement("span", { className: "section-eyebrow" }, "YOU'RE IN GOOD HANDS"), /* @__PURE__ */ React.createElement("h2", { className: "section-title" }, "A studio you can trust with your time."), /* @__PURE__ */ React.createElement("div", { className: "more-features" }, items.map((it, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "feature-card", style: { animationDelay: i * 60 + "ms" } }, /* @__PURE__ */ React.createElement("p", { className: "num" }, it.num), /* @__PURE__ */ React.createElement("h4", null, it.title), /* @__PURE__ */ React.createElement("p", null, it.body)))));
}
function HomePage() {
  const [titleProgress, setTitleProgress] = useState2(0);
  useEffect2(() => {
    const onScroll = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / 110));
      setTitleProgress(progress);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const titleScale = 1 - titleProgress * 0.52;
  const titleX = -200 * titleProgress;
  const titleY = -70 * titleProgress;
  const titleOpacity = 1 - titleProgress * 0.9;
  const taglineOpacity = Math.max(0, 1 - titleProgress * 2.2);
  return /* @__PURE__ */ React.createElement("div", { className: "page" }, /* @__PURE__ */ React.createElement("section", { className: "hero-brand" }, /* @__PURE__ */ React.createElement(
    "h1",
    {
      className: "hero-title",
      style: {
        transform: `translate(${titleX}px, ${titleY}px) scale(${titleScale})`,
        opacity: titleOpacity
      }
    },
    /* @__PURE__ */ React.createElement(CrowLogo, { size: 44 }),
    /* @__PURE__ */ React.createElement("span", null, "Cheervinsky")
  ), /* @__PURE__ */ React.createElement(
    "p",
    {
      className: "tagline",
      style: {
        opacity: taglineOpacity,
        transform: `translateY(${-14 * titleProgress}px)`
      }
    },
    "Warm, careful apps built on ",
    /* @__PURE__ */ React.createElement("strong", null, "neuroscience"),
    " and attention science - designed for a world that has become extremely efficient at distracting you. We help you focus, relax, and ",
    /* @__PURE__ */ React.createElement("strong", null, "remember what you were doing five seconds ago"),
    "."
  )), /* @__PURE__ */ React.createElement(Carousel, null), /* @__PURE__ */ React.createElement(PinnedPost, null), /* @__PURE__ */ React.createElement(FeaturesStrip, null), /* @__PURE__ */ React.createElement(MoreFeatures, null));
}
Object.assign(window, { HomePage, Carousel, PinnedPost, FeaturesStrip, MoreFeatures });
function PaginationControls({ currentPage, totalPages, onPageChange, label }) {
  if (totalPages <= 1) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "blog-pagination", "aria-label": label || "Pagination" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: currentPage === 1, onClick: () => onPageChange(Math.max(1, currentPage - 1)) }, "Previous"), Array.from({ length: totalPages }, (_, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i + 1,
      type: "button",
      className: currentPage === i + 1 ? "active" : "",
      onClick: () => onPageChange(i + 1),
      "aria-label": "Go to page " + (i + 1)
    },
    i + 1
  )), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: currentPage === totalPages, onClick: () => onPageChange(Math.min(totalPages, currentPage + 1)) }, "Next"));
}
function BlogPage() {
  const store = useStore();
  const posts = window.cheerStore.getPosts().filter((p) => p.published !== false && p.status !== "product");
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visiblePosts = posts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return /* @__PURE__ */ React.createElement("div", { className: "page" }, /* @__PURE__ */ React.createElement("section", { className: "blog-hero" }, /* @__PURE__ */ React.createElement("h1", null, "Blog"), /* @__PURE__ */ React.createElement("p", null, "Letters from the studio \u2014 releases, design notes, and the occasional thought about what we're trying to make.")), /* @__PURE__ */ React.createElement("div", { className: "blog-toolbar" }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'Vollkorn SC', serif", letterSpacing: "0.08em", fontSize: 13, color: "var(--ink-2)" } }, posts.length, " ", posts.length === 1 ? "POST" : "POSTS"), /* @__PURE__ */ React.createElement(PaginationControls, { currentPage, totalPages, onPageChange: setPage, label: "Blog pagination top" }), totalPages > 1 && /* @__PURE__ */ React.createElement("span", { className: "blog-page-count" }, "Page ", currentPage, " of ", totalPages)), /* @__PURE__ */ React.createElement("div", { className: "blog-grid" }, visiblePosts.map((p) => {
    const previewSrc = p.cover;
    return /* @__PURE__ */ React.createElement("a", { key: p.id, className: "post-card", href: "#post/" + p.id }, /* @__PURE__ */ React.createElement("div", { className: "post-cover" }, previewSrc ? /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(previewSrc), alt: "", style: getCoverImageStyle(p.coverPosition, p.coverZoom) }) : /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: "100%", display: "grid", placeItems: "center", fontFamily: "'Vollkorn SC', serif", fontSize: 48, color: "rgba(0,0,0,0.2)" } }, p.title[0])), /* @__PURE__ */ React.createElement("div", { className: "body" }, /* @__PURE__ */ React.createElement("div", { className: "meta" }, p.pinned && /* @__PURE__ */ React.createElement("span", { className: "pinned" }, "PINNED"), /* @__PURE__ */ React.createElement("span", null, formatDate(p.date)), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, p.author)), /* @__PURE__ */ React.createElement("h3", { className: "list-card-title" }, p.productIcon ? /* @__PURE__ */ React.createElement(
      "img",
      {
        className: "list-card-title-icon",
        src: resolveImageRef(p.productIcon),
        alt: "",
        style: {
          width: Math.max(12, Math.min(140, parseInt(p.productIconSize, 10) || 26)),
          height: Math.max(12, Math.min(140, parseInt(p.productIconSize, 10) || 26)),
          marginRight: getProductIconGap(p.productIconGap),
          transform: `translate(${getProductIconShiftX(p.productIconShiftX)}px, ${getProductIconShiftY(p.productIconShiftY)}px)`
        }
      }
    ) : null, p.title), /* @__PURE__ */ React.createElement("p", null, p.excerpt), /* @__PURE__ */ React.createElement("span", { className: "read-more" }, "Read more \u2192")));
  })), /* @__PURE__ */ React.createElement(PaginationControls, { currentPage, totalPages, onPageChange: setPage, label: "Blog pagination bottom" }));
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getCoverPosition(position) {
  const legacyPositions = {
    "center top": "50% 0%",
    "center 25%": "50% 25%",
    "center center": "50% 50%",
    "center 70%": "50% 70%",
    "center bottom": "50% 100%",
    "left center": "0% 50%",
    "right center": "100% 50%"
  };
  if (legacyPositions[position]) return legacyPositions[position];
  return /^\d{1,3}% \d{1,3}%$/.test(position || "") ? position : "50% 0%";
}
function getCoverCrop(position) {
  const [x, y] = getCoverPosition(position).split(" ").map((value) => parseInt(value, 10));
  return { x, y };
}
function setCoverCropAxis(position, axis, value) {
  const crop = getCoverCrop(position);
  const nextValue = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
  return axis === "x" ? `${nextValue}% ${crop.y}%` : `${crop.x}% ${nextValue}%`;
}
function getCoverZoom(zoom) {
  return Math.min(180, Math.max(60, parseInt(zoom, 10) || 100));
}
function getCoverImageStyle(position, zoom, extra = {}) {
  const coverPosition = getCoverPosition(position);
  return {
    objectFit: "contain",
    objectPosition: coverPosition,
    transform: `scale(${getCoverZoom(zoom) / 100})`,
    transformOrigin: coverPosition,
    ...extra
  };
}
function getHomeImagePosition(position) {
  return /^-?\d{1,3}% -?\d{1,3}%$/.test(position || "") ? position : "50% 50%";
}
function getHomeImageCrop(position) {
  const [x, y] = getHomeImagePosition(position).split(" ").map((value) => parseInt(value, 10));
  return { x, y };
}
function setHomeImageCropAxis(position, axis, value) {
  const crop = getHomeImageCrop(position);
  const nextValue = Math.min(180, Math.max(-80, parseInt(value, 10) || 0));
  return axis === "x" ? `${nextValue}% ${crop.y}%` : `${crop.x}% ${nextValue}%`;
}
function getHomeImageZoom(zoom) {
  return Math.min(700, Math.max(30, parseInt(zoom, 10) || 100));
}
function getHomeImageStyle(position, zoom, extra = {}) {
  const imagePosition = getHomeImagePosition(position);
  return {
    objectPosition: imagePosition,
    transform: `scale(${getHomeImageZoom(zoom) / 100})`,
    transformOrigin: imagePosition,
    ...extra
  };
}
function getProductIconShiftX(value) {
  return Math.max(-120, Math.min(120, parseInt(value, 10) || 0));
}
function getProductIconShiftY(value) {
  return Math.max(-90, Math.min(90, parseInt(value, 10) || 0));
}
function getProductIconGap(value) {
  return Math.max(-80, Math.min(80, parseInt(value, 10) || 8));
}
function warnIfJpegUpload(file, contextLabel) {
  if (!file || file.type !== "image/jpeg") return;
  alert(`${contextLabel}: this file is JPEG, and JPEG cannot keep transparent background. Please use PNG with alpha for transparent areas.`);
}
function renderInlineText(text) {
  const parts = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)]+|mailto:[^)]+|#[^)]+)\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] && match[3]) {
      parts.push(
        /* @__PURE__ */ React.createElement("a", { key: parts.length, href: match[3], target: match[3].startsWith("http") ? "_blank" : void 0, rel: match[3].startsWith("http") ? "noopener noreferrer" : void 0 }, match[2])
      );
    } else if (match[5]) {
      parts.push(/* @__PURE__ */ React.createElement("strong", { key: parts.length }, match[5]));
    } else if (match[7]) {
      parts.push(/* @__PURE__ */ React.createElement("u", { key: parts.length }, match[7]));
    } else if (match[9]) {
      parts.push(/* @__PURE__ */ React.createElement("em", { key: parts.length }, match[9]));
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        id = parsed.pathname.split("/")[2] || "";
      } else if (parsed.pathname.startsWith("/embed/")) {
        id = parsed.pathname.split("/")[2] || "";
      } else {
        id = parsed.searchParams.get("v") || "";
      }
    }
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch (e) {
    return "";
  }
}
function isYouTubeUrl(url) {
  return !!getYouTubeEmbedUrl(url);
}
function MediaAsset({ id, alt = "" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    window.cheerMedia.getUrl(id).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setSrc(url);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  if (!src) return /* @__PURE__ */ React.createElement("div", { className: "post-media-placeholder" }, "Loading image...");
  return /* @__PURE__ */ React.createElement("img", { src, alt });
}
function parseMediaOptions(parts) {
  const options = { caption: "", sideText: "", size: "full", align: "center", wrap: false, shadow: false, columns: 2 };
  parts.forEach((part) => {
    const value = (part || "").trim();
    if (!value) return;
    const option = value.match(/^([a-z]+)=(.+)$/i);
    if (!option) {
      if (!options.caption) options.caption = value;
      return;
    }
    const key = option[1].toLowerCase();
    const rawOptionValue = option[2].trim();
    const optionValue = rawOptionValue.toLowerCase();
    if (key === "size" && ["small", "medium", "large", "full"].includes(optionValue)) options.size = optionValue;
    if (key === "align" && ["left", "center", "right"].includes(optionValue)) options.align = optionValue;
    if (key === "wrap") options.wrap = ["true", "yes", "1"].includes(optionValue);
    if (key === "shadow") options.shadow = ["true", "yes", "1"].includes(optionValue);
    if (key === "columns") options.columns = Math.min(5, Math.max(2, parseInt(optionValue, 10) || 2));
    if (key === "sidetext") {
      try {
        options.sideText = decodeURIComponent(rawOptionValue);
      } catch (e) {
        options.sideText = rawOptionValue;
      }
    }
  });
  if (options.align === "center") options.wrap = false;
  return options;
}
function buildMediaToken(type, src, options = {}) {
  const mediaSrc = Array.isArray(src) ? src.map((value) => encodeURIComponent(value)).join(",") : src;
  const parts = [
    options.caption || "",
    "size=" + (options.size || "full"),
    "align=" + (options.align || "center"),
    "wrap=" + !!options.wrap,
    "shadow=" + !!options.shadow,
    type === "gallery" ? "columns=" + Math.min(5, Math.max(2, parseInt(options.columns, 10) || 2)) : "",
    options.sideText ? "sideText=" + encodeURIComponent(options.sideText) : ""
  ].filter(Boolean);
  return `{{${type}:${mediaSrc}${parts.length ? "|" + parts.join("|") : ""}}}`;
}
function parseGallerySources(src) {
  return (src || "").split(",").map((value) => {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }).filter(Boolean).slice(0, 5);
}
function renderPostBody(body, editor = {}) {
  return (body || "").split(/\n\s*\n/).map((b, i) => {
    const trim = b.trim();
    const media = trim.match(/^\{\{(image|video|youtube|gallery):([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (media) {
      const [, type, src, rawOptions] = media;
      const options = parseMediaOptions((rawOptions || "").split("|").slice(1));
      const cleanSrc = src.trim();
      const mediaId = cleanSrc.startsWith("media:") ? cleanSrc.slice(6) : "";
      const youtubeSrc = type === "youtube" || type === "video" ? getYouTubeEmbedUrl(cleanSrc) : "";
      const gallerySources = type === "gallery" ? parseGallerySources(cleanSrc) : [];
      const mediaClass = [
        "post-media",
        "post-media-" + options.size,
        "post-media-" + options.align,
        options.wrap ? "post-media-wrap" : "post-media-no-wrap",
        options.shadow ? "post-media-shadow" : ""
      ].join(" ");
      const canEdit = editor.onMediaChange && editor.onMediaDelete && (type === "image" || type === "gallery");
      const mediaFigure = /* @__PURE__ */ React.createElement("figure", { className: type === "gallery" ? "post-media post-gallery post-gallery-columns-" + options.columns + (options.shadow ? " post-media-shadow" : "") : mediaClass }, type === "gallery" ? /* @__PURE__ */ React.createElement("div", { className: "post-gallery-grid" }, gallerySources.map((source, galleryIndex) => {
        const galleryMediaId = source.startsWith("media:") ? source.slice(6) : "";
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "post-gallery-item" + (canEdit ? " draggable" : ""),
            key: galleryIndex,
            draggable: canEdit,
            onDragStart: canEdit ? (e) => {
              e.dataTransfer.setData("text/plain", String(galleryIndex));
              e.dataTransfer.effectAllowed = "move";
            } : void 0,
            onDragOver: canEdit ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            } : void 0,
            onDrop: canEdit ? (e) => {
              e.preventDefault();
              const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
              if (!isNaN(fromIndex)) editor.onGalleryImageMove(i, fromIndex, galleryIndex);
            } : void 0,
            title: canEdit ? "Drag to reorder this image" : void 0
          },
          galleryMediaId ? /* @__PURE__ */ React.createElement(MediaAsset, { id: galleryMediaId, alt: options.caption || "" }) : /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(source), alt: options.caption || "" }),
          canEdit ? /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              className: "gallery-image-remove",
              onClick: () => editor.onGalleryImageDelete(i, galleryIndex),
              "aria-label": "Remove image " + (galleryIndex + 1)
            },
            "Remove"
          ) : null
        );
      })) : youtubeSrc ? /* @__PURE__ */ React.createElement("div", { className: "post-youtube" }, /* @__PURE__ */ React.createElement(
        "iframe",
        {
          src: youtubeSrc,
          title: options.caption || "YouTube video",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true
        }
      )) : type === "video" ? /* @__PURE__ */ React.createElement("video", { src: resolveImageRef(cleanSrc), controls: true, playsInline: true, preload: "metadata" }) : mediaId ? /* @__PURE__ */ React.createElement(MediaAsset, { id: mediaId, alt: options.caption || "" }) : /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(cleanSrc), alt: options.caption || "" }), options.caption ? /* @__PURE__ */ React.createElement("figcaption", null, options.caption) : null, canEdit && type === "gallery" ? /* @__PURE__ */ React.createElement("div", { className: "media-preview-controls" }, /* @__PURE__ */ React.createElement("label", null, "Images in row", /* @__PURE__ */ React.createElement("select", { value: options.columns, onChange: (e) => editor.onMediaChange(i, { columns: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "2" }, "2 images"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "3 images"), /* @__PURE__ */ React.createElement("option", { value: "4" }, "4 images"), /* @__PURE__ */ React.createElement("option", { value: "5" }, "5 images"))), /* @__PURE__ */ React.createElement("label", { className: "media-preview-caption" }, "Caption", /* @__PURE__ */ React.createElement("input", { value: options.caption, onChange: (e) => editor.onMediaChange(i, { caption: e.target.value }) })), /* @__PURE__ */ React.createElement("label", { className: "media-preview-checkbox" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: !!options.shadow,
          onChange: (e) => editor.onMediaChange(i, { shadow: e.target.checked })
        }
      ), "Drop shadow"), gallerySources.length < 5 ? /* @__PURE__ */ React.createElement("label", { className: "gallery-add-btn" }, "Add images", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", multiple: true, onChange: (e) => editor.onGalleryAdd(i, e) })) : null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "media-delete-btn", onClick: () => editor.onMediaDelete(i) }, "Delete images")) : canEdit ? /* @__PURE__ */ React.createElement("div", { className: "media-preview-controls" }, /* @__PURE__ */ React.createElement("label", null, "Size", /* @__PURE__ */ React.createElement("select", { value: options.size, onChange: (e) => editor.onMediaChange(i, { size: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "small" }, "Small"), /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium"), /* @__PURE__ */ React.createElement("option", { value: "large" }, "Large"), /* @__PURE__ */ React.createElement("option", { value: "full" }, "Full"))), /* @__PURE__ */ React.createElement("label", null, "Position", /* @__PURE__ */ React.createElement("select", { value: options.align, onChange: (e) => editor.onMediaChange(i, { align: e.target.value, wrap: e.target.value === "center" ? false : options.wrap }) }, /* @__PURE__ */ React.createElement("option", { value: "left" }, "Left"), /* @__PURE__ */ React.createElement("option", { value: "center" }, "Center"), /* @__PURE__ */ React.createElement("option", { value: "right" }, "Right"))), /* @__PURE__ */ React.createElement("label", { className: "media-preview-checkbox" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: options.wrap,
          disabled: options.align === "center",
          onChange: (e) => editor.onMediaChange(i, { wrap: e.target.checked })
        }
      ), "Text beside"), /* @__PURE__ */ React.createElement("label", { className: "media-preview-checkbox" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: !!options.shadow,
          onChange: (e) => editor.onMediaChange(i, { shadow: e.target.checked })
        }
      ), "Drop shadow"), /* @__PURE__ */ React.createElement("label", { className: "media-preview-caption" }, "Caption", /* @__PURE__ */ React.createElement("input", { value: options.caption, onChange: (e) => editor.onMediaChange(i, { caption: e.target.value }) })), /* @__PURE__ */ React.createElement("label", { className: "media-preview-side-text" }, "Text beside image", /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: options.sideText,
          disabled: !options.wrap,
          onChange: (e) => editor.onMediaChange(i, { sideText: e.target.value }),
          placeholder: options.wrap ? "Write the text that should sit beside this image." : "Enable Text beside first."
        }
      )), /* @__PURE__ */ React.createElement("button", { type: "button", className: "media-delete-btn", onClick: () => editor.onMediaDelete(i) }, "Delete image")) : null);
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, mediaFigure, options.wrap && options.sideText ? /* @__PURE__ */ React.createElement("p", { className: "post-media-side-copy" }, renderInlineText(options.sideText)) : null);
    }
    const standaloneYouTubeSrc = getYouTubeEmbedUrl(trim);
    if (standaloneYouTubeSrc) {
      return /* @__PURE__ */ React.createElement("figure", { key: i, className: "post-media post-media-full post-media-center post-media-no-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "post-youtube" }, /* @__PURE__ */ React.createElement(
        "iframe",
        {
          src: standaloneYouTubeSrc,
          title: "YouTube video",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true
        }
      )));
    }
    if (trim.startsWith("### ")) return /* @__PURE__ */ React.createElement("h3", { key: i }, renderInlineText(trim.slice(4)));
    if (trim.startsWith("## ")) return /* @__PURE__ */ React.createElement("h2", { key: i }, renderInlineText(trim.slice(3)));
    if (trim.startsWith("# ")) return /* @__PURE__ */ React.createElement("h1", { key: i }, renderInlineText(trim.slice(2)));
    return /* @__PURE__ */ React.createElement("p", { key: i }, renderInlineText(trim));
  });
}
function PostPage({ id }) {
  const store = useStore();
  const isAdminSession = sessionStorage.getItem("cheer_admin_session") === "1";
  const post = store.posts.find((p) => p.id === id);
  if (!post || post.published === false && !isAdminSession) {
    return /* @__PURE__ */ React.createElement("div", { className: "page post-page" }, /* @__PURE__ */ React.createElement("a", { href: "#blog", className: "back-link" }, "\u2190 Back to blog"), /* @__PURE__ */ React.createElement("h1", null, "Not found"), /* @__PURE__ */ React.createElement("p", null, "We can't find that post. It may have been removed."));
  }
  const blocks = renderPostBody(post.body);
  const isProductPost = post.status === "product";
  return /* @__PURE__ */ React.createElement("div", { className: "page post-page" }, /* @__PURE__ */ React.createElement("article", { className: "detail-content-panel" }, /* @__PURE__ */ React.createElement("a", { href: isProductPost ? "#products" : "#blog", className: "back-link" }, "\u2190 Back to ", isProductPost ? "products" : "blog"), post.cover ? /* @__PURE__ */ React.createElement("div", { className: "post-cover" }, /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(post.cover), alt: "", style: getCoverImageStyle(post.coverPosition, post.coverZoom, { width: "100%", height: "100%", borderRadius: "inherit" }) })) : null, /* @__PURE__ */ React.createElement("h1", { className: isProductPost ? "product-post-title" : "" }, isProductPost && post.productIcon ? /* @__PURE__ */ React.createElement(
    "img",
    {
      className: "product-post-title-icon",
      src: resolveImageRef(post.productIcon),
      alt: "",
      style: {
        width: Math.max(12, Math.min(140, parseInt(post.productIconSize, 10) || 34)),
        height: Math.max(12, Math.min(140, parseInt(post.productIconSize, 10) || 34)),
        marginRight: getProductIconGap(post.productIconGap),
        transform: `translate(${getProductIconShiftX(post.productIconShiftX)}px, ${getProductIconShiftY(post.productIconShiftY)}px)`
      }
    }
  ) : null, post.title), /* @__PURE__ */ React.createElement("div", { className: "meta" }, isProductPost ? "PRODUCT \xB7 " : "", formatDate(post.date), " \xB7 ", post.author, post.pinned ? " \xB7 PINNED" : ""), /* @__PURE__ */ React.createElement("div", { className: "post-body" }, blocks), isProductPost && (post.appStore || post.googlePlay) ? /* @__PURE__ */ React.createElement("div", { className: "stores product-detail-stores" }, post.appStore ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "apple", href: post.appStore }) : null, post.googlePlay ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "google", href: post.googlePlay }) : null) : null));
}
function ProductDetailPage({ id }) {
  const store = useStore();
  const product = store.products.find((p) => p.id === id);
  if (!product) {
    return /* @__PURE__ */ React.createElement("div", { className: "page post-page" }, /* @__PURE__ */ React.createElement("a", { href: "#products", className: "back-link" }, "\u2190 Back to products"), /* @__PURE__ */ React.createElement("h1", null, "Not found"), /* @__PURE__ */ React.createElement("p", null, "We can't find that product."));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "page post-page product-detail-page" }, /* @__PURE__ */ React.createElement("article", { className: "detail-content-panel" }, /* @__PURE__ */ React.createElement("a", { href: "#products", className: "back-link" }, "\u2190 Back to products"), /* @__PURE__ */ React.createElement("div", { className: "product-detail-hero" }, /* @__PURE__ */ React.createElement(PhoneMockup, { src: product.hero, alt: product.name, className: "product-detail-phone" })), /* @__PURE__ */ React.createElement("div", { className: "meta" }, "PRODUCT \xB7 ", product.eyebrow), /* @__PURE__ */ React.createElement("h1", null, product.title || product.name), /* @__PURE__ */ React.createElement("div", { className: "post-body" }, /* @__PURE__ */ React.createElement("p", null, product.description)), /* @__PURE__ */ React.createElement("div", { className: "stores product-detail-stores" }, /* @__PURE__ */ React.createElement(StoreButton, { kind: "apple", href: product.appStore }), /* @__PURE__ */ React.createElement(StoreButton, { kind: "google", href: product.googlePlay }))));
}
function ProductsPage() {
  const productPosts = window.cheerStore.getPosts().filter((p) => p.published !== false && p.status === "product");
  const products = productPosts;
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return /* @__PURE__ */ React.createElement("div", { className: "page" }, /* @__PURE__ */ React.createElement("section", { className: "blog-hero" }, /* @__PURE__ */ React.createElement("h1", null, "Products"), /* @__PURE__ */ React.createElement("p", null, "Five small apps under one warm roof. Each does one thing, slowly, and well.")), /* @__PURE__ */ React.createElement("div", { className: "blog-toolbar" }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'Vollkorn SC', serif", letterSpacing: "0.08em", fontSize: 13, color: "var(--ink-2)" } }, products.length, " ", products.length === 1 ? "PRODUCT" : "PRODUCTS"), /* @__PURE__ */ React.createElement(PaginationControls, { currentPage, totalPages, onPageChange: setPage, label: "Products pagination top" }), totalPages > 1 && /* @__PURE__ */ React.createElement("span", { className: "blog-page-count" }, "Page ", currentPage, " of ", totalPages)), /* @__PURE__ */ React.createElement("div", { className: "products-grid" }, visibleProducts.map((p) => {
    const previewSrc = p.cover;
    return /* @__PURE__ */ React.createElement("a", { key: p.id, className: "product-card product-post-card", href: "#post/" + p.id }, /* @__PURE__ */ React.createElement("div", { className: "post-cover product-post-cover" }, previewSrc ? /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(previewSrc), alt: "", style: getCoverImageStyle(p.coverPosition, p.coverZoom) }) : /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: "100%", display: "grid", placeItems: "center", fontFamily: "'Vollkorn SC', serif", fontSize: 48, color: "rgba(0,0,0,0.2)" } }, p.title[0])), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "'Vollkorn SC', serif", fontSize: 12, letterSpacing: "0.16em", color: "var(--honey-deep)", margin: "0 0 4px" } }, "PRODUCT"), /* @__PURE__ */ React.createElement("h3", { className: "list-card-title" }, p.productIcon ? /* @__PURE__ */ React.createElement(
      "img",
      {
        className: "list-card-title-icon",
        src: resolveImageRef(p.productIcon),
        alt: "",
        style: {
          width: Math.max(12, Math.min(140, parseInt(p.productIconSize, 10) || 26)),
          height: Math.max(12, Math.min(140, parseInt(p.productIconSize, 10) || 26)),
          marginRight: getProductIconGap(p.productIconGap),
          transform: `translate(${getProductIconShiftX(p.productIconShiftX)}px, ${getProductIconShiftY(p.productIconShiftY)}px)`
        }
      }
    ) : null, p.title), /* @__PURE__ */ React.createElement("p", null, p.excerpt), p.appStore || p.googlePlay ? /* @__PURE__ */ React.createElement("div", { className: "stores" }, p.appStore ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "apple", href: p.appStore }) : null, p.googlePlay ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "google", href: p.googlePlay }) : null) : null, /* @__PURE__ */ React.createElement("span", { className: "read-more" }, "Read about product \u2192"));
  })), /* @__PURE__ */ React.createElement(PaginationControls, { currentPage, totalPages, onPageChange: setPage, label: "Products pagination bottom" }));
}
function ContactsPage() {
  return /* @__PURE__ */ React.createElement("div", { className: "page" }, /* @__PURE__ */ React.createElement("div", { className: "contacts-page" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", null, "Hello."), /* @__PURE__ */ React.createElement("p", { className: "lede" }, "We're a small studio in Lisbon, two people who answer their own email. We'd love to hear from you \u2014 whether it's a question, an idea, or a quiet hello."), /* @__PURE__ */ React.createElement("ul", { className: "contact-list" }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("span", { className: "label" }, "EMAIL"), /* @__PURE__ */ React.createElement("span", { className: "value" }, "shish.hamish@gmail.com"))))));
}
function resizeImageFile(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.82, mimeType = "image/jpeg" } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === "image/png" && file.size < 400 * 1024 ? "image/png" : mimeType;
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Image resize failed"));
            return;
          }
          const resized = new File([blob], file.name.replace(/\.[^.]+$/, outputType === "image/png" ? ".png" : ".jpg"), { type: outputType });
          resolve(resized.size < file.size ? resized : file);
        }, outputType, quality);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function AdminPage() {
  const store = useStore();
  const posts = window.cheerStore.getPosts();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", excerpt: "", cover: "", coverPosition: "50% 0%", coverZoom: 100, homeImage: "", homeImagePosition: "50% 50%", homeImageZoom: 100, productIcon: "", productIconSize: 34, productIconGap: 8, productIconShiftX: 0, productIconShiftY: 0, appStore: "", googlePlay: "", includeInCarousel: false, author: "The Cheervinsky Studio", body: "", pinned: false, published: true, status: "blog", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
  const [showPreview, setShowPreview] = useState(false);
  const [postFilter, setPostFilter] = useState("all");
  const [postSearch, setPostSearch] = useState("");
  const [toast, setToast] = useState("");
  const [mediaComposer, setMediaComposer] = useState({ url: "", uploadedSrc: "", uploadedName: "", uploadedSources: [], uploadedNames: [], caption: "", sideText: "", size: "full", align: "center", wrap: false, shadow: false, columns: 2 });
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const toastTimerRef = useRef(null);
  const filteredPosts = posts.filter((p) => {
    const matchesFilter = postFilter === "all" || (postFilter === "product" ? p.status === "product" : p.status !== "product");
    const matchesSearch = !postSearch.trim() || (p.title || "").toLowerCase().includes(postSearch.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const coverCrop = getCoverCrop(form.coverPosition);
  const coverZoom = getCoverZoom(form.coverZoom);
  const homeImageCrop = getHomeImageCrop(form.homeImagePosition);
  const homeImageZoom = getHomeImageZoom(form.homeImageZoom);
  const productIconSize = Math.max(12, Math.min(140, parseInt(form.productIconSize, 10) || 34));
  const productIconGap = getProductIconGap(form.productIconGap);
  const productIconShiftX = getProductIconShiftX(form.productIconShiftX);
  const productIconShiftY = getProductIconShiftY(form.productIconShiftY);
  function showAdminToast(message) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3200);
  }
  useEffect(() => {
    function onRemoteSync(e) {
      const detail = e && e.detail;
      if (!detail) return;
      if (detail.ok) {
        if (detail.message) showAdminToast(detail.message);
      } else {
        showAdminToast("GitHub sync failed: " + (detail.message || "unknown error"));
      }
    }
    window.addEventListener("cheer-store-remote-sync", onRemoteSync);
    return () => window.removeEventListener("cheer-store-remote-sync", onRemoteSync);
  }, []);
  function copyAdminLink() {
    const token = window.cheerSync && window.cheerSync.getToken && window.cheerSync.getToken() || "";
    if (!token) {
      alert("No admin token loaded. Open the site with #admin/<your-token> to enable saving to GitHub.");
      return;
    }
    const base = window.location.href.split("#")[0];
    const link = base + "#admin/" + token;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(
        () => showAdminToast("Secret admin link copied to clipboard."),
        () => prompt("Copy your secret admin link:", link)
      );
    } else {
      prompt("Copy your secret admin link:", link);
    }
  }
  function manualResync() {
    if (window.cheerStore && window.cheerStore.refreshFromRemote) {
      window.cheerStore.refreshFromRemote().then(() => showAdminToast("Reloaded from GitHub."));
    }
  }
  function downloadPostsJson() {
    const payload = window.cheerStore.exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "posts.json";
    link.click();
    URL.revokeObjectURL(url);
    const cmd = 'mv ~/Downloads/posts.json ~/Downloads/Cheervinsky\\ Design\\ System/data/posts.json && cd ~/Downloads/Cheervinsky\\ Design\\ System && git add data/posts.json && git commit -m "Update posts" && git push';
    setTimeout(() => {
      if (confirm("Downloaded posts.json to your Downloads folder.\n\nClick OK to copy the publish command to your clipboard, then paste it into Terminal.")) {
        try {
          navigator.clipboard.writeText(cmd);
        } catch (e) {
        }
      }
    }, 200);
  }
  const localServerOn = window.location.protocol === "http:" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const syncOn = localServerOn || !!(window.cheerSync && window.cheerSync.hasToken && window.cheerSync.hasToken());
  function reset() {
    setEditingId(null);
    setForm({ title: "", excerpt: "", cover: "", coverPosition: "50% 0%", coverZoom: 100, homeImage: "", homeImagePosition: "50% 50%", homeImageZoom: 100, productIcon: "", productIconSize: 34, productIconGap: 8, productIconShiftX: 0, productIconShiftY: 0, appStore: "", googlePlay: "", includeInCarousel: false, author: "The Cheervinsky Studio", body: "", pinned: false, published: true, status: "blog", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
    setShowPreview(false);
  }
  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, excerpt: p.excerpt, cover: p.cover, coverPosition: getCoverPosition(p.coverPosition), coverZoom: getCoverZoom(p.coverZoom), homeImage: p.homeImage || "", homeImagePosition: getHomeImagePosition(p.homeImagePosition), homeImageZoom: getHomeImageZoom(p.homeImageZoom), productIcon: p.productIcon || "", productIconSize: p.productIconSize || 34, productIconGap: p.productIconGap || 8, productIconShiftX: p.productIconShiftX || 0, productIconShiftY: p.productIconShiftY || 0, appStore: p.appStore || "", googlePlay: p.googlePlay || "", includeInCarousel: !!p.includeInCarousel, author: p.author, body: p.body, pinned: !!p.pinned, published: p.published !== false, status: p.status === "product" ? "product" : "blog", date: p.date });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function savePost(publishedOverride = form.published) {
    const postData = {
      ...form,
      published: publishedOverride,
      pinned: publishedOverride && form.status !== "product" ? form.pinned : false,
      includeInCarousel: form.status === "product" && publishedOverride ? form.includeInCarousel : false
    };
    const saved = editingId ? window.cheerStore.updatePost(editingId, postData) : window.cheerStore.addPost(postData);
    if (saved) {
      const message = publishedOverride ? editingId ? "Changes saved and post is published." : "Post published successfully." : "Draft saved successfully.";
      reset();
      showAdminToast(message);
    }
  }
  function submit(e) {
    e.preventDefault();
    savePost(form.published);
  }
  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    warnIfJpegUpload(f, "List + detail page image");
    try {
      if (f.type === "image/png") {
        const pngReader = new FileReader();
        pngReader.onload = () => setForm((s) => ({ ...s, cover: pngReader.result }));
        pngReader.readAsDataURL(f);
        return;
      }
      const resized = await resizeImageFile(f, {
        maxWidth: 1600,
        maxHeight: 1e3,
        quality: 0.82,
        mimeType: f.type === "image/png" ? "image/png" : "image/jpeg"
      });
      const reader = new FileReader();
      reader.onload = () => setForm((s) => ({ ...s, cover: reader.result }));
      reader.readAsDataURL(resized);
    } catch (error) {
      alert("Could not resize this cover image. Please try another image.");
    }
  }
  async function onHomeImageFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    warnIfJpegUpload(f, "Home page preview image");
    try {
      const mediaId = await window.cheerMedia.saveFile(f);
      const nextHomeImage = "media:" + mediaId;
      setForm((s) => ({ ...s, homeImage: nextHomeImage }));
      if (editingId) {
        const saved = window.cheerStore.updatePost(editingId, {
          homeImage: nextHomeImage,
          homeImagePosition: form.homeImagePosition,
          homeImageZoom: form.homeImageZoom
        });
        if (saved) showAdminToast("Home page preview image updated.");
      }
    } catch (error) {
      alert("Could not resize this home page image. Please try another image.");
    }
  }
  function removeHomeImage() {
    setForm((s) => ({ ...s, homeImage: "" }));
    if (editingId) {
      const saved = window.cheerStore.updatePost(editingId, { homeImage: "" });
      if (saved) showAdminToast("Home page preview image removed.");
    }
  }
  async function onProductIconFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const resized = await resizeImageFile(f, {
        maxWidth: 180,
        maxHeight: 180,
        quality: 0.86,
        mimeType: f.type === "image/png" ? "image/png" : "image/jpeg"
      });
      const reader = new FileReader();
      reader.onload = () => setForm((s) => ({ ...s, productIcon: reader.result }));
      reader.readAsDataURL(resized);
    } catch (error) {
      alert("Could not resize this product icon. Please try another image.");
    }
  }
  async function stageBodyMedia(e) {
    const selectedFiles = Array.from(e.target.files || []).slice(0, 5);
    e.target.value = "";
    if (!selectedFiles.length) return;
    if ((e.target.files || []).length > 5) {
      alert("You can add up to 5 images in one line. I selected the first 5.");
    }
    if (selectedFiles.some((file) => file.type.startsWith("video/"))) {
      alert("Video files are too large for browser storage. Please add videos by URL instead.");
      return;
    }
    try {
      const savedFiles = [];
      for (const f of selectedFiles) {
        const mediaFile = f.type === "image/gif" ? f : await resizeImageFile(f, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
        const mediaId = await window.cheerMedia.saveFile(mediaFile);
        savedFiles.push({ src: "media:" + mediaId, name: f.name });
      }
      setMediaComposer((s) => ({
        ...s,
        uploadedSrc: savedFiles[0].src,
        uploadedName: savedFiles.map((file) => file.name).join(", "),
        uploadedSources: savedFiles.map((file) => file.src),
        uploadedNames: savedFiles.map((file) => file.name),
        columns: Math.min(5, Math.max(2, savedFiles.length)),
        caption: s.caption || (savedFiles.length === 1 ? savedFiles[0].name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : "")
      }));
    } catch (error) {
      alert("Could not save this image. Please try a smaller image or use an image URL.");
    }
  }
  function insertMediaBlock(type, src, caption = "", options = {}) {
    const normalizedType = isYouTubeUrl(src) ? "youtube" : type;
    const normalizedOptions = {
      size: options.size || "full",
      align: options.align || "center",
      wrap: options.wrap || false,
      shadow: !!options.shadow
    };
    const optionParts = [
      caption,
      "size=" + normalizedOptions.size,
      "align=" + normalizedOptions.align,
      "wrap=" + normalizedOptions.wrap,
      "shadow=" + normalizedOptions.shadow
    ].filter(Boolean);
    if (options.sideText) optionParts.push("sideText=" + encodeURIComponent(options.sideText));
    if (normalizedType === "gallery") optionParts.push("columns=" + Math.min(5, Math.max(2, parseInt(options.columns, 10) || 2)));
    const mediaSrc = Array.isArray(src) ? src.map((value) => encodeURIComponent(value)).join(",") : src;
    const mediaBlock = `

{{${normalizedType}:${mediaSrc}${optionParts.length ? "|" + optionParts.join("|") : ""}}}

`;
    const textarea = bodyRef.current;
    const start = textarea ? textarea.selectionStart : form.body.length;
    const end = textarea ? textarea.selectionEnd : form.body.length;
    const nextBody = form.body.slice(0, start) + mediaBlock + form.body.slice(end);
    setForm((s) => ({ ...s, body: nextBody }));
    setShowPreview(true);
    requestAnimationFrame(() => {
      if (!textarea) return;
      const cursor = start + mediaBlock.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }
  function addComposerMedia() {
    const cleanUrl = mediaComposer.url.trim();
    const hasGallery = mediaComposer.uploadedSources.length > 1;
    const source = hasGallery ? mediaComposer.uploadedSources.slice(0, 5) : mediaComposer.uploadedSrc || cleanUrl;
    if (!source) {
      alert("Upload an image/GIF or paste a media URL first.");
      return;
    }
    const lowerUrl = Array.isArray(source) ? "" : source.toLowerCase();
    const type = hasGallery ? "gallery" : isYouTubeUrl(source) ? "youtube" : /\.(mp4|webm|ogg)(\?|#|$)/i.test(lowerUrl) ? "video" : "image";
    const options = type === "image" ? { size: mediaComposer.size, align: mediaComposer.align, wrap: mediaComposer.wrap, sideText: mediaComposer.sideText, shadow: mediaComposer.shadow } : type === "gallery" ? { columns: mediaComposer.columns, caption: mediaComposer.caption, shadow: mediaComposer.shadow } : { size: "full", align: "center", wrap: false };
    insertMediaBlock(type, source, mediaComposer.caption.trim(), options);
    setMediaComposer((s) => ({ ...s, url: "", uploadedSrc: "", uploadedName: "", uploadedSources: [], uploadedNames: [], caption: "", sideText: "", shadow: false }));
  }
  function updateBodySelection(transform) {
    const textarea = bodyRef.current;
    const start = textarea ? textarea.selectionStart : form.body.length;
    const end = textarea ? textarea.selectionEnd : form.body.length;
    const selected = form.body.slice(start, end);
    const next = transform(selected);
    const nextBody = form.body.slice(0, start) + next.text + form.body.slice(end);
    setForm((s) => ({ ...s, body: nextBody }));
    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start + next.selectionStart, start + next.selectionEnd);
    });
  }
  function wrapBodySelection(before, after, placeholder) {
    updateBodySelection((selected) => {
      const value = selected || placeholder;
      return {
        text: before + value + after,
        selectionStart: before.length,
        selectionEnd: before.length + value.length
      };
    });
  }
  function addLinkToBody() {
    const url = prompt("Paste the link URL");
    if (!url) return;
    updateBodySelection((selected) => {
      const value = selected || "link text";
      return {
        text: `[${value}](${url})`,
        selectionStart: 1,
        selectionEnd: 1 + value.length
      };
    });
  }
  function updateMediaBlock(blockIndex, patch) {
    const blocks = (form.body || "").split(/\n\s*\n/);
    const block = (blocks[blockIndex] || "").trim();
    const media = block.match(/^\{\{(image|video|youtube|gallery):([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;
    const [, type, src, rawOptions] = media;
    const currentOptions = parseMediaOptions((rawOptions || "").split("|").slice(1));
    const nextSrc = patch.gallerySources ? patch.gallerySources.slice(0, 5) : src;
    const nextOptions = {
      ...currentOptions,
      ...patch
    };
    delete nextOptions.gallerySources;
    if (nextOptions.align === "center") nextOptions.wrap = false;
    blocks[blockIndex] = buildMediaToken(type, nextSrc, nextOptions);
    setForm((s) => ({ ...s, body: blocks.join("\n\n") }));
  }
  function deleteGalleryImage(blockIndex, imageIndex) {
    const blocks = (form.body || "").split(/\n\s*\n/);
    const block = (blocks[blockIndex] || "").trim();
    const media = block.match(/^\{\{gallery:([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;
    const [, src, rawOptions] = media;
    const sources = parseGallerySources(src).filter((_, i) => i !== imageIndex);
    const options = parseMediaOptions((rawOptions || "").split("|").slice(1));
    if (!sources.length) {
      blocks.splice(blockIndex, 1);
    } else if (sources.length === 1) {
      blocks[blockIndex] = buildMediaToken("image", sources[0], { caption: options.caption, size: "full", align: "center", wrap: false });
    } else {
      blocks[blockIndex] = buildMediaToken("gallery", sources, { ...options, columns: Math.min(options.columns, sources.length) });
    }
    setForm((s) => ({ ...s, body: blocks.join("\n\n") }));
  }
  function moveGalleryImage(blockIndex, fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const blocks = (form.body || "").split(/\n\s*\n/);
    const block = (blocks[blockIndex] || "").trim();
    const media = block.match(/^\{\{gallery:([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;
    const [, src, rawOptions] = media;
    const sources = parseGallerySources(src);
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= sources.length || toIndex >= sources.length) return;
    const [movedSource] = sources.splice(fromIndex, 1);
    sources.splice(toIndex, 0, movedSource);
    const options = parseMediaOptions((rawOptions || "").split("|").slice(1));
    blocks[blockIndex] = buildMediaToken("gallery", sources, options);
    setForm((s) => ({ ...s, body: blocks.join("\n\n") }));
  }
  async function addImagesToGallery(blockIndex, e) {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = "";
    if (!selectedFiles.length) return;
    const blocks = (form.body || "").split(/\n\s*\n/);
    const block = (blocks[blockIndex] || "").trim();
    const media = block.match(/^\{\{gallery:([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;
    const [, src, rawOptions] = media;
    const sources = parseGallerySources(src);
    const remainingSlots = 5 - sources.length;
    if (remainingSlots <= 0) {
      alert("This row already has 5 images.");
      return;
    }
    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      alert("This row can only have 5 images. I added the first " + remainingSlots + ".");
    }
    if (filesToAdd.some((file) => file.type.startsWith("video/"))) {
      alert("Video files are too large for browser storage. Please add videos by URL instead.");
      return;
    }
    try {
      const addedSources = [];
      for (const f of filesToAdd) {
        const mediaFile = f.type === "image/gif" ? f : await resizeImageFile(f, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
        const mediaId = await window.cheerMedia.saveFile(mediaFile);
        addedSources.push("media:" + mediaId);
      }
      const options = parseMediaOptions((rawOptions || "").split("|").slice(1));
      const nextSources = sources.concat(addedSources).slice(0, 5);
      blocks[blockIndex] = buildMediaToken("gallery", nextSources, { ...options, columns: Math.min(5, Math.max(options.columns, nextSources.length)) });
      setForm((s) => ({ ...s, body: blocks.join("\n\n") }));
    } catch (error) {
      alert("Could not save these images. Please try smaller images.");
    }
  }
  function deleteMediaBlock(blockIndex) {
    if (!confirm("Delete this image from the post?")) return;
    const blocks = (form.body || "").split(/\n\s*\n/);
    blocks.splice(blockIndex, 1);
    setForm((s) => ({ ...s, body: blocks.join("\n\n") }));
  }
  function exportProjectData() {
    const payload = window.cheerStore.exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cheervinsky-data.json";
    link.click();
    URL.revokeObjectURL(url);
    showAdminToast("Data exported.");
  }
  function importProjectData(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        const ok = window.cheerStore.importData(payload);
        if (!ok) throw new Error("Import failed");
        showAdminToast("Data imported successfully.");
      } catch (error) {
        alert("Could not import this file. Please choose a valid cheervinsky-data.json backup.");
      }
    };
    reader.readAsText(file);
  }
  return /* @__PURE__ */ React.createElement("div", { className: "page admin-page" }, toast ? /* @__PURE__ */ React.createElement("div", { className: "admin-toast", role: "status", "aria-live": "polite" }, toast) : null, /* @__PURE__ */ React.createElement("h1", null, "Manage posts"), /* @__PURE__ */ React.createElement("p", { className: "lede" }, "Add new blog entries, edit existing ones, and choose which post appears on the homepage.", " ", localServerOn ? "Local dev server detected \u2014 Save writes data/posts.json (and any uploaded images) directly to disk. Then `git push` to publish." : syncOn ? "Changes are saved to your GitHub repo so they show up in any browser, including incognito." : "Saving to GitHub is OFF \u2014 open this page from the dev server (localhost) or with an admin token in the URL. Changes will only stay in this browser otherwise."), /* @__PURE__ */ React.createElement("div", { className: "admin-sync-bar", style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, padding: "4px 10px", borderRadius: 999, background: syncOn ? "rgba(40,140,80,0.15)" : "rgba(180,40,40,0.12)", color: syncOn ? "rgb(20,90,50)" : "rgb(140,20,20)", fontWeight: 600 } }, localServerOn ? "Sync: writes to disk" : syncOn ? "GitHub sync: ON" : "Sync: OFF (read-only)"), syncOn ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost", onClick: copyAdminLink }, "Copy secret admin link") : null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost", onClick: manualResync }, "Reload from GitHub"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn dark", onClick: downloadPostsJson, title: "Download posts.json \u2014 then move it into data/ and git push to publish." }, "Publish to production\u2026")), /* @__PURE__ */ React.createElement("div", { className: "admin-grid" }, /* @__PURE__ */ React.createElement("form", { className: "admin-form", onSubmit: submit }, /* @__PURE__ */ React.createElement("h2", null, editingId ? "Edit post" : "New post"), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "TITLE"), /* @__PURE__ */ React.createElement("input", { value: form.title, onChange: (e) => setForm((s) => ({ ...s, title: e.target.value })), placeholder: "A short, gentle title", required: true })), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "EXCERPT (1\u20132 sentences)"), /* @__PURE__ */ React.createElement("textarea", { value: form.excerpt, onChange: (e) => setForm((s) => ({ ...s, excerpt: e.target.value })), placeholder: "A short summary that appears on the home page and the blog list.", style: { minHeight: 70 }, required: true })), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "LIST + DETAIL PAGE IMAGE"), /* @__PURE__ */ React.createElement("input", { ref: fileRef, type: "file", accept: "image/*", onChange: onFile, style: { padding: 8 } }), /* @__PURE__ */ React.createElement("p", { className: "field-hint" }, "This image appears on the Blog/Product list card and at the top of the full Blog/Product detail page. It is separate from the Home page image."), form.cover && /* @__PURE__ */ React.createElement("div", { className: "preview-thumb" }, /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(form.cover), alt: "", style: getCoverImageStyle(form.coverPosition, form.coverZoom) })), form.cover && /* @__PURE__ */ React.createElement("div", { className: "cover-position-control" }, /* @__PURE__ */ React.createElement("span", null, "Adjust visible cover area"), /* @__PURE__ */ React.createElement("label", null, "Make image bigger / smaller", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "60",
      max: "180",
      value: coverZoom,
      onChange: (e) => setForm((s) => ({ ...s, coverZoom: e.target.value }))
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Move left / right", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "100",
      value: coverCrop.x,
      onChange: (e) => setForm((s) => ({ ...s, coverPosition: setCoverCropAxis(s.coverPosition, "x", e.target.value) }))
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Move up / down", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "100",
      value: coverCrop.y,
      onChange: (e) => setForm((s) => ({ ...s, coverPosition: setCoverCropAxis(s.coverPosition, "y", e.target.value) }))
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "AUTHOR"), /* @__PURE__ */ React.createElement("input", { value: form.author, onChange: (e) => setForm((s) => ({ ...s, author: e.target.value })) })), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "MAIN / HOME PAGE PREVIEW IMAGE"), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", onChange: onHomeImageFile, style: { padding: 8 } }), /* @__PURE__ */ React.createElement("p", { className: "field-hint" }, "Optional. This image appears only on the Home page carousel or pinned blog block. It does not replace the Blog/Product list image or detail page image."), form.homeImage ? /* @__PURE__ */ React.createElement("div", { className: "home-image-admin-row" }, form.homeImage.startsWith("media:") ? /* @__PURE__ */ React.createElement(MediaAsset, { id: form.homeImage.slice(6), alt: "" }) : /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(form.homeImage), alt: "" }), /* @__PURE__ */ React.createElement("span", null, "Homepage preview image selected."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: removeHomeImage }, "Remove")) : null, form.homeImage ? /* @__PURE__ */ React.createElement("div", { className: "home-image-placement" }, /* @__PURE__ */ React.createElement("div", { className: "home-image-combined-preview" }, /* @__PURE__ */ React.createElement("div", { className: "home-image-phone-preview" }, /* @__PURE__ */ React.createElement(
    PhoneMockup,
    {
      src: form.homeImage,
      alt: "",
      className: "home-image-preview-phone",
      innerStyle: getHomeImageStyle(form.homeImagePosition, form.homeImageZoom)
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "home-image-text-preview" }, /* @__PURE__ */ React.createElement("p", null, form.status === "product" ? "PRODUCT" : "FROM THE BLOG"), /* @__PURE__ */ React.createElement("h4", null, form.status === "product" && form.productIcon ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: resolveImageRef(form.productIcon),
      alt: "",
      style: {
        width: Math.max(12, Math.min(90, parseInt(form.productIconSize, 10) || 22)),
        height: Math.max(12, Math.min(90, parseInt(form.productIconSize, 10) || 22)),
        transform: `translate(${productIconShiftX}px, ${productIconShiftY}px)`
      }
    }
  ) : null, /* @__PURE__ */ React.createElement("span", null, form.title || "Post title preview")), /* @__PURE__ */ React.createElement("span", null, form.excerpt || "Short description preview will appear here so you can check how image and text look together."))), /* @__PURE__ */ React.createElement("div", { className: "home-image-controls" }, /* @__PURE__ */ React.createElement("span", null, "Adjust Home page image inside the phone preview"), /* @__PURE__ */ React.createElement("label", null, "Make image bigger / smaller", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "30",
      max: "700",
      value: homeImageZoom,
      onChange: (e) => setForm((s) => ({ ...s, homeImageZoom: e.target.value }))
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Move left / right", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "-80",
      max: "180",
      value: homeImageCrop.x,
      onChange: (e) => setForm((s) => ({ ...s, homeImagePosition: setHomeImageCropAxis(s.homeImagePosition, "x", e.target.value) }))
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Move up / down", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "-80",
      max: "180",
      value: homeImageCrop.y,
      onChange: (e) => setForm((s) => ({ ...s, homeImagePosition: setHomeImageCropAxis(s.homeImagePosition, "y", e.target.value) }))
    }
  )))) : null), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "DATE"), /* @__PURE__ */ React.createElement("input", { type: "date", value: form.date, onChange: (e) => setForm((s) => ({ ...s, date: e.target.value })) })), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "STATUS"), /* @__PURE__ */ React.createElement("select", { value: form.status, onChange: (e) => setForm((s) => ({ ...s, status: e.target.value, pinned: e.target.value === "product" ? false : s.pinned })) }, /* @__PURE__ */ React.createElement("option", { value: "blog" }, "BLOG"), /* @__PURE__ */ React.createElement("option", { value: "product" }, "PRODUCT"))), form.status === "product" && /* @__PURE__ */ React.createElement("div", { className: "product-admin-fields" }, /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "APP STORE LINK"), /* @__PURE__ */ React.createElement("input", { value: form.appStore, onChange: (e) => setForm((s) => ({ ...s, appStore: e.target.value })), placeholder: "https://apps.apple.com/..." })), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "GOOGLE PLAY LINK"), /* @__PURE__ */ React.createElement("input", { value: form.googlePlay, onChange: (e) => setForm((s) => ({ ...s, googlePlay: e.target.value })), placeholder: "https://play.google.com/store/apps/details?id=..." })), /* @__PURE__ */ React.createElement("div", { className: "checkbox-row" }, /* @__PURE__ */ React.createElement("input", { id: "includeInCarousel", type: "checkbox", checked: form.includeInCarousel, onChange: (e) => setForm((s) => ({ ...s, includeInCarousel: e.target.checked })) }), /* @__PURE__ */ React.createElement("label", { htmlFor: "includeInCarousel" }, "Show this product in the homepage carousel")), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "TINY PRODUCT TITLE ICON"), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", onChange: onProductIconFile, style: { padding: 8 } }), /* @__PURE__ */ React.createElement("div", { className: "product-icon-admin-row" }, form.productIcon ? /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(form.productIcon), alt: "" }) : null, /* @__PURE__ */ React.createElement("span", null, "This appears before the product title on the home carousel. Use a small transparent PNG/SVG-style image under 160KB."), form.productIcon ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setForm((s) => ({ ...s, productIcon: "" })) }, "Remove") : null), /* @__PURE__ */ React.createElement("div", { className: "product-icon-size-control" }, /* @__PURE__ */ React.createElement("label", null, "Icon size (", productIconSize, "px)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "12",
      max: "140",
      value: productIconSize,
      onChange: (e) => setForm((s) => ({ ...s, productIconSize: e.target.value }))
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "product-icon-size-control" }, /* @__PURE__ */ React.createElement("label", null, "Distance from title (", productIconGap, "px)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "-80",
      max: "80",
      value: productIconGap,
      onChange: (e) => setForm((s) => ({ ...s, productIconGap: e.target.value }))
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "product-icon-size-control" }, /* @__PURE__ */ React.createElement("label", null, "Horizontal move (", productIconShiftX, "px)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "-120",
      max: "120",
      value: productIconShiftX,
      onChange: (e) => setForm((s) => ({ ...s, productIconShiftX: e.target.value }))
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "product-icon-size-control" }, /* @__PURE__ */ React.createElement("label", null, "Vertical move (", productIconShiftY, "px)", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "-90",
      max: "90",
      value: productIconShiftY,
      onChange: (e) => setForm((s) => ({ ...s, productIconShiftY: e.target.value }))
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "product-icon-title-preview", "aria-live": "polite" }, form.productIcon ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: resolveImageRef(form.productIcon),
      alt: "",
      style: {
        width: productIconSize,
        height: productIconSize,
        marginRight: productIconGap,
        transform: `translate(${productIconShiftX}px, ${productIconShiftY}px)`
      }
    }
  ) : null, /* @__PURE__ */ React.createElement("span", null, form.title || "Product title preview")))), /* @__PURE__ */ React.createElement("div", { className: "field" }, /* @__PURE__ */ React.createElement("label", null, "BODY (use blank lines between paragraphs, # / ## / ### for headings)"), /* @__PURE__ */ React.createElement("div", { className: "body-format-toolbar", "aria-label": "Post formatting toolbar" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => wrapBodySelection("# ", "", "Main heading") }, "H1"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => wrapBodySelection("## ", "", "Section heading") }, "H2"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => wrapBodySelection("### ", "", "Small heading") }, "H3"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => wrapBodySelection("**", "**", "bold text") }, "Bold"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => wrapBodySelection("*", "*", "italic text") }, "Italic"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => wrapBodySelection("__", "__", "underlined text") }, "Underline"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: addLinkToBody }, "Link")), /* @__PURE__ */ React.createElement("textarea", { className: "post-body-editor", ref: bodyRef, value: form.body, onChange: (e) => setForm((s) => ({ ...s, body: e.target.value })), placeholder: "# Main heading\n\n## Section heading\n\n### Small heading\n\nA paragraph of plain, warm prose.\n\n{{image:https://example.com/photo.gif|Optional caption|size=medium|align=left|wrap=true}}\n\nMore text after the media." }), /* @__PURE__ */ React.createElement("div", { className: "media-composer" }, /* @__PURE__ */ React.createElement("div", { className: "media-composer-head" }, /* @__PURE__ */ React.createElement("strong", null, "Add media block"), /* @__PURE__ */ React.createElement("span", null, "Inserted wherever your cursor is in the body.")), /* @__PURE__ */ React.createElement("div", { className: "media-composer-grid" }, /* @__PURE__ */ React.createElement("label", null, "Media URL", /* @__PURE__ */ React.createElement("input", { value: mediaComposer.url, onChange: (e) => setMediaComposer((s) => ({ ...s, url: e.target.value })), placeholder: "YouTube, image/GIF, or direct video URL" })), /* @__PURE__ */ React.createElement("label", null, "Caption", /* @__PURE__ */ React.createElement("input", { value: mediaComposer.caption, onChange: (e) => setMediaComposer((s) => ({ ...s, caption: e.target.value })), placeholder: "Optional caption" })), /* @__PURE__ */ React.createElement("label", { className: "media-composer-wide" }, "Text beside image", /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: mediaComposer.sideText,
      disabled: !mediaComposer.wrap || mediaComposer.uploadedSources.length > 1,
      onChange: (e) => setMediaComposer((s) => ({ ...s, sideText: e.target.value })),
      placeholder: mediaComposer.uploadedSources.length > 1 ? "Text beside image is only for single left/right images." : mediaComposer.wrap ? "This paragraph will appear beside the left/right image." : "Choose left or right and enable text beside image first."
    }
  )), /* @__PURE__ */ React.createElement("label", null, "Image size", /* @__PURE__ */ React.createElement("select", { value: mediaComposer.size, disabled: mediaComposer.uploadedSources.length > 1, onChange: (e) => setMediaComposer((s) => ({ ...s, size: e.target.value })) }, /* @__PURE__ */ React.createElement("option", { value: "small" }, "Small"), /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium"), /* @__PURE__ */ React.createElement("option", { value: "large" }, "Large"), /* @__PURE__ */ React.createElement("option", { value: "full" }, "Full width"))), /* @__PURE__ */ React.createElement("label", null, "Position", /* @__PURE__ */ React.createElement("select", { value: mediaComposer.align, disabled: mediaComposer.uploadedSources.length > 1, onChange: (e) => setMediaComposer((s) => ({ ...s, align: e.target.value, wrap: e.target.value === "center" ? false : true })) }, /* @__PURE__ */ React.createElement("option", { value: "left" }, "Left"), /* @__PURE__ */ React.createElement("option", { value: "center" }, "Center"), /* @__PURE__ */ React.createElement("option", { value: "right" }, "Right"))), /* @__PURE__ */ React.createElement("label", null, "Images in row", /* @__PURE__ */ React.createElement("select", { value: mediaComposer.columns, disabled: mediaComposer.uploadedSources.length < 2, onChange: (e) => setMediaComposer((s) => ({ ...s, columns: e.target.value })) }, /* @__PURE__ */ React.createElement("option", { value: "2" }, "2 images"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "3 images"), /* @__PURE__ */ React.createElement("option", { value: "4" }, "4 images"), /* @__PURE__ */ React.createElement("option", { value: "5" }, "5 images"))), /* @__PURE__ */ React.createElement("label", { className: "media-composer-checkbox" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: mediaComposer.wrap,
      disabled: mediaComposer.align === "center" || mediaComposer.uploadedSources.length > 1,
      onChange: (e) => setMediaComposer((s) => ({ ...s, wrap: e.target.checked }))
    }
  ), "Place text beside the image"), /* @__PURE__ */ React.createElement("label", { className: "media-composer-checkbox" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: mediaComposer.shadow,
      onChange: (e) => setMediaComposer((s) => ({ ...s, shadow: e.target.checked }))
    }
  ), "Add drop shadow")), /* @__PURE__ */ React.createElement("div", { className: "media-insert-row" }, /* @__PURE__ */ React.createElement("label", { className: "btn ghost" }, "Upload image / GIF", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", multiple: true, onChange: stageBodyMedia })), mediaComposer.uploadedName ? /* @__PURE__ */ React.createElement("span", { className: "media-selected" }, "Selected: ", mediaComposer.uploadedName) : null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn dark", onClick: addComposerMedia }, mediaComposer.uploadedSources.length > 1 ? "Add image row" : "Add image"), /* @__PURE__ */ React.createElement("span", null, "Upload 1 image/GIF, or select 2\u20135 images together to place them on one line. Videos should be added by URL.")))), /* @__PURE__ */ React.createElement("div", { className: "checkbox-row" }, /* @__PURE__ */ React.createElement("input", { id: "pin", type: "checkbox", checked: form.pinned, disabled: form.status === "product", onChange: (e) => setForm((s) => ({ ...s, pinned: e.target.checked })) }), /* @__PURE__ */ React.createElement("label", { htmlFor: "pin" }, "\u{1F4CC} Pin to homepage (replaces the current pinned post)")), /* @__PURE__ */ React.createElement("div", { className: "checkbox-row" }, /* @__PURE__ */ React.createElement("input", { id: "published", type: "checkbox", checked: form.published, onChange: (e) => setForm((s) => ({ ...s, published: e.target.checked, pinned: e.target.checked ? s.pinned : false })) }), /* @__PURE__ */ React.createElement("label", { htmlFor: "published" }, "Publish this post publicly")), /* @__PURE__ */ React.createElement("div", { className: "row admin-save-row" }, /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn dark" }, editingId ? "Save changes" : "Publish post"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost", onClick: () => savePost(false) }, "Save as draft"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost", onClick: () => setShowPreview((v) => !v) }, showPreview ? "Hide preview" : "Preview"), editingId && /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost", onClick: reset }, "Cancel"))), showPreview && /* @__PURE__ */ React.createElement("section", { className: "admin-preview" }, /* @__PURE__ */ React.createElement("div", { className: "admin-preview-bar" }, /* @__PURE__ */ React.createElement("span", null, "Preview only \u2014 not published"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowPreview(false) }, "Close")), /* @__PURE__ */ React.createElement("article", { className: "post-page admin-preview-post" }, form.cover ? /* @__PURE__ */ React.createElement("div", { className: "post-cover" }, /* @__PURE__ */ React.createElement("img", { src: resolveImageRef(form.cover), alt: "", style: getCoverImageStyle(form.coverPosition, form.coverZoom, { width: "100%", height: "100%", borderRadius: "inherit" }) })) : null, /* @__PURE__ */ React.createElement("h1", null, form.title || "Untitled draft"), /* @__PURE__ */ React.createElement("div", { className: "meta" }, form.status === "product" ? "PRODUCT \xB7 " : "", formatDate(form.date), " \xB7 ", form.author || "The Cheervinsky Studio", form.pinned && form.published && form.status !== "product" ? " \xB7 PINNED" : "", form.includeInCarousel && form.status === "product" ? " \xB7 CAROUSEL" : ""), /* @__PURE__ */ React.createElement("div", { className: "post-body" }, form.body ? renderPostBody(form.body, { onMediaChange: updateMediaBlock, onMediaDelete: deleteMediaBlock, onGalleryImageDelete: deleteGalleryImage, onGalleryImageMove: moveGalleryImage, onGalleryAdd: addImagesToGallery }) : /* @__PURE__ */ React.createElement("p", { style: { color: "var(--ink-3)" } }, "Start writing to preview the post body.")), form.status === "product" && (form.appStore || form.googlePlay) ? /* @__PURE__ */ React.createElement("div", { className: "stores product-detail-stores" }, form.appStore ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "apple", href: form.appStore }) : null, form.googlePlay ? /* @__PURE__ */ React.createElement(StoreButton, { kind: "google", href: form.googlePlay }) : null) : null)), /* @__PURE__ */ React.createElement("div", { className: "admin-list" }, /* @__PURE__ */ React.createElement("div", { className: "admin-list-header" }, /* @__PURE__ */ React.createElement("h2", null, "All posts (", filteredPosts.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "admin-list-tools" }, /* @__PURE__ */ React.createElement("label", { className: "admin-search" }, /* @__PURE__ */ React.createElement("span", null, "Search title"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "search",
      value: postSearch,
      onChange: (e) => setPostSearch(e.target.value),
      placeholder: "Type a post title..."
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "admin-filter", "aria-label": "Filter posts" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: postFilter === "all" ? "active" : "", onClick: () => setPostFilter("all") }, "All"), /* @__PURE__ */ React.createElement("button", { type: "button", className: postFilter === "blog" ? "active" : "", onClick: () => setPostFilter("blog") }, "Blog"), /* @__PURE__ */ React.createElement("button", { type: "button", className: postFilter === "product" ? "active" : "", onClick: () => setPostFilter("product") }, "Products")))), /* @__PURE__ */ React.createElement("div", { className: "admin-data-tools" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn ghost", onClick: exportProjectData }, "Export data"), /* @__PURE__ */ React.createElement("label", { className: "btn ghost" }, "Import data", /* @__PURE__ */ React.createElement("input", { type: "file", accept: "application/json", onChange: importProjectData })), /* @__PURE__ */ React.createElement("span", null, "Use Export/Import to move your posts into incognito or another browser.")), filteredPosts.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { color: "var(--ink-3)" } }, postSearch.trim() ? "No posts match that title." : "Nothing here yet."), filteredPosts.map((p) => {
    const rowTitle = (p.title || "").trim() || "Untitled post";
    const rowExcerpt = (p.excerpt || "").trim() || "No excerpt yet.";
    return /* @__PURE__ */ React.createElement("div", { key: p.id, className: "admin-post-row " + (p.pinned ? "pinned " : "") + (p.published === false ? "unpublished" : "") }, /* @__PURE__ */ React.createElement("div", { className: "thumb", style: p.cover ? { backgroundImage: `url(${resolveImageRef(p.cover)})`, backgroundPosition: getCoverPosition(p.coverPosition) } : {} }, !p.cover ? /* @__PURE__ */ React.createElement("span", null, rowTitle[0]) : null), /* @__PURE__ */ React.createElement("div", { className: "info" }, /* @__PURE__ */ React.createElement("div", { className: "admin-post-meta" }, /* @__PURE__ */ React.createElement("span", { className: p.published === false ? "status unpublished" : "status published" }, p.published === false ? "UNPUBLISHED" : "PUBLISHED"), /* @__PURE__ */ React.createElement("span", { className: p.status === "product" ? "status product" : "status blog" }, p.status === "product" ? "PRODUCT" : "BLOG"), p.status === "product" && p.includeInCarousel && /* @__PURE__ */ React.createElement("span", { className: "status carousel-status" }, "CAROUSEL"), p.pinned && /* @__PURE__ */ React.createElement("span", { className: "status pinned" }, "PINNED")), /* @__PURE__ */ React.createElement("h4", null, rowTitle), /* @__PURE__ */ React.createElement("p", { className: "excerpt" }, rowExcerpt)), /* @__PURE__ */ React.createElement("div", { className: "actions" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "icon-btn pin " + (p.pinned ? "active" : ""),
        onClick: () => window.cheerStore.setPinned(p.pinned ? "" : p.id),
        "aria-label": "Pin to homepage",
        title: p.pinned ? "Unpin" : "Pin to homepage",
        disabled: p.published === false || p.status === "product"
      },
      /* @__PURE__ */ React.createElement(IconPin, null)
    ), /* @__PURE__ */ React.createElement("button", { className: "admin-action-btn", onClick: () => startEdit(p) }, "Edit"), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "admin-action-btn",
        onClick: () => {
          const willPublish = p.published === false;
          window.cheerStore.updatePost(p.id, { published: willPublish, pinned: willPublish ? p.pinned : false });
        }
      },
      p.published === false ? "Publish" : "Unpublish"
    ), /* @__PURE__ */ React.createElement("button", { className: "icon-btn danger", onClick: () => {
      if (confirm("Delete this post?")) window.cheerStore.deletePost(p.id);
    }, "aria-label": "Delete", title: "Delete" }, /* @__PURE__ */ React.createElement(IconTrash, null))));
  }), /* @__PURE__ */ React.createElement("button", { className: "btn ghost", style: { marginTop: 16 }, onClick: () => {
    if (confirm("Reset all posts and products to defaults?")) window.cheerStore.reset();
  } }, "Reset to defaults"))));
}
Object.assign(window, { BlogPage, PostPage, ProductDetailPage, ProductsPage, ContactsPage, AdminPage, formatDate });
function ScrollProgress() {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const fn = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight || 1;
      setW(Math.min(1, window.scrollY / max));
    };
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return /* @__PURE__ */ React.createElement("div", { className: "scroll-progress", style: { transform: `scaleX(${w})` } });
}
function ParallaxOrbs() {
  const refs = [React.useRef(), React.useRef(), React.useRef()];
  React.useEffect(() => {
    let mx = 0, my = 0, sy = 0;
    const onMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    const onScroll = () => {
      sy = window.scrollY;
    };
    let raf;
    const tick = () => {
      if (refs[0].current) refs[0].current.style.transform = `translate(${mx * 30}px, ${my * 30 + sy * -0.08}px)`;
      if (refs[1].current) refs[1].current.style.transform = `translate(${mx * -25}px, ${my * -20 + sy * -0.04}px)`;
      if (refs[2].current) refs[2].current.style.transform = `translate(${mx * 18}px, ${my * 18 + sy * -0.12}px)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { ref: refs[0], className: "orb o1" }), /* @__PURE__ */ React.createElement("div", { ref: refs[1], className: "orb o2" }), /* @__PURE__ */ React.createElement("div", { ref: refs[2], className: "orb o3" }));
}
function App() {
  const { route, param, hidden } = useRoute();
  const isLocalDev = window.location.protocol === "http:" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const isAdminSession = isLocalDev || sessionStorage.getItem("cheer_admin_session") === "1";
  React.useEffect(() => {
    localStorage.removeItem("cheer_admin_session");
  }, []);
  React.useEffect(() => {
    if (route === "admin" && param) {
      const token = param;
      sessionStorage.setItem("cheer_admin_session", "1");
      sessionStorage.setItem("cheer_admin_token", token);
      if (window.cheerSync) {
        window.cheerSync.setToken(token);
        window.dispatchEvent(new CustomEvent("cheer-admin-token-changed"));
      }
      if (window.location.hash !== "#admin") window.location.hash = "#admin";
      return;
    }
    if (hidden && hidden.startsWith("admin/")) {
      const token = hidden.slice("admin/".length);
      if (token) {
        sessionStorage.setItem("cheer_admin_session", "1");
        sessionStorage.setItem("cheer_admin_token", token);
        if (window.cheerSync) {
          window.cheerSync.setToken(token);
          window.dispatchEvent(new CustomEvent("cheer-admin-token-changed"));
        }
        if (window.location.hash !== "#admin") window.location.hash = "#admin";
        return;
      }
    }
    if (isAdminSession && window.cheerSync && !window.cheerSync.hasToken()) {
      const stashed = sessionStorage.getItem("cheer_admin_token") || "";
      if (stashed) {
        window.cheerSync.setToken(stashed);
        window.dispatchEvent(new CustomEvent("cheer-admin-token-changed"));
      }
    }
    if (route !== "admin") return;
    if (isAdminSession) return;
    window.location.hash = "#blog";
  }, [route, param, hidden, isAdminSession]);
  let body = null;
  if (route === "home" || route === "") body = /* @__PURE__ */ React.createElement(HomePage, null);
  else if (route === "blog") body = /* @__PURE__ */ React.createElement(BlogPage, null);
  else if (route === "post") body = /* @__PURE__ */ React.createElement(PostPage, { id: param });
  else if (route === "products") body = /* @__PURE__ */ React.createElement(ProductsPage, null);
  else if (route === "product") body = /* @__PURE__ */ React.createElement(ProductDetailPage, { id: param });
  else if (route === "contacts") body = /* @__PURE__ */ React.createElement(ContactsPage, null);
  else if (route === "admin") body = isAdminSession ? /* @__PURE__ */ React.createElement(AdminPage, null) : /* @__PURE__ */ React.createElement(BlogPage, null);
  else body = /* @__PURE__ */ React.createElement(HomePage, null);
  return /* @__PURE__ */ React.createElement("div", { className: "app route-" + (route || "home"), "data-screen-label": "01 " + (route || "home") }, /* @__PURE__ */ React.createElement(LiquidGlassDefs, null), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient" }), /* @__PURE__ */ React.createElement("div", { className: "bg-grain" }), /* @__PURE__ */ React.createElement(ParallaxOrbs, null), /* @__PURE__ */ React.createElement(ScrollProgress, null), /* @__PURE__ */ React.createElement(Header, { route }), body, /* @__PURE__ */ React.createElement(Footer, { route }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
