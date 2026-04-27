// App root: routing + scroll progress + parallax orbs
function ScrollProgress() {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const fn = () => {
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
      setW(Math.min(1, window.scrollY / max));
    };
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return <div className="scroll-progress" style={{ transform: `scaleX(${w})` }} />;
}

function ParallaxOrbs() {
  const refs = [React.useRef(), React.useRef(), React.useRef()];
  React.useEffect(() => {
    let mx = 0, my = 0, sy = 0;
    const onMove = (e) => {
      mx = (e.clientX / window.innerWidth - 0.5);
      my = (e.clientY / window.innerHeight - 0.5);
    };
    const onScroll = () => { sy = window.scrollY; };
    let raf;
    const tick = () => {
      if (refs[0].current) refs[0].current.style.transform = `translate(${mx * 30}px, ${my * 30 + sy * -0.08}px)`;
      if (refs[1].current) refs[1].current.style.transform = `translate(${mx * -25}px, ${my * -20 + sy * -0.04}px)`;
      if (refs[2].current) refs[2].current.style.transform = `translate(${mx * 18}px, ${my * 18 + sy * -0.12}px)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove); window.removeEventListener('scroll', onScroll); };
  }, []);
  return (
    <>
      <div ref={refs[0]} className="orb o1" />
      <div ref={refs[1]} className="orb o2" />
      <div ref={refs[2]} className="orb o3" />
    </>
  );
}

function App() {
  const { route, param, hidden } = useRoute();
  const isAdminSession = sessionStorage.getItem('cheer_admin_session') === '1';

  React.useEffect(() => {
    // Clear any previous persistent admin flag; admin is session-only.
    localStorage.removeItem('cheer_admin_session');
  }, []);

  React.useEffect(() => {
    // The unique admin URL embeds your GitHub PAT directly:
    //   index.html#admin/<your-PAT>
    // Anyone without the right token can still load #admin (it just shows the
    // blog), but writes will fail at the GitHub API. The URL itself IS the
    // secret — bookmark it, don't share it.
    if (route === 'admin' && param) {
      const token = param;
      sessionStorage.setItem('cheer_admin_session', '1');
      sessionStorage.setItem('cheer_admin_token', token);
      if (window.cheerSync) {
        window.cheerSync.setToken(token);
        window.dispatchEvent(new CustomEvent('cheer-admin-token-changed'));
      }
      if (window.location.hash !== '#admin') window.location.hash = '#admin';
      return;
    }
    // Legacy support for #admin#<token> — token in `hidden`.
    if (hidden && hidden.startsWith('admin/')) {
      const token = hidden.slice('admin/'.length);
      if (token) {
        sessionStorage.setItem('cheer_admin_session', '1');
        sessionStorage.setItem('cheer_admin_token', token);
        if (window.cheerSync) {
          window.cheerSync.setToken(token);
          window.dispatchEvent(new CustomEvent('cheer-admin-token-changed'));
        }
        if (window.location.hash !== '#admin') window.location.hash = '#admin';
        return;
      }
    }

    // Re-hydrate the in-memory sync token from sessionStorage on subsequent
    // navigations within the admin session.
    if (isAdminSession && window.cheerSync && !window.cheerSync.hasToken()) {
      const stashed = sessionStorage.getItem('cheer_admin_token') || '';
      if (stashed) {
        window.cheerSync.setToken(stashed);
        window.dispatchEvent(new CustomEvent('cheer-admin-token-changed'));
      }
    }

    if (route !== 'admin') return;

    if (isAdminSession) return;
    window.location.hash = '#blog';
  }, [route, param, hidden, isAdminSession]);

  let body = null;
  if (route === 'home' || route === '') body = <HomePage />;
  else if (route === 'blog') body = <BlogPage />;
  else if (route === 'post') body = <PostPage id={param} />;
  else if (route === 'products') body = <ProductsPage />;
  else if (route === 'product') body = <ProductDetailPage id={param} />;
  else if (route === 'contacts') body = <ContactsPage />;
  else if (route === 'admin') body = isAdminSession ? <AdminPage /> : <BlogPage />;
  else body = <HomePage />;

  return (
    <div className={'app route-' + (route || 'home')} data-screen-label={'01 ' + (route || 'home')}>
      <LiquidGlassDefs />
      <div className="bg-gradient" />
      <div className="bg-grain" />
      <ParallaxOrbs />
      <ScrollProgress />
      <Header route={route} />
      {body}
      <Footer route={route} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
