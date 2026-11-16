import { useEffect } from 'react';
import { LibraryProvider } from './library.jsx';
import { PlayerProvider, usePlayer } from './player.jsx';
import { UIOverlays, UIProvider, useIsPhone, useUI } from './ui.jsx';
import { PlayerBar, QueuePanel, Sidebar, TabBar, TopBar, VideoStage } from './components/Layout.jsx';
import SearchPage from './pages/SearchPage.jsx';
import { ArtistPage, ArtistsPage, HomePage, LibraryPage, LikedPage, PlaylistPage, RecentPage, SongsPage } from './pages/Pages.jsx';

function CurrentPage() {
  const { view } = useUI();
  switch (view.name) {
    case 'search': return <SearchPage q={view.q} />;
    case 'library': return <LibraryPage />;
    case 'songs': return <SongsPage />;
    case 'liked': return <LikedPage />;
    case 'recent': return <RecentPage />;
    case 'artists': return <ArtistsPage />;
    case 'artist': return <ArtistPage artist={view.artist} />;
    case 'playlist': return <PlaylistPage id={view.id} key={view.id} />;
    default: return <HomePage />;
  }
}

function Shell() {
  const player = usePlayer();
  const { queueOpen, view } = useUI();
  const isPhone = useIsPhone();
  const { setMode } = player;

  // Going to another page collapses the big video back to the mini player.
  useEffect(() => {
    setMode('audio');
  }, [view, setMode]);

  // Space = play/pause, Shift+←/→ = previous/next (ignored while typing).
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, [contenteditable]')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        player.toggle();
      } else if (e.shiftKey && e.key === 'ArrowRight') player.next();
      else if (e.shiftKey && e.key === 'ArrowLeft') player.prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const hostClass = ['yt-host', player.mode, player.current ? '' : 'idle', queueOpen ? 'with-queue' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`app ${queueOpen ? 'queue-open' : ''} ${isPhone ? 'phone' : ''}`}>
      <Sidebar />
      <main className="main">
        <TopBar />
        <CurrentPage />
      </main>
      {queueOpen && <QueuePanel />}
      <VideoStage />
      {/* The single YouTube player. React never renders inside it; the API injects the iframe. */}
      <div ref={player.hostRef} className={hostClass} />
      <PlayerBar />
      {isPhone && <TabBar />}
      <UIOverlays />
    </div>
  );
}

function Providers() {
  const { notify } = useUI();
  return (
    <LibraryProvider>
      <PlayerProvider notify={notify}>
        <Shell />
      </PlayerProvider>
    </LibraryProvider>
  );
}

export default function App() {
  return (
    <UIProvider>
      <Providers />
    </UIProvider>
  );
}
