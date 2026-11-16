// Keyless YouTube search via public Piped / Invidious servers.
// These are volunteer-run mirrors that come and go, so we try several and
// remember whichever one answered last.
import { guessArtistAndTitle } from './youtube.js';

const PIPED = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
  'https://piped-api.lunar.icu',
];
const INVIDIOUS = ['https://yt.chocolatemoo53.com'];
const INVIDIOUS_DIRECTORY = 'https://api.invidious.io/instances.json?sort_by=type,users';
const LAST_GOOD_KEY = 'natefy-search-server';
const TIMEOUT_MS = 6000;

let discovered; // Promise<string[]> of extra Invidious servers found via the directory

function discoverInvidious() {
  discovered ??= fetchJson(INVIDIOUS_DIRECTORY)
    .then((list) =>
      list
        .filter(([, i]) => i.type === 'https' && i.api && i.cors)
        .map(([, i]) => i.uri.replace(/\/$/, ''))
    )
    .catch(() => []);
  return discovered;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const videoIdFromUrl = (url = '') => url.match(/[?&]v=([\w-]{11})/)?.[1];

function fromPiped(data, kind) {
  return (data.items || [])
    .filter((it) => it.type === 'stream' && !it.isShort && it.duration > 0)
    .map((it) => {
      const id = videoIdFromUrl(it.url);
      const channel = it.uploaderName || '';
      const names =
        kind === 'songs'
          ? { title: it.title, artist: channel.replace(/\s*-\s*Topic$/i, '') || 'Unknown artist' }
          : guessArtistAndTitle(it.title, channel);
      return id && { id, ...names, rawTitle: it.title, channel, duration: it.duration };
    })
    .filter(Boolean);
}

function fromInvidious(data) {
  return (Array.isArray(data) ? data : [])
    .filter((it) => it.type === 'video' && it.lengthSeconds > 0)
    .map((it) => ({
      id: it.videoId,
      ...guessArtistAndTitle(it.title, it.author),
      rawTitle: it.title,
      channel: it.author,
      duration: it.lengthSeconds,
    }));
}

function attempt(server, query, kind) {
  const q = encodeURIComponent(query);
  if (server.type === 'piped') {
    const filter = kind === 'songs' ? 'music_songs' : 'videos';
    return fetchJson(`${server.url}/search?q=${q}&filter=${filter}`).then((d) => fromPiped(d, kind));
  }
  return fetchJson(`${server.url}/api/v1/search?q=${q}&type=video`).then(fromInvidious);
}

/**
 * Search YouTube. kind = 'songs' (YouTube Music songs, clean artist names)
 * or 'videos' (regular YouTube videos).
 * Resolves to { results, server }. Throws if every server fails.
 */
export async function searchYouTube(query, kind = 'songs') {
  const extra = await discoverInvidious();
  let servers = [
    ...PIPED.map((url) => ({ type: 'piped', url })),
    ...[...new Set([...INVIDIOUS, ...extra])].map((url) => ({ type: 'invidious', url })),
  ];

  // Try whichever server worked last time first.
  const last = localStorage.getItem(LAST_GOOD_KEY);
  servers.sort((a, b) => (b.url === last) - (a.url === last));
  // Invidious can't filter to songs, so prefer Piped for that tab.
  if (kind === 'songs') servers.sort((a, b) => (a.type === 'piped' ? 0 : 1) - (b.type === 'piped' ? 0 : 1));

  for (const server of servers) {
    try {
      const results = await attempt(server, query, kind);
      localStorage.setItem(LAST_GOOD_KEY, server.url);
      return { results, server: new URL(server.url).hostname };
    } catch {
      // try the next one
    }
  }
  throw new Error('All search servers are unavailable right now');
}
