import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';

function SafeRoot() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#111827' }}>CarVex failed to mount</div>
      <div style={{ color: '#b91c1c' }}>
        #app element was not found in document. Ensure page includes:
        <br />
        <code>{'<div id="app"></div>'}</code>
      </div>
    </div>
  );
}

const el = document.getElementById('app');
if (!el) {
  ReactDOM.createRoot(document.body).render(<SafeRoot />);
} else {
  ReactDOM.createRoot(el).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
