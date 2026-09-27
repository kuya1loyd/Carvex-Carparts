import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

function SafeRoot() {
  return (
    <div style={{ padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>CarVex failed to mount</div>
      <div style={{ color: '#b91c1c' }}>
        #app element was not found. Ensure the page includes:
        <br />
        <code>{'<div id="app">'}</code>
      </div>
    </div>
  );
}

const el = document.getElementById('app');
if (!el) {
  ReactDOM.createRoot(document.body).render(<SafeRoot />);
} else {
  ReactDOM.createRoot(el).render(<App />);
}

