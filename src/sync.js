// Move a library between devices as a compact, compressed code inside a link.
// The code lives after the "#", so it never leaves the device it's opened on.
import { isSaved } from './library.jsx';

export const PUBLIC_URL = 'https://mrnathanoliver.github.io/natefy/';
const PREFIX = 'N1.';

const toB64 = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

/** Library state -> short code. Only songs that are saved or used somewhere are included. */
export async function encodeLibrary(state) {
  const used = new Set([...state.liked, ...state.recent, ...state.playlists.flatMap((p) => p.trackIds)]);
  const tracks = Object.values(state.tracks)
    .filter((t) => isSaved(t) || used.has(t.id))
    .map((t) => [t.id, t.title, t.artist, Math.round(t.duration || 0), Math.round((t.addedAt || 0) / 1000), isSaved(t) ? 1 : 0]);
  const data = { v: 1, t: tracks, p: state.playlists.map((p) => [p.id, p.name, p.trackIds]), l: state.liked, r: state.recent };
  const zipped = await pipe(new TextEncoder().encode(JSON.stringify(data)), new CompressionStream('deflate-raw'));
  return PREFIX + toB64(zipped);
}

export const libraryLink = (code) => `${PUBLIC_URL}#import=${code}`;

/** Accepts a code or a whole link. Throws if it isn't a Natefy library. */
export async function decodeLibrary(text) {
  const m = String(text).trim().match(/N1\.[A-Za-z0-9_-]+/);
  if (!m) throw new Error('That isn’t a Natefy library code.');
  let data;
  try {
    const bytes = await pipe(fromB64(m[0].slice(PREFIX.length)), new DecompressionStream('deflate-raw'));
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('That code is incomplete or damaged. Try copying it again.');
  }
  const tracks = {};
  for (const [id, title, artist, duration, added, saved] of data.t) {
    tracks[id] = { id, title, artist, ...(duration ? { duration } : {}), addedAt: added * 1000, inLibrary: !!saved };
  }
  return {
    tracks,
    playlists: data.p.map(([id, name, trackIds]) => ({ id, name, trackIds })),
    liked: data.l,
    recent: data.r,
  };
}

/** Combine an incoming library with this one without losing anything from either. */
export function mergeLibraries(mine, theirs) {
  const tracks = { ...mine.tracks };
  for (const t of Object.values(theirs.tracks)) {
    const cur = tracks[t.id];
    if (!cur) tracks[t.id] = t;
    else if (!isSaved(cur) && isSaved(t)) tracks[t.id] = { ...cur, inLibrary: true, addedAt: t.addedAt };
  }
  const playlists = mine.playlists.map((p) => {
    const other = theirs.playlists.find((q) => q.id === p.id);
    return other ? { ...p, trackIds: [...new Set([...p.trackIds, ...other.trackIds])] } : p;
  });
  for (const q of theirs.playlists) if (!playlists.some((p) => p.id === q.id)) playlists.push(q);
  return {
    tracks,
    playlists,
    liked: [...new Set([...mine.liked, ...theirs.liked])],
    recent: [...new Set([...mine.recent, ...theirs.recent])].slice(0, 50),
  };
}
