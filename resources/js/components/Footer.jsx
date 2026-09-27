import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
    const { isAuthenticated, isAdmin } = useAuth();
    const cartPath = isAuthenticated && !isAdmin ? '/dashboard/cart' : '/cart';

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-grid">
                    <div className="footer-section brand-block">
                        <h3>About CarVex</h3>
                        <p>Your trusted online car parts shopping platform.</p>
                        <p className="brand-note">Auto parts. Helpful support.</p>
                    </div>

                    <div className="footer-section">
                        <h3>Quick Links</h3>
                        <ul>
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/products">Products</Link></li>
                            <li><Link to={cartPath}>Cart</Link></li>
                            <li><Link to="/login">Login</Link></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h3>Contact</h3>
                        <p className="contact-item">
                            <span className="contact-icon" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="5" width="18" height="14" rx="2" />
                                    <path d="m3 7 9 6 9-6" />
                                </svg>
                            </span>
                            <span>support@carvex.ph</span>
                        </p>
                        <p className="contact-item">
                            <span className="contact-icon" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.35 1.78.68 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.25a2 2 0 0 1 2.11-.45c.83.33 1.71.56 2.61.68A2 2 0 0 1 22 16.92z" />
                                </svg>
                            </span>
                            <span>+63 9395158432</span>
                        </p>
                        <p className="contact-item">
                            <span className="contact-icon" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </span>
                            <span>Agusan del Norte, Butuan City</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} CarVex. All rights reserved.</p>
            </div>
        </footer>
    );
}
