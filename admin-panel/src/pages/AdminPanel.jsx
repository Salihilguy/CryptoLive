import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom'; 

const AdminPanel = () => { 
    const navigate = useNavigate(); 

    const [stats, setStats] = useState({ totalUsers: 0, totalAlarms: 0, onlineCount: 0, uptime: '00:00:00' });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [supportMessages, setSupportMessages] = useState([]);
    const [replyTexts, setReplyTexts] = useState({});

    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [broadcastType, setBroadcastType] = useState('info');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null); 

    const handleLogout = () => {
        toast.info("Çıkış yapıldı.");
        navigate('/'); 
    };

    const fetchData = async () => {
        try {
            const statsRes = await AuthService.adminGetStats();
            const usersRes = await AuthService.adminGetUsers();
            const msgsRes = await AuthService.adminGetSupportMessages();
            
            if (msgsRes.messages) setSupportMessages(msgsRes.messages);
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
        const interval = setInterval(fetchData, 3000); 
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
            await AuthService.adminSendBroadcast(broadcastTitle, broadcastMsg, broadcastType);
            toast.success("📢 Duyuru gönderildi!");
            setBroadcastTitle('');
            setBroadcastMsg('');
        } catch (error) {
            toast.error("Duyuru gönderilemedi.");
        }
    };

    // ARAMA FİLTRESİ
    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        return (
            (user.username && user.username.toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.phone && user.phone.includes(term))
        );
    });

    return (
        <div style={{ 
            height: '100vh', 
            background: '#13131a', 
            color: 'white', 
            fontFamily: 'Segoe UI, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            
            {/* 1. ÜST MENÜ (NAVBAR) */}
            <div style={{ 
                height: '60px', 
                background: '#1e1e2e', 
                borderBottom: '1px solid #333', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0 20px',
                flexShrink: 0
            }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px'}}>
                    <h1 style={{ margin: 0, color: '#00d2ff', fontSize: '1.2rem' }}>🛡️ Admin Kontrol Merkezi</h1>
                </div>
                
                <button 
                    onClick={handleLogout}
                    style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                >
                    Çıkış Yap
                </button>
            </div>

            {/* 2. İSTATİSTİK BAR */}
            <div style={{ padding: '20px', flexShrink: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <StatCard title="Toplam Üye" value={stats.totalUsers} icon="👥" color="#007aff" />
                    <StatCard title="Online Üye" value={stats.onlineCount} icon="🟢" color="#00ff88" />
                    <StatCard title="Aktif Alarm" value={stats.totalAlarms} icon="🔔" color="#ffd700" />
                    <StatCard title="Sunucu Süresi" value={stats.uptime} icon="⏱️" color="#ff9f43" />
                </div>
            </div>

            {/* 3. ANA İÇERİK */}
            <div style={{ 
                flex: 1, 
                padding: '0 20px 20px 20px',
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px', 
                overflow: 'hidden' 
            }}>
                
                {/* SOL PANEL: DUYURU */}
                <div style={{ 
                    gridColumn: 'span 1', 
                    ...panelStyle, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ flexShrink: 0 }}>
                        <h3 style={{ marginTop: 0, color: '#00d2ff', fontSize:'1rem', display:'flex', alignItems:'center', gap:'8px' }}>
                            📢 Duyuru Paneli
                        </h3>
                        <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '15px' }}>Tüm kullanıcılara anlık bildirim gönder.</p>
                    </div>

                    <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <label style={labelStyle}>Bildirim Türü</label>
                        <select value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)} style={selectStyle}>
                            <option value="info">🔵 Bilgi</option>
                            <option value="success">🟢 Yükseliş/Müjde</option>
                            <option value="error">🔴 Uyarı/Düşüş</option>
                        </select>
                        
                        <label style={labelStyle}>Başlık</label>
                        <input type="text" placeholder="Örn: Bitcoin Rallisi!" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} style={inputStyle} />
                        
                        <label style={labelStyle}>Mesaj</label>
                        <textarea 
                            placeholder="Mesaj içeriği..." 
                            value={broadcastMsg} 
                            onChange={(e) => setBroadcastMsg(e.target.value)} 
                            style={{ ...inputStyle, resize: 'none', flex: 1 }} 
                        />
                        
                        <button type="submit" style={btnGradientStyle}>GÖNDER 🚀</button>
                    </form>
                </div>

                {/* ORTA PANEL: KULLANICI LİSTESİ */}
                <div style={{ gridColumn: 'span 2', ...panelStyle }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize:'1.1rem' }}>Kullanıcı Listesi</h3>
                        <input 
                            type="text" 
                            placeholder="🔍 E-posta, Tel, İsim..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #444', background: '#15151b', color: 'white', width: '220px', fontSize: '0.9rem' }}
                        />
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#15151b' }}>
                                <tr style={{ borderBottom: '2px solid #333', color: '#aaa', textAlign: 'left', fontSize:'0.9rem' }}>
                                    <th style={{ padding: '12px' }}>Durum</th>
                                    <th style={{ padding: '12px' }}>Kullanıcı</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? filteredUsers.map((user, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #252530', fontSize:'0.9rem' }}>
                                        <td style={{ padding: '12px' }}>
                                            {user.isOnline 
                                                ? <span style={{ color: '#00ff88', fontWeight:'bold', fontSize:'0.75rem' }}>● Online</span>
                                                : <span style={{ color: '#666', fontSize:'0.75rem' }}>○ Offline</span>
                                            }
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>
                                            {user.username}
                                            <button 
                                                onClick={() => setSelectedUser(user)}
                                                title="Detayları Gör"
                                                style={{ marginLeft: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '0.8rem', cursor: 'pointer', lineHeight: '22px' }}
                                            >
                                                ?
                                            </button>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <button onClick={() => handleDeleteUser(user.username)} style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                Sil
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Kayıt bulunamadı.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SAĞ PANEL: DESTEK MESAJLARI */}
                <div style={{ gridColumn: 'span 1', ...panelStyle, display:'flex', flexDirection:'column' }}>
                    <div style={{ paddingBottom: '10px', borderBottom: '1px solid #333', marginBottom:'10px' }}>
                        <h3 style={{ margin: 0, color: '#00ff88', fontSize:'1rem' }}>💬 Gelen Kutusu ({supportMessages.length})</h3>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight:'5px' }}>
                        {supportMessages.length === 0 ? (
                            <div style={{ textAlign:'center', color:'#555', marginTop:'50px' }}>Okunmamış mesaj yok.</div>
                        ) : supportMessages.map(msg => (
                            <div key={msg.id} style={{ background: '#15151b', borderRadius: '8px', marginBottom: '15px', border: '1px solid #333', overflow: 'hidden' }}>
                                
                                <div style={{ padding: '12px', borderBottom: '1px solid #2a2a35' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>
                                        <span style={{ color: '#00d2ff', fontWeight: 'bold' }}>{msg.username}</span>
                                        <span>{msg.date}</span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>{msg.subject}</div>
                                    <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.3' }}>{msg.message}</div>
                                </div>

                                {msg.replies && msg.replies.length > 0 && (
                                    <div style={{ background: '#0f0f13', padding: '8px 12px' }}>
                                        {msg.replies.map((reply, idx) => (
                                            <div key={idx} style={{ textAlign: 'right', marginBottom: '5px' }}>
                                                <span style={{ background: '#004d40', color: '#80cbc4', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{reply.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ padding: '10px', background: '#1e1e24' }}>
                                    {msg.contactInfo ? (
                                        <div>
                                            <div style={{fontSize:'0.75rem', color:'#ff9f43', marginBottom:'5px'}}>⚠️ Ziyaretçi İletişimi:</div>
                                            <div style={{background:'black', color:'#00ff88', padding:'5px', fontSize:'0.8rem', borderRadius:'4px', marginBottom:'5px', fontFamily:'monospace'}}>{msg.contactInfo}</div>
                                            <div style={{display:'flex', justifyContent:'flex-end', gap:'5px'}}>
                                                 <button onClick={() => {navigator.clipboard.writeText(msg.contactInfo); toast.info("Kopyalandı");}} style={miniBtnStyle}>Kopyala</button>
                                                 <button onClick={async () => { if(window.confirm('Sil?')) { await AuthService.adminDeleteSupportMessage(msg.id); fetchData(); }}} style={{...miniBtnStyle, color:'#ff4d4d'}}>Sil</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display:'flex', gap:'5px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Yanıt yaz..." 
                                                value={replyTexts[msg.id] || ''} 
                                                onChange={(e) => setReplyTexts({ ...replyTexts, [msg.id]: e.target.value })} 
                                                style={{ flex:1, background:'#15151b', border:'1px solid #444', color:'white', borderRadius:'4px', padding:'5px', fontSize:'0.85rem' }}
                                            />
                                            <button 
                                                onClick={async () => { const text = replyTexts[msg.id]; if(!text) return; await AuthService.adminReplySupport(msg.id, msg.username, text); setReplyTexts({...replyTexts, [msg.id]:''}); fetchData(); toast.success('Gönderildi'); }}
                                                style={{ background:'#007aff', border:'none', borderRadius:'4px', color:'white', cursor:'pointer', fontSize:'0.9rem', padding:'0 10px' }}
                                            >
                                                ➜
                                            </button>
                                            <button 
                                                onClick={async () => { if(window.confirm('Sil?')) { await AuthService.adminDeleteSupportMessage(msg.id); fetchData(); }}} 
                                                style={{ background:'#333', border:'none', borderRadius:'4px', color:'#ff4d4d', cursor:'pointer', padding:'0 8px' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* KULLANICI DETAY MODALI */}
            {selectedUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 1100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }} onClick={() => setSelectedUser(null)}>
                    <div style={{
                        background: '#1e1e2e', padding: '30px', borderRadius: '12px', width: '400px',
                        border: '1px solid #444', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <button onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        
                        <h2 style={{ marginTop: 0, color: '#00d2ff', borderBottom:'1px solid #333', paddingBottom:'10px' }}>
                            👤 {selectedUser.username}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                            <DetailRow label="E-Posta" value={selectedUser.email} />
                            <DetailRow label="Telefon" value={selectedUser.phone} />
                            <DetailRow label="Cinsiyet" value={selectedUser.gender} />
                            <DetailRow label="Doğum Tarihi" value={selectedUser.birthDate} />
                            
                            <DetailRow label="Kurulu Alarm" value={`${selectedUser.alarmCount} adet`} highlight />
                            <DetailRow label="Favori Coin" value={`${selectedUser.favCount} adet`} highlight />
                            
                            <DetailRow label="Durum" value={selectedUser.isOnline ? 'Çevrimiçi 🟢' : 'Çevrimdışı 🔴'} />
                            <DetailRow label="ID" value={selectedUser.id} />
                            
                            {selectedUser.password && (
                                <div style={{ background: '#2a1a1a', padding: '10px', borderRadius: '6px', marginTop: '10px', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>🔒 Şifre: </span>
                                    <span style={{ color: '#ccc' }}>{selectedUser.password}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const panelStyle = {
    background: '#1e1e2e', 
    borderRadius: '12px', 
    padding: '20px', 
    border: '1px solid #333',
    overflowY: 'auto'
};

const StatCard = ({ title, value, icon, color }) => (
    <div style={{ background: '#1e1e2e', padding: '20px', borderRadius: '12px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ fontSize: '2rem', width: '50px', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>{icon}</div>
        <div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>{title}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color }}>{value}</div>
        </div>
    </div>
);

const DetailRow = ({ label, value, highlight }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '6px' }}>
        <span style={{ color: highlight ? '#ffd700' : '#888' }}>{label}:</span>
        <span style={{ fontWeight: 'bold', color: highlight ? '#ffd700' : 'white' }}>{value || '-'}</span>
    </div>
);

const labelStyle = { display:'block', color:'#888', fontSize:'0.75rem', marginBottom:'5px', marginTop:'10px' };
const inputStyle = { width: '100%', padding: '10px', background: '#15151b', border: '1px solid #444', borderRadius: '6px', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle, cursor: 'pointer', fontWeight: 'bold' };
const btnGradientStyle = { width: '100%', padding: '10px', background: 'linear-gradient(90deg, #00d2ff, #007aff)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' };
const miniBtnStyle = { background:'#333', border:'none', color:'#ccc', fontSize:'0.75rem', padding:'3px 8px', borderRadius:'3px', cursor:'pointer' };

export default AdminPanel;