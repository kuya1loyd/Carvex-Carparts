import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            hasError: true,
            error: error,
            errorInfo: errorInfo
        });
        console.error('Error caught by Error Boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '24px',
                    margin: '20px auto',
                    maxWidth: '800px',
                    background: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#991b1b',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ margin: '0 0 10px', fontSize: '20px', color: '#b91c1c' }}>CarVex Application Error</h2>
                    <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#4b5563' }}>
                        A client-side error occurred while rendering the page:
                    </p>
                    <pre style={{
                        background: '#ffffff',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        overflow: 'auto',
                        fontSize: '13px',
                        color: '#b91c1c',
                        fontFamily: 'monospace'
                    }}>
                        {this.state.error && (this.state.error.stack || this.state.error.toString())}
                    </pre>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
