import React, { useState } from 'react';
import { AuthService } from '../services/api'; // Servisi çağırdık

const AdminLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // DÜZELTİLEN KISIM BURASI: .login yerine .adminLogin oldu
      const result = await AuthService.adminLogin(username, password);
      
      if (result.success) {
        onLoginSuccess(); // App.js'e "Tamamdır, içeri al" diyoruz
      }
    } catch (err) {
      setErrorMsg(err.message || 'Bir hata oluştu!');
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#13131a',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Segoe UI, sans-serif',
      color: 'white',
      position: 'fixed', // Sayfanın en üstünde dursun
      top: 0, left: 0, zIndex: 9999
    }}>
      <style>{`
        .login-card {
          background: #1e1e2e;
          padding: 40px;
          border-radius: 16px;
          border: 1px solid #333;
          box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
          width: 350px;
          text-align: center;
        }
        .custom-input {
          width: 100%; padding: 12px; margin-bottom: 15px;
          background: #15151b; border: 1px solid #333; border-radius: 8px;
          color: white; outline: none; box-sizing: border-box;
        }
        .custom-input:focus { border-color: #00d2ff; }
        .login-btn {
          width: 100%; padding: 12px;
          background: linear-gradient(90deg, #00d2ff, #007aff);
          border: none; border-radius: 8px; color: white;
          font-weight: bold; cursor: pointer; margin-top: 10px;
        }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg { color: #ff4d4d; font-size: 0.9rem; margin-bottom: 10px; }
      `}</style>

      <div className="login-card">
        <h2 style={{ color: '#00d2ff', marginTop: 0 }}>PANEL GİRİŞ</h2>
        <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>Admin yetkilendirmesi gerekli</p>
        
        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            className="custom-input" 
            placeholder="Kullanıcı Adı (admin)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            type="password" 
            className="custom-input" 
            placeholder="Şifre (1234)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'KONTROL EDİLİYOR...' : 'GİRİŞ YAP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;