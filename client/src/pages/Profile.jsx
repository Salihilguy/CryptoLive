import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Profile = ({ user, onUpdateUser }) => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        gender: '',
        birthDate: '',
        password: '' 
    });

    const [showModal, setShowModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email || '',
                phone: user.phone || '',
                gender: user.gender || '',
                birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                password: ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 1. AŞAMA: KAYDET BUTONUNA BASINCA (Kod Gönder)
    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await AuthService.sendVerificationCode(user.username);
            toast.info("📧 Doğrulama kodu e-postana gönderildi!");
            setLoading(false);
            setShowModal(true); 
        } catch (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    // 2. AŞAMA: KODU GİRİP ONAYLAYINCA (Güncelle)
    const handleFinalVerify = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            toast.warn("Lütfen 6 haneli kodu giriniz.");
            return;
        }

        setLoading(true);
        try {
            const updateData = {
                username: user.username,
                code: verificationCode,
                newEmail: formData.email,
                newPhone: formData.phone,
                newGender: formData.gender,
                newBirthDate: formData.birthDate,
                newPassword: formData.password || undefined 
            };

            const result = await AuthService.verifyAndUpdateProfile(updateData);

            if (result.success) {
                toast.success(result.message);
                onUpdateUser(result.user);
                setShowModal(false); 
                setVerificationCode('');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Giriş yapmalısınız.</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
            <div style={cardStyle}>
                <h2 style={{ color: '#00d2ff', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
                    👤 Profil Ayarları
                </h2>

                <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={rowStyle}>
                        <label style={labelStyle}>Kullanıcı Adı</label>
                        <input type="text" value={user.username} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
                    </div>
                    <div style={rowStyle}>
                        <label style={labelStyle}>E-Posta</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} required />
                    </div>
                    <div style={rowStyle}>
                        <label style={labelStyle}>Telefon</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} required />
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Cinsiyet</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} style={inputStyle}>
                                <option value="">Seçiniz</option>
                                <option value="Erkek">Erkek</option>
                                <option value="Kadın">Kadın</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Doğum Tarihi</label>
                            <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                        <label style={{...labelStyle, color: '#ff4d4d'}}>Yeni Şifre (Boş bırakırsanız değişmez)</label>
                        <input type="password" name="password" placeholder="Yeni Şifre" value={formData.password} onChange={handleChange} style={inputStyle} />
                    </div>
                    <button type="submit" disabled={loading} style={btnStyle}>
                        {loading ? 'İşleniyor...' : 'DEĞİŞİKLİKLERİ KAYDET'}
                    </button>
                </form>
            </div>

            {/* DOĞRULAMA PENCERESİ (MODAL) */}
            {showModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, color: '#00d2ff' }}>🔐 Güvenlik Doğrulaması</h3>
                        <p style={{ color: '#ccc', fontSize: '0.9rem' }}>
                            <b>{user.email}</b> adresine gönderilen 6 haneli kodu giriniz.
                        </p>
                        <input 
                            type="text" 
                            placeholder="Kod (Örn: 123456)" 
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            maxLength={6}
                            style={{ ...inputStyle, textAlign: 'center', fontSize: '1.2rem', letterSpacing: '5px', margin: '20px 0' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowModal(false)} style={{ ...btnStyle, background: '#444' }}>İptal</button>
                            <button onClick={handleFinalVerify} disabled={loading} style={btnStyle}>
                                {loading ? 'Doğrulanıyor...' : 'ONAYLA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const cardStyle = { background: '#1e1e2e', padding: '30px', borderRadius: '12px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' };
const rowStyle = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { color: '#888', fontSize: '0.85rem', fontWeight: 'bold' };
const inputStyle = { padding: '12px', background: '#15151b', border: '1px solid #444', borderRadius: '6px', color: 'white', fontSize: '1rem', width: '100%', boxSizing: 'border-box' };
const btnStyle = { padding: '12px', background: 'linear-gradient(90deg, #00d2ff, #007aff)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', width: '100%', transition: '0.3s' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalContentStyle = { background: '#1e1e2e', padding: '30px', borderRadius: '12px', border: '1px solid #00d2ff', width: '350px', textAlign: 'center', boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)' };

export default Profile;