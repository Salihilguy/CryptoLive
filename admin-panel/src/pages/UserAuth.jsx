import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { AuthService } from '../services/api'; 

const UserAuth = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(''); 
    
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await AuthService.adminLogin(username, password);
            console.log("Giriş Başarılı:", result);
            navigate('/dashboard');

        } catch (err) {
            setError(err.message || 'Giriş başarısız. Bilgileri kontrol et.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'#0f0f13', display:'flex', justifyContent:'center', alignItems:'center' }}>
            
            <div style={{ background: '#1e1e2e', padding: '40px', borderRadius: '16px', border: '1px solid #333', width: '350px', position:'relative', boxShadow: '0 0 20px rgba(0, 210, 255, 0.1)' }}>
                
                <h2 style={{ color: '#00d2ff', marginTop: 0, textAlign:'center', marginBottom: '20px' }}>YÖNETİCİ PANELİ</h2>
                
                {/* Hata Mesajı Alanı */}
                {error && (
                    <div style={{ color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center', border: '1px solid #ff4d4d' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        placeholder="Admin Kullanıcı Adı" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        style={{width:'100%', padding:'12px', marginBottom:'15px', background:'#15151b', border:'1px solid #333', borderRadius:'8px', color:'white', boxSizing:'border-box', outline: 'none'}} 
                        required 
                    />
                    
                    <input 
                        type="password" 
                        placeholder="Şifre" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        style={{width:'100%', padding:'12px', marginBottom:'15px', background:'#15151b', border:'1px solid #333', borderRadius:'8px', color:'white', boxSizing:'border-box', outline: 'none'}} 
                        required 
                    />
                    
                    <button 
                        type="submit" 
                        disabled={loading} 
                        style={{
                            width:'100%', 
                            padding:'12px', 
                            background: loading ? '#555' : 'linear-gradient(90deg, #00d2ff, #007aff)', 
                            border:'none', 
                            borderRadius:'8px', 
                            color:'white', 
                            fontWeight:'bold', 
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px'
                        }}>
                        {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
                    </button>
                </form>

                <div style={{marginTop:'20px', textAlign:'center', fontSize:'0.8rem', color:'#666'}}>
                    CryptoLive Yönetim Sistemi © 2025
                </div>
            </div>
        </div>
    );
};

export default UserAuth;