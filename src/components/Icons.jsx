// Small inline SVG icon set.
const I = ({ d, size = 20, fill = 'currentColor', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true" {...rest}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const Play = (p) => <I {...p} d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />;
export const Pause = (p) => <I {...p} d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" />;
export const Next = (p) => <I {...p} d="M5 5.5v13a.75.75 0 0 0 1.15.63L15.5 13v5.5h2.5v-13h-2.5V11L6.15 4.87A.75.75 0 0 0 5 5.5z" />;
export const Prev = (p) => <I {...p} d="M19 5.5v13a.75.75 0 0 1-1.15.63L8.5 13v5.5H6v-13h2.5V11l9.35-6.13A.75.75 0 0 1 19 5.5z" />;
export const Shuffle = (p) => <I {...p} d="M16 3h5v5h-2V6.41l-4.29 4.3-1.42-1.42L17.59 5H16zM3 5.41 4.41 4l15.18 15.17V17.6h2v5h-5v-2h1.59zM9.29 13.29l1.42 1.42L4.41 21 3 19.59z" />;
export const Repeat = (p) => <I {...p} d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />;
export const RepeatOne = (p) => (
  <I {...p} d={<><path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" /><path d="M11 15h1.5V9h-1l-2 1v1l1.5-.5z" /></>} />
);
export const Heart = (p) => <I {...p} fill="none" stroke="currentColor" strokeWidth="2" d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />;
export const HeartFilled = (p) => <I {...p} d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />;
export const Volume = (p) => <I {...p} d="M4 9v6h4l5 5V4L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />;
export const VolumeOff = (p) => <I {...p} d="M4 9v6h4l5 5V4L8 9zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" />;
export const QueueIcon = (p) => <I {...p} d="M3 6h13v2H3zm0 5h13v2H3zm0 5h8v2H3zm12 0 6-3.5v7z" />;
export const VideoIcon = (p) => <I {...p} d="M3 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3.5l4-3v11l-4-3V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
export const Home = (p) => <I {...p} d="M12 3 3 10v11h6v-6h6v6h6V10z" />;
export const Music = (p) => <I {...p} d="M9 3v11.55A4 4 0 1 0 11 18V7h6V3z" />;
export const Mic = (p) => <I {...p} d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />;
export const Clock = (p) => <I {...p} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.5 2.1-1 1.7L11 13V7h2z" />;
export const SearchIcon = (p) => <I {...p} d="M10.5 3a7.5 7.5 0 0 1 5.96 12.05l4.25 4.24-1.42 1.42-4.24-4.25A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />;
export const Plus = (p) => <I {...p} d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />;
export const More = (p) => <I {...p} d="M5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />;
export const Close = (p) => <I {...p} d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z" />;
export const ChevronDown = (p) => <I {...p} d="M5.6 8.3 12 14.7l6.4-6.4 1.4 1.4-7.8 7.8-7.8-7.8z" />;
export const Library = (p) => <I {...p} d="M4 3h2v18H4zm4 0h2v18H8zm4.7.6 1.9-.6 5.8 17.4-1.9.6z" />;
export const SyncIcon = (p) => <I {...p} d="M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8zm8 8a8 8 0 0 1-15.4 3H7v-2H1v6h2v-2.3A10 10 0 0 0 22 12z" />;
export const ListIcon = (p) => <I {...p} d="M4 5h16v2H4zm0 6h16v2H4zm0 6h10v2H4z" />;
export const Link = (p) => <I {...p} d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a3 3 0 1 1 4.2 4.2l-2 2-1.4-1.4 2-2a1 1 0 0 0-1.4-1.4l-3 3a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3 3a3 3 0 1 1-4.2-4.2l2-2 1.4 1.4-2 2a1 1 0 1 0 1.4 1.4l3-3a1 1 0 0 1 1.4 0z" />;

/** Natefy logo mark: sound bars that spell out an "N". */
export const Logo = ({ size = 28 }) => (
  <svg width={size * 56 / 44} height={size} viewBox="0 0 56 44" aria-hidden="true">
    <g fill="var(--accent)">
      <rect x="2" y="6" width="7" height="32" rx="3.5" />
      <rect x="13" y="12" width="7" height="14" rx="3.5" />
      <rect x="24" y="18" width="7" height="14" rx="3.5" />
      <rect x="35" y="6" width="7" height="32" rx="3.5" />
    </g>
    <rect x="47" y="14" width="7" height="16" rx="3.5" fill="var(--accent-2)" />
  </svg>
);
