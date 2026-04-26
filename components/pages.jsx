// Blog list, single post, Products page, Contacts page, Admin page

function PaginationControls({ currentPage, totalPages, onPageChange, label }) {
  if (totalPages <= 1) return null;

  return (
    <div className="blog-pagination" aria-label={label || 'Pagination'}>
      <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>Previous</button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i + 1}
          type="button"
          className={currentPage === i + 1 ? 'active' : ''}
          onClick={() => onPageChange(i + 1)}
          aria-label={'Go to page ' + (i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>Next</button>
    </div>
  );
}

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
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} label="Blog pagination top" />
        {totalPages > 1 && (
          <span className="blog-page-count">Page {currentPage} of {totalPages}</span>
        )}
      </div>
      <div className="blog-grid">
        {visiblePosts.map(p => (
          <a key={p.id} className="post-card" href={'#post/' + p.id}>
            <div className="post-cover">
              {p.cover ? <img src={p.cover} alt="" style={getCoverImageStyle(p.coverPosition, p.coverZoom)} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontFamily: "'Vollkorn SC', serif", fontSize: 48, color: 'rgba(0,0,0,0.2)' }}>{p.title[0]}</div>}
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
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} label="Blog pagination bottom" />
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCoverPosition(position) {
  const legacyPositions = {
    'center top': '50% 0%',
    'center 25%': '50% 25%',
    'center center': '50% 50%',
    'center 70%': '50% 70%',
    'center bottom': '50% 100%',
    'left center': '0% 50%',
    'right center': '100% 50%',
  };
  if (legacyPositions[position]) return legacyPositions[position];
  return /^\d{1,3}% \d{1,3}%$/.test(position || '') ? position : '50% 0%';
}

function getCoverCrop(position) {
  const [x, y] = getCoverPosition(position).split(' ').map(value => parseInt(value, 10));
  return { x, y };
}

function setCoverCropAxis(position, axis, value) {
  const crop = getCoverCrop(position);
  const nextValue = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
  return axis === 'x' ? `${nextValue}% ${crop.y}%` : `${crop.x}% ${nextValue}%`;
}

function getCoverZoom(zoom) {
  return Math.min(180, Math.max(60, parseInt(zoom, 10) || 100));
}

function getCoverImageStyle(position, zoom, extra = {}) {
  const coverPosition = getCoverPosition(position);
  return {
    objectFit: 'contain',
    objectPosition: coverPosition,
    transform: `scale(${getCoverZoom(zoom) / 100})`,
    transformOrigin: coverPosition,
    ...extra,
  };
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
  const options = { caption: '', sideText: '', size: 'full', align: 'center', wrap: false, columns: 2 };

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
    if (key === 'columns') options.columns = Math.min(5, Math.max(2, parseInt(optionValue, 10) || 2));
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
  const mediaSrc = Array.isArray(src) ? src.map(value => encodeURIComponent(value)).join(',') : src;
  const parts = [
    options.caption || '',
    'size=' + (options.size || 'full'),
    'align=' + (options.align || 'center'),
    'wrap=' + !!options.wrap,
    type === 'gallery' ? 'columns=' + Math.min(5, Math.max(2, parseInt(options.columns, 10) || 2)) : '',
    options.sideText ? 'sideText=' + encodeURIComponent(options.sideText) : '',
  ].filter(Boolean);

  return `{{${type}:${mediaSrc}${parts.length ? '|' + parts.join('|') : ''}}}`;
}

function parseGallerySources(src) {
  return (src || '').split(',').map(value => {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }).filter(Boolean).slice(0, 5);
}

function renderPostBody(body, editor = {}) {
  return (body || '').split(/\n\s*\n/).map((b, i) => {
    const trim = b.trim();
    const media = trim.match(/^\{\{(image|video|youtube|gallery):([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (media) {
      const [, type, src, rawOptions] = media;
      const options = parseMediaOptions((rawOptions || '').split('|').slice(1));
      const cleanSrc = src.trim();
      const mediaId = cleanSrc.startsWith('media:') ? cleanSrc.slice(6) : '';
      const youtubeSrc = (type === 'youtube' || type === 'video') ? getYouTubeEmbedUrl(cleanSrc) : '';
      const gallerySources = type === 'gallery' ? parseGallerySources(cleanSrc) : [];
      const mediaClass = [
        'post-media',
        'post-media-' + options.size,
        'post-media-' + options.align,
        options.wrap ? 'post-media-wrap' : 'post-media-no-wrap',
      ].join(' ');
      const canEdit = editor.onMediaChange && editor.onMediaDelete && (type === 'image' || type === 'gallery');
      const mediaFigure = (
        <figure className={type === 'gallery' ? 'post-media post-gallery post-gallery-columns-' + options.columns : mediaClass}>
          {type === 'gallery' ? (
            <div className="post-gallery-grid">
              {gallerySources.map((source, galleryIndex) => {
                const galleryMediaId = source.startsWith('media:') ? source.slice(6) : '';
                return (
                  <div className="post-gallery-item" key={galleryIndex}>
                    {galleryMediaId
                      ? <MediaAsset id={galleryMediaId} alt={options.caption || ''} />
                      : <img src={source} alt={options.caption || ''} />}
                    {canEdit ? (
                      <button
                        type="button"
                        className="gallery-image-remove"
                        onClick={() => editor.onGalleryImageDelete(i, galleryIndex)}
                        aria-label={'Remove image ' + (galleryIndex + 1)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : youtubeSrc ? (
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
          {canEdit && type === 'gallery' ? (
            <div className="media-preview-controls">
              <label>
                Images in row
                <select value={options.columns} onChange={e => editor.onMediaChange(i, { columns: e.target.value })}>
                  <option value="2">2 images</option>
                  <option value="3">3 images</option>
                  <option value="4">4 images</option>
                  <option value="5">5 images</option>
                </select>
              </label>
              <label className="media-preview-caption">
                Caption
                <input value={options.caption} onChange={e => editor.onMediaChange(i, { caption: e.target.value })} />
              </label>
              {gallerySources.length < 5 ? (
                <label className="gallery-add-btn">
                  Add images
                  <input type="file" accept="image/*" multiple onChange={e => editor.onGalleryAdd(i, e)} />
                </label>
              ) : null}
              <button type="button" className="media-delete-btn" onClick={() => editor.onMediaDelete(i)}>Delete images</button>
            </div>
          ) : canEdit ? (
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

    const standaloneYouTubeSrc = getYouTubeEmbedUrl(trim);
    if (standaloneYouTubeSrc) {
      return (
        <figure key={i} className="post-media post-media-full post-media-center post-media-no-wrap">
          <div className="post-youtube">
            <iframe
              src={standaloneYouTubeSrc}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </figure>
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
      <article className="detail-content-panel">
        <a href={isProductPost ? '#products' : '#blog'} className="back-link">← Back to {isProductPost ? 'products' : 'blog'}</a>
        {post.cover ? <div className="post-cover"><img src={post.cover} alt="" style={getCoverImageStyle(post.coverPosition, post.coverZoom, { width: '100%', height: '100%', borderRadius: 'inherit' })} /></div> : null}
        <h1>{post.title}</h1>
        <div className="meta">{isProductPost ? 'PRODUCT · ' : ''}{formatDate(post.date)} · {post.author}{post.pinned ? ' · PINNED' : ''}</div>
        <div className="post-body">{blocks}</div>
        {isProductPost && (post.appStore || post.googlePlay) ? (
          <div className="stores product-detail-stores">
            {post.appStore ? <StoreButton kind="apple" href={post.appStore} /> : null}
            {post.googlePlay ? <StoreButton kind="google" href={post.googlePlay} /> : null}
          </div>
        ) : null}
      </article>
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
      <article className="detail-content-panel">
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
      </article>
    </div>
  );
}

function ProductsPage() {
  const productPosts = window.cheerStore.getPosts().filter(p => p.published !== false && p.status === 'product');
  const products = productPosts;
  const pageSize = 20;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="page">
      <section className="blog-hero">
        <h1>Products</h1>
        <p>Five small apps under one warm roof. Each does one thing, slowly, and well.</p>
      </section>
      <div className="blog-toolbar">
        <span style={{ fontFamily: "'Vollkorn SC', serif", letterSpacing: '0.08em', fontSize: 13, color: 'var(--ink-2)' }}>
          {products.length} {products.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
        </span>
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} label="Products pagination top" />
        {totalPages > 1 && (
          <span className="blog-page-count">Page {currentPage} of {totalPages}</span>
        )}
      </div>
      <div className="products-grid">
        {visibleProducts.map(p => (
          <a key={p.id} className="product-card product-post-card" href={'#post/' + p.id}>
            <div className="post-cover product-post-cover">
              {p.cover ? <img src={p.cover} alt="" style={getCoverImageStyle(p.coverPosition, p.coverZoom)} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontFamily: "'Vollkorn SC', serif", fontSize: 48, color: 'rgba(0,0,0,0.2)' }}>{p.title[0]}</div>}
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
      </div>
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} label="Products pagination bottom" />
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
  const [form, setForm] = useState({ title: '', excerpt: '', cover: '', coverPosition: '50% 0%', coverZoom: 100, productIcon: '', appStore: '', googlePlay: '', includeInCarousel: false, author: 'The Cheervinsky Studio', body: '', pinned: false, published: true, status: 'blog', date: new Date().toISOString().slice(0, 10) });
  const [showPreview, setShowPreview] = useState(false);
  const [postFilter, setPostFilter] = useState('all');
  const [postSearch, setPostSearch] = useState('');
  const [toast, setToast] = useState('');
  const [mediaComposer, setMediaComposer] = useState({ url: '', uploadedSrc: '', uploadedName: '', uploadedSources: [], uploadedNames: [], caption: '', sideText: '', size: 'full', align: 'center', wrap: false, columns: 2 });
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const toastTimerRef = useRef(null);
  const filteredPosts = posts.filter(p => {
    const matchesFilter = postFilter === 'all' || (postFilter === 'product' ? p.status === 'product' : p.status !== 'product');
    const matchesSearch = !postSearch.trim() || (p.title || '').toLowerCase().includes(postSearch.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const coverCrop = getCoverCrop(form.coverPosition);
  const coverZoom = getCoverZoom(form.coverZoom);

  function showAdminToast(message) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3200);
  }
  function reset() {
    setEditingId(null);
    setForm({ title: '', excerpt: '', cover: '', coverPosition: '50% 0%', coverZoom: 100, productIcon: '', appStore: '', googlePlay: '', includeInCarousel: false, author: 'The Cheervinsky Studio', body: '', pinned: false, published: true, status: 'blog', date: new Date().toISOString().slice(0, 10) });
    setShowPreview(false);
  }
  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, excerpt: p.excerpt, cover: p.cover, coverPosition: getCoverPosition(p.coverPosition), coverZoom: getCoverZoom(p.coverZoom), productIcon: p.productIcon || '', appStore: p.appStore || '', googlePlay: p.googlePlay || '', includeInCarousel: !!p.includeInCarousel, author: p.author, body: p.body, pinned: !!p.pinned, published: p.published !== false, status: p.status === 'product' ? 'product' : 'blog', date: p.date });
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
    if (saved) {
      const message = publishedOverride
        ? editingId ? 'Changes saved and post is published.' : 'Post published successfully.'
        : 'Draft saved successfully.';
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
    const selectedFiles = Array.from(e.target.files || []).slice(0, 5);
    e.target.value = '';
    if (!selectedFiles.length) return;
    if ((e.target.files || []).length > 5) {
      alert('You can add up to 5 images in one line. I selected the first 5.');
    }
    if (selectedFiles.some(file => file.type.startsWith('video/'))) {
      alert('Video files are too large for browser storage. Please add videos by URL instead.');
      return;
    }
    try {
      const savedFiles = [];
      for (const f of selectedFiles) {
        const mediaFile = f.type === 'image/gif'
          ? f
          : await resizeImageFile(f, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
        const mediaId = await window.cheerMedia.saveFile(mediaFile);
        savedFiles.push({ src: 'media:' + mediaId, name: f.name });
      }
      setMediaComposer(s => ({
        ...s,
        uploadedSrc: savedFiles[0].src,
        uploadedName: savedFiles.map(file => file.name).join(', '),
        uploadedSources: savedFiles.map(file => file.src),
        uploadedNames: savedFiles.map(file => file.name),
        columns: Math.min(5, Math.max(2, savedFiles.length)),
        caption: s.caption || (savedFiles.length === 1 ? savedFiles[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') : ''),
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
    if (options.sideText) optionParts.push('sideText=' + encodeURIComponent(options.sideText));
    if (normalizedType === 'gallery') optionParts.push('columns=' + Math.min(5, Math.max(2, parseInt(options.columns, 10) || 2)));
    const mediaSrc = Array.isArray(src) ? src.map(value => encodeURIComponent(value)).join(',') : src;
    const mediaBlock = `\n\n{{${normalizedType}:${mediaSrc}${optionParts.length ? '|' + optionParts.join('|') : ''}}}\n\n`;
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
    const hasGallery = mediaComposer.uploadedSources.length > 1;
    const source = hasGallery ? mediaComposer.uploadedSources.slice(0, 5) : mediaComposer.uploadedSrc || cleanUrl;
    if (!source) {
      alert('Upload an image/GIF or paste a media URL first.');
      return;
    }
    const lowerUrl = Array.isArray(source) ? '' : source.toLowerCase();
    const type = hasGallery
      ? 'gallery'
      : isYouTubeUrl(source)
      ? 'youtube'
      : /\.(mp4|webm|ogg)(\?|#|$)/i.test(lowerUrl)
        ? 'video'
        : 'image';
    const options = type === 'image'
      ? { size: mediaComposer.size, align: mediaComposer.align, wrap: mediaComposer.wrap, sideText: mediaComposer.sideText }
      : type === 'gallery'
        ? { columns: mediaComposer.columns, caption: mediaComposer.caption }
      : { size: 'full', align: 'center', wrap: false };
    insertMediaBlock(type, source, mediaComposer.caption.trim(), options);
    setMediaComposer(s => ({ ...s, url: '', uploadedSrc: '', uploadedName: '', uploadedSources: [], uploadedNames: [], caption: '', sideText: '' }));
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
    const media = block.match(/^\{\{(image|video|youtube|gallery):([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;

    const [, type, src, rawOptions] = media;
    const currentOptions = parseMediaOptions((rawOptions || '').split('|').slice(1));
    const nextSrc = patch.gallerySources ? patch.gallerySources.slice(0, 5) : src;
    const nextOptions = {
      ...currentOptions,
      ...patch,
    };
    delete nextOptions.gallerySources;
    if (nextOptions.align === 'center') nextOptions.wrap = false;

    blocks[blockIndex] = buildMediaToken(type, nextSrc, nextOptions);
    setForm(s => ({ ...s, body: blocks.join('\n\n') }));
  }
  function deleteGalleryImage(blockIndex, imageIndex) {
    const blocks = (form.body || '').split(/\n\s*\n/);
    const block = (blocks[blockIndex] || '').trim();
    const media = block.match(/^\{\{gallery:([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;

    const [, src, rawOptions] = media;
    const sources = parseGallerySources(src).filter((_, i) => i !== imageIndex);
    const options = parseMediaOptions((rawOptions || '').split('|').slice(1));
    if (!sources.length) {
      blocks.splice(blockIndex, 1);
    } else if (sources.length === 1) {
      blocks[blockIndex] = buildMediaToken('image', sources[0], { caption: options.caption, size: 'full', align: 'center', wrap: false });
    } else {
      blocks[blockIndex] = buildMediaToken('gallery', sources, { ...options, columns: Math.min(options.columns, sources.length) });
    }
    setForm(s => ({ ...s, body: blocks.join('\n\n') }));
  }
  async function addImagesToGallery(blockIndex, e) {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selectedFiles.length) return;

    const blocks = (form.body || '').split(/\n\s*\n/);
    const block = (blocks[blockIndex] || '').trim();
    const media = block.match(/^\{\{gallery:([^|}]+)((?:\|[^}]*)?)\}\}$/);
    if (!media) return;

    const [, src, rawOptions] = media;
    const sources = parseGallerySources(src);
    const remainingSlots = 5 - sources.length;
    if (remainingSlots <= 0) {
      alert('This row already has 5 images.');
      return;
    }
    const filesToAdd = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      alert('This row can only have 5 images. I added the first ' + remainingSlots + '.');
    }
    if (filesToAdd.some(file => file.type.startsWith('video/'))) {
      alert('Video files are too large for browser storage. Please add videos by URL instead.');
      return;
    }

    try {
      const addedSources = [];
      for (const f of filesToAdd) {
        const mediaFile = f.type === 'image/gif'
          ? f
          : await resizeImageFile(f, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
        const mediaId = await window.cheerMedia.saveFile(mediaFile);
        addedSources.push('media:' + mediaId);
      }
      const options = parseMediaOptions((rawOptions || '').split('|').slice(1));
      const nextSources = sources.concat(addedSources).slice(0, 5);
      blocks[blockIndex] = buildMediaToken('gallery', nextSources, { ...options, columns: Math.min(5, Math.max(options.columns, nextSources.length)) });
      setForm(s => ({ ...s, body: blocks.join('\n\n') }));
    } catch (error) {
      alert('Could not save these images. Please try smaller images.');
    }
  }
  function deleteMediaBlock(blockIndex) {
    if (!confirm('Delete this image from the post?')) return;
    const blocks = (form.body || '').split(/\n\s*\n/);
    blocks.splice(blockIndex, 1);
    setForm(s => ({ ...s, body: blocks.join('\n\n') }));
  }

  return (
    <div className="page admin-page">
      {toast ? <div className="admin-toast" role="status" aria-live="polite">{toast}</div> : null}
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
            {form.cover && (
              <div className="preview-thumb">
                <img src={form.cover} alt="" style={getCoverImageStyle(form.coverPosition, form.coverZoom)} />
              </div>
            )}
            {form.cover && (
              <div className="cover-position-control">
                <span>Adjust visible cover area</span>
                <label>
                  Make image bigger / smaller
                  <input
                    type="range"
                    min="60"
                    max="180"
                    value={coverZoom}
                    onChange={e => setForm(s => ({ ...s, coverZoom: e.target.value }))}
                  />
                </label>
                <label>
                  Move left / right
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coverCrop.x}
                    onChange={e => setForm(s => ({ ...s, coverPosition: setCoverCropAxis(s.coverPosition, 'x', e.target.value) }))}
                  />
                </label>
                <label>
                  Move up / down
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coverCrop.y}
                    onChange={e => setForm(s => ({ ...s, coverPosition: setCoverCropAxis(s.coverPosition, 'y', e.target.value) }))}
                  />
                </label>
              </div>
            )}
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
                    disabled={!mediaComposer.wrap || mediaComposer.uploadedSources.length > 1}
                    onChange={e => setMediaComposer(s => ({ ...s, sideText: e.target.value }))}
                    placeholder={mediaComposer.uploadedSources.length > 1 ? 'Text beside image is only for single left/right images.' : mediaComposer.wrap ? 'This paragraph will appear beside the left/right image.' : 'Choose left or right and enable text beside image first.'}
                  />
                </label>
                <label>
                  Image size
                  <select value={mediaComposer.size} disabled={mediaComposer.uploadedSources.length > 1} onChange={e => setMediaComposer(s => ({ ...s, size: e.target.value }))}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="full">Full width</option>
                  </select>
                </label>
                <label>
                  Position
                  <select value={mediaComposer.align} disabled={mediaComposer.uploadedSources.length > 1} onChange={e => setMediaComposer(s => ({ ...s, align: e.target.value, wrap: e.target.value === 'center' ? false : true }))}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label>
                  Images in row
                  <select value={mediaComposer.columns} disabled={mediaComposer.uploadedSources.length < 2} onChange={e => setMediaComposer(s => ({ ...s, columns: e.target.value }))}>
                    <option value="2">2 images</option>
                    <option value="3">3 images</option>
                    <option value="4">4 images</option>
                    <option value="5">5 images</option>
                  </select>
                </label>
                <label className="media-composer-checkbox">
                  <input
                    type="checkbox"
                    checked={mediaComposer.wrap}
                    disabled={mediaComposer.align === 'center' || mediaComposer.uploadedSources.length > 1}
                    onChange={e => setMediaComposer(s => ({ ...s, wrap: e.target.checked }))}
                  />
                  Place text beside the image
                </label>
              </div>
              <div className="media-insert-row">
                <label className="btn ghost">
                  Upload image / GIF
                  <input type="file" accept="image/*" multiple onChange={stageBodyMedia} />
                </label>
                {mediaComposer.uploadedName ? (
                  <span className="media-selected">Selected: {mediaComposer.uploadedName}</span>
                ) : null}
                <button type="button" className="btn dark" onClick={addComposerMedia}>{mediaComposer.uploadedSources.length > 1 ? 'Add image row' : 'Add image'}</button>
                <span>Upload 1 image/GIF, or select 2–5 images together to place them on one line. Videos should be added by URL.</span>
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
              {form.cover ? <div className="post-cover"><img src={form.cover} alt="" style={getCoverImageStyle(form.coverPosition, form.coverZoom, { width: '100%', height: '100%', borderRadius: 'inherit' })} /></div> : null}
              <h1>{form.title || 'Untitled draft'}</h1>
              <div className="meta">{form.status === 'product' ? 'PRODUCT · ' : ''}{formatDate(form.date)} · {form.author || 'The Cheervinsky Studio'}{form.pinned && form.published && form.status !== 'product' ? ' · PINNED' : ''}{form.includeInCarousel && form.status === 'product' ? ' · CAROUSEL' : ''}</div>
              <div className="post-body">
                {form.body ? renderPostBody(form.body, { onMediaChange: updateMediaBlock, onMediaDelete: deleteMediaBlock, onGalleryImageDelete: deleteGalleryImage, onGalleryAdd: addImagesToGallery }) : <p style={{ color: 'var(--ink-3)' }}>Start writing to preview the post body.</p>}
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
            <div className="admin-list-tools">
              <label className="admin-search">
                <span>Search title</span>
                <input
                  type="search"
                  value={postSearch}
                  onChange={e => setPostSearch(e.target.value)}
                  placeholder="Type a post title..."
                />
              </label>
              <div className="admin-filter" aria-label="Filter posts">
                <button type="button" className={postFilter === 'all' ? 'active' : ''} onClick={() => setPostFilter('all')}>All</button>
                <button type="button" className={postFilter === 'blog' ? 'active' : ''} onClick={() => setPostFilter('blog')}>Blog</button>
                <button type="button" className={postFilter === 'product' ? 'active' : ''} onClick={() => setPostFilter('product')}>Products</button>
              </div>
            </div>
          </div>
          {filteredPosts.length === 0 && <p style={{ color: 'var(--ink-3)' }}>{postSearch.trim() ? 'No posts match that title.' : 'Nothing here yet.'}</p>}
          {filteredPosts.map(p => {
            const rowTitle = (p.title || '').trim() || 'Untitled post';
            const rowExcerpt = (p.excerpt || '').trim() || 'No excerpt yet.';
            return (
              <div key={p.id} className={'admin-post-row ' + (p.pinned ? 'pinned ' : '') + (p.published === false ? 'unpublished' : '')}>
                <div className="thumb" style={p.cover ? { backgroundImage: `url(${p.cover})`, backgroundPosition: getCoverPosition(p.coverPosition) } : {}}>
                  {!p.cover ? <span>{rowTitle[0]}</span> : null}
                </div>
                <div className="info">
                  <div className="admin-post-meta">
                    <span className={p.published === false ? 'status unpublished' : 'status published'}>{p.published === false ? 'UNPUBLISHED' : 'PUBLISHED'}</span>
                    <span className={p.status === 'product' ? 'status product' : 'status blog'}>{p.status === 'product' ? 'PRODUCT' : 'BLOG'}</span>
                    {p.status === 'product' && p.includeInCarousel && <span className="status carousel-status">CAROUSEL</span>}
                    {p.pinned && <span className="status pinned">PINNED</span>}
                  </div>
                  <h4>{rowTitle}</h4>
                  <p className="excerpt">{rowExcerpt}</p>
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
            );
          })}
          <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => { if (confirm('Reset all posts and products to defaults?')) window.cheerStore.reset(); }}>Reset to defaults</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BlogPage, PostPage, ProductDetailPage, ProductsPage, ContactsPage, AdminPage, formatDate });
