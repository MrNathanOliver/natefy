# Natefy

A personal music player that plays songs from YouTube links, styled like a typical streaming app.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Using it

- **Search:** type in the box at the top. The Songs tab finds YouTube Music tracks (clean artist and
  song names); the Videos tab finds regular YouTube videos. Press + on a result to save it to your library.
- **Add by link:** paste one or more YouTube links (videos, Shorts, youtu.be) into the box at the top.
  If a playlist page is open, the songs are added to that playlist too.
- **Play:** hover a row and hit ▶, or double-click it. Big ▶ / shuffle buttons play a whole page.
- **Song menu (⋯ or right-click):** play next, add to queue, add to playlist, edit artist/title, remove.
- **Video:** the camera button in the player bar switches between the mini player and full video.
- **Keyboard:** Space = play/pause, Shift+←/→ = previous/next. Media keys work too.

Your library is saved in the browser's localStorage, so it's per-browser and per-computer.

## How it's built

- React + Vite, no backend, no API key.
- Search goes through free public Piped / Invidious servers (`src/search.js`). These are unofficial
  and volunteer-run, so search can break if they go down; pasting links always works.
- Playback uses the official YouTube IFrame Player API (`src/player.jsx`).
- Song titles come from YouTube's public oEmbed endpoint; "Artist – Song" titles are split
  automatically (`src/youtube.js`).
- Library state lives in `src/library.jsx`.

Some videos can't be played outside YouTube (the owner disabled embedding). Those show an error
and are skipped.
