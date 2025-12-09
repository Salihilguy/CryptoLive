import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';

const AdminPanel = ({ onLogout }) => {
    const [stats, setStats] = useState({ totalUsers: 0, totalAlarms: 0, onlineCount: 0, uptime: '00:00:00' });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Duyuru State'leri
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');

    const fetchData = async () => {
        try {
            const statsRes = await AuthService.adminGetStats();
            const usersRes = await AuthService.adminGetUsers();
            
            if (statsRes) setStats(statsRes);
            if (usersRes.success) setUsers(usersRes.users);
        } catch (error) {
            console.error("Veri yükleme hatası", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleDeleteUser = async (username) => {
        if (window.confirm(`${username} kullanıcısını silmek istediğine emin misin?`)) {
            try {
                await AuthService.adminDeleteUser(username);
                toast.success(`${username} silindi.`);
                fetchData(); 
            } catch (error) {
                toast.error("Silme işlemi başarısız.");
            }
        }
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastTitle || !broadcastMsg) {
            toast.warn("Lütfen başlık ve mesaj girin.");
            return;
        }
        try {
            await AuthService.adminSendBroadcast(broadcastTitle, broadcastMsg);
            toast.success("📢 Duyuru tüm kullanıcılara gönderildi!");
            setBroadcastTitle('');
            setBroadcastMsg('');
        } catch (error) {
            toast.error("Duyuru gönderilemedi.");
        }
    };

    return (
        <div style={{ padding: '30px', background: '#13131a', minHeight: '100vh', color: 'white', fontFamily: 'Segoe UI, sans-serif' }}>
            {/* BAŞLIK VE ÇIKIŞ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ margin: 0, color: '#00d2ff' }}>🛡️ Admin Kontrol Merkezi</h1>
                <button onClick={onLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Çıkış Yap</button>
            </div>

            {/* İSTATİSTİK KARTLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard title="Toplam Üye" value={stats.totalUsers} icon="👥" color="#007aff" />
                <StatCard title="Anlık Online" value={stats.onlineCount} icon="🟢" color="#00ff88" />
                <StatCard title="Kurulu Alarm" value={stats.totalAlarms} icon="🔔" color="#ffd700" />
                <StatCard title="Sunucu Süresi" value={stats.uptime} icon="⏱️" color="#ff9f43" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                
                {/* SOL: DUYURU PANELİ */}
                <div style={{ background: '#1e1e2e', borderRadius: '12px', padding: '20px', border: '1px solid #333', height: 'fit-content' }}>
                    <h3 style={{ marginTop: 0, color: '#00d2ff', display:'flex', alignItems:'center', gap:'10px' }}>📢 Global Duyuru Yap</h3>
                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '15px' }}>Mesajınız anlık olarak sitedeki herkese iletilir.</p>
                    
                    <form onSubmit={handleSendBroadcast}>
                        <input 
                            type="text" 
                            placeholder="Duyuru Başlığı" 
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            style={inputStyle}
                        />
                        <textarea 
                            rows="4"
                            placeholder="Mesajınız..." 
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            style={{ ...inputStyle, resize: 'none' }}
                        />
                        <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(90deg, #00d2ff, #007aff)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                            GÖNDER 🚀
                        </button>
                    </form>
                </div>

                {/* SAĞ: KULLANICI TABLOSU */}
                <div style={{ background: '#1e1e2e', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>Kayıtlı Kullanıcılar</h3>
                        <button onClick={fetchData} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', borderRadius: '6px', cursor: 'pointer', padding: '5px 10px' }}>🔄 Yenile</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #333', color: '#888', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Durum</th>
                                    <th style={{ padding: '10px' }}>Kullanıcı</th>
                                    <th style={{ padding: '10px', textAlign:'center' }}>Alarm</th>
                                    <th style={{ padding: '10px', textAlign:'center' }}>Fav</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? users.map((user, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #2a2a35' }}>
                                        <td style={{ padding: '15px 10px' }}>
                                            {user.isOnline 
                                                ? <span style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(0,255,136,0.2)' }}>● Online</span>
                                                : <span style={{ background: 'rgba(100,100,100,0.1)', color: '#888', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid #444' }}>○ Offline</span>
                                            }
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{user.username}</td>
                                        <td style={{ padding: '10px', textAlign:'center' }}>{user.alarmCount}</td>
                                        <td style={{ padding: '10px', textAlign:'center' }}>{user.favCount}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleDeleteUser(user.username)}
                                                style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                Sil
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Kullanıcı yok.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Yardımcılar
const StatCard = ({ title, value, icon, color }) => (
    <div style={{ background: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%' }}>{icon}</div>
        <div>
            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '5px' }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: color }}>{value}</div>
        </div>
    </div>
);

const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    background: '#15151b',
    border: '1px solid #333',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.95rem',
    boxSizing: 'border-box'
};

export default AdminPanel;