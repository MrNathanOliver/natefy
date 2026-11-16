import { groupByArtist, libraryTracks, resolveTracks, useLibrary } from '../library.jsx';
import { usePlayer } from '../player.jsx';
import { useUI } from '../ui.jsx';
import TrackList from '../components/TrackList.jsx';
import { Card, Cover, EmptyState, PageHeader, PlayActions, totalDuration } from '../components/Common.jsx';
import { ConfirmModal, PromptModal } from '../components/Modals.jsx';
import { Clock, HeartFilled, ListIcon, Mic, More, Plus } from '../components/Icons.jsx';
import { useNewPlaylist } from '../components/Layout.jsx';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const byNewest = (a, b) => b.addedAt - a.addedAt;

function summary(tracks) {
  return [plural(tracks.length, 'song'), totalDuration(tracks)].filter(Boolean).join(' · ');
}

export function HomePage() {
  const { state } = useLibrary();
  const player = usePlayer();
  const { navigate } = useUI();
  const recent = resolveTracks(state, state.recent).slice(0, 12);
  const added = libraryTracks(state).sort(byNewest).slice(0, 10);
  const artists = groupByArtist(state).sort((a, b) => b.tracks.length - a.tracks.length).slice(0, 8);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (!added.length) {
    return (
      <div className="page">
        <h1 className="greeting">{greeting}</h1>
        <div className="welcome">
          <h2>Your library is empty</h2>
          <p className="muted">
            Copy a link from YouTube (a video, a Short, or a youtu.be link) and paste it into the box at
            the top of the page. You can paste several links at once.
          </p>
          <p className="muted small">
            Tip: “Artist – Song” titles are split into artist and song name. You can fix any song with
            “Edit details” in its ⋯ menu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="greeting">{greeting}</h1>

      {recent.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Recently played</h2>
            <button className="link muted" onClick={() => navigate({ name: 'recent' })}>Show all</button>
          </div>
          <div className="card-grid">
            {recent.map((t) => (
              <Card
                key={t.id}
                ids={[t.id]}
                title={t.title}
                subtitle={t.artist}
                onOpen={() => navigate({ name: 'artist', artist: t.artist })}
                onPlay={() => player.playTracks([t.id], 0, 'Recently played')}
              />
            ))}
          </div>
        </section>
      )}

      {state.playlists.length > 0 && (
        <section>
          <div className="section-head"><h2>Your playlists</h2></div>
          <div className="card-grid">
            {state.playlists.map((p) => (
              <Card
                key={p.id}
                ids={p.trackIds}
                title={p.name}
                subtitle={plural(p.trackIds.length, 'song')}
                onOpen={() => navigate({ name: 'playlist', id: p.id })}
                onPlay={p.trackIds.length ? () => player.playTracks(p.trackIds, 0, `Playlist · ${p.name}`) : null}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Your artists</h2>
          <button className="link muted" onClick={() => navigate({ name: 'artists' })}>Show all</button>
        </div>
        <div className="card-grid">
          {artists.map((a) => (
            <Card
              key={a.name}
              round
              ids={[a.tracks[0].id]}
              title={a.name}
              subtitle="Artist"
              onOpen={() => navigate({ name: 'artist', artist: a.name })}
              onPlay={() => player.playTracks(a.tracks.map((t) => t.id), 0, `Artist · ${a.name}`)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Recently added</h2>
          <button className="link muted" onClick={() => navigate({ name: 'songs' })}>Show all</button>
        </div>
        <TrackList tracks={added} context="Recently added" />
      </section>
    </div>
  );
}

export function SongsPage() {
  const { state } = useLibrary();
  const tracks = libraryTracks(state).sort(byNewest);
  return (
    <div className="page">
      <PageHeader kicker="Library" title="Songs" subtitle={summary(tracks)} art={<Cover ids={tracks.map((t) => t.id)} />} />
      <PlayActions tracks={tracks} context="Songs" />
      {tracks.length ? (
        <TrackList tracks={tracks} context="Songs" />
      ) : (
        <EmptyState title="No songs yet">Paste a YouTube link at the top of the page to add one.</EmptyState>
      )}
    </div>
  );
}

export function LikedPage() {
  const { state } = useLibrary();
  const tracks = resolveTracks(state, state.liked);
  return (
    <div className="page">
      <PageHeader
        kicker="Playlist"
        title="Liked Songs"
        subtitle={summary(tracks)}
        art={<div className="cover liked-cover"><HeartFilled size={64} /></div>}
      />
      <PlayActions tracks={tracks} context="Liked Songs" />
      {tracks.length ? (
        <TrackList tracks={tracks} context="Liked Songs" />
      ) : (
        <EmptyState title="Songs you like will appear here">Tap the heart on any song to save it.</EmptyState>
      )}
    </div>
  );
}

export function RecentPage() {
  const { state, dispatch } = useLibrary();
  const tracks = resolveTracks(state, state.recent);
  return (
    <div className="page">
      <PageHeader kicker="History" title="Recently played" subtitle={plural(tracks.length, 'song')} art={<Cover ids={tracks.map((t) => t.id)} />} />
      <PlayActions tracks={tracks} context="Recently played">
        {tracks.length > 0 && (
          <button className="btn ghost" onClick={() => dispatch({ type: 'CLEAR_RECENT' })}>Clear history</button>
        )}
      </PlayActions>
      {tracks.length ? (
        <TrackList tracks={tracks} context="Recently played" showAdded={false} />
      ) : (
        <EmptyState title="Nothing played yet">Songs you play will show up here.</EmptyState>
      )}
    </div>
  );
}

export function ArtistsPage() {
  const { state } = useLibrary();
  const player = usePlayer();
  const { navigate } = useUI();
  const artists = groupByArtist(state);
  return (
    <div className="page">
      <h1 className="greeting">Artists</h1>
      {artists.length ? (
        <div className="card-grid">
          {artists.map((a) => (
            <Card
              key={a.name}
              round
              ids={[a.tracks[0].id]}
              title={a.name}
              subtitle={plural(a.tracks.length, 'song')}
              onOpen={() => navigate({ name: 'artist', artist: a.name })}
              onPlay={() => player.playTracks(a.tracks.map((t) => t.id), 0, `Artist · ${a.name}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No artists yet">Artists appear here once you add songs.</EmptyState>
      )}
    </div>
  );
}

export function ArtistPage({ artist }) {
  const { state } = useLibrary();
  const { navigate } = useUI();
  const tracks = libraryTracks(state).filter((t) => t.artist === artist).sort(byNewest);
  const context = `Artist · ${artist}`;
  return (
    <div className="page">
      <PageHeader kicker="Artist" title={artist} subtitle={summary(tracks)} art={<Cover ids={tracks.slice(0, 1).map((t) => t.id)} round />} />
      <PlayActions tracks={tracks} context={context} />
      {tracks.length ? (
        <TrackList tracks={tracks} context={context} />
      ) : (
        <EmptyState title={`No ${artist} songs in your library yet`}>
          <button className="btn primary small retry" onClick={() => navigate({ name: 'search', q: artist })}>
            Search for {artist}
          </button>
        </EmptyState>
      )}
    </div>
  );
}

export function PlaylistPage({ id }) {
  const { state, dispatch } = useLibrary();
  const { openMenu, openModal, navigate } = useUI();
  const playlist = state.playlists.find((p) => p.id === id);
  if (!playlist) {
    return <div className="page"><EmptyState title="Playlist not found">It may have been deleted.</EmptyState></div>;
  }
  const tracks = resolveTracks(state, playlist.trackIds);
  const context = `Playlist · ${playlist.name}`;

  const rename = () =>
    openModal(
      <PromptModal
        title="Rename playlist"
        label="Name"
        initial={playlist.name}
        onSubmit={(name) => dispatch({ type: 'RENAME_PLAYLIST', id, name })}
      />
    );
  const remove = () =>
    openModal(
      <ConfirmModal
        title="Delete playlist?"
        message={`“${playlist.name}” will be deleted. The songs stay in your library.`}
        onConfirm={() => { dispatch({ type: 'DELETE_PLAYLIST', id }); navigate({ name: 'home' }); }}
      />
    );

  return (
    <div className="page">
      <PageHeader
        kicker="Playlist"
        title={playlist.name}
        subtitle={summary(tracks)}
        art={<Cover ids={playlist.trackIds} />}
        onTitleClick={rename}
      />
      <PlayActions tracks={tracks} context={context}>
        <button
          className="icon-btn big"
          title="More options"
          onClick={(e) =>
            openMenu(e, [
              { label: 'Rename', onClick: rename },
              { label: 'Delete playlist', danger: true, onClick: remove },
            ])
          }
        >
          <More size={26} />
        </button>
      </PlayActions>
      {tracks.length ? (
        <>
          <TrackList
            tracks={tracks}
            context={context}
            onReorder={(from, to) => dispatch({ type: 'MOVE_IN_PLAYLIST', id, from, to })}
            extraMenu={(t) => [
              { label: 'Remove from this playlist', onClick: () => dispatch({ type: 'REMOVE_FROM_PLAYLIST', id, trackId: t.id }) },
              '-',
            ]}
          />
          <p className="muted small hint phone-hide">Drag songs to reorder.</p>
        </>
      ) : (
        <EmptyState title="This playlist is empty">
          Paste a YouTube link at the top while this playlist is open to add it here, or use “Add to playlist…” in
          any song’s ⋯ menu.
        </EmptyState>
      )}
    </div>
  );
}

/** Phone "Your library" tab: everything the desktop sidebar lists. */
export function LibraryPage() {
  const { state } = useLibrary();
  const { navigate } = useUI();
  const newPlaylist = useNewPlaylist();
  const songs = libraryTracks(state).length;
  const row = (key, art, name, sub, go) => (
    <button key={key} className="lib-row" onClick={go}>
      {art}
      <span className="pl-text">
        <span className="pl-name">{name}</span>
        {sub && <span className="muted small">{sub}</span>}
      </span>
    </button>
  );
  const iconArt = (icon) => <span className="cover lib-icon">{icon}</span>;
  return (
    <div className="page">
      <div className="section-head">
        <h1 className="greeting">Your library</h1>
        <button className="icon-btn" title="Create playlist" onClick={newPlaylist}><Plus size={26} /></button>
      </div>
      <div className="lib-list">
        {row('liked', <span className="cover liked-cover lib-icon"><HeartFilled size={22} /></span>, 'Liked Songs', plural(state.liked.length, 'song'), () => navigate({ name: 'liked' }))}
        {state.playlists.map((p) =>
          row(p.id, <Cover ids={p.trackIds} className="lib-icon" />, p.name, `Playlist · ${plural(p.trackIds.length, 'song')}`, () => navigate({ name: 'playlist', id: p.id }))
        )}
        {row('songs', iconArt(<ListIcon size={24} />), 'Songs', plural(songs, 'song'), () => navigate({ name: 'songs' }))}
        {row('artists', iconArt(<Mic size={24} />), 'Artists', null, () => navigate({ name: 'artists' }))}
        {row('recent', iconArt(<Clock size={24} />), 'Recently played', null, () => navigate({ name: 'recent' }))}
      </div>
    </div>
  );
}
