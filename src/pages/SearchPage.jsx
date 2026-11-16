import { useEffect, useState } from 'react';
import { useLibrary } from '../library.jsx';
import { searchYouTube } from '../search.js';
import TrackList from '../components/TrackList.jsx';
import { EmptyState } from '../components/Common.jsx';

const cache = new Map(); // `${tab}:${query}` -> { results, server }

const TABS = [
  { id: 'songs', label: 'Songs' },
  { id: 'videos', label: 'Videos' },
];

export default function SearchPage({ q }) {
  const { state, dispatch } = useLibrary();
  const [tab, setTab] = useState('songs');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!q) {
      setStatus('idle');
      setData(null);
      return;
    }
    const key = `${tab}:${q.toLowerCase()}`;
    if (cache.has(key)) {
      setData(cache.get(key));
      setStatus('done');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    searchYouTube(q, tab)
      .then((res) => {
        if (cancelled) return;
        cache.set(key, res);
        // Remember these so they can be played, liked or added to playlists.
        dispatch({ type: 'CACHE_TRACKS', tracks: res.results.map((t) => ({ ...t, addedAt: Date.now() })) });
        setData(res);
        setStatus('done');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [q, tab, retry, dispatch]);

  // Show the library's copy where there is one (it may be saved or edited).
  const tracks = (data?.results || []).map((r) => state.tracks[r.id] || { ...r, inLibrary: false });

  return (
    <div className="page">
      <div className="search-head">
        <h1 className="greeting">{q ? <>Results for “{q}”</> : 'Search'}</h1>
        {q && (
          <div className="chips">
            {TABS.map((t) => (
              <button key={t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!q && (
        <EmptyState title="Find something to play">
          Type a song, artist or album in the box above. Songs you play from search show up in Recently played;
          press + to save one to your library.
        </EmptyState>
      )}

      {status === 'loading' && (
        <div className="skeletons">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" />)}
        </div>
      )}

      {status === 'error' && (
        <EmptyState title="Search isn’t working right now">
          Natefy searches through free public servers, and none of them answered. Try again in a minute, or paste a
          YouTube link instead.
          <br />
          <button className="btn ghost small retry" onClick={() => setRetry((n) => n + 1)}>Try again</button>
        </EmptyState>
      )}

      {status === 'done' && (
        tracks.length ? (
          <>
            <TrackList tracks={tracks} context={`Search · ${q}`} showAdded={false} />
            <p className="muted small hint">Results via {data.server}</p>
          </>
        ) : (
          <EmptyState title={`No results for “${q}”`}>Check the spelling, or try the Videos tab.</EmptyState>
        )
      )}
    </div>
  );
}
