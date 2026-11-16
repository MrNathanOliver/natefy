import { usePlayer } from '../player.jsx';
import { formatTime, thumbnailUrl } from '../youtube.js';
import { Pause, Play, Shuffle } from './Icons.jsx';

/** 1 or 4 thumbnails arranged as cover art. */
export function Cover({ ids, round = false, className = '' }) {
  const unique = [...new Set(ids)];
  return (
    <div className={`cover ${round ? 'round' : ''} ${unique.length >= 4 ? 'grid' : ''} ${className}`}>
      {unique.length === 0 && <div className="cover-empty">♪</div>}
      {(unique.length >= 4 ? unique.slice(0, 4) : unique.slice(0, 1)).map((id) => (
        <img key={id} src={thumbnailUrl(id)} alt="" />
      ))}
    </div>
  );
}

export function totalDuration(tracks) {
  const known = tracks.filter((t) => t.duration);
  if (!known.length) return '';
  const sec = known.reduce((s, t) => s + t.duration, 0);
  const label = sec >= 3600 ? `${Math.floor(sec / 3600)} hr ${Math.round((sec % 3600) / 60)} min` : formatTime(sec);
  return known.length < tracks.length ? `${label}+` : label;
}

export function PageHeader({ kicker, title, subtitle, art, onTitleClick }) {
  return (
    <header className="page-header">
      {art}
      <div className="page-header-text">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 onClick={onTitleClick} className={onTitleClick ? 'editable' : ''}>{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
    </header>
  );
}

/** Big round play button + shuffle, as on album/playlist pages. */
export function PlayActions({ tracks, context, children }) {
  const player = usePlayer();
  const ids = tracks.map((t) => t.id);
  const active = player.context === context && ids.includes(player.currentId);
  return (
    <div className="play-actions">
      <button
        className="big-play"
        disabled={!tracks.length}
        title={active && player.isPlaying ? 'Pause' : 'Play'}
        onClick={() => (active ? player.toggle() : player.playTracks(ids, 0, context))}
      >
        {active && player.isPlaying ? <Pause size={26} /> : <Play size={26} />}
      </button>
      <button
        className="icon-btn big"
        disabled={!tracks.length}
        title="Shuffle play"
        onClick={() => player.playTracks(ids, null, context, { shuffle: true })}
      >
        <Shuffle size={26} />
      </button>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </div>
  );
}

/** Card used in home-page grids. */
export function Card({ ids, title, subtitle, round, onOpen, onPlay }) {
  return (
    <div className="card" onClick={onOpen}>
      <div className="card-art">
        <Cover ids={ids} round={round} />
        {onPlay && (
          <button
            className="card-play"
            title="Play"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            <Play size={22} />
          </button>
        )}
      </div>
      <div className="card-title">{title}</div>
      {subtitle && <div className="card-sub muted">{subtitle}</div>}
    </div>
  );
}
