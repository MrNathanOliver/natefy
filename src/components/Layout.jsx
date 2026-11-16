import { useEffect, useRef, useState } from 'react';
import { isSaved, uid, useLibrary } from '../library.jsx';
import { usePlayer } from '../player.jsx';
import { useIsPhone, useUI } from '../ui.jsx';
import { fetchVideoMeta, formatTime, guessArtistAndTitle, parseVideoIds, thumbnailUrl } from '../youtube.js';
import { Cover } from './Common.jsx';
import { PromptModal } from './Modals.jsx';
import SyncModal from './SyncModal.jsx';
import {
  ChevronDown, Clock, Close, Library, Logo, SyncIcon, SearchIcon, Heart, HeartFilled, Home, Link, ListIcon, Mic, Music, Next, Pause, Play, Plus, Prev,
  QueueIcon, Repeat, RepeatOne, Shuffle, VideoIcon, Volume, VolumeOff,
} from './Icons.jsx';

export function useNewPlaylist() {
  const { state, dispatch } = useLibrary();
  const { navigate, openModal } = useUI();
  return () =>
    openModal(
      <PromptModal
        title="New playlist"
        label="Name"
        initial={`My playlist #${state.playlists.length + 1}`}
        confirmLabel="Create"
        onSubmit={(name) => {
          const id = uid();
          dispatch({ type: 'CREATE_PLAYLIST', id, name });
          navigate({ name: 'playlist', id });
        }}
      />
    );
}

const focusSearch = () => setTimeout(() => document.querySelector('.add-form input')?.focus(), 0);

export function Sidebar() {
  const { state } = useLibrary();
  const { view, navigate, openModal } = useUI();
  const player = usePlayer();
  const newPlaylist = useNewPlaylist();
  const is = (name, extra = {}) =>
    view.name === name && Object.entries(extra).every(([k, v]) => view[k] === v) ? 'active' : '';

  return (
    <aside className="sidebar">
      <div className="brand"><Logo size={24} /> natefy</div>
      <nav>
        <button className={`nav-item ${is('home')}`} onClick={() => navigate({ name: 'home' })}><Home /> Home</button>
        <button className={`nav-item ${is('search')}`} onClick={() => { navigate({ name: 'search', q: '' }); focusSearch(); }}><SearchIcon /> Search</button>
        <button className={`nav-item ${is('songs')}`} onClick={() => navigate({ name: 'songs' })}><ListIcon /> Songs</button>
        <button className={`nav-item ${is('artists')}`} onClick={() => navigate({ name: 'artists' })}><Mic /> Artists</button>
        <button className={`nav-item ${is('recent')}`} onClick={() => navigate({ name: 'recent' })}><Clock /> Recently played</button>
        <button className="nav-item" onClick={() => openModal(<SyncModal />)}><SyncIcon /> Sync devices</button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-head">
          <span>Playlists</span>
          <button className="icon-btn" title="Create playlist" onClick={newPlaylist}><Plus size={18} /></button>
        </div>
        <div className="playlist-list">
          <button className={`pl-item ${is('liked')}`} onClick={() => navigate({ name: 'liked' })}>
            <span className="cover liked-cover small"><HeartFilled size={16} /></span>
            <span className="pl-text">
              <span className="pl-name">Liked Songs</span>
              <span className="muted small">{state.liked.length} songs</span>
            </span>
          </button>
          {state.playlists.map((p) => (
            <button key={p.id} className={`pl-item ${is('playlist', { id: p.id })}`} onClick={() => navigate({ name: 'playlist', id: p.id })}>
              <Cover ids={p.trackIds} className="small" />
              <span className="pl-text">
                <span className="pl-name">{p.name}</span>
                <span className="muted small">{p.trackIds.length} songs</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {player.current && player.mode === 'audio' && (
        <div className="mini-slot">
          <div className="mini-head">
            <span className="muted small">Now playing</span>
            <button className="icon-btn" title="Show video" onClick={() => player.setMode('video')}>
              <VideoIcon size={16} />
            </button>
          </div>
          {/* The YouTube player is positioned over this box (see .yt-host.audio). */}
          <div className="mini-video" />
        </div>
      )}
    </aside>
  );
}

/** Bottom tab bar on phones. */
export function TabBar() {
  const { view, navigate } = useUI();
  const libraryViews = ['library', 'songs', 'liked', 'recent', 'artists', 'artist', 'playlist'];
  const tabs = [
    { label: 'Home', icon: <Home size={22} />, on: view.name === 'home', go: () => navigate({ name: 'home' }) },
    { label: 'Search', icon: <SearchIcon size={22} />, on: view.name === 'search', go: () => { navigate({ name: 'search', q: '' }); focusSearch(); } },
    { label: 'Your library', icon: <Library size={22} />, on: libraryViews.includes(view.name), go: () => navigate({ name: 'library' }) },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.label} className={`tab ${t.on ? 'on' : ''}`} onClick={t.go}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

const looksLikeLink = (text) => /youtu\.?be|^https?:\/\//i.test(text.trim());

export function TopBar() {
  const { state, dispatch } = useLibrary();
  const { view, navigate, notify, back } = useUI();
  const [text, setText] = useState(view.name === 'search' ? view.q : '');
  const [busy, setBusy] = useState(false);
  const debounce = useRef(null);

  const targetPlaylist = view.name === 'playlist' ? state.playlists.find((p) => p.id === view.id) : null;
  const isLink = looksLikeLink(text);

  const lastSearched = useRef(null);

  // Leaving the search page clears the box (unless a link is being pasted);
  // a search started elsewhere (e.g. an artist page) fills it in.
  useEffect(() => {
    if (view.name !== 'search') setText((t) => (looksLikeLink(t) ? t : ''));
    else if (view.q !== lastSearched.current) setText(view.q);
  }, [view]);

  const search = (q, replace) => {
    clearTimeout(debounce.current);
    if (q.trim().length < 2) return;
    lastSearched.current = q.trim();
    navigate({ name: 'search', q: q.trim() }, { replace });
  };

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    clearTimeout(debounce.current);
    if (!looksLikeLink(value)) {
      debounce.current = setTimeout(() => search(value, view.name === 'search'), 450);
    }
  };

  const addLinks = async () => {
    const ids = parseVideoIds(text);
    if (!ids.length) {
      notify('That doesn’t look like a YouTube video link', 'error');
      return;
    }
    setBusy(true);
    const fresh = ids.filter((id) => !state.tracks[id]);
    const unsaved = ids.filter((id) => state.tracks[id] && !isSaved(state.tracks[id]));
    const results = await Promise.allSettled(fresh.map(fetchVideoMeta));
    const now = Date.now();
    const added = [];
    const failed = [];
    results.forEach((r, i) => {
      const id = fresh[i];
      if (r.status === 'fulfilled') {
        const { rawTitle, channel } = r.value;
        added.push({ id, rawTitle, channel, ...guessArtistAndTitle(rawTitle, channel), addedAt: now - i, inLibrary: true });
      } else {
        failed.push(r.reason?.message || 'Couldn’t load video');
      }
    });
    if (added.length) dispatch({ type: 'ADD_TRACKS', tracks: added });
    for (const id of unsaved) dispatch({ type: 'SAVE_TRACK', id });
    added.push(...unsaved.map((id) => state.tracks[id]));

    const okIds = ids.filter((id) => state.tracks[id] || added.some((t) => t.id === id));
    if (targetPlaylist && okIds.length) {
      dispatch({ type: 'ADD_TO_PLAYLIST', id: targetPlaylist.id, trackIds: okIds });
    }

    const where = targetPlaylist ? ` to ${targetPlaylist.name}` : '';
    if (added.length === 1 && !failed.length) notify(`Added “${added[0].title}”${where}`);
    else if (added.length) notify(`Added ${added.length} songs${where}`);
    else if (okIds.length && targetPlaylist) notify(`Added to ${targetPlaylist.name}`);
    else if (okIds.length) notify('Already in your library');
    if (failed.length) notify(failed.length === 1 ? failed[0] : `${failed.length} links couldn’t be added`, 'error');

    setBusy(false);
    if (!failed.length) setText('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (isLink) addLinks();
    else search(text, view.name === 'search' && view.q === text.trim());
  };

  return (
    <div className="topbar">
      <button className="icon-btn round" title="Back" onClick={back}>‹</button>
      <form className="add-form" onSubmit={submit}>
        {isLink ? <Link size={18} /> : <SearchIcon size={18} />}
        <input
          value={text}
          onChange={onChange}
          placeholder={
            targetPlaylist
              ? `Search, or paste a YouTube link to add to “${targetPlaylist.name}”`
              : 'Search for songs, or paste a YouTube link'
          }
          spellCheck={false}
        />
        {text && (
          <button type="button" className="icon-btn" title="Clear" onClick={() => setText('')}>
            <Close size={16} />
          </button>
        )}
        <button className={`btn primary small ${isLink ? '' : 'desktop-only'}`} disabled={busy || !text.trim()}>
          {busy ? 'Adding…' : isLink ? 'Add' : 'Search'}
        </button>
      </form>
    </div>
  );
}

/** Seek bar with elapsed / total time. */
function Seek() {
  const player = usePlayer();
  const [scrub, setScrub] = useState(null); // value while dragging
  const pos = scrub ?? player.time;
  const pct = player.duration ? (pos / player.duration) * 100 : 0;
  const done = (e) => { player.seek(Number(e.target.value)); setScrub(null); };
  return (
    <div className="pb-progress">
      <span className="time">{formatTime(pos)}</span>
      <input
        type="range"
        className="slider"
        min={0}
        max={player.duration || 1}
        step={0.1}
        value={pos}
        disabled={!player.current}
        style={{ '--pct': `${pct}%` }}
        onChange={(e) => setScrub(Number(e.target.value))}
        onPointerUp={done}
        onTouchEnd={done}
        onKeyUp={done}
      />
      <span className="time">{formatTime(player.duration)}</span>
    </div>
  );
}

function LikeButton({ track, size = 18 }) {
  const { state, dispatch } = useLibrary();
  const liked = state.liked.includes(track.id);
  return (
    <button className={`icon-btn like ${liked ? 'on' : ''}`} title="Like" onClick={() => dispatch({ type: 'TOGGLE_LIKE', id: track.id })}>
      {liked ? <HeartFilled size={size} /> : <Heart size={size} />}
    </button>
  );
}

/** Phone mini player: tap it to open the full Now Playing screen. */
function PhonePlayerBar() {
  const player = usePlayer();
  const t = player.current;
  if (!t) return null;
  const pct = player.duration ? (player.time / player.duration) * 100 : 0;
  return (
    <footer className="playerbar phone">
      <button className="pb-open" onClick={() => player.setMode('video')}>
        {/* The YouTube player sits over this slot (see .yt-host.audio). */}
        <span className="pb-slot" />
        <span className="pb-text">
          <span className="pb-title">{t.title}</span>
          <span className="muted small">{t.artist}</span>
        </span>
      </button>
      <LikeButton track={t} size={22} />
      <button className="icon-btn" title={player.isPlaying ? 'Pause' : 'Play'} onClick={player.toggle}>
        {player.isPlaying ? <Pause size={26} /> : <Play size={26} />}
      </button>
      <span className="pb-line"><i style={{ width: `${pct}%` }} /></span>
    </footer>
  );
}

export function PlayerBar() {
  const isPhone = useIsPhone();
  return isPhone ? <PhonePlayerBar /> : <DesktopPlayerBar />;
}

function DesktopPlayerBar() {
  const { state, dispatch } = useLibrary();
  const player = usePlayer();
  const { navigate, queueOpen, setQueueOpen } = useUI();
  const t = player.current;
  const liked = t && state.liked.includes(t.id);
  const volPct = player.muted ? 0 : player.volume;

  return (
    <footer className="playerbar">
      <div className="pb-left">
        {t && (
          <>
            <img className="pb-art" src={thumbnailUrl(t.id)} alt="" />
            <div className="pb-text">
              <div className="pb-title">{t.title}</div>
              <button className="link muted small" onClick={() => navigate({ name: 'artist', artist: t.artist })}>{t.artist}</button>
            </div>
            <button className={`icon-btn like ${liked ? 'on' : ''}`} title="Like" onClick={() => dispatch({ type: 'TOGGLE_LIKE', id: t.id })}>
              {liked ? <HeartFilled size={18} /> : <Heart size={18} />}
            </button>
          </>
        )}
      </div>

      <div className="pb-center">
        <div className="pb-controls">
          <button className={`icon-btn toggle ${player.shuffle ? 'on' : ''}`} title="Shuffle" onClick={player.toggleShuffle}>
            <Shuffle size={18} />
          </button>
          <button className="icon-btn" title="Previous" disabled={!t} onClick={player.prev}><Prev /></button>
          <button className="pb-play" title={player.isPlaying ? 'Pause' : 'Play'} disabled={!t} onClick={player.toggle}>
            {player.isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="icon-btn" title="Next" disabled={!t} onClick={player.next}><Next /></button>
          <button
            className={`icon-btn toggle ${player.repeat !== 'off' ? 'on' : ''}`}
            title={`Repeat: ${player.repeat}`}
            onClick={player.cycleRepeat}
          >
            {player.repeat === 'one' ? <RepeatOne size={18} /> : <Repeat size={18} />}
          </button>
        </div>
        <Seek />
      </div>

      <div className="pb-right">
        <button
          className={`icon-btn toggle ${player.mode === 'video' ? 'on' : ''}`}
          title={player.mode === 'video' ? 'Hide video' : 'Show video'}
          disabled={!t}
          onClick={() => player.setMode(player.mode === 'video' ? 'audio' : 'video')}
        >
          <VideoIcon size={18} />
        </button>
        <button className={`icon-btn toggle ${queueOpen ? 'on' : ''}`} title="Queue" onClick={() => setQueueOpen(!queueOpen)}>
          <QueueIcon size={18} />
        </button>
        <button className="icon-btn" title={player.muted ? 'Unmute' : 'Mute'} onClick={player.toggleMute}>
          {player.muted || player.volume === 0 ? <VolumeOff size={18} /> : <Volume size={18} />}
        </button>
        <input
          type="range"
          className="slider volume"
          min={0}
          max={100}
          value={volPct}
          style={{ '--pct': `${volPct}%` }}
          onChange={(e) => player.setVolume(Number(e.target.value))}
        />
      </div>
    </footer>
  );
}

export function QueuePanel() {
  const { state } = useLibrary();
  const player = usePlayer();
  const { setQueueOpen } = useUI();
  const current = player.current;
  const upNext = player.queue
    .map((id, i) => ({ track: state.tracks[id], i }))
    .filter(({ track, i }) => track && i > player.index);

  return (
    <aside className="queue-panel">
      <div className="qp-head">
        <h3>Queue</h3>
        <button className="icon-btn" title="Close" onClick={() => setQueueOpen(false)}><Close size={18} /></button>
      </div>
      {current ? (
        <>
          <div className="qp-label">Now playing{player.context ? ` · ${player.context}` : ''}</div>
          <QueueItem track={current} active />
          <div className="qp-label">Next up</div>
          {upNext.length ? (
            upNext.map(({ track, i }) => (
              <QueueItem
                key={`${track.id}-${i}`}
                track={track}
                onPlay={() => player.jumpTo(i)}
                onRemove={() => player.removeFromQueue(i)}
              />
            ))
          ) : (
            <p className="muted small qp-empty">
              {player.repeat === 'all' ? 'The queue will start again from the top.' : 'Nothing else queued.'}
            </p>
          )}
        </>
      ) : (
        <p className="muted small qp-empty">Play a song to start a queue.</p>
      )}
    </aside>
  );
}

function QueueItem({ track, active, onPlay, onRemove }) {
  return (
    <div className={`qp-item ${active ? 'active' : ''}`} onDoubleClick={onPlay}>
      <button className="qp-art" onClick={onPlay} disabled={!onPlay} title="Play">
        <img src={thumbnailUrl(track.id)} alt="" />
        {onPlay && <span className="qp-art-play"><Play size={16} /></span>}
      </button>
      <div className="qp-text">
        <div className="qp-title">{track.title}</div>
        <div className="muted small">{track.artist}</div>
      </div>
      {onRemove && (
        <button className="icon-btn qp-remove" title="Remove from queue" onClick={onRemove}><Close size={14} /></button>
      )}
    </div>
  );
}

/** Backdrop + caption shown behind the large video in video mode. */
export function VideoStage() {
  const player = usePlayer();
  const isPhone = useIsPhone();
  const t = player.current;
  if (player.mode !== 'video' || !t) return null;
  if (isPhone) return <NowPlayingSheet />;
  return (
    <div className="video-stage">
      <div className="vs-top">
        <button className="btn ghost small" onClick={() => player.setMode('audio')}>
          <Close size={14} /> Hide video
        </button>
      </div>
      <div className="vs-caption">
        <div className="vs-title">{t.title}</div>
        <div className="muted">{t.artist}</div>
      </div>
    </div>
  );
}

/** Full-screen Now Playing view on phones. */
function NowPlayingSheet() {
  const player = usePlayer();
  const { navigate, setQueueOpen } = useUI();
  const t = player.current;
  return (
    <div className="np-sheet">
      <div className="np-head">
        <button className="icon-btn" title="Close" onClick={() => player.setMode('audio')}><ChevronDown size={28} /></button>
        <span className="np-context muted small">{player.context || 'Now playing'}</span>
        <span style={{ width: 36 }} />
      </div>
      {/* The YouTube player sits over this slot (see .yt-host.video). */}
      <div className="np-video" />
      <div className="np-info">
        <div className="np-text">
          <div className="np-title">{t.title}</div>
          <button className="link muted" onClick={() => navigate({ name: 'artist', artist: t.artist })}>{t.artist}</button>
        </div>
        <LikeButton track={t} size={26} />
      </div>
      <Seek />
      <div className="np-controls">
        <button className={`icon-btn toggle ${player.shuffle ? 'on' : ''}`} title="Shuffle" onClick={player.toggleShuffle}><Shuffle size={24} /></button>
        <button className="icon-btn" title="Previous" onClick={player.prev}><Prev size={34} /></button>
        <button className="pb-play np-play" title={player.isPlaying ? 'Pause' : 'Play'} onClick={player.toggle}>
          {player.isPlaying ? <Pause size={32} /> : <Play size={32} />}
        </button>
        <button className="icon-btn" title="Next" onClick={player.next}><Next size={34} /></button>
        <button className={`icon-btn toggle ${player.repeat !== 'off' ? 'on' : ''}`} title={`Repeat: ${player.repeat}`} onClick={player.cycleRepeat}>
          {player.repeat === 'one' ? <RepeatOne size={24} /> : <Repeat size={24} />}
        </button>
      </div>
      <div className="np-foot">
        <button className="icon-btn" title="Queue" onClick={() => setQueueOpen(true)}><QueueIcon size={22} /></button>
      </div>
    </div>
  );
}
