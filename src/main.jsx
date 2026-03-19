import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { Component } from 'react';
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("ROOT ERROR:", error, info); }
  render() {
    if (this.state.error) return (
      <div style={{ color: "#ff4040", background: "#1a0a0a", padding: 20, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: "100vh", overflow: "auto" }}>
        <h2>Game Error</h2>
        <p>{String(this.state.error)}</p>
        <pre>{this.state.error?.stack}</pre>
        <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
