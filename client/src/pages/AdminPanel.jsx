import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = "http://localhost:3001/api";

const AdminPanel = ({ onLogout }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info'); // info, warning, success
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title || !message) {
            toast.warn("Başlık ve mesaj boş olamaz!");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/notification`, { title, message, type });
            toast.success("Bildirim tüm kullanıcılara gönderildi!");
            setTitle('');
            setMessage('');
        } catch (error) {
            toast.error("Gönderim hatası!");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            backgroundColor: '#13131a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Segoe UI, sans-serif'
        }}>
            <style>{`
                .admin-container { background: #1e1e2e; padding: 40px; borderRadius: 16px; border: 1px solid #333; width: 500px; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
                .form-group { margin-bottom: 20px; }
                .label { display: block; margin-bottom: 8px; color: #888; font-weight: 600; font-size: 0.9rem; }
                .input-field { width: 100%; padding: 12px; background: #15151b; border: 1px solid #333; border-radius: 8px; color: white; outline: none; box-sizing: border-box; transition: 0.3s; }
                .input-field:focus { border-color: #00d2ff; }
                .btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; font-size: 1rem; }
                .btn-send { background: linear-gradient(90deg, #00d2ff, #007aff); color: white; }
                .btn-logout { background: #333; color: #bbb; margin-top: 20px; }
                .btn-logout:hover { background: #444; color: white; }
                .type-select { width: 100%; padding: 12px; background: #15151b; border: 1px solid #333; border-radius: 8px; color: white; outline: none; }
            `}</style>

            <div className="admin-container">
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ margin: 0, color: '#00d2ff' }}>YÖNETİM PANELİ</h1>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Anlık Bildirim Sistemi</p>
                </div>

                <form onSubmit={handleSend}>
                    <div className="form-group">
                        <label className="label">Bildirim Türü</label>
                        <select className="type-select" value={type} onChange={e => setType(e.target.value)}>
                            <option value="info">Bilgi (Mavi)</option>
                            <option value="success">Fırsat / Yükseliş (Yeşil)</option>
                            <option value="warning">Uyarı / Düşüş (Kırmızı)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Başlık</label>
                        <input type="text" className="input-field" placeholder="Örn: BTC Güncellemesi" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="label">Mesaj İçeriği</label>
                        <textarea className="input-field" rows="4" placeholder="Kullanıcılara gidecek mesaj..." value={message} onChange={e => setMessage(e.target.value)} style={{ resize: 'none' }} />
                    </div>

                    <button type="submit" className="btn btn-send" disabled={loading}>
                        {loading ? 'GÖNDERİLİYOR...' : 'BİLDİRİMİ GÖNDER 🚀'}
                    </button>
                </form>

                <button onClick={onLogout} className="btn btn-logout">
                    Piyasaya Geri Dön (Çıkış)
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;