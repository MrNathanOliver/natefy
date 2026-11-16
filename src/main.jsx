import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No <StrictMode>: its double-mounting would create the YouTube player twice.
createRoot(document.getElementById('root')).render(<App />);
