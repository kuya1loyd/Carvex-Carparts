import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Building2, Lock, CheckCircle, Eye, EyeOff, Camera, Upload } from 'lucide-react';

export default function AdminAccount() {
    const { user, updateProfile, token } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [company, setCompany] = useState(user?.company_name || 'CarVex Auto Parts');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profilePreview, setProfilePreview] = useState(user?.profile_picture || null);
    const [profileFile, setProfileFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleProfilePictureClick = () => {
        fileInputRef.current?.click();
    };

    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setProfileFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('phone', phone);
            if (profileFile) {
                formData.append('profile_picture', profileFile);
            }

            const response = await fetch('/api/admin/profile', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                credentials: 'include',
                body: formData,
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('Profile updated successfully');
                setMessageType('success');
                setProfileFile(null);
                
                // Update localStorage and trigger storage event for other components
                if (data.data) {
                    const updatedUser = {
                        ...user,
                        first_name: data.data.first_name || firstName,
                        last_name: data.data.last_name || lastName,
                        phone: data.data.phone || phone,
                        profile_picture: data.data.profile_picture || profilePreview,
                    };
                    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
                    localStorage.setItem('auth_validated_at', String(Date.now()));
                    
                    // Dispatch event to notify other components (like AdminLayout)
                    window.dispatchEvent(new CustomEvent('profile-updated', {
                        detail: updatedUser
                    }));
                    
                    if (data.data.profile_picture) {
                        setProfilePreview(data.data.profile_picture);
                    }
                }
            } else {
                setMessage(data.message || 'Failed to update profile');
                setMessageType('error');
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to update profile: ' + err.message);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage('Please fill in all password fields');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setMessage('New password and confirm password do not match');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        
        setLoading(true);
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    new_password_confirmation: confirmPassword,
                }),
            });
            
            const data = await response.json();
            console.log('Password change response:', data);
            
            if (response.ok) {
                setMessage('Password updated successfully');
                setMessageType('success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage(data.message || 'Failed to update password');
                setMessageType('error');
                console.error('Password change error:', data);
            }
        } catch (err) {
            console.error('Password change exception:', err);
            setMessage('Failed to update password: ' + err.message);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-dashboard-modern">
                <div className="admin-page-header">
                    <div className="header-content">
                        <h1>Settings</h1>
                        <p>Manage your account and application preferences</p>
                    </div>
                </div>

                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        marginBottom: '1.5rem',
                        background: messageType === 'success' ? '#dcfce7' : messageType === 'error' ? '#fee2e2' : '#dbeafe',
                        color: messageType === 'success' ? '#15803d' : messageType === 'error' ? '#991b1b' : '#1e40af',
                        border: `1px solid ${messageType === 'success' ? '#bbf7d0' : messageType === 'error' ? '#fecaca' : '#bfdbfe'}`
                    }}>
                        {message}
                    </div>
                )}

                {/* Profile Information Section */}
                <div className="admin-panel" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <User size={24} color="#0f172a" />
                        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>Profile Information</h2>
                    </div>

                    <form onSubmit={handleProfileSubmit}>
                        {/* Profile Picture Upload */}
                        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                            <div 
                                onClick={handleProfilePictureClick}
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    background: profilePreview ? 'transparent' : '#e2e8f0',
                                    border: '3px dashed #94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1rem',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                            >
                                {profilePreview ? (
                                    <img 
                                        src={profilePreview} 
                                        alt="Profile" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Camera size={40} color="#94a3b8" />
                                )}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    padding: '0.25rem',
                                    fontSize: '0.75rem',
                                    display: profilePreview ? 'none' : 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem'
                                }}>
                                    <Upload size={12} />
                                    Upload
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePictureChange}
                                style={{ display: 'none' }}
                            />
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                                Click to upload profile picture
                            </p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                JPG, PNG up to 2MB
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.95rem',
                                        color: '#0f172a',
                                        background: '#f8fafc'
                                    }}
                                    placeholder="Admin"
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.95rem',
                                        color: '#0f172a',
                                        background: '#f8fafc'
                                    }}
                                    placeholder="User"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: '#0f172a',
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}>Email Address</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.75rem',
                                    fontSize: '0.95rem',
                                    color: '#94a3b8',
                                    background: '#f1f5f9',
                                    cursor: 'not-allowed'
                                }}
                            />
                            <small style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                                Email cannot be changed
                            </small>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: '#0f172a',
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}>Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.75rem',
                                    fontSize: '0.95rem',
                                    color: '#0f172a',
                                    background: '#f8fafc'
                                }}
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <CheckCircle size={18} />
                            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </form>
                </div>

                {/* Company Information Section */}
                <div className="admin-panel" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Building2 size={24} color="#0f172a" />
                        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>Company Information</h2>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: '#0f172a',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}>Company Name</label>
                        <input
                            type="text"
                            value={company}
                            disabled
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                fontSize: '0.95rem',
                                color: '#0f172a',
                                background: '#f8fafc'
                            }}
                        />
                    </div>

                    <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb', color: '#64748b', fontSize: '0.9rem' }}>
                        <strong style={{ color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>Company Details</strong>
                        <p style={{ margin: 0, lineHeight: '1.6' }}>
                            Your company information is locked to prevent unauthorized changes. Contact support if you need to update company details.
                        </p>
                    </div>
                </div>

                {/* Password Section */}
                <div className="admin-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Lock size={24} color="#0f172a" />
                        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 700 }}>Security</h2>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: '#0f172a',
                                fontWeight: 600,
                                fontSize: '0.9rem'
                            }}>Current Password</label>
                            <div style={{ position: 'relative', maxWidth: '400px' }}>
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.95rem',
                                        color: '#0f172a',
                                        background: '#f8fafc'
                                    }}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0.25rem',
                                        color: '#64748b'
                                    }}
                                >
                                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '0.75rem',
                                            fontSize: '0.95rem',
                                            color: '#0f172a',
                                            background: '#f8fafc'
                                        }}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '0.75rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.25rem',
                                            color: '#64748b'
                                        }}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '0.75rem',
                                            fontSize: '0.95rem',
                                            color: '#0f172a',
                                            background: '#f8fafc'
                                        }}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '0.75rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.25rem',
                                            color: '#64748b'
                                        }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
