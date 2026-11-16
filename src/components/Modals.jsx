import { useState } from 'react';
import { uid, useLibrary } from '../library.jsx';
import { useUI } from '../ui.jsx';
import { thumbnailUrl } from '../youtube.js';
import { Plus } from './Icons.jsx';

export function PromptModal({ title, label, initial = '', confirmLabel = 'Save', onSubmit }) {
  const { closeModal } = useUI();
  const [value, setValue] = useState(initial);
  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    closeModal();
  };
  return (
    <form onSubmit={submit}>
      <h2>{title}</h2>
      <label className="field">
        <span>{label}</span>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={closeModal}>Cancel</button>
        <button className="btn primary">{confirmLabel}</button>
      </div>
    </form>
  );
}

export function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm }) {
  const { closeModal } = useUI();
  return (
    <div>
      <h2>{title}</h2>
      <p className="muted">{message}</p>
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>Cancel</button>
        <button className="btn danger" autoFocus onClick={() => { onConfirm(); closeModal(); }}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function EditTrackModal({ track }) {
  const { dispatch } = useLibrary();
  const { closeModal } = useUI();
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const submit = (e) => {
    e.preventDefault();
    dispatch({
      type: 'UPDATE_TRACK',
      id: track.id,
      patch: { title: title.trim() || track.title, artist: artist.trim() || 'Unknown artist' },
    });
    closeModal();
  };
  return (
    <form onSubmit={submit}>
      <h2>Edit details</h2>
      <div className="edit-track">
        <img src={thumbnailUrl(track.id)} alt="" />
        <div className="edit-fields">
          <label className="field">
            <span>Title</span>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Artist</span>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} />
          </label>
        </div>
      </div>
      <p className="muted small">Original YouTube title: {track.rawTitle}</p>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={closeModal}>Cancel</button>
        <button className="btn primary">Save</button>
      </div>
    </form>
  );
}

export function AddToPlaylistModal({ trackIds }) {
  const { state, dispatch } = useLibrary();
  const { closeModal, notify, openModal } = useUI();

  const add = (p) => {
    dispatch({ type: 'ADD_TO_PLAYLIST', id: p.id, trackIds });
    notify(`Added to ${p.name}`);
    closeModal();
  };

  const createNew = () =>
    openModal(
      <PromptModal
        title="New playlist"
        label="Name"
        confirmLabel="Create"
        onSubmit={(name) => {
          dispatch({ type: 'CREATE_PLAYLIST', id: uid(), name, trackIds });
          notify(`Added to ${name}`);
        }}
      />
    );

  return (
    <div>
      <h2>Add to playlist</h2>
      <div className="pick-list">
        <button className="pick-item" onClick={createNew}>
          <span className="pick-art new"><Plus /></span>
          New playlist
        </button>
        {state.playlists.map((p) => (
          <button key={p.id} className="pick-item" onClick={() => add(p)}>
            <span className="pick-art">
              {p.trackIds[0] ? <img src={thumbnailUrl(p.trackIds[0])} alt="" /> : null}
            </span>
            <span>
              {p.name}
              <span className="muted small"> · {p.trackIds.length} songs</span>
            </span>
          </button>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={closeModal}>Cancel</button>
      </div>
    </div>
  );
}
