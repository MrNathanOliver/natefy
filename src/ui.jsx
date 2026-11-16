// App-wide UI state: current page, toasts, popup menus and modals.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [view, setView] = useState({ name: 'home' });
  const [toasts, setToasts] = useState([]);
  const [menu, setMenu] = useState(null); // { x, y, items }
  const [modal, setModal] = useState(null); // React element
  const [queueOpen, setQueueOpen] = useState(false);
  const history = useRef([]);

  const navigate = useCallback((v, { replace = false } = {}) => {
    setView((cur) => {
      if (!replace) history.current.push(cur);
      return v;
    });
    if (!replace) document.querySelector('.main')?.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    const prev = history.current.pop();
    if (prev) setView(prev);
  }, []);

  const notify = useCallback((text, kind = 'info') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const openMenu = useCallback((e, items) => {
    e.preventDefault();
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: r.right, y: r.bottom, items });
  }, []);

  const value = {
    view, navigate, back, notify, openMenu,
    openModal: setModal, closeModal: () => setModal(null),
    queueOpen, setQueueOpen,
    _overlay: { menu, setMenu, modal, setModal, toasts },
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/** Menus, modals and toasts. Rendered inside the other providers so they can use them. */
export function UIOverlays() {
  const { menu, setMenu, modal, setModal, toasts } = useContext(UIContext)._overlay;
  const closeMenu = useCallback(() => setMenu(null), [setMenu]);
  return (
    <>
      {menu && <Menu {...menu} onClose={closeMenu} />}
      {modal && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            {modal}
          </div>
        </div>
      )}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </>
  );
}

export const useUI = () => useContext(UIContext);

function Menu({ x, y, items, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y, opacity: 0 });

  useEffect(() => {
    // Keep the menu on-screen.
    const r = ref.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(x - r.width, window.innerWidth - r.width - 8));
    const top = y + r.height > window.innerHeight - 8 ? y - r.height - 36 : y + 4;
    setPos({ left, top: Math.max(8, top), opacity: 1 });

    const close = (e) => !ref.current?.contains(e.target) && onClose();
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
      window.removeEventListener('resize', onClose);
    };
  }, [x, y, onClose]);

  return (
    <div ref={ref} className="menu" style={pos}>
      {items.filter(Boolean).map((it, i) =>
        it === '-' ? (
          <div key={i} className="menu-sep" />
        ) : (
          <button
            key={i}
            className={`menu-item ${it.danger ? 'danger' : ''}`}
            onClick={() => {
              onClose();
              it.onClick();
            }}
          >
            {it.label}
          </button>
        )
      )}
    </div>
  );
}

/** True on phone-sized screens (matches the CSS breakpoint). */
const PHONE_QUERY = '(max-width: 760px)';
export function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}
