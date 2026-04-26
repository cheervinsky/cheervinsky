// Blog list, single post, Products page, Contacts page, Admin page

function BlogPage() {
  const store = useStore();
  const posts = window.cheerStore.getPosts().filter(p => p.published !== false && p.status !== 'product');
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visiblePosts = posts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="page">
      <section className="blog-hero">
        <h1>Blog</h1>
        <p>Letters from the studio — releases, design notes, and the occasional thought about what we're trying to make.</p>
      </section>
      <div className="blog-toolbar">
        <span style={{ fontFamily: "'Vollkorn SC', serif", letterSpacing: '0.08em', fontSize: 13, color: 'var(--ink-2)' }}>
          {posts.length} {posts.length === 1 ? 'POST' : 'POSTS'}
        </span>
        {totalPages > 1 && (
          <span className="blog-page-count">Page {currentPage} of {totalPages}</span>
        )}
      </div>
      <div className="blog-grid">
        {visiblePosts.map(p => (
          <a key={p.id} className="post-card" href={'#post/' + p.id}>
            <div className="post-cover">
              {p.cover ? <img src={p.cover} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontFamily: "'Vollkorn SC', serif", fontSize: 48, color: 'rgba(0,0,0,0.2)' }}>{p.title[0]}</div>}
            </div>
            <div className="body">
              <div className="meta">
                {p.pinned && <span className="pinned">PINNED</span>}
                <span>{formatDate(p.date)}</span>
                <span>·</span>
                <span>{p.author}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="read-more">Read more →</span>
            </div>
          </a>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="blog-pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              type="button"
              className={currentPage === i + 1 ? 'active' : ''}
              onClick={() => setPage(i + 1)}
              aria-label={'Go to blog page ' + (i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        <a key={parts.length} href={match[3]} target={match[3].startsWith('http') ? '_blank' : undefined} rel={match[3].startsWith('http') ? 'noopener noreferrer' : undefined}>
          {match[2]}
        </a>
      );
    } else if (match[5]) {
      parts.push(<strong key={parts.length}>{match[5]}</strong>);
    } else if (match[7]) {
      parts.push(<u key={parts.length}>{match[7]}</u>);
    } else if (match[9]) {
      parts.push(<em key={parts.length}>{match[9]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    let id = '';

    if (parsed.hostname.includes('youtu.be')) {
      id = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) {
        id = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        id = parsed.pathname.split('/')[2] || '';
      } else {
        id = parsed.searchParams.get('v') || '';
      }
    }

    return id ? `https://www.youtube.com/embed/${id}` : '';
  } catch (e) {
    return '';
  }
}

function isYouTubeUrl(url) {
  return !!getYouTubeEmbedUrl(url);
}

function MediaAsset({ id, alt = '' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    window.cheerMedia.getUrl(id).then(url => {
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

  if (!src) return <div className="post-media-placeholder">Loading image...</div>;
  return <img src={src} alt={alt} />;
}

function parseMediaOptions(parts) {
  const options = { caption: '', sideText: '', size: 'full', align: 'center', wrap: false };

  parts.forEach(part => {
    const value = (part || '').trim();
    if (!value) return;

    const option = value.match(/^([a-z]+)=(.+)$/i);
    if (!option) {
      if (!options.caption) options.caption = value;
      return;
    }

    const key = option[1].toLowerCase();
    const rawOptionValue = option[2].trim();
    const optionValue = rawOptionValue.toLowerCase();
    if (key === 'size' && ['small', 'medium', 'large', 'full'].includes(optionValue)) options.size = optionValue;
    if (key === 'align' && ['left', 'center', 'right'].includes(optionValue)) options.align = optionValue;
    if (key === 'wrap') options.wrap = ['true', 'yes', '1'].includes(optionValue);
    if (key === 'sidetext') {
      try {
        options.sideText = decodeURIComponent(rawOptionValue);
      } catch (e) {
        options.sideText = rawOptionValue;
      }
    }
  });

  if (options.align === 'center') options.wrap = false;
  return options;
}

function buildMediaToken(type, src, options = {}) {
  const parts = [
    options.caption || '',
    'size=' + (options.size || 'full'),
    'align=' + (options.align || 'center'),
    'wrap=' + !!options.wrap,
    options.sideText ? 'sideText=' + encodeURIComponent(options.sideText) : '',
  ].filter(Boolean);

  return `{{${type}:${src}${parts.length ? '|' + parts.join('|') : ''}}}`;
}

function renderPostBody(body, editor = {}) {
  return (body || '').split(/\n\s*\n/).map((b, i) => {
    const trim = b.trim();
    const media = trim.match(/^\{\{(image|video|youtube):([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (media) {
      const [, type, src, rawOptions] = media;
      const options = parseMediaOptions((rawOptions || '').split('|').slice(1));
      const cleanSrc = src.trim();
      const mediaId = cleanSrc.startsWith('media:') ? cleanSrc.slice(6) : '';
      const youtubeSrc = (type === 'youtube' || type === 'video') ? getYouTubeEmbedUrl(cleanSrc) : '';
      const mediaClass = [
        'post-media',
        'post-media-' + options.size,
        'post-media-' + options.align,
        options.wrap ? 'post-media-wrap' : 'post-media-no-wrap',
      ].join(' ');
      const canEdit = editor.onMediaChange && editor.onMediaDelete && type === 'image';
      const mediaFigure = (
        <figure className={mediaClass}>
          {youtubeSrc ? (
            <div className="post-youtube">
              <iframe
                src={youtubeSrc}
                title={options.caption || 'YouTube video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : type === 'video' ? (
            <video src={cleanSrc} controls playsInline preload="metadata" />
          ) : mediaId ? (
            <MediaAsset id={mediaId} alt={options.caption || ''} />
          ) : (
            <img src={cleanSrc} alt={options.caption || ''} />
          )}
          {options.caption ? <figcaption>{options.caption}</figcaption> : null}
          {canEdit ? (
            <div className="media-preview-controls">
              <label>
                Size
                <select value={options.size} onChange={e => editor.onMediaChange(i, { size: e.target.value })}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="full">Full</option>
                </select>
              </label>
              <label>
                Position
                <select value={options.align} onChange={e => editor.onMediaChange(i, { align: e.target.value, wrap: e.target.value === 'center' ? false : options.wrap })}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label className="media-preview-checkbox">
                <input
                  type="checkbox"
                  checked={options.wrap}
                  disabled={options.align === 'center'}
                  onChange={e => editor.onMediaChange(i, { wrap: e.target.checked })}
                />
                Text beside
              </label>
              <label className="media-preview-caption">
                Caption
                <input value={options.caption} onChange={e => editor.onMediaChange(i, { caption: e.target.value })} />
              </label>
              <label className="media-preview-side-text">
                Text beside image
                <textarea
                  value={options.sideText}
                  disabled={!options.wrap}
                  onChange={e => editor.onMediaChange(i, { sideText: e.target.value })}
                  placeholder={options.wrap ? 'Write the text that should sit beside this image.' : 'Enable Text beside first.'}
                />
              </label>
              <button type="button" className="media-delete-btn" onClick={() => editor.onMediaDelete(i)}>Delete image</button>
            </div>
          ) : null}
        </figure>
      );

      return (
        <React.Fragment key={i}>
          {mediaFigure}
          {options.wrap && options.sideText ? <p className="post-media-side-copy">{renderInlineText(options.sideText)}</p> : null}
        </React.Fragment>
      );
    }

    if (trim.startsWith('## ')) return <h2 key={i}>{renderInlineText(trim.slice(3))}</h2>;
    if (trim.startsWith('# ')) return <h2 key={i}>{renderInlineText(trim.slice(2))}</h2>;
    return <p key={i}>{renderInlineText(trim)}</p>;
  });
}

function PostPage({ id }) {
  const store = useStore();
  const isAdminSession = sessionStorage.getItem('cheer_admin_session') === '1';
  const post = store.posts.find(p => p.id === id);
  if (!post || (post.published === false && !isAdminSession)) {
    return (
      <div className="page post-page">
        <a href="#blog" className="back-link">← Back to blog</a>
        <h1>Not found</h1>
        <p>We can't find that post. It may have been removed.</p>
      </div>
    );
  }
  const blocks = renderPostBody(post.body);
  const isProductPost = post.status === 'product';
  return (
    <div className="page post-page">
      <a href={isProductPost ? '#products' : '#blog'} className="back-link">← Back to {isProductPost ? 'products' : 'blog'}</a>
      {post.cover ? <div className="post-cover"><img src={post.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /></div> : null}
      <h1>{post.title}</h1>
      <div className="meta">{isProductPost ? 'PRODUCT · ' : ''}{formatDate(post.date)} · {post.author}{post.pinned ? ' · PINNED' : ''}</div>
      <div className="post-body">{blocks}</div>
      {isProductPost && (post.appStore || post.googlePlay) ? (
        <div className="stores product-detail-stores">
          {post.appStore ? <StoreButton kind="apple" href={post.appStore} /> : null}
          {post.googlePlay ? <StoreButton kind="google" href={post.googlePlay} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ProductDetailPage({ id }) {
  const store = useStore();
  const product = store.products.find(p => p.id === id);
  if (!product) {
    return (
      <div className="page post-page">
        <a href="#products" className="back-link">← Back to products</a>
        <h1>Not found</h1>
        <p>We can't find that product.</p>
      </div>
    );
  }

  return (
    <div className="page post-page product-detail-page">
      <a href="#products" className="back-link">← Back to products</a>
      <div className="product-detail-hero">
        <PhoneMockup src={product.hero} alt={product.name} className="product-detail-phone" />
      </div>
      <div className="meta">PRODUCT · {product.eyebrow}</div>
      <h1>{product.title || product.name}</h1>
      <div className="post-body">
        <p>{product.description}</p>
      </div>
      <div className="stores product-detail-stores">
        <StoreButton kind="apple" href={product.appStore} />
        <StoreButton kind="google" href={product.googlePlay} />
      </div>
    </div>
  );
}

function ProductsPage() {
  const store = useStore();
  const productPosts = window.cheerStore.getPosts().filter(p => p.published !== false && p.status === 'product');
  return (
    <div className="page">
      <section className="blog-hero">
        <h1>Products</h1>
        <p>Five small apps under one warm roof. Each does one thing, slowly, and well.</p>
      </section>
      <div className="products-grid">
        {productPosts.map(p => (
          <a key={p.id} className="product-card product-post-card" href={'#post/' + p.id}>
            <div className="post-cover product-post-cover">
              {p.cover ? <img src={p.cover} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontFamily: "'Vollkorn SC', serif", fontSize: 48, color: 'rgba(0,0,0,0.2)' }}>{p.title[0]}</div>}
            </div>
            <p style={{ fontFamily: "'Vollkorn SC', serif", fontSize: 12, letterSpacing: '0.16em', color: 'var(--honey-deep)', margin: '0 0 4px' }}>PRODUCT</p>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
            {(p.appStore || p.googlePlay) ? (
              <div className="stores">
                {p.appStore ? <StoreButton kind="apple" href={p.appStore} /> : null}
                {p.googlePlay ? <StoreButton kind="google" href={p.googlePlay} /> : null}
              </div>
            ) : null}
            <span className="read-more">Read about product →</span>
          </a>
        ))}
        {store.products.map(p => (
          <div key={p.id} className="product-card">
            <h3>{p.title || p.name}</h3>
            <div className="product-card-visual">
              <PhoneMockup src={p.hero} alt={p.name} className="product-phone" />
            </div>
            <p style={{ fontFamily: "'Vollkorn SC', serif", fontSize: 12, letterSpacing: '0.16em', color: 'var(--honey-deep)', margin: '0 0 4px' }}>{p.eyebrow}</p>
            <p>{p.tagline}</p>
            <div className="stores">
              <StoreButton kind="apple" href={p.appStore} />
              <StoreButton kind="google" href={p.googlePlay} />
            </div>
            <a href={'#product/' + p.id} className="read-more product-read-more">Read about product →</a>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactsPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="page">
      <div className="contacts-page">
        <div>
          <h1>Hello.</h1>
          <p className="lede">We're a small studio in Lisbon, two people who answer their own email. We'd love to hear from you — whether it's a question, an idea, or a quiet hello.</p>
          <ul className="contact-list">
            <li><span className="label">EMAIL</span><span className="value">hello@cheervinsky.studio</span></li>
            <li><span className="label">PRESS</span><span className="value">press@cheervinsky.studio</span></li>
            <li><span className="label">SUPPORT</span><span className="value">support@cheervinsky.studio</span></li>
            <li><span className="label">STUDIO</span><span className="value">Rua das Flores 12, Lisboa</span></li>
            <li><span className="label">HOURS</span><span className="value">Mon–Fri, 09:00–17:00 WET</span></li>
          </ul>
        </div>
        <form className="contact-form" onSubmit={e => { e.preventDefault(); setSent(true); }}>
          <div>
            <label>NAME</label>
            <input type="text" required placeholder="Your name" />
          </div>
          <div>
            <label>EMAIL</label>
            <input type="email" required placeholder="you@somewhere.com" />
          </div>
          <div>
            <label>MESSAGE</label>
            <textarea required placeholder="Say a little hello, or tell us what's on your mind." />
          </div>
          <button type="submit" className="btn dark" style={{ alignSelf: 'flex-start' }}>
            {sent ? 'Sent — thank you.' : 'Send a note →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function resizeImageFile(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.82, mimeType = 'image/jpeg' } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
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
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const outputType = file.type === 'image/png' && file.size < 400 * 1024 ? 'image/png' : mimeType;

        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Image resize failed'));
            return;
          }
          const resized = new File([blob], file.name.replace(/\.[^.]+$/, outputType === 'image/png' ? '.png' : '.jpg'), { type: outputType });
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
  const [form, setForm] = useState({ title: '', excerpt: '', cover: '', productIcon: '', appStore: '', googlePlay: '', includeInCarousel: false, author: 'The Cheervinsky Studio', body: '', pinned: false, published: true, status: 'blog', date: new Date().toISOString().slice(0, 10) });
  const [showPreview, setShowPreview] = useState(false);
  const [postFilter, setPostFilter] = useState('all');
  const [mediaComposer, setMediaComposer] = useState({ url: '', uploadedSrc: '', uploadedName: '', caption: '', sideText: '', size: 'full', align: 'center', wrap: false });
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const filteredPosts = posts.filter(p => postFilter === 'all' || (postFilter === 'product' ? p.status === 'product' : p.status !== 'product'));

  function reset() {
    setEditingId(null);
    setForm({ title: '', excerpt: '', cover: '', productIcon: '', appStore: '', googlePlay: '', includeInCarousel: false, author: 'The Cheervinsky Studio', body: '', pinned: false, published: true, status: 'blog', date: new Date().toISOString().slice(0, 10) });
    setShowPreview(false);
  }
  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, excerpt: p.excerpt, cover: p.cover, productIcon: p.productIcon || '', appStore: p.appStore || '', googlePlay: p.googlePlay || '', includeInCarousel: !!p.includeInCarousel, author: p.author, body: p.body, pinned: !!p.pinned, published: p.published !== false, status: p.status === 'product' ? 'product' : 'blog', date: p.date });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function savePost(publishedOverride = form.published) {
    const postData = {
      ...form,
      published: publishedOverride,
      pinned: publishedOverride && form.status !== 'product' ? form.pinned : false,
      includeInCarousel: form.status === 'product' && publishedOverride ? form.includeInCarousel : false,
    };
    const saved = editingId
      ? window.cheerStore.updatePost(editingId, postData)
      : window.cheerStore.addPost(postData);
    if (saved) reset();
  }
  function submit(e) {
    e.preventDefault();
    savePost(form.published);
  }
  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const resized = await resizeImageFile(f, { maxWidth: 1600, maxHeight: 1000, quality: 0.82 });
      const reader = new FileReader();
      reader.onload = () => setForm(s => ({ ...s, cover: reader.result }));
      reader.readAsDataURL(resized);
    } catch (error) {
      alert('Could not resize this cover image. Please try another image.');
    }
  }
  async function onProductIconFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const resized = await resizeImageFile(f, { maxWidth: 180, maxHeight: 180, quality: 0.86 });
      const reader = new FileReader();
      reader.onload = () => setForm(s => ({ ...s, productIcon: reader.result }));
      reader.readAsDataURL(resized);
    } catch (error) {
      alert('Could not resize this product icon. Please try another image.');
    }
  }
  async function stageBodyMedia(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.type.startsWith('video/')) {
      alert('Video files are too large for browser storage. Please add videos by URL instead.');
      return;
    }
    try {
      const mediaFile = f.type === 'image/gif'
        ? f
        : await resizeImageFile(f, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
      const mediaId = await window.cheerMedia.saveFile(mediaFile);
      setMediaComposer(s => ({
        ...s,
        uploadedSrc: 'media:' + mediaId,
        uploadedName: f.name,
        caption: s.caption || f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
      }));
    } catch (error) {
      alert('Could not save this image. Please try a smaller image or use an image URL.');
    }
  }
  function insertMediaBlock(type, src, caption = '', options = {}) {
    const normalizedType = isYouTubeUrl(src) ? 'youtube' : type;
    const normalizedOptions = {
      size: options.size || 'full',
      align: options.align || 'center',
      wrap: options.wrap || false,
    };
    const optionParts = [
      caption,
      'size=' + normalizedOptions.size,
      'align=' + normalizedOptions.align,
      'wrap=' + normalizedOptions.wrap,
    ].filter(Boolean);
    const mediaBlock = `\n\n{{${normalizedType}:${src}${optionParts.length ? '|' + optionParts.join('|') : ''}}}\n\n`;
    const textarea = bodyRef.current;
    const start = textarea ? textarea.selectionStart : form.body.length;
    const end = textarea ? textarea.selectionEnd : form.body.length;
    const nextBody = form.body.slice(0, start) + mediaBlock + form.body.slice(end);

    setForm(s => ({ ...s, body: nextBody }));
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
    const source = mediaComposer.uploadedSrc || cleanUrl;
    if (!source) {
      alert('Upload an image/GIF or paste a media URL first.');
      return;
    }
    const lowerUrl = source.toLowerCase();
    const type = isYouTubeUrl(source)
      ? 'youtube'
      : /\.(mp4|webm|ogg)(\?|#|$)/i.test(lowerUrl)
        ? 'video'
        : 'image';
    const options = type === 'image'
      ? { size: mediaComposer.size, align: mediaComposer.align, wrap: mediaComposer.wrap, sideText: mediaComposer.sideText }
      : { size: 'full', align: 'center', wrap: false };
    insertMediaBlock(type, source, mediaComposer.caption.trim(), options);
    setMediaComposer(s => ({ ...s, url: '', uploadedSrc: '', uploadedName: '', caption: '', sideText: '' }));
  }
  function updateBodySelection(transform) {
    const textarea = bodyRef.current;
    const start = textarea ? textarea.selectionStart : form.body.length;
    const end = textarea ? textarea.selectionEnd : form.body.length;
    const selected = form.body.slice(start, end);
    const next = transform(selected);
    const nextBody = form.body.slice(0, start) + next.text + form.body.slice(end);

    setForm(s => ({ ...s, body: nextBody }));
    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start + next.selectionStart, start + next.selectionEnd);
    });
  }
  function wrapBodySelection(before, after, placeholder) {
    updateBodySelection(selected => {
      const value = selected || placeholder;
      return {
        text: before + value + after,
        selectionStart: before.length,
        selectionEnd: before.length + value.length,
      };
    });
  }
  function addLinkToBody() {
    const url = prompt('Paste the link URL');
    if (!url) return;
    updateBodySelection(selected => {
      const value = selected || 'link text';
      return {
        text: `[${value}](${url})`,
        selectionStart: 1,
        selectionEnd: 1 + value.length,
      };
    });
  }
  function updateMediaBlock(blockIndex, patch) {
    const blocks = (form.body || '').split(/\n\s*\n/);
    const block = (blocks[blockIndex] || '').trim();
    const media = block.match(/^\{\{(image|video|youtube):([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;

    const [, type, src, rawOptions] = media;
    const currentOptions = parseMediaOptions((rawOptions || '').split('|').slice(1));
    const nextOptions = {
      ...currentOptions,
      ...patch,
    };
    if (nextOptions.align === 'center') nextOptions.wrap = false;

    blocks[blockIndex] = buildMediaToken(type, src, nextOptions);
    setForm(s => ({ ...s, body: blocks.join('\n\n') }));
  }
  function deleteMediaBlock(blockIndex) {
    if (!confirm('Delete this image from the post?')) return;
    const blocks = (form.body || '').split(/\n\s*\n/);
    blocks.splice(blockIndex, 1);
    setForm(s => ({ ...s, body: blocks.join('\n\n') }));
  }

  return (
    <div className="page admin-page">
      <h1>Manage posts</h1>
      <p className="lede">Add new blog entries, edit existing ones, and choose which post appears on the homepage. Everything is saved to your browser — no server, no account.</p>

      <div className="admin-grid">
        <form className="admin-form" onSubmit={submit}>
          <h2>{editingId ? 'Edit post' : 'New post'}</h2>

          <div className="field">
            <label>TITLE</label>
            <input value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} placeholder="A short, gentle title" required />
          </div>

          <div className="field">
            <label>EXCERPT (1–2 sentences)</label>
            <textarea value={form.excerpt} onChange={e => setForm(s => ({ ...s, excerpt: e.target.value }))} placeholder="A short summary that appears on the home page and the blog list." style={{ minHeight: 70 }} required />
          </div>

          <div className="field">
            <label>COVER IMAGE</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ padding: 8 }} />
            {form.cover && <div className="preview-thumb" style={{ backgroundImage: `url(${form.cover})` }} />}
          </div>

          <div className="field">
            <label>AUTHOR</label>
            <input value={form.author} onChange={e => setForm(s => ({ ...s, author: e.target.value }))} />
          </div>

          <div className="field">
            <label>DATE</label>
            <input type="date" value={form.date} onChange={e => setForm(s => ({ ...s, date: e.target.value }))} />
          </div>

          <div className="field">
            <label>STATUS</label>
            <select value={form.status} onChange={e => setForm(s => ({ ...s, status: e.target.value, pinned: e.target.value === 'product' ? false : s.pinned }))}>
              <option value="blog">BLOG</option>
              <option value="product">PRODUCT</option>
            </select>
          </div>

          {form.status === 'product' && (
            <div className="product-admin-fields">
              <div className="field">
                <label>APP STORE LINK</label>
                <input value={form.appStore} onChange={e => setForm(s => ({ ...s, appStore: e.target.value }))} placeholder="https://apps.apple.com/..." />
              </div>
              <div className="field">
                <label>GOOGLE PLAY LINK</label>
                <input value={form.googlePlay} onChange={e => setForm(s => ({ ...s, googlePlay: e.target.value }))} placeholder="https://play.google.com/store/apps/details?id=..." />
              </div>
              <div className="checkbox-row">
                <input id="includeInCarousel" type="checkbox" checked={form.includeInCarousel} onChange={e => setForm(s => ({ ...s, includeInCarousel: e.target.checked }))} />
                <label htmlFor="includeInCarousel">Show this product in the homepage carousel</label>
              </div>
              <div className="field">
                <label>TINY PRODUCT TITLE ICON</label>
                <input type="file" accept="image/*" onChange={onProductIconFile} style={{ padding: 8 }} />
                <div className="product-icon-admin-row">
                  {form.productIcon ? <img src={form.productIcon} alt="" /> : null}
                  <span>This appears before the product title on the home carousel. Use a small transparent PNG/SVG-style image under 160KB.</span>
                  {form.productIcon ? <button type="button" onClick={() => setForm(s => ({ ...s, productIcon: '' }))}>Remove</button> : null}
                </div>
              </div>
            </div>
          )}

          <div className="field">
            <label>BODY (use blank lines between paragraphs, ## for headings)</label>
            <div className="body-format-toolbar" aria-label="Post formatting toolbar">
              <button type="button" onClick={() => wrapBodySelection('**', '**', 'bold text')}>Bold</button>
              <button type="button" onClick={() => wrapBodySelection('*', '*', 'italic text')}>Italic</button>
              <button type="button" onClick={() => wrapBodySelection('__', '__', 'underlined text')}>Underline</button>
              <button type="button" onClick={addLinkToBody}>Link</button>
            </div>
            <textarea className="post-body-editor" ref={bodyRef} value={form.body} onChange={e => setForm(s => ({ ...s, body: e.target.value }))} placeholder={"## A small heading\n\nA paragraph of plain, warm prose.\n\n{{image:https://example.com/photo.gif|Optional caption|size=medium|align=left|wrap=true}}\n\nMore text after the media."} />
            <div className="media-composer">
              <div className="media-composer-head">
                <strong>Add media block</strong>
                <span>Inserted wherever your cursor is in the body.</span>
              </div>
              <div className="media-composer-grid">
                <label>
                  Media URL
                  <input value={mediaComposer.url} onChange={e => setMediaComposer(s => ({ ...s, url: e.target.value }))} placeholder="YouTube, image/GIF, or direct video URL" />
                </label>
                <label>
                  Caption
                  <input value={mediaComposer.caption} onChange={e => setMediaComposer(s => ({ ...s, caption: e.target.value }))} placeholder="Optional caption" />
                </label>
                <label className="media-composer-wide">
                  Text beside image
                  <textarea
                    value={mediaComposer.sideText}
                    disabled={!mediaComposer.wrap}
                    onChange={e => setMediaComposer(s => ({ ...s, sideText: e.target.value }))}
                    placeholder={mediaComposer.wrap ? 'This paragraph will appear beside the left/right image.' : 'Choose left or right and enable text beside image first.'}
                  />
                </label>
                <label>
                  Image size
                  <select value={mediaComposer.size} onChange={e => setMediaComposer(s => ({ ...s, size: e.target.value }))}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="full">Full width</option>
                  </select>
                </label>
                <label>
                  Position
                  <select value={mediaComposer.align} onChange={e => setMediaComposer(s => ({ ...s, align: e.target.value, wrap: e.target.value === 'center' ? false : true }))}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label className="media-composer-checkbox">
                  <input
                    type="checkbox"
                    checked={mediaComposer.wrap}
                    disabled={mediaComposer.align === 'center'}
                    onChange={e => setMediaComposer(s => ({ ...s, wrap: e.target.checked }))}
                  />
                  Place text beside the image
                </label>
              </div>
              <div className="media-insert-row">
                <label className="btn ghost">
                  Upload image / GIF
                  <input type="file" accept="image/*" onChange={stageBodyMedia} />
                </label>
                {mediaComposer.uploadedName ? (
                  <span className="media-selected">Selected: {mediaComposer.uploadedName}</span>
                ) : null}
                <button type="button" className="btn dark" onClick={addComposerMedia}>Add image</button>
                <span>Upload or paste a URL, adjust the settings above, then click Add image. Videos should be added by URL.</span>
              </div>
            </div>
          </div>

          <div className="checkbox-row">
            <input id="pin" type="checkbox" checked={form.pinned} disabled={form.status === 'product'} onChange={e => setForm(s => ({ ...s, pinned: e.target.checked }))} />
            <label htmlFor="pin">📌 Pin to homepage (replaces the current pinned post)</label>
          </div>

          <div className="checkbox-row">
            <input id="published" type="checkbox" checked={form.published} onChange={e => setForm(s => ({ ...s, published: e.target.checked, pinned: e.target.checked ? s.pinned : false }))} />
            <label htmlFor="published">Publish this post publicly</label>
          </div>

          <div className="row">
            <button type="submit" className="btn dark">{editingId ? 'Save changes' : 'Publish post'}</button>
            <button type="button" className="btn ghost" onClick={() => savePost(false)}>Save as draft</button>
            <button type="button" className="btn ghost" onClick={() => setShowPreview(v => !v)}>{showPreview ? 'Hide preview' : 'Preview'}</button>
            {editingId && <button type="button" className="btn ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>

        {showPreview && (
          <section className="admin-preview">
            <div className="admin-preview-bar">
              <span>Preview only — not published</span>
              <button type="button" onClick={() => setShowPreview(false)}>Close</button>
            </div>
            <article className="post-page admin-preview-post">
              {form.cover ? <div className="post-cover"><img src={form.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /></div> : null}
              <h1>{form.title || 'Untitled draft'}</h1>
              <div className="meta">{form.status === 'product' ? 'PRODUCT · ' : ''}{formatDate(form.date)} · {form.author || 'The Cheervinsky Studio'}{form.pinned && form.published && form.status !== 'product' ? ' · PINNED' : ''}{form.includeInCarousel && form.status === 'product' ? ' · CAROUSEL' : ''}</div>
              <div className="post-body">
                {form.body ? renderPostBody(form.body, { onMediaChange: updateMediaBlock, onMediaDelete: deleteMediaBlock }) : <p style={{ color: 'var(--ink-3)' }}>Start writing to preview the post body.</p>}
              </div>
              {form.status === 'product' && (form.appStore || form.googlePlay) ? (
                <div className="stores product-detail-stores">
                  {form.appStore ? <StoreButton kind="apple" href={form.appStore} /> : null}
                  {form.googlePlay ? <StoreButton kind="google" href={form.googlePlay} /> : null}
                </div>
              ) : null}
            </article>
          </section>
        )}

        <div className="admin-list">
          <div className="admin-list-header">
            <h2>All posts ({filteredPosts.length})</h2>
            <div className="admin-filter" aria-label="Filter posts">
              <button type="button" className={postFilter === 'all' ? 'active' : ''} onClick={() => setPostFilter('all')}>All</button>
              <button type="button" className={postFilter === 'blog' ? 'active' : ''} onClick={() => setPostFilter('blog')}>Blog</button>
              <button type="button" className={postFilter === 'product' ? 'active' : ''} onClick={() => setPostFilter('product')}>Products</button>
            </div>
          </div>
          {filteredPosts.length === 0 && <p style={{ color: 'var(--ink-3)' }}>Nothing here yet.</p>}
          {filteredPosts.map(p => (
            <div key={p.id} className={'admin-post-row ' + (p.pinned ? 'pinned ' : '') + (p.published === false ? 'unpublished' : '')}>
              <div className="thumb" style={p.cover ? { backgroundImage: `url(${p.cover})` } : {}} />
              <div className="info">
                <div className="admin-post-meta">
                  <span className={p.published === false ? 'status unpublished' : 'status published'}>{p.published === false ? 'UNPUBLISHED' : 'PUBLISHED'}</span>
                  <span className={p.status === 'product' ? 'status product' : 'status blog'}>{p.status === 'product' ? 'PRODUCT' : 'BLOG'}</span>
                  {p.status === 'product' && p.includeInCarousel && <span className="status carousel">CAROUSEL</span>}
                  {p.pinned && <span className="status pinned">PINNED</span>}
                </div>
                <h4>{p.title}</h4>
                <p className="excerpt">{p.excerpt}</p>
              </div>
              <div className="actions">
                <button
                  className={'icon-btn pin ' + (p.pinned ? 'active' : '')}
                  onClick={() => window.cheerStore.setPinned(p.pinned ? '' : p.id)}
                  aria-label="Pin to homepage"
                  title={p.pinned ? 'Unpin' : 'Pin to homepage'}
                  disabled={p.published === false || p.status === 'product'}
                ><IconPin /></button>
                <button className="admin-action-btn" onClick={() => startEdit(p)}>Edit</button>
                <button
                  className="admin-action-btn"
                  onClick={() => {
                    const willPublish = p.published === false;
                    window.cheerStore.updatePost(p.id, { published: willPublish, pinned: willPublish ? p.pinned : false });
                  }}
                >{p.published === false ? 'Publish' : 'Unpublish'}</button>
                <button className="icon-btn danger" onClick={() => { if (confirm('Delete this post?')) window.cheerStore.deletePost(p.id); }} aria-label="Delete" title="Delete"><IconTrash /></button>
              </div>
            </div>
          ))}
          <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => { if (confirm('Reset all posts and products to defaults?')) window.cheerStore.reset(); }}>Reset to defaults</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BlogPage, PostPage, ProductDetailPage, ProductsPage, ContactsPage, AdminPage, formatDate });
