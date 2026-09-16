// Chibuike toasts — explain what failed, why, and what to do next.
import { store, useChibuike } from '../../chibuike/chibuikeStore';

export function ChibuikeToasts() {
  useChibuike();
  return (
    <div className="pf-toasts" role="status" aria-live="polite">
      {store.toasts.map(t => (
        <div key={t.id} className={`pf-toast ${t.kind}`}>
          <span style={{ flex: 1 }}>{t.msg}</span>
          {t.action && <button onClick={() => { t.action!.run(); store.toasts = store.toasts.filter(x => x.id !== t.id); store.bumpReact(); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}
