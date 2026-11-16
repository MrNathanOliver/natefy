// Library state (songs, playlists, likes, history), saved to localStorage.
import { createContext, useContext, useEffect, useReducer } from 'react';

const STORAGE_KEY = 'tunebox-library-v1';
const RECENT_LIMIT = 50;

const empty = { tracks: {}, playlists: [], liked: [], recent: [] };

/** Saved to the library (as opposed to only seen in search results / played once). */
export const isSaved = (t) => t.inLibrary !== false;

function load() {
  let state;
  try {
    state = { ...empty, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return empty;
  }
  // Forget search results that were never saved, liked, played or put in a playlist.
  const used = new Set([...state.liked, ...state.recent, ...state.playlists.flatMap((p) => p.trackIds)]);
  state.tracks = Object.fromEntries(
    Object.entries(state.tracks).filter(([id, t]) => isSaved(t) || used.has(id))
  );
  return state;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TRACKS': {
      const tracks = { ...state.tracks };
      for (const t of action.tracks) tracks[t.id] = { ...tracks[t.id], ...t };
      return { ...state, tracks };
    }
    case 'CACHE_TRACKS': {
      // Remember tracks from search results without adding them to the library.
      const fresh = action.tracks.filter((t) => !state.tracks[t.id]);
      if (!fresh.length) return state;
      const tracks = { ...state.tracks };
      for (const t of fresh) tracks[t.id] = { ...t, inLibrary: false };
      return { ...state, tracks };
    }
    case 'SAVE_TRACK': {
      const cur = state.tracks[action.id];
      if (!cur || isSaved(cur)) return state;
      return { ...state, tracks: { ...state.tracks, [action.id]: { ...cur, inLibrary: true, addedAt: Date.now() } } };
    }
    case 'UPDATE_TRACK': {
      const cur = state.tracks[action.id];
      if (!cur) return state;
      return { ...state, tracks: { ...state.tracks, [action.id]: { ...cur, ...action.patch } } };
    }
    case 'REMOVE_TRACK': {
      const { [action.id]: _, ...tracks } = state.tracks;
      const drop = (ids) => ids.filter((x) => x !== action.id);
      return {
        ...state,
        tracks,
        liked: drop(state.liked),
        recent: drop(state.recent),
        playlists: state.playlists.map((p) => ({ ...p, trackIds: drop(p.trackIds) })),
      };
    }
    case 'TOGGLE_LIKE':
      return {
        ...state,
        liked: state.liked.includes(action.id)
          ? state.liked.filter((x) => x !== action.id)
          : [action.id, ...state.liked],
      };
    case 'PLAYED':
      return {
        ...state,
        recent: [action.id, ...state.recent.filter((x) => x !== action.id)].slice(0, RECENT_LIMIT),
      };
    case 'CLEAR_RECENT':
      return { ...state, recent: [] };
    case 'CREATE_PLAYLIST':
      return {
        ...state,
        playlists: [
          ...state.playlists,
          { id: action.id, name: action.name, trackIds: action.trackIds || [], createdAt: Date.now() },
        ],
      };
    case 'RENAME_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)),
      };
    case 'DELETE_PLAYLIST':
      return { ...state, playlists: state.playlists.filter((p) => p.id !== action.id) };
    case 'ADD_TO_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.id
            ? { ...p, trackIds: [...p.trackIds, ...action.trackIds.filter((t) => !p.trackIds.includes(t))] }
            : p
        ),
      };
    case 'REMOVE_FROM_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.id ? { ...p, trackIds: p.trackIds.filter((t) => t !== action.trackId) } : p
        ),
      };
    case 'MOVE_IN_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map((p) => {
          if (p.id !== action.id) return p;
          const ids = [...p.trackIds];
          const [moved] = ids.splice(action.from, 1);
          ids.splice(action.to, 0, moved);
          return { ...p, trackIds: ids };
        }),
      };
    default:
      return state;
  }
}

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <LibraryContext.Provider value={{ state, dispatch }}>{children}</LibraryContext.Provider>;
}

export const useLibrary = () => useContext(LibraryContext);

/** Map a list of IDs to track objects, skipping any that were removed. */
export const resolveTracks = (state, ids) => ids.map((id) => state.tracks[id]).filter(Boolean);

/** Group library tracks by artist name. */
export const libraryTracks = (state) => Object.values(state.tracks).filter(isSaved);

export function groupByArtist(state) {
  const map = new Map();
  for (const t of libraryTracks(state)) {
    const key = t.artist || 'Unknown artist';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return [...map.entries()]
    .map(([name, tracks]) => ({ name, tracks: tracks.sort((a, b) => b.addedAt - a.addedAt) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
