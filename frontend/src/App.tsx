import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import UploadPage from './pages/UploadPage';
import NoteDetailPage from './pages/NoteDetailPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <Link to="/" className="app-brand">
            <div className="brand-icon-wrapper">
              <Mic size={20} strokeWidth={2.5} />
            </div>
            <span className="brand-text">Gnani Audio Notes</span>
          </Link>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Notes Workspace</Link>
          </nav>
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/notes/:id" element={<NoteDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
