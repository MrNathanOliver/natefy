// Playback engine built on the YouTube IFrame Player API.
// One hidden-ish player is created once and reused; the UI drives it through context.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLibrary } from './library.jsx';
import { thumbnailUrl } from './youtube.js';

let apiPromise;
function loadYouTubeApi() {
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      if (window.YT?.Player) return resolve(window.YT);
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ERRORS = {
  2: 'Invalid video',
  5: 'This video can’t be played in the browser player',
  100: 'Video was removed or made private',
  101: 'The owner doesn’t allow this video to play outside YouTube',
  150: 'The owner doesn’t allow this video to play outside YouTube',
};

const VOLUME_KEY = 'tunebox-volume';

const PlayerContext = createContext(null);

export function PlayerProvider({ children, notify }) {
  const { state: lib, dispatch } = useLibrary();

  const hostRef = useRef(null); // DOM node the iframe lives in (positioned by CSS)
  const ytRef = useRef(null); // YT.Player instance
  const [ready, setReady] = useState(false);

  const [queue, setQueue] = useState([]); // track IDs in play order
  const [index, setIndex] = useState(-1);
  const [baseQueue, setBaseQueue] = useState([]); // un-shuffled order
  const [context, setContext] = useState(null); // e.g. "Playlist · Road trip"
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem(VOLUME_KEY) ?? 80));
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | all | one
  const [mode, setMode] = useState('audio'); // audio | video

  // Always-current snapshot for use inside YouTube event callbacks.
  const live = useRef({});
  live.current = { queue, index, repeat, volume, muted, lib };
  const errorStreak = useRef(0);

  const currentId = queue[index];
  const current = currentId ? lib.tracks[currentId] : null;

  const loadAt = useCallback((q, i, autoplay = true) => {
    setQueue(q);
    setIndex(i);
    setTime(0);
    setDuration(0);
    const id = q[i];
    if (!id || !ytRef.current) return;
    if (autoplay) {
      ytRef.current.loadVideoById(id);
      dispatch({ type: 'PLAYED', id });
    } else {
      ytRef.current.cueVideoById(id);
    }
  }, [dispatch]);

  const next = useCallback((auto = false) => {
    const { queue: q, index: i, repeat: r } = live.current;
    if (!q.length) return;
    if (auto && r === 'one') {
      ytRef.current.seekTo(0, true);
      ytRef.current.playVideo();
    } else if (i < q.length - 1) {
      loadAt(q, i + 1);
    } else if (r === 'all') {
      loadAt(q, 0);
    } else {
      // End of the queue: rewind to the first track, stopped.
      loadAt(q, 0, false);
      setIsPlaying(false);
    }
  }, [loadAt]);

  // Create the player once.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || ytRef.current) return;
      const target = document.createElement('div');
      hostRef.current.appendChild(target);
      ytRef.current = new YT.Player(target, {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1, iv_load_policy: 3, fs: 1 },
        events: {
          onReady: (e) => {
            e.target.setVolume(live.current.volume);
            setReady(true);
          },
          onStateChange: (e) => {
            const S = YT.PlayerState;
            setBuffering(e.data === S.BUFFERING);
            if (e.data === S.PLAYING) {
              errorStreak.current = 0;
              setIsPlaying(true);
              const d = e.target.getDuration();
              setDuration(d);
              const id = live.current.queue[live.current.index];
              const track = live.current.lib.tracks[id];
              if (track && d && !track.duration) dispatch({ type: 'UPDATE_TRACK', id, patch: { duration: d } });
            } else if (e.data === S.PAUSED || e.data === S.CUED) {
              setIsPlaying(false);
            } else if (e.data === S.ENDED) {
              setIsPlaying(false);
              next(true);
            }
          },
          onError: (e) => {
            const { queue: q } = live.current;
            notify?.(ERRORS[e.data] || 'Playback error', 'error');
            setIsPlaying(false);
            errorStreak.current += 1;
            if (errorStreak.current < q.length) setTimeout(() => next(true), 800);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, next, notify]);

  // Poll the playhead while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      const p = ytRef.current;
      if (p?.getCurrentTime) setTime(p.getCurrentTime());
    }, 250);
    return () => clearInterval(t);
  }, [isPlaying]);

  /**
   * Start playing a list of tracks. Pass startIndex = null with { shuffle: true }
   * to begin from a random track.
   */
  const playTracks = useCallback((ids, startIndex = 0, ctx = null, opts = {}) => {
    if (!ids.length) return;
    errorStreak.current = 0;
    const doShuffle = opts.shuffle ?? shuffle;
    if (opts.shuffle) setShuffle(true);
    const start = startIndex ?? Math.floor(Math.random() * ids.length);
    setContext(ctx);
    setBaseQueue(ids);
    if (doShuffle) {
      loadAt([ids[start], ...shuffled(ids.filter((_, i) => i !== start))], 0);
    } else {
      loadAt(ids, start);
    }
  }, [shuffle, loadAt]);

  const toggle = useCallback(() => {
    const p = ytRef.current;
    if (!p || !currentId) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying, currentId]);

  const prev = useCallback(() => {
    const p = ytRef.current;
    if (!p || !currentId) return;
    if (p.getCurrentTime() > 3 || index === 0) {
      p.seekTo(0, true);
      setTime(0);
    } else {
      loadAt(queue, index - 1);
    }
  }, [currentId, index, queue, loadAt]);

  const seek = useCallback((t) => {
    ytRef.current?.seekTo(t, true);
    setTime(t);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    localStorage.setItem(VOLUME_KEY, String(v));
    const p = ytRef.current;
    if (!p) return;
    p.setVolume(v);
    if (v > 0) {
      p.unMute();
      setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const p = ytRef.current;
    if (!p) return;
    if (muted) p.unMute();
    else p.mute();
    setMuted(!muted);
  }, [muted]);

  const toggleShuffle = useCallback(() => {
    if (!shuffle) {
      setBaseQueue(queue);
      if (currentId) {
        setQueue([currentId, ...shuffled(queue.filter((_, i) => i !== index))]);
        setIndex(0);
      }
    } else if (currentId) {
      const base = baseQueue.length ? baseQueue : queue;
      // Keep anything added to the queue while shuffled.
      const extra = queue.filter((id) => !base.includes(id));
      const restored = [...base, ...extra];
      setQueue(restored);
      setIndex(Math.max(0, restored.indexOf(currentId)));
    }
    setShuffle(!shuffle);
  }, [shuffle, queue, index, currentId, baseQueue]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const playNext = useCallback((id) => {
    if (!currentId) return playTracks([id]);
    const q = [...queue];
    q.splice(index + 1, 0, id);
    setQueue(q);
    setBaseQueue((b) => [...b, id]);
  }, [currentId, queue, index, playTracks]);

  const addToQueue = useCallback((id) => {
    if (!currentId) return playTracks([id]);
    setQueue((q) => [...q, id]);
    setBaseQueue((b) => [...b, id]);
  }, [currentId, playTracks]);

  const removeFromQueue = useCallback((i) => {
    if (i === index) return;
    setQueue((q) => q.filter((_, j) => j !== i));
    if (i < index) setIndex(index - 1);
  }, [index]);

  const jumpTo = useCallback((i) => loadAt(queue, i), [queue, loadAt]);

  // Lock-screen / media-key integration and tab title.
  useEffect(() => {
    document.title = current ? `${current.title} · ${current.artist}` : 'Natefy';
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({
          title: current.title,
          artist: current.artist,
          artwork: [{ src: thumbnailUrl(current.id), sizes: '480x360', type: 'image/jpeg' }],
        })
      : null;
  }, [current]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => ytRef.current?.playVideo());
    ms.setActionHandler('pause', () => ytRef.current?.pauseVideo());
    ms.setActionHandler('nexttrack', () => next());
    ms.setActionHandler('previoustrack', prev);
  }, [next, prev]);

  const value = {
    hostRef, ready, queue, index, current, currentId, context,
    isPlaying, buffering, time, duration: duration || current?.duration || 0,
    volume, muted, shuffle, repeat, mode,
    playTracks, toggle, next: () => next(false), prev, seek, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, playNext, addToQueue, removeFromQueue, jumpTo, setMode,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => useContext(PlayerContext);
