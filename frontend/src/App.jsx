import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Chat from './pages/Chat.jsx';
import Navbar from './components/ui/Navbar.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center"
          style={{ background: '#ffffff' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
          </div>
          <h2 className="text-lg font-semibold" style={{ color: '#0d0d0d' }}>Something went wrong</h2>
          <p className="text-sm max-w-sm" style={{ color: '#6b7280' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/chat'; }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#0d0d0d', color: '#ffffff' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>
        <Navbar />
        <main className="flex-1 flex flex-col">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
