// Helpers for working with YouTube links and metadata (no API key needed).

const ID_RE = /^[\w-]{11}$/;

/** Extract an 11-character video ID from any common YouTube URL format. */
export function parseVideoId(input) {
  const s = input.trim();
  if (ID_RE.test(s)) return s;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id = null;

  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v');
    if (!id) {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) id = m[1];
    }
  }

  return id && ID_RE.test(id) ? id : null;
}

/** Pull every video ID out of a blob of text (one or more pasted links). */
export function parseVideoIds(text) {
  const ids = text
    .split(/[\s,]+/)
    .map(parseVideoId)
    .filter(Boolean);
  return [...new Set(ids)];
}

export const thumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/** Fetch title + channel name via YouTube's public oEmbed endpoint. */
export async function fetchVideoMeta(id) {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`
  );
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'This video can’t be embedded'
        : 'Video not found (private or removed?)'
    );
  }
  const data = await res.json();
  return { rawTitle: data.title, channel: data.author_name };
}

const NOISE_RE =
  /\s*[\(\[][^\)\]]*\b(official|video|audio|lyrics?|visuali[sz]er|hd|hq|4k|mv|m\/v|explicit|clean)\b[^\)\]]*[\)\]]/gi;

function cleanChannel(channel = '') {
  return channel
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*Official$/i, '')
    .trim();
}

/** Best-effort split of a YouTube title into { artist, title }. */
export function guessArtistAndTitle(rawTitle = '', channel = '') {
  let t = rawTitle
    .replace(NOISE_RE, '')
    .split(/\s+\|\s+/)[0]
    .replace(/\s*\b(M\/V|MV|Official (Music )?Video)$/i, '')
    .trim();

  let artist = '';
  const m = t.match(/^(.+?)\s+[-–—~]\s+(.+)$/);
  if (m) {
    artist = m[1].trim();
    t = m[2].trim();
  } else {
    artist = cleanChannel(channel);
  }

  t = t.replace(/^["“'‘](.+)["”'’]$/, '$1').trim();
  return { artist: artist || 'Unknown artist', title: t || rawTitle };
}

export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
