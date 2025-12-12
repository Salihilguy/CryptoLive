import React, { useState } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';

const UserAuth = ({ onSuccess, onClose }) => {
    const [isLoginMode, setIsLoginMode] = useState(true); 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLoginMode) {
                // GİRİŞ YAP
                const result = await AuthService.userLogin(username, password);
                toast.success(`Hoş geldin ${result.username}!`);
                onSuccess(result); 
            } else {
                // KAYIT OL
                const result = await AuthService.register(username, password);
                toast.success(result.message);
                setIsLoginMode(true);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
            <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)' }} onClick={onClose}></div>
            
            <div style={{ background: '#1e1e2e', padding: '40px', borderRadius: '16px', border: '1px solid #333', width: '350px', zIndex: 10000, position:'relative' }}>
                <button onClick={onClose} style={{position:'absolute', top:'10px', right:'15px', background:'none', border:'none', color:'#666', fontSize:'1.2rem', cursor:'pointer'}}>✕</button>
                
                <h2 style={{ color: '#00d2ff', marginTop: 0, textAlign:'center' }}>{isLoginMode ? 'ÜYE GİRİŞİ' : 'KAYIT OL'}</h2>
                
                <form onSubmit={handleSubmit}>
                    <input type="text" placeholder="Kullanıcı Adı" value={username} onChange={e => setUsername(e.target.value)} 
                        style={{width:'100%', padding:'12px', marginBottom:'15px', background:'#15151b', border:'1px solid #333', borderRadius:'8px', color:'white', boxSizing:'border-box'}} required />
                    
                    <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} 
                        style={{width:'100%', padding:'12px', marginBottom:'15px', background:'#15151b', border:'1px solid #333', borderRadius:'8px', color:'white', boxSizing:'border-box'}} required />
                    
                    <button type="submit" disabled={loading} style={{width:'100%', padding:'12px', background: 'linear-gradient(90deg, #00d2ff, #007aff)', border:'none', borderRadius:'8px', color:'white', fontWeight:'bold', cursor:'pointer'}}>
                        {loading ? 'İşlem Yapılıyor...' : (isLoginMode ? 'GİRİŞ YAP' : 'KAYIT OL')}
                    </button>
                </form>

                <div style={{marginTop:'20px', textAlign:'center', fontSize:'0.9rem', color:'#aaa'}}>
                    {isLoginMode ? "Hesabın yok mu? " : "Zaten üye misin? "}
                    <span onClick={() => setIsLoginMode(!isLoginMode)} style={{color:'#00d2ff', cursor:'pointer', fontWeight:'bold'}}>
                        {isLoginMode ? "Kayıt Ol" : "Giriş Yap"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default UserAuth;