import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
    const { isAuthenticated, isAdmin } = useAuth();
    const cartPath = isAuthenticated && !isAdmin ? '/dashboard/cart' : '/cart';

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-grid">
                    <div className="footer-section brand-block">
                        <Link to="/" className="footer-brand" aria-label="CarVex home">
                            <img src="/images/carvex.png" alt="" />
                            <span><strong>CarVex</strong><small>Auto parts</small></span>
                        </Link>
                        <p>Parts for the road ahead. Find what you need, get help with fit, and keep your vehicle moving.</p>
                    </div>

                    <nav className="footer-section" aria-label="Shop links">
                        <h3>Shop</h3>
                        <ul>
                            <li><Link to="/products">All products</Link></li>
                            <li><Link to="/products">Shop parts</Link></li>
                            <li><Link to={cartPath}>Shopping cart</Link></li>
                        </ul>
                    </nav>

                    <nav className="footer-section" aria-label="CarVex links">
                        <h3>CarVex</h3>
                        <ul>
                            <li><Link to="/customer-service">Customer support</Link></li>
                            <li><Link to="/terms">Terms of service</Link></li>
                            <li><Link to="/privacy">Privacy policy</Link></li>
                        </ul>
                    </nav>

                    <div className="footer-section footer-contact">
                        <h3>Talk to our team</h3>
                        <a className="contact-item" href="mailto:support@carvex.ph">
                            <Mail size={17} aria-hidden="true" />
                            <span>support@carvex.ph</span>
                        </a>
                        <a className="contact-item" href="tel:+639395158432">
                            <Phone size={17} aria-hidden="true" />
                            <span>+63 939 515 8432</span>
                        </a>
                        <p className="contact-item">
                            <MapPin size={17} aria-hidden="true" />
                            <span>Butuan City, Agusan del Norte</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} CarVex. All rights reserved.</p>
                <span>Built for better journeys.</span>
            </div>
        </footer>
    );
}
