// GitHub-as-database sync layer.
//
// READS: anyone can fetch the posts.json file from raw.githubusercontent.com.
// WRITES: only the admin (whose unique URL contains a GitHub Personal Access
// Token) can commit changes back via the GitHub Contents API.
//
// Exposes window.cheerSync with:
//   - configure({ owner, repo, branch, dataPath, mediaDir })
//   - setToken(token) / getToken() / clearToken()
//   - hasToken() — true if a write token is currently held
//   - fetchPosts() -> Promise<state | null>  (null if file missing or fetch failed)
//   - savePosts(state) -> Promise<{ ok, message }>
//   - uploadMedia(filenameHint, blob) -> Promise<string>  (returns 'ghmedia/<filename>')
//   - rawUrl(ref) -> string | null  (resolves a 'ghmedia/...' ref to a fetchable URL)
(function () {
  const CONFIG = {
    // Must match the GitHub repo that holds data/posts.json (user/org site repo name).
    owner: 'cheervinsky',
    repo: 'cheervinsky.github.io',
    branch: 'main',
    dataPath: 'data/posts.json',
    mediaDir: 'data/media',
  };

  let token = '';
  let lastSha = null; // remembered after each successful read/write of posts.json

  function configure(next) {
    Object.assign(CONFIG, next || {});
  }

  function setToken(value) {
    token = (value || '').trim();
  }
  function getToken() { return token; }
  function clearToken() { token = ''; }
  function hasToken() { return !!token; }

  function rawUrl(ref) {
    if (!ref || typeof ref !== 'string') return null;
    if (!ref.startsWith('ghmedia/')) return null;
    const filename = ref.slice('ghmedia/'.length);
    return 'https://raw.githubusercontent.com/' + CONFIG.owner + '/' + CONFIG.repo
      + '/' + CONFIG.branch + '/' + CONFIG.mediaDir + '/' + filename;
  }

  // ---- Reading posts.json (no auth needed) ----
  // We use the Contents API when we have a token (so we can capture the SHA for
  // future writes), and the cdn raw URL otherwise (no rate limit).
  async function fetchPosts() {
    try {
      if (token) {
        const res = await fetch(apiUrl(CONFIG.dataPath) + '?ref=' + encodeURIComponent(CONFIG.branch), {
          headers: authHeaders(),
        });
        if (res.status === 404) {
          lastSha = null;
          return null;
        }
        if (!res.ok) return null;
        const json = await res.json();
        lastSha = json.sha || null;
        return parseJsonContent(json.content);
      }
      // No token: use raw with cache-buster so incognito reloads see the latest.
      const url = 'https://raw.githubusercontent.com/' + CONFIG.owner + '/' + CONFIG.repo
        + '/' + CONFIG.branch + '/' + CONFIG.dataPath + '?t=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // ---- Writing posts.json (admin only) ----
  async function savePosts(state) {
    if (!token) return { ok: false, message: 'No admin token. Open the secret URL to enable saving to GitHub.' };
    try {
      // Make sure we have the latest SHA so we don't get a 409 conflict.
      if (lastSha === null) {
        const probe = await fetch(apiUrl(CONFIG.dataPath) + '?ref=' + encodeURIComponent(CONFIG.branch), {
          headers: authHeaders(),
        });
        if (probe.status === 200) {
          const probeJson = await probe.json();
          lastSha = probeJson.sha || null;
        } else if (probe.status !== 404) {
          return { ok: false, message: 'GitHub responded ' + probe.status + ' when checking the data file. Is your token correct?' };
        }
      }
      const body = {
        message: 'Update posts.json from admin',
        content: encodeUtf8Base64(JSON.stringify(state, null, 2)),
        branch: CONFIG.branch,
      };
      if (lastSha) body.sha = lastSha;

      const res = await fetch(apiUrl(CONFIG.dataPath), {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, message: 'GitHub save failed (' + res.status + '). ' + text.slice(0, 200) };
      }
      const out = await res.json();
      lastSha = out.content && out.content.sha ? out.content.sha : null;
      return { ok: true, message: 'Saved to GitHub.' };
    } catch (e) {
      return { ok: false, message: 'Network error saving to GitHub: ' + (e && e.message ? e.message : e) };
    }
  }

  // ---- Uploading a media file as its own committed file in the repo ----
  // Returns 'ghmedia/<filename>' which is what posts.json should reference.
  async function uploadMedia(filenameHint, blob) {
    if (!token) throw new Error('No admin token');
    const ext = guessExt(blob && blob.type, filenameHint);
    const safeBase = (filenameHint || 'asset')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'asset';
    const stamp = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const filename = safeBase + '-' + stamp + ext;
    const path = CONFIG.mediaDir + '/' + filename;
    const base64 = await blobToBase64(blob);
    const res = await fetch(apiUrl(path), {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Add media: ' + filename,
        content: base64,
        branch: CONFIG.branch,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Media upload failed (' + res.status + '): ' + text.slice(0, 200));
    }
    return 'ghmedia/' + filename;
  }

  // ---- Helpers ----
  function apiUrl(path) {
    return 'https://api.github.com/repos/' + CONFIG.owner + '/' + CONFIG.repo + '/contents/'
      + path.split('/').map(encodeURIComponent).join('/');
  }
  function authHeaders() {
    return {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
  function parseJsonContent(b64) {
    try {
      const text = decodeUtf8Base64((b64 || '').replace(/\n/g, ''));
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
  function encodeUtf8Base64(text) {
    // Browser-safe: handle UTF-8 properly.
    return btoa(unescape(encodeURIComponent(text)));
  }
  function decodeUtf8Base64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  function guessExt(mime, hint) {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/gif') return '.gif';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/svg+xml') return '.svg';
    if (hint && /\.[a-z0-9]+$/i.test(hint)) return hint.slice(hint.lastIndexOf('.')).toLowerCase();
    return '.bin';
  }

  window.cheerSync = {
    configure, setToken, getToken, clearToken, hasToken,
    fetchPosts, savePosts, uploadMedia, rawUrl,
    config: CONFIG,
  };
})();
