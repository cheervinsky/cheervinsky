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
      hero: p.homeImage || p.cover || '',
      heroPosition: p.homeImagePosition || '50% 50%',
      heroZoom: p.homeImageZoom || 100,
      productIcon: p.productIcon || '',
      productIconSize: Math.max(12, Math.min(140, parseInt(p.productIconSize, 10) || 34)),
      productIconGap: Math.max(-80, Math.min(80, parseInt(p.productIconGap, 10) || 8)),
      productIconShiftX: Math.max(-120, Math.min(120, parseInt(p.productIconShiftX, 10) || 0)),
      productIconShiftY: Math.max(-90, Math.min(90, parseInt(p.productIconShiftY, 10) || 0)),
      appStore: p.appStore || '',
      googlePlay: p.googlePlay || '',
      eyebrow: 'PRODUCT',
      monogram: p.title ? p.title[0] : 'P',
      detailHref: '#post/' + p.id,
    }));
  const products = productPosts;
  const [idx, setIdx] = useState2(0);
  const [phase, setPhase] = useState2('in'); // 'in' | 'out'
  const timerRef = useRef2(null);

  // NOTE: all hooks MUST be called before any conditional early return,
  // otherwise React throws "Rendered more hooks than during the previous
  // render" the moment products goes from empty -> non-empty (e.g. when the
  // store finishes loading from GitHub).
  useEffect2(() => {
    if (!products.length) return undefined;
    timerRef.current = setInterval(() => {
      setPhase('out');
      setTimeout(() => {
        setIdx(i => (i + 1 + products.length) % products.length);
        setPhase('enter');
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
      }, 1150);
    }, 10000);
    return () => clearInterval(timerRef.current);
  }, [idx, products.length]);

  if (!products.length) return null;

  const advance = (next) => {
    setPhase('out');
    setTimeout(() => {
      setIdx((next + products.length) % products.length);
      setPhase('enter');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
    }, 1150);
  };

  const goto = (i) => {
    clearInterval(timerRef.current);
    advance(i);
  };

  const product = products[idx];
  const phoneClass = phase === 'out' ? 'exiting' : phase === 'enter' ? 'entering' : '';
  const glassClass = phase === 'out' ? ' exiting' : phase === 'enter' ? ' entering' : '';
  const loopLineClass = phase === 'in' ? 'carousel-loop-line' : 'carousel-loop-line visible';

  return (
    <section className="section">
      <div className="carousel">
        <div className="phone-stage">
          <div className="phone-shadow" />
          <PhoneMockup src={product.hero} alt={product.name} className={phoneClass} innerStyle={getHomeImageStyle(product.heroPosition, product.heroZoom)} />
        </div>
        <div className={'glass carousel-glass' + glassClass}>
          <div className="carousel-glass-content">
            <p className="glass-eyebrow">{product.eyebrow || 'CHEERVINSKY APP'}</p>
            <h2>
              {product.detailHref ? (
                <a href={product.detailHref} className="carousel-title-link">
                  {product.productIcon ? (
                    <img
                      className="carousel-title-icon"
                      src={product.productIcon}
                      alt=""
                      style={{
                        width: product.productIconSize,
                        height: product.productIconSize,
                        marginRight: product.productIconGap,
                        transform: `translate(${product.productIconShiftX}px, ${product.productIconShiftY}px)`,
                      }}
                    />
                  ) : null}
                  {product.name}
                </a>
              ) : (
                <>
                  {product.name}
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
                  <a href={product.detailHref} className="btn dark product-read-about-btn">Read about product</a>
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
        <div className={loopLineClass} aria-hidden="true">
          <svg viewBox="0 0 120 110" preserveAspectRatio="xMidYMid meet">
            <path d="M60 94 C34 73, 18 56, 18 38 C18 23, 28 14, 41 14 C50 14, 56 20, 60 28 C64 20, 70 14, 79 14 C92 14, 102 23, 102 38 C102 56, 86 73, 60 94 Z" />
          </svg>
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
          <PhoneMockup
            src={post.homeImage || post.cover || ''}
            alt={post.title}
            className="pinned-phone"
            innerStyle={getHomeImageStyle(post.homeImagePosition, post.homeImageZoom)}
          />
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
      title: <>TRUSTED BY <span className="feature-highlight">20,000+ USERS</span> WORLDWIDE</>,
      icon: <img src="assets/first_place_icon.png" alt="" />
    },
    {
      title: 'BUILT ON REAL NEUROSCIENCE & EVIDENCE-BASED RESEARCH',
      icon: <img src="assets/unique_apps_icon.png" alt="" />
    },
    {
      title: 'NO TRUE ALTERNATIVES ON THE MARKET',
      icon: <img src="assets/user_selection_icon.png" alt="" />
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
    { num: '01 · ONE ECOSYSTEM', title: 'Everything, in harmony.', body: 'All apps live within one cohesive ecosystem - one philosophy, one visual language, one seamless experience. Move between them effortlessly. Nothing breaks your flow.' },
    { num: '02 · OFFLINE FIRST', title: 'Yours, on your device.', body: 'No accounts, no sync server, no telemetry. Your journal, your timer, your habits - they live where they belong.' },
    { num: '03 · SLOW BY DESIGN', title: 'Nothing is in a hurry.', body: 'Every interaction is shaped around human psychology and natural behavior patterns. Animations breathe. Reminders arrive gently. Tools that respect your pace - not fight it.' },
    { num: '04 · BUILT FOR MODERN LIFE', title: 'Clarity in a noisy world.', body: 'Continuously updated with the latest scientific insights and shaped by the realities of modern life - from social media overload to AI acceleration. Designed to help you disconnect, regain control, and think clearly again.' },
    { num: '05 · HONEST PRICING', title: 'Fair, and made to be accessible.', body: 'Pricing is kept simple and considerate - designed to be available to as many people as possible. Minimal advertising, no manipulation, no pressure.' },
    { num: '06 · OPEN ROADMAP', title: 'You\'ll know what\'s next.', body: 'We share what we\'re building, exploring, and questioning - openly, every month.' }
  ];
  return (
    <section className="section" style={{ paddingTop: 96, paddingBottom: 96 }}>
      <span className="section-eyebrow">YOU'RE IN GOOD HANDS</span>
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
          Warm, careful apps built on <strong>neuroscience</strong> and attention science - designed for a world that has become extremely efficient at distracting you.
          We help you focus, relax, and <strong>remember what you were doing five seconds ago</strong>.
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
