require('./bootstrap');

// Mount React with a safe fallback UI to avoid blank/white screen.
import './bootstrapReact';

// Surface runtime errors early in the console.
window.addEventListener('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('Runtime error:', e?.message || e);
});

window.addEventListener('unhandledrejection', (e) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled promise rejection:', e?.reason || e);
});


