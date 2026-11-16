import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { libraryTracks, useLibrary } from '../library.jsx';
import { useIsPhone, useUI } from '../ui.jsx';
import { decodeLibrary, encodeLibrary, libraryLink, mergeLibraries } from '../sync.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const describe = (lib) =>
  `${plural(libraryTracks(lib).length, 'song')}, ${plural(lib.playlists.length, 'playlist')}, ${lib.liked.length} liked`;
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function QR({ text }) {
  const svg = useMemo(() => {
    if (text.length > 1600) return null; // too dense to scan off a screen
    try {
      const qr = qrcode(0, 'L');
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
    } catch {
      return null;
    }
  }, [text]);
  if (!svg) return <p className="muted small">Your library is too big for a QR code. Use Copy link or Share instead.</p>;
  return <div className="sync-qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function SyncModal({ incoming = '' }) {
  const { state, dispatch } = useLibrary();
  const { closeModal, notify } = useUI();
  const isPhone = useIsPhone();
  const [tab, setTab] = useState(incoming ? 'receive' : 'send');
  const [code, setCode] = useState('');
  const [text, setText] = useState(incoming);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    encodeLibrary(state).then(setCode);
  }, [state]);

  useEffect(() => {
    setParsed(null);
    setError('');
    if (!text.trim()) return;
    let off = false;
    decodeLibrary(text).then((lib) => !off && setParsed(lib), (e) => !off && setError(e.message));
    return () => { off = true; };
  }, [text]);

  const link = code ? libraryLink(code) : '';
  const copy = async (value, what) => {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${what} copied`);
    } catch {
      notify('Couldn’t copy. Select the text and copy it yourself.', 'error');
    }
  };
  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      notify('Couldn’t read the clipboard. Paste into the box instead.', 'error');
    }
  };
  const apply = (mode) => {
    dispatch({ type: 'REPLACE_LIBRARY', state: mode === 'replace' ? parsed : mergeLibraries(state, parsed) });
    notify(mode === 'merge' ? 'Libraries combined' : hasOwn ? 'Library replaced' : 'Library added');
    closeModal();
  };
  const hasOwn = libraryTracks(state).length > 0 || state.playlists.length > 0;

  return (
    <div className="sync">
      <h2>Sync with another device</h2>
      <div className="chips sync-tabs">
        <button className={`chip ${tab === 'send' ? 'on' : ''}`} onClick={() => setTab('send')}>Send from here</button>
        <button className={`chip ${tab === 'receive' ? 'on' : ''}`} onClick={() => setTab('receive')}>Receive here</button>
      </div>

      {tab === 'send' && (
        <>
          <p className="muted">
            This device has {describe(state)}. Open the link on your other device to copy everything there.
          </p>
          {!isPhone && link && (
            <>
              <QR text={link} />
              <p className="muted small">Point your phone’s camera at the code.</p>
            </>
          )}
          <div className="modal-actions sync-actions">
            {navigator.share && (
              <button className="btn ghost" disabled={!link} onClick={() => navigator.share({ title: 'My Natefy library', url: link }).catch(() => {})}>
                Share…
              </button>
            )}
            <button className="btn primary" disabled={!link} onClick={() => copy(link, 'Link')}>Copy link</button>
          </div>
        </>
      )}

      {tab === 'receive' && (
        <>
          <p className="muted">Paste a Natefy link or code from your other device.</p>
          <div className="sync-paste">
            <input className="sync-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste link here" spellCheck={false} />
            <button className="btn ghost small" onClick={paste}>Paste</button>
          </div>
          {error && <p className="sync-error">{error}</p>}
          {parsed && (
            <>
              <p>
                <strong>Found:</strong> {describe(parsed)}.
              </p>
              {!standalone() && isPhone && (
                <p className="muted small sync-note">
                  Using Natefy from your Home Screen? It keeps its own library, separate from this browser tab. Tap{' '}
                  <button className="link sync-inline" onClick={() => copy(text, 'Link')}>copy this link</button>, open Natefy
                  from your Home Screen, then go to Sync › Receive here › Paste.
                </p>
              )}
              <div className="modal-actions sync-actions">
                {hasOwn ? (
                  <>
                    <button className="btn ghost" onClick={() => apply('replace')} title="Anything only on this device will be lost">
                      Replace this device’s library
                    </button>
                    <button className="btn primary" onClick={() => apply('merge')}>Combine with this device</button>
                  </>
                ) : (
                  <button className="btn primary" onClick={() => apply('replace')}>Add to this device</button>
                )}
              </div>
              {hasOwn && (
                <p className="muted small">
                  Combine keeps everything from both. Replace makes this device an exact copy (songs only here are removed).
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
