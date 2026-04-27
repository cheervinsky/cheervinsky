// Shared UI: Header, Footer, Logo, StoreButton, Icons, CurvyDivider
const { useEffect, useState, useRef, useMemo, useCallback } = React;

// --- Hash router (very small) ---
function parseHash() {
  const h = window.location.hash.replace(/^#/, '') || 'home';
  const [primary, hidden = ''] = h.split('#');
  const [route, ...rest] = primary.split('/');
  return { route: route || 'home', param: rest.join('/') || '', hidden };
}
function navigate(route) {
  window.location.hash = '#' + route;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function useRoute() {
  const [r, setR] = useState(parseHash());
  useEffect(() => {
    const fn = () => setR(parseHash());
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return r;
}

// --- Store hook ---
function useStore() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const fn = () => setVersion(v => v + 1);
    window.addEventListener('cheer-store-changed', fn);
    return () => window.removeEventListener('cheer-store-changed', fn);
  }, []);
  return useMemo(() => window.cheerStore.get(), [version]);
}

// --- Logo ---
function CrowLogo({ size = 84 }) {
  return (
    <img
      src="assets/crow-logo.png"
      alt="Cheervinsky"
      className="crow"
      style={{ height: size, width: 'auto' }}
    />
  );
}

// --- Icons (Lucide-style) ---
function IconYouTube() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <polygon points="10,9 16,12 10,15" fill="#FFC72A" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
function IconArrow({ left }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: left ? 'rotate(180deg)' : '' }}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9 8H4l4 4-2 7 6-3 6 3-2-7 4-4h-5z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

// --- Store button (App Store / Google Play) ---
function StoreButton({ kind, href = '#' }) {
  if (kind === 'apple') {
    return (
      <a href={href} className="store-btn" aria-label="Download on the App Store">
        <svg className="store-svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 12.04c-.03-2.93 2.4-4.34 2.5-4.4-1.36-1.99-3.49-2.27-4.24-2.3-1.81-.18-3.53 1.06-4.45 1.06-.93 0-2.34-1.04-3.85-1.01-1.97.03-3.81 1.16-4.83 2.93-2.06 3.58-.53 8.86 1.48 11.77.98 1.42 2.16 3.02 3.7 2.96 1.49-.06 2.05-.96 3.85-.96 1.79 0 2.31.96 3.88.93 1.6-.03 2.62-1.45 3.59-2.88 1.13-1.65 1.6-3.25 1.62-3.34-.04-.02-3.1-1.19-3.13-4.72zM14.36 3.6c.81-.99 1.36-2.36 1.21-3.72-1.17.05-2.59.78-3.43 1.76-.75.87-1.41 2.27-1.23 3.6 1.31.1 2.65-.66 3.45-1.64z"/>
        </svg>
        <span className="label">
          <span className="small">Download on the</span>
          <span className="big">App Store</span>
        </span>
      </a>
    );
  }
  return (
    <a href={href} className="store-btn" aria-label="Get it on Google Play">
      <svg className="store-svg" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="gp1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#00D4FF"/><stop offset="1" stopColor="#00B0FF"/>
          </linearGradient>
          <linearGradient id="gp2" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#00F076"/><stop offset="1" stopColor="#00C264"/>
          </linearGradient>
          <linearGradient id="gp3" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#FFE000"/><stop offset="1" stopColor="#FF9100"/>
          </linearGradient>
          <linearGradient id="gp4" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#FF3A44"/><stop offset="1" stopColor="#C31162"/>
          </linearGradient>
        </defs>
        <path d="M3.6 2.7C3.2 3.05 3 3.5 3 4v16c0 .5.2.95.6 1.3L13 12 3.6 2.7z" fill="url(#gp1)"/>
        <path d="M16.4 8.85L13 12l3.4 3.15 3.5-2.05c.95-.55.95-1.65 0-2.2l-3.5-2.05z" fill="url(#gp3)"/>
        <path d="M3.6 2.7L13 12l3.4-3.15L4.7 2.05c-.4-.2-.8-.2-1.1.05z" fill="url(#gp2)"/>
        <path d="M3.6 21.3c.3.25.7.25 1.1.05l11.7-6.8L13 12 3.6 21.3z" fill="url(#gp4)"/>
      </svg>
      <span className="label">
        <span className="small">GET IT ON</span>
        <span className="big">Google Play</span>
      </span>
    </a>
  );
}

// --- Header ---
function Header({ route }) {
  const [isScrolled, setIsScrolled] = useState(route !== 'home');
  useEffect(() => {
    if (route !== 'home') {
      setIsScrolled(true);
      return;
    }
    const onScroll = () => setIsScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [route]);

  const links = [
    { id: 'products', label: 'PRODUCTS' },
    { id: 'blog', label: 'BLOG' },
    { id: 'contacts', label: 'CONTACTS' },
  ];
  return (
    <header className={'site-header header-' + route + (route === 'home' ? ' home-header' : '') + (route === 'home' && isScrolled ? ' home-header-scrolled' : '')}>
      {route === 'home' && !isScrolled ? (
        <div className="header-spacer" aria-hidden="true" />
      ) : (
        <a href="#home" className="brand-mini">
          <img src="assets/crow-logo.png" alt="" />
          <span>cheervinsky</span>
        </a>
      )}
      <nav className="nav">
        {links.map(l => (
          <a
            key={l.id}
            href={'#' + l.id}
            className={route === l.id ? 'active' : ''}
          >{l.label}</a>
        ))}
        <span className="socials">
          <a href="#" aria-label="YouTube"><IconYouTube /></a>
          <a href="#" aria-label="Instagram"><IconInstagram /></a>
        </span>
      </nav>
    </header>
  );
}

// --- Footer ---
function Footer({ route }) {
  return (
    <footer className={'site-footer' + (route === 'home' ? ' home-footer' : '')}>
      <nav className="nav">
        <a href="#products">PRODUCTS</a>
        <a href="#blog">BLOG</a>
        <a href="#contacts">CONTACTS</a>
      </nav>
      <a href="#contacts" className="terms">Terms and Conditions and Privacy Policy</a>
      <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-2)', fontFamily: "'Vollkorn SC', serif", letterSpacing: '0.08em' }}>
        © 2026 Cheervinsky Studio · Made with care
      </div>
    </footer>
  );
}

function LiquidGlassDefs() {
  return (
    <svg className="svg-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="liquid-glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.022"
            numOctaves="1"
            seed="7"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              values="0.01 0.022;0.008 0.018;0.01 0.022"
              dur="14s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feGaussianBlur in="noise" stdDeviation="0.7" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

// --- Curvy decorative line that animates ---
function CurvyDivider() {
  return (
    <div className="curvy-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path
          className="curvy-path"
          d="M -80 74 C 92 44, 194 94, 272 72 C 330 54, 352 46, 348 72 C 344 98, 292 92, 308 66 C 326 38, 386 54, 452 72 C 570 104, 616 38, 704 68 C 752 84, 764 104, 738 100 C 706 96, 712 50, 762 52 C 826 54, 886 90, 980 72 C 1048 58, 1084 48, 1096 68 C 1112 94, 1058 98, 1070 70 C 1084 38, 1160 56, 1238 76 S 1392 92, 1520 68"
        />
      </svg>
    </div>
  );
}

// --- Image reference resolver ---
// Posts can reference images in four ways:
//   data:...            -> inline base64 (legacy)
//   http(s)://...       -> external URL (use directly)
//   ghmedia/<filename>  -> committed to the GitHub repo's data/media/ folder
//   media:<id>          -> IndexedDB blob (legacy; resolved async by callers)
//   <anything else>     -> treated as a path relative to the page (e.g. 'assets/foo.png')
function resolveImageRef(ref) {
  if (!ref || typeof ref !== 'string') return '';
  if (ref.startsWith('ghmedia/') && window.cheerSync && window.cheerSync.rawUrl) {
    return window.cheerSync.rawUrl(ref) || '';
  }
  return ref;
}

// --- Loose Phone-mockup component (uses uploaded mockup as a frame) ---
// We build the phone by composing the mockup PNG + an inset that holds an image.
function PhoneMockup({ src, alt = '', className = '', innerStyle = {} }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => src && src.startsWith('media:') ? '' : resolveImageRef(src));

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!src || !src.startsWith('media:')) {
      setResolvedSrc(resolveImageRef(src));
      return () => {
        active = false;
      };
    }

    const mediaId = src.slice(6);
    window.cheerMedia.getUrl(mediaId).then(url => {
      if (!active) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setResolvedSrc(url || '');
    }).catch(() => {
      if (!active) return;
      setResolvedSrc('');
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  // The iPhone mockup PNG already has a transparent screen area;
  // we render the screen image *behind* the frame using absolute positioning.
  return (
    <div className={'phone-frame ' + className} style={{ position: 'relative', height: '100%', aspectRatio: '0.49' }}>
      {/* Screen image */}
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={alt}
          style={{
            position: 'absolute',
            top: '2.6%', left: '5.4%',
            width: '89%', height: '94.8%',
            objectFit: 'cover',
            borderRadius: '7%',
            zIndex: 1,
            ...innerStyle,
          }}
        />
      ) : null}
      {/* Frame on top */}
      <img
        src="assets/iphone-mockup.png"
        alt=""
        style={{ position: 'relative', height: '100%', zIndex: 2, pointerEvents: 'none' }}
      />
    </div>
  );
}

Object.assign(window, {
  parseHash, navigate, useRoute, useStore, resolveImageRef,
  CrowLogo, StoreButton, Header, Footer, LiquidGlassDefs, CurvyDivider, PhoneMockup,
  IconYouTube, IconInstagram, IconArrow, IconPin, IconTrash, IconEdit,
});
