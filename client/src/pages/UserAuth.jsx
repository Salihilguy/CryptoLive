import React, { useState } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';

const UserAuth = ({ onSuccess, onClose, onGuestSupport }) => {
    const [isLoginMode, setIsLoginMode] = useState(true); 
    
    // GİRİŞ
    const [loginInput, setLoginInput] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // KAYIT
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regBirthDate, setRegBirthDate] = useState('');
    const [regGender, setRegGender] = useState('Erkek');

    const [loading, setLoading] = useState(false);

    const validateRegister = () => {

        if (!regUsername.trim()) {
            toast.warn("Lütfen bir kullanıcı adı belirleyin.");
            return false;
        }

        // Mail Kontrolü (@ ve . var mı?)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(regEmail)) {
            toast.warn("Lütfen geçerli bir e-posta adresi girin (örn: isim@gmail.com).");
            return false;
        }

        // Telefon Kontrolü (5 ile başlıyor mu, 10 hane mi?)
        const phoneRegex = /^5\d{9}$/;
        if (!phoneRegex.test(regPhone)) {
            toast.warn("Telefon numarası '5' ile başlamalı ve toplam 10 hane olmalıdır (Örn: 5321234567).");
            return false;
        }

        // Yaş Kontrolü (Tam Tarih)
        if (!regBirthDate) {
            toast.warn("Lütfen doğum tarihinizi seçin.");
            return false;
        } 
        
        const birth = new Date(regBirthDate);
        const birthYear = birth.getFullYear();

        if (birthYear < 1910 || birthYear > 2025) {
            toast.warn("Doğum tarihi 1910 ile 2025 yılları arasında olmalıdır.");
            return false;
        }
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        if (age < 18) {
            toast.error("Üzgünüz, üye olmak için 18 yaşını gün, ay ve yıl olarak doldurmuş olmalısınız.");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isLoginMode) {
            if (!validateRegister()) return;
        }

        setLoading(true);
        try {
            if (isLoginMode) {
                const result = await AuthService.userLogin(loginInput, loginPassword);
                
                toast.success(`Hoş geldin ${result.user.username}!`);
                onSuccess(result.user); 
            } else {
                const result = await AuthService.register(regUsername, regPassword, regEmail, regPhone, regBirthDate, regGender);
                toast.success(result.message);
                setIsLoginMode(true);
            }
        } catch (error) {
            toast.error(error.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
            <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)' }} onClick={onClose}></div>
            
            <div style={{ background: '#1e1e2e', padding: '40px', borderRadius: '16px', border: '1px solid #333', width: '380px', zIndex: 10000, position:'relative', maxHeight:'90vh', overflowY:'auto' }}>
                <button onClick={onClose} style={{position:'absolute', top:'10px', right:'15px', background:'none', border:'none', color:'#666', fontSize:'1.2rem', cursor:'pointer'}}>✕</button>
                
                <h2 style={{ color: '#00d2ff', marginTop: 0, textAlign:'center', marginBottom:'20px' }}>{isLoginMode ? 'GİRİŞ YAP' : 'KAYIT OL'}</h2>
                
                <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    
                    {isLoginMode ? (
                        <>
                            <input type="text" placeholder="E-posta veya Telefon Numarası" value={loginInput} onChange={e => setLoginInput(e.target.value)} style={inputStyle} required />
                            <input type="password" placeholder="Şifre" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={inputStyle} required />
                        </>
                    ) : (
                        <>
                            <input type="text" placeholder="Görünen İsim (Nick)" value={regUsername} onChange={e => setRegUsername(e.target.value)} style={inputStyle} required />
                            
                            <input type="email" placeholder="E-posta (örn: ali@gmail.com)" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={inputStyle} required />

                            <input type="tel" placeholder="Telefon (532... - 10 Hane)" value={regPhone} onChange={e => setRegPhone(e.target.value)} maxLength={10} style={inputStyle} required />
                            
                            <div style={{display:'flex', gap:'10px'}}>
                                <select value={regGender} onChange={e => setRegGender(e.target.value)} style={inputStyle}>
                                    <option value="Erkek">Erkek</option>
                                    <option value="Kadın">Kadın</option>
                                </select>

                                <input 
                                    type="date" 
                                    value={regBirthDate} 
                                    onChange={e => setRegBirthDate(e.target.value)} 
                                    min="1910-01-01"
                                    max="2025-12-31"
                                    style={{...inputStyle, colorScheme:'dark'}} 
                                    required
                                />
                            </div>
                            
                            <input type="password" placeholder="Şifre Belirle" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={inputStyle} required />
                            <p style={{fontSize:'0.75rem', color:'#666', margin:0}}>* Üye olmak için 18 yaşını doldurmuş olmalısınız.</p>
                        </>
                    )}
                    
                    <button type="submit" disabled={loading} style={btnStyle}>
                        {loading ? 'İşlem Yapılıyor...' : (isLoginMode ? 'GİRİŞ YAP' : 'KAYIT OL')}
                    </button>
                </form>

                <div style={{marginTop:'20px', textAlign:'center', fontSize:'0.9rem', color:'#aaa'}}>
                    {isLoginMode ? "Hesabın yok mu? " : "Zaten üye misin? "}
                    <span onClick={() => setIsLoginMode(!isLoginMode)} style={{color:'#00d2ff', cursor:'pointer', fontWeight:'bold'}}>
                        {isLoginMode ? "Kayıt Ol" : "Giriş Yap"}
                    </span>
                    
                    <p onClick={() => { if(onGuestSupport) onGuestSupport(isLoginMode ? 'LOGIN' : 'REGISTER'); }} style={{ marginTop: '15px', color: '#00d2ff', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', textDecoration: 'underline', fontWeight: 'bold' }}>
                        💬 {isLoginMode ? 'Giriş yapamıyor musun? Bize Ulaş' : 'Üye olamıyor musun? Bize Ulaş'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const inputStyle = { width:'100%', padding:'12px', background:'#15151b', border:'1px solid #333', borderRadius:'8px', color:'white', boxSizing:'border-box', outline:'none' };
const btnStyle = { width:'100%', padding:'12px', background: 'linear-gradient(90deg, #00d2ff, #007aff)', border:'none', borderRadius:'8px', color:'white', fontWeight:'bold', cursor:'pointer', marginTop:'10px' };

export default UserAuth;