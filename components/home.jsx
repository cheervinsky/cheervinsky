// Home page: hero + carousel + pinned post + features + extras
const { useEffect: useEffect2, useState: useState2, useRef: useRef2 } = React;

function Carousel() {
  const store = useStore();
  const productPosts = store.posts
    .filter(p => p.published !== false && p.status === 'product' && p.includeInCarousel)
    .map(p => ({
      id: p.id,
      name: p.title,
      title: p.title,
      tagline: p.excerpt,
      description: p.excerpt || p.body,
      hero: p.cover || 'assets/iphone-mockup.png',
      productIcon: p.productIcon || '',
      appStore: p.appStore || '',
      googlePlay: p.googlePlay || '',
      eyebrow: 'PRODUCT',
      monogram: p.title ? p.title[0] : 'P',
      detailHref: '#post/' + p.id,
    }));
  const products = productPosts.length ? productPosts : store.products;
  const [idx, setIdx] = useState2(0);
  const [phase, setPhase] = useState2('in'); // 'in' | 'out'
  const timerRef = useRef2(null);

  const advance = (next) => {
    setPhase('out');
    setTimeout(() => {
      setIdx((next + products.length) % products.length);
      setPhase('enter');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
    }, 1150);
  };

  useEffect2(() => {
    timerRef.current = setInterval(() => {
      advance(idx + 1);
    }, 10000);
    return () => clearInterval(timerRef.current);
  }, [idx, products.length]);

  const goto = (i) => {
    clearInterval(timerRef.current);
    advance(i);
  };

  const product = products[idx];
  const phoneClass = phase === 'out' ? 'exiting' : phase === 'enter' ? 'entering' : '';
  const glassClass = phase === 'out' ? ' exiting' : phase === 'enter' ? ' entering' : '';

  return (
    <section className="section">
      <div className="carousel">
        <div className="phone-stage">
          <div className="phone-shadow" />
          <PhoneMockup src={product.hero} alt={product.name} className={phoneClass} />
        </div>
        <div className={'glass carousel-glass' + glassClass}>
          <div className="carousel-glass-content">
            <p className="glass-eyebrow">{product.eyebrow || 'CHEERVINSKY APP'}</p>
            <h2>
              {product.detailHref ? (
                <a href={product.detailHref} className="carousel-title-link">
                  {product.productIcon ? (
                    <img className="carousel-title-icon" src={product.productIcon} alt="" />
                  ) : (
                    <span className="ink-mark" style={{ color: 'var(--honey-deep)', fontStyle: 'italic' }}>{product.monogram || product.name[0]}</span>
                  )}
                  {product.productIcon ? product.name : product.name.slice(1)}
                </a>
              ) : (
                <>
                  <span className="ink-mark" style={{ color: 'var(--honey-deep)', fontStyle: 'italic' }}>{product.monogram || product.name[0]}</span>
                  {product.name.slice(1)}
                </>
              )}
            </h2>
            {product.detailHref ? (
              <a href={product.detailHref} className="carousel-description-link">{product.description}</a>
            ) : (
              <p>{product.description}</p>
            )}
            <div className="cta-row">
              {product.detailHref ? (
                <>
                  {product.googlePlay ? <StoreButton kind="google" href={product.googlePlay} /> : null}
                  {product.appStore ? <StoreButton kind="apple" href={product.appStore} /> : null}
                  <a href={product.detailHref} className="btn dark">Read about product</a>
                </>
              ) : (
                <>
                  <StoreButton kind="google" href={product.googlePlay} />
                  <StoreButton kind="apple" href={product.appStore} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="carousel-controls">
        <button className="arrow-btn" onClick={() => goto(idx - 1)} aria-label="Previous"><IconArrow left /></button>
        <div className="dots">
          {products.map((_, i) => (
            <button key={i} className={i === idx ? 'active' : ''} onClick={() => goto(i)} aria-label={'Go to slide ' + (i + 1)} />
          ))}
        </div>
        <button className="arrow-btn" onClick={() => goto(idx + 1)} aria-label="Next"><IconArrow /></button>
      </div>
    </section>
  );
}

function PinnedPost() {
  const store = useStore();
  const publishedPosts = store.posts.filter(p => p.published !== false && p.status !== 'product');
  const post = publishedPosts.find(p => p.pinned) || publishedPosts[0];
  if (!post) return null;
  return (
    <section className="section">
      <CurvyDivider />
      <div className="pinned-blog">
        <div className="phone-stage pinned-phone-stage">
          <div className="phone-shadow" />
          <PhoneMockup src={post.cover || 'assets/iphone-mockup.png'} alt={post.title} className="pinned-phone" />
        </div>
        <div className="glass pinned-glass">
          <div className="carousel-glass-content pinned-glass-content">
            <p className="glass-eyebrow">FROM THE BLOG · PINNED</p>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <div className="cta-row pinned-cta-row">
              <a href={'#post/' + post.id} className="btn">Read in Blog</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesStrip() {
  const items = [
    {
      title: 'FIRST EMDR AND BREATHING APP',
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="50" cy="55" r="22" />
          <text x="50" y="62" textAnchor="middle" fontFamily="Vollkorn SC, serif" fontSize="22" fontWeight="700" fill="currentColor" stroke="none">1</text>
          <path d="M20 78 Q35 70 50 76 Q65 82 80 78" />
          <path d="M22 80 Q30 92 38 86" />
          <path d="M78 80 Q70 92 62 86" />
          <path d="M30 65 Q24 50 30 38" />
          <path d="M70 65 Q76 50 70 38" />
        </svg>
      )
    },
    {
      title: 'THE MOST UNIQUE APP',
      icon: (
        <svg className="crown-icon" viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 22 c-3 -8 -10 -10 -14 -10 c2 4 4 8 4 12 c-6 -2 -12 0 -16 4 c4 0 8 2 10 4 c-4 4 -6 10 -4 16 c2 -3 6 -6 10 -7 c-2 6 0 14 4 18 c0 -5 2 -10 5 -13 c2 6 8 12 14 13 c-3 -4 -5 -8 -5 -13 c5 1 11 -1 14 -5 c-4 0 -8 -2 -10 -5 c4 -4 6 -10 4 -16 c-3 3 -7 5 -11 6 c2 -5 0 -11 -5 -14 z M50 65 c-3 0 -5 8 -5 18 h10 c0 -10 -2 -18 -5 -18 z" />
        </svg>
      )
    },
    {
      title: 'REAL IMPROVEMENTS OF YOUR LIFE',
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M50 70 V30" strokeWidth="2" />
          <path d="M50 30 Q42 36 38 44 Q34 52 38 58 Q42 60 46 56 Q50 50 50 30" fill="currentColor" stroke="none" opacity="0.85" />
          <path d="M50 30 Q58 36 62 44 Q66 52 62 58 Q58 60 54 56 Q50 50 50 30" fill="currentColor" stroke="none" opacity="0.85" />
          <path d="M30 70 Q35 65 40 70 Q45 75 40 80" />
          <path d="M70 70 Q65 65 60 70 Q55 75 60 80" />
          <rect x="34" y="78" width="32" height="6" rx="2" fill="currentColor" stroke="none" />
          <path d="M28 84 H72" strokeWidth="2" />
        </svg>
      )
    }
  ];
  return (
    <section className="features-strip">
      <div className="features-grid">
        {items.map((it, i) => (
          <div key={i} className="feature">
            <div className="ico">{it.icon}</div>
            <h3>{it.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

function MoreFeatures() {
  const items = [
    { num: '01 · ECOSYSTEM', title: 'Five apps. One studio.', body: 'Each app shares the same warm visual language and the same calm philosophy. Switch between them and nothing jars.' },
    { num: '02 · OFFLINE FIRST', title: 'Yours, on your device.', body: 'No accounts, no sync server, no telemetry. Your journal, your timer, your habits — they live where they belong.' },
    { num: '03 · SLOW BY DESIGN', title: 'Nothing is in a hurry.', body: 'Animations breathe. Reminders fade in. Streaks forgive. We make tools for a life worth slowing down for.' },
    { num: '04 · ACCESSIBLE', title: 'Built for every reader.', body: 'High-contrast text, generous tap targets, full keyboard navigation, reduced-motion mode. Always, by default.' },
    { num: '05 · NO ADS, EVER', title: 'A small, honest price.', body: 'A single fair purchase unlocks the whole studio for life. No subscriptions, no upsells, no dark patterns.' },
    { num: '06 · OPEN ROADMAP', title: 'You\'ll know what\'s next.', body: 'We publish what we\'re working on, what we\'re reading, and what we\'re wrestling with. Every month, plainly.' }
  ];
  return (
    <section className="section" style={{ paddingTop: 96, paddingBottom: 96 }}>
      <span className="section-eyebrow">WHAT WE BELIEVE</span>
      <h2 className="section-title">A studio you can trust with your time.</h2>
      <div className="more-features">
        {items.map((it, i) => (
          <div key={i} className="feature-card" style={{ animationDelay: (i * 60) + 'ms' }}>
            <p className="num">{it.num}</p>
            <h4>{it.title}</h4>
            <p>{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  const [titleProgress, setTitleProgress] = useState2(0);

  useEffect2(() => {
    const onScroll = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / 110));
      setTitleProgress(progress);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const titleScale = 1 - titleProgress * 0.52;
  const titleX = -200 * titleProgress;
  const titleY = -70 * titleProgress;
  const titleOpacity = 1 - titleProgress * 0.9;
  const taglineOpacity = Math.max(0, 1 - titleProgress * 2.2);

  return (
    <div className="page">
      <section className="hero-brand">
        <h1
          className="hero-title"
          style={{
            transform: `translate(${titleX}px, ${titleY}px) scale(${titleScale})`,
            opacity: titleOpacity,
          }}
        >
          <CrowLogo size={44} />
          <span>Cheervinsky</span>
        </h1>
        <p
          className="tagline"
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${-14 * titleProgress}px)`,
          }}
        >
          A small studio of warm, careful apps. Tools for relaxing, focusing, noticing yourself, and making the everyday a little more playful.
        </p>
      </section>
      <Carousel />
      <PinnedPost />
      <FeaturesStrip />
      <MoreFeatures />
    </div>
  );
}

Object.assign(window, { HomePage, Carousel, PinnedPost, FeaturesStrip, MoreFeatures });
