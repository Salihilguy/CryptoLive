import React, { useState } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next'; 

const UserAuth = ({ onClose, onSuccess, onGuestSupport }) => {
    const { t } = useTranslation();
    const [isRegister, setIsRegister] = useState(false);
    
    // Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Register State
    const [regData, setRegData] = useState({
        username: '', password: '', email: '', phone: '', birthDate: '', gender: ''
    });

    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await AuthService.userLogin(username, password);
            if (result.success) {
                // 👇 BURASI DEĞİŞTİ: Backend mesajı yerine çeviriyi kullan
                toast.success(t('auth.login_success')); 
                onSuccess(result.user); 
            }
        } catch (error) {
            toast.error(error.message); // Hata mesajları backend'den gelmeye devam edebilir
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await AuthService.register(regData);
            if (result.success) {
                toast.success(result.message);
                setIsRegister(false); 
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegChange = (e) => setRegData({...regData, [e.target.name]: e.target.value});

    return (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
            <div style={{ background: '#1e1e2e', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '350px', position:'relative', boxShadow: '0 0 20px rgba(0, 210, 255, 0.1)' }}>
                
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>

                <h2 style={{ color: '#00d2ff', marginTop: 0, textAlign:'center', marginBottom: '20px' }}>
                    {isRegister ? t('auth.register_title') : t('auth.login_title')}
                </h2>

                {isRegister ? (
                    /* KAYIT FORMU */
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} autoComplete="off">
                        {/* Tarayıcıların otomatik doldurmasını engellemek için gizli input hilesi */}
                        <input type="text" style={{display:'none'}} />
                        <input type="password" style={{display:'none'}} />

                        <input 
                            type="text" 
                            name="username" 
                            placeholder={t('auth.username')} 
                            onChange={handleRegChange} 
                            style={inputStyle} 
                            required 
                            autoComplete="off" 
                        />
                        <input 
                            type="password" 
                            name="password" 
                            placeholder={t('auth.password')} 
                            onChange={handleRegChange} 
                            style={inputStyle} 
                            required 
                            autoComplete="new-password" 
                        />
                        <input 
                            type="email" 
                            name="email" 
                            placeholder={t('auth.email')} 
                            onChange={handleRegChange} 
                            style={inputStyle} 
                            required 
                            autoComplete="off" 
                        />
                        <input 
                            type="text" 
                            name="phone" 
                            placeholder={t('auth.phone')} 
                            onChange={handleRegChange} 
                            style={inputStyle} 
                            required 
                            autoComplete="off" 
                        />
                        
                        <div style={{display:'flex', gap:'5px'}}>
                            <div style={{flex:1}}>
                                <label style={{color:'#888', fontSize:'0.7rem', display:'block', marginBottom:'2px'}}>{t('auth.birth_date')}</label>
                                <input type="date" name="birthDate" onChange={handleRegChange} style={{...inputStyle, padding:'8px'}} required />
                            </div>
                            <div style={{flex:1}}>
                                <label style={{color:'#888', fontSize:'0.7rem', display:'block', marginBottom:'2px'}}>{t('auth.gender')}</label>
                                <select name="gender" onChange={handleRegChange} style={{...inputStyle, padding:'8px'}} required>
                                    <option value="">{t('auth.gender_select')}</option>
                                    <option value="Erkek">{t('auth.male')}</option>
                                    <option value="Kadın">{t('auth.female')}</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={btnStyle}>
                            {loading ? t('auth.processing') : t('auth.submit_register')}
                        </button>
                    </form>
                ) : (
                    /* GİRİŞ FORMU */
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} autoComplete="off">
                        <input 
                            type="text" 
                            placeholder={t('auth.email') + " / " + t('auth.phone')} 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            style={inputStyle} 
                            required 
                            autoComplete="off" 
                        />
                        <input 
                            type="password" 
                            placeholder={t('auth.password')} 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            style={inputStyle} 
                            required 
                            autoComplete="new-password" 
                        />
                        <button type="submit" disabled={loading} style={btnStyle}>
                            {loading ? t('auth.processing') : t('auth.submit_login')}
                        </button>
                    </form>
                )}

                <div style={{marginTop:'15px', textAlign:'center', fontSize:'0.9rem'}}>
                    <span onClick={() => setIsRegister(!isRegister)} style={{color:'#00d2ff', cursor:'pointer', textDecoration:'underline'}}>
                        {isRegister ? t('auth.have_account') : t('auth.no_account')}
                    </span>
                </div>

                <div style={{marginTop:'10px', textAlign:'center'}}>
                    <button 
                        onClick={() => onGuestSupport(isRegister ? 'REGISTER' : 'LOGIN')} 
                        style={{background:'none', border:'none', color:'#aaa', fontSize:'0.8rem', cursor:'pointer'}}
                    >
                        {t('auth.guest_support')}
                    </button>
                </div>

                <div style={{marginTop:'20px', textAlign:'center', fontSize:'0.7rem', color:'#666'}}>
                    {t('auth.footer')}
                </div>
            </div>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '10px', background: '#15151b', border: '1px solid #333', borderRadius: '6px', color: 'white', boxSizing: 'border-box', outline: 'none' };
const btnStyle = { width: '100%', padding: '12px', background: 'linear-gradient(90deg, #00d2ff, #007aff)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' };

export default UserAuth;