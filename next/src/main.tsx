// Chibuike app entry — hash routing keeps the landing bundle tiny; the studio
// is lazy-loaded so the marketing page never pays for editor code.
import { StrictMode, lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './ui/Landing';
import { Tutorial } from './ui/Tutorial';
import './chibuike/chibuikeStyle.css';

const Studio = lazy(() => import('./ui/studio/Studio'));

function ChibuikeRoute() {
  const [route, setRoute] = useState(() => location.hash.replace(/^#\/?/, '') || '');
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace(/^#\/?/, ''));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  if (route.startsWith('studio')) {
    return (
      <Suspense fallback={<div className="pf-app"><div style={{ margin: 'auto' }} className="pf-muted">Warming up the studio…</div></div>}>
        <Studio />
      </Suspense>
    );
  }
  if (route.startsWith('tutorial')) return <Tutorial />;
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChibuikeRoute />
  </StrictMode>,
);
