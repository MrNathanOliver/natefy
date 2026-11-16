import { useState } from 'react';
import { isSaved, useLibrary } from '../library.jsx';
import { usePlayer } from '../player.jsx';
import { useIsPhone, useUI } from '../ui.jsx';
import { formatTime, thumbnailUrl, watchUrl } from '../youtube.js';
import { AddToPlaylistModal, ConfirmModal, EditTrackModal } from './Modals.jsx';
import { Heart, HeartFilled, More, Pause, Play, Plus } from './Icons.jsx';

/** Build the "⋯" menu items for a track. `extra` items go at the top. */
export function useTrackMenu() {
  const { dispatch } = useLibrary();
  const player = usePlayer();
  const { openModal, notify, navigate } = useUI();

  return (track, extra = []) => [
    ...extra,
    { label: 'Play next', onClick: () => { player.playNext(track.id); notify('Playing next'); } },
    { label: 'Add to queue', onClick: () => { player.addToQueue(track.id); notify('Added to queue'); } },
    { label: 'Add to playlist…', onClick: () => openModal(<AddToPlaylistModal trackIds={[track.id]} />) },
    '-',
    { label: 'Go to artist', onClick: () => navigate({ name: 'artist', artist: track.artist }) },
    { label: 'Edit details…', onClick: () => openModal(<EditTrackModal track={track} />) },
    { label: 'Open on YouTube', onClick: () => window.open(watchUrl(track.id), '_blank', 'noopener') },
    '-',
    isSaved(track)
      ? {
          label: 'Remove from library',
          danger: true,
          onClick: () =>
            openModal(
              <ConfirmModal
                title="Remove from library?"
                message={`“${track.title}” will be removed from your library and all playlists.`}
                confirmLabel="Remove"
                onConfirm={() => dispatch({ type: 'REMOVE_TRACK', id: track.id })}
              />
            ),
        }
      : { label: 'Save to your library', onClick: () => { dispatch({ type: 'SAVE_TRACK', id: track.id }); notify('Saved to your library'); } },
  ];
}

/**
 * A Spotify-style track table.
 * - context: label shown in the queue ("Playlist · Chill")
 * - extraMenu(track, i): items to prepend to each row's menu
 * - onReorder(from, to): enables drag-and-drop reordering
 */
export default function TrackList({ tracks, context, extraMenu, onReorder, showAdded = true }) {
  const { state, dispatch } = useLibrary();
  const player = usePlayer();
  const { openMenu, navigate, notify } = useUI();
  const trackMenu = useTrackMenu();
  const isPhone = useIsPhone();
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const ids = tracks.map((t) => t.id);
  const playingHere = player.context === context;

  if (!tracks.length) return null;

  return (
    <div className="tracklist">
      <div className="tl-row tl-head">
        <span className="tl-num">#</span>
        <span>Title</span>
        {showAdded && <span className="tl-added">Added</span>}
        <span />
        <span className="tl-dur">Time</span>
        <span />
      </div>
      {tracks.map((t, i) => {
        const isCurrent = player.currentId === t.id && (playingHere || !context);
        const liked = state.liked.includes(t.id);
        return (
          <div
            key={t.id}
            className={`tl-row ${isCurrent ? 'current' : ''} ${dragOver === i ? 'drag-over' : ''}`}
            onDoubleClick={() => player.playTracks(ids, i, context)}
            onClick={(e) => {
              // Phones: a single tap plays (unless it hit a button inside the row).
              if (isPhone && !e.target.closest('button')) isCurrent ? player.toggle() : player.playTracks(ids, i, context);
            }}
            onContextMenu={(e) => openMenu(e, trackMenu(t, extraMenu?.(t, i)))}
            draggable={!!onReorder && !isPhone}
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => { if (onReorder) { e.preventDefault(); setDragOver(i); } }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => {
              if (onReorder && dragFrom !== null && dragFrom !== i) onReorder(dragFrom, i);
              setDragFrom(null);
              setDragOver(null);
            }}
            onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
          >
            <span className="tl-num">
              <span className="num">
                {isCurrent && player.isPlaying ? <span className="eq"><i /><i /><i /></span> : i + 1}
              </span>
              <button
                className="icon-btn play-btn"
                title={isCurrent && player.isPlaying ? 'Pause' : 'Play'}
                onClick={() => (isCurrent ? player.toggle() : player.playTracks(ids, i, context))}
              >
                {isCurrent && player.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </span>
            <span className="tl-title">
              <img src={thumbnailUrl(t.id)} alt="" loading="lazy" />
              <span className="tl-text">
                <span className="tl-name">{t.title}</span>
                <button className="link muted" onClick={() => navigate({ name: 'artist', artist: t.artist })}>
                  {t.artist}
                </button>
              </span>
            </span>
            {showAdded && <span className="tl-added muted">{new Date(t.addedAt).toLocaleDateString()}</span>}
            <span>
              {isSaved(t) ? (
                <button
                  className={`icon-btn like ${liked ? 'on' : ''}`}
                  title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                  onClick={() => dispatch({ type: 'TOGGLE_LIKE', id: t.id })}
                >
                  {liked ? <HeartFilled size={16} /> : <Heart size={16} />}
                </button>
              ) : (
                <button
                  className="icon-btn save"
                  title="Save to your library"
                  onClick={() => { dispatch({ type: 'SAVE_TRACK', id: t.id }); notify('Saved to your library'); }}
                >
                  <Plus size={18} />
                </button>
              )}
            </span>
            <span className="tl-dur muted">{t.duration ? formatTime(t.duration) : '–'}</span>
            <span>
              <button className="icon-btn more" title="More options" onClick={(e) => openMenu(e, trackMenu(t, extraMenu?.(t, i)))}>
                <More size={16} />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
