import React, { useState } from 'react';
import { sendNotification } from '../services/api';
import { toast, ToastContainer } from 'react-toastify';

// 'onClose' prop'u: App.jsx'e "Ben işimi bitirdim, beni kapat" demek için
export default function Admin({ onClose }) {
    const [password, setPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        if (password === "1234") {
            setIsAuthenticated(true);
            toast.success("Giriş Başarılı");
        } else {
            toast.error("Hatalı Şifre");
        }
    };

    const handleSend = async () => {
        if (!title || !message) return toast.warning("Boş alan bırakmayın");
        setLoading(true);
        try {
            await sendNotification(title, message);
            toast.success("Bildirim Yollandı! 🚀");
            setTitle(""); setMessage("");
        } catch (e) {
            toast.error("Hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    // 1. GİRİŞ EKRANI
    if (!isAuthenticated) {
        return (
            <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.9)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center' }}>
                <div style={{ background:'#1e1e2e', padding:'40px', borderRadius:'10px', width:'300px', textAlign:'center', border:'1px solid #444' }}>
                    <h2 style={{color:'white'}}>🛡 Admin Girişi</h2>
                    <input
    
    type="password"
    value={password}
    onChange={e => setPassword(e.target.value)}
    onKeyDown={e => e.key === "Enter" && handleLogin()}
    style={{
        width:'100%',
        padding:'10px',
        marginBottom:'10px',
        borderRadius:'5px'
    }}
/>


                    <button onClick={handleLogin} style={{width:'100%', padding:'10px', background:'#007aff', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>GİRİŞ</button>
                    <button onClick={onClose} style={{marginTop:'10px', background:'transparent', border:'none', color:'#888', cursor:'pointer'}}>İptal / Geri Dön</button>
                </div>
            </div>
        );
    }

    // 2. PANEL EKRANI
    return (
        <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'#13131a', zIndex:999, padding:'40px', color:'white', overflowY:'auto' }}>
            <ToastContainer theme="dark"/>
            <button onClick={onClose} style={{position:'absolute', top:'20px', right:'120px', background:'#ff4d4d', color:'white', border:'none', padding:'10px 20px', borderRadius:'5px', cursor:'pointer'}}>Kapat ✕</button>
            
            <div style={{maxWidth:'600px', margin:'50px auto'}}>
                <h1>📢 Bildirim Merkezi</h1>
                <div style={{background:'#1e1e2e', padding:'30px', borderRadius:'20px', border:'1px solid #00d2ff'}}>
                    <input type="text" placeholder="Başlık" value={title} onChange={e=>setTitle(e.target.value)} style={{width:'100%', padding:'15px', marginBottom:'20px', background:'#13131a', border:'none', color:'white'}} />
                    <textarea placeholder="Mesaj" value={message} onChange={e=>setMessage(e.target.value)} style={{width:'100%', height:'150px', padding:'15px', marginBottom:'20px', background:'#13131a', border:'none', color:'white'}} />
                    <button onClick={handleSend} disabled={loading} style={{width:'100%', padding:'15px', background:'#00d2ff', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>
                        {loading ? 'GÖNDERİLİYOR...' : 'HERKESE GÖNDER 🚀'}
                    </button>
                </div>
            </div>
        </div>
    );
}