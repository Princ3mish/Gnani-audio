import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import NotesList from './pages/NotesList';
import NoteDetail from './pages/NoteDetail';
import Architecture from './pages/Architecture';

function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#007acc', fontWeight: 'bold' }}>Home (Notes List)</Link>
          <Link to="/notes/sample-note-id" style={{ textDecoration: 'none', color: '#007acc', fontWeight: 'bold' }}>Sample Note Detail</Link>
          <Link to="/architecture" style={{ textDecoration: 'none', color: '#007acc', fontWeight: 'bold' }}>Architecture</Link>
        </nav>
        <hr style={{ border: 'none', height: '1px', backgroundColor: '#ccc', margin: '20px 0' }} />
        <main>
          <Routes>
            <Route path="/" element={<NotesList />} />
            <Route path="/notes/:id" element={<NoteDetail />} />
            <Route path="/architecture" element={<Architecture />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
