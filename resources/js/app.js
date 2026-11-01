require('./bootstrap');

// Surface runtime errors early on screen if React fails silently
window.addEventListener('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('CarVex runtime error:', e?.message || e);
    const appEl = document.getElementById('app');
    if (appEl && (!appEl.innerHTML || appEl.innerHTML.trim() === '')) {
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'padding: 20px; margin: 20px; background: #fff1f2; border: 2px solid #e11d48; border-radius: 8px; color: #9f1239; font-family: monospace;';
        errDiv.innerHTML = `<h3 style="margin:0 0 8px;">CarVex Runtime Error</h3><p style="margin:0 0 8px;">${e.message || 'Error occurred during initial script evaluation'}</p><small>${e.filename || ''}:${e.lineno || ''}</small>`;
        document.body.prepend(errDiv);
    }
});

window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled promise rejection:', e?.reason || e);
});

// Mount React with safe error boundary
import './bootstrapReact';
