import React, { useState } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';

const AdminLogin = ({ onLoginSuccess, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await AuthService.adminLogin(username, password);
            if (res.success) {
                toast.success('Admin girişi başarılı! 🚀');
                onLoginSuccess();
            }
        } catch (err) {
            toast.error(err.message || 'Giriş başarısız!');
        }
    };

    return (
        <div style={{
            background: '#1e1e2e',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid #333',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            width: '350px',
            position: 'relative',
            zIndex: 10001,
            textAlign: 'center'
        }}>
            <h2 style={{ color: '#00d2ff', marginBottom: '20px', fontWeight: '800' }}>Admin Paneli</h2>
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <input 
                        type="text" 
                        placeholder="Kullanıcı Adı" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={inputStyle}
                        autoFocus
                    />
                </div>
                <div>
                    <input 
                        type="password" 
                        placeholder="Şifre" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {/* VAZGEÇ / ÇIKIŞ BUTONU */}
                    <button 
                        type="button" 
                        onClick={onClose} 
                        style={{ ...buttonStyle, background: '#333', color: '#ccc' }}
                    >
                        Vazgeç
                    </button>

                    {/* GİRİŞ BUTONU */}
                    <button 
                        type="submit" 
                        style={{ ...buttonStyle, background: 'linear-gradient(90deg, #00d2ff, #007aff)', color: 'white' }}
                    >
                        Giriş Yap
                    </button>
                </div>
            </form>
        </div>
    );
};

// CSS Stilleri
const inputStyle = {
    width: '100%',
    padding: '12px',
    background: '#15151b',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box'
};

const buttonStyle = {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
};

export default AdminLogin;