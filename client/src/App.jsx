import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TradingViewWidget from './TradingViewWidget';
import UserAuth from './pages/UserAuth'; 
import { AuthService } from './services/api';

const socket = io.connect("http://localhost:3001");
const API_URL = "http://localhost:3001/api";

const formatMarketCap = (value, currencySymbol) => {
    if (!value) return '-';
    let val = parseFloat(value);
    if (val >= 1e9) return `${currencySymbol}${(val / 1e9).toFixed(2)}B`; 
    if (val >= 1e6) return `${currencySymbol}${(val / 1e6).toFixed(2)}M`; 
    return `${currencySymbol}${val.toFixed(0)}`;
};

const FlashCell = ({ value, type = 'text', prefix = '', suffix = '', align = 'right', isChange = false, width = 'auto', fontSize='0.95rem' }) => {
    const [flashClass, setFlashClass] = useState('');
    const prevValueRef = useRef(value);

    useEffect(() => {
        const currentVal = parseFloat(value);
        const prevVal = parseFloat(prevValueRef.current);

        if (!isNaN(currentVal) && !isNaN(prevVal) && prevVal !== null && currentVal !== prevVal) {
            if (currentVal > prevVal) setFlashClass('flash-green-pro');
            else if (currentVal < prevVal) setFlashClass('flash-red-pro');
            
            const timer = setTimeout(() => setFlashClass(''), 500);
            return () => clearTimeout(timer);
        }
        prevValueRef.current = value;
    }, [value]);

    let textColor = '#888888'; 
    if (isChange) {
        const val = parseFloat(value);
        if (val > 0) textColor = '#00ff88';      
        else if (val < 0) textColor = '#ff4d4d'; 
    } else {
        textColor = '#e0e0e0'; 
    }

    const displayValue = (value === null || value === undefined) 
        ? '-' 
        : (typeof value === 'number' ? value.toFixed(2) : value);

    return (
        <td className={`flash-cell-pro ${flashClass}`} style={{ textAlign: align, color: flashClass ? 'inherit' : textColor, width: width, minWidth: width, maxWidth: width, fontSize: fontSize }}>
            {displayValue !== '-' ? prefix : ''}{displayValue}{displayValue !== '-' ? suffix : ''}
        </td>
    );
};

function App() {
  const [showProfileModal, setShowProfileModal] = useState(false); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [showUserAuth, setShowUserAuth] = useState(false); 
  const [favorites, setFavorites] = useState([]); 

  const [notifications, setNotifications] = useState([]); 
  const [showNotifPanel, setShowNotifPanel] = useState(false); 
  const [unreadCount, setUnreadCount] = useState(0); 

  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmCoin, setAlarmCoin] = useState(null);
  const [alarmTarget, setAlarmTarget] = useState('');
  const [alarmMessage, setAlarmMessage] = useState('');
  const [myAlarms, setMyAlarms] = useState([]);
  
  const [editingAlarmId, setEditingAlarmId] = useState(null);

  const [coins, setCoins] = useState([]);
  const [activeTab, setActiveTab] = useState('CRYPTO');
  const [currentTime, setCurrentTime] = useState(new Date());

  const markets = [
      { id: 'CRYPTO', label: 'Kripto Piyasası' },
      { id: 'BIST', label: 'BIST 100' },
      { id: 'FOREX', label: 'Döviz' },
      { id: 'COMMODITY', label: 'Emtia' },
      { id: 'US_STOCK', label: 'ABD Borsası' },
      { id: 'FAVORITES', label: 'Favorilerim' },
      { id: 'ALARMS', label: 'Alarmlarım' }
  ];

  const [searchTerm, setSearchTerm] = useState(""); 
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' }); 
  const [selectedCoin, setSelectedCoin] = useState(null); 
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const defaultSortOrder = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'TRXUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT', 'LINKUSDT', 'SHIBUSDT', 'ATOMUSDT'];

  useEffect(() => {
    const handleDataUpdate = (data) => {
        setCoins((prevCoins) => {
            let newCoinsList = [...prevCoins];
            data.forEach(newCoin => {
                const index = newCoinsList.findIndex(c => c.symbol === newCoin.symbol);
                if (index !== -1) {
                    newCoinsList[index] = { ...newCoinsList[index], ...newCoin, logo: newCoin.logo || newCoinsList[index].logo };
                } else {
                    const mockMarketCap = newCoin.price * (Math.random() * 1000000 + 500000); 
                    const mock6m = (Math.random() * 40) - 15; 
                    const mock1y = (Math.random() * 80) - 20; 
                    const mock5y = (Math.random() * 300) - 50; 
                    newCoinsList.push({ ...newCoin, type: newCoin.type || 'CRYPTO', mcap: mockMarketCap, change6m: mock6m, change1y: mock1y, change5y: mock5y });
                }
            });
            return newCoinsList;
        });
    };

    socket.on("tickerUpdate", handleDataUpdate);
    socket.on("marketUpdate", handleDataUpdate);
    
    socket.on('notification', (notif) => {
        if (notif.targetUser && currentUser && notif.targetUser !== currentUser.username) return;
        
        let finalColor = '#00d2ff';

        if (notif.type === 'error') {
            finalColor = '#ff4d4d';
        } else if (notif.type === 'success') {
            finalColor = '#00ff88';
        }

        const CustomToastContent = () => (
            <div>
                <span style={{ 
                    color: finalColor, 
                    fontWeight: '800', 
                    fontSize: '1rem', 
                    display: 'block', 
                    marginBottom: '4px' 
                }}>
                    {notif.title}
                </span>
                <span style={{ 
                    color: '#e0e0e0', 
                    fontSize: '0.9rem',
                    lineHeight: '1.4'
                }}>
                    {notif.message}
                </span>
            </div>
        );
        
        const options = { 
            position: "top-right", 
            theme: "dark", 
            autoClose: 8000
        };

        if (notif.type === 'error') {
            toast.error(CustomToastContent, options); 
        } else if (notif.type === 'success') {
            toast.success(CustomToastContent, options);
        } else {
            toast.info(CustomToastContent, options); 
        }

        const newNotification = {
            id: Date.now(),
            title: notif.title,
            message: notif.message,
            time: new Date().toLocaleTimeString(),
            type: notif.type 
        };
        
        setNotifications(prev => [newNotification, ...prev]); 
        setUnreadCount(prev => prev + 1); 

        if (notif.type === 'success' && currentUser) fetchAlarms();
    });

    return () => { socket.off('tickerUpdate'); socket.off('marketUpdate'); socket.off('notification'); };
  }, [currentUser]); 

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
       if (currentUser) { 
           fetchAlarms(); 
           socket.emit('user_connected', currentUser.username);
       } else { 
           setMyAlarms([]); 
           if (activeTab === 'ALARMS') setActiveTab('CRYPTO'); 
       }
   }, [currentUser]);

   const fetchAlarms = async () => {
      if(currentUser) {
          try {
            const alarms = await AuthService.getAlarms(currentUser.username);
            setMyAlarms(alarms);
          } catch (e) { console.error("Alarm fetch error", e); }
      }
  };

  const handleDeleteAlarm = async (alarmId) => {
      if(!currentUser) return;
      try {
        await AuthService.deleteAlarm(currentUser.username, alarmId);
        toast.info("Alarm silindi.");
        fetchAlarms(); 
      } catch (e) { toast.error("Silme hatası"); }
  };

  const handleToggleFavorite = async (e, symbol) => { 
      e.stopPropagation(); 
      if(!currentUser){
          toast.warn("Giriş yapmalısın!");
          setShowUserAuth(true);
          return;
      } 
      const isRemoving = favorites.includes(symbol);
      const res = await AuthService.toggleFavorite(currentUser.username, symbol); 
      if(res.success) {
          setFavorites(res.favorites);
          if (isRemoving) {
              const alarmToDelete = myAlarms.find(a => a.symbol === symbol);
              if (alarmToDelete) {
                  await handleDeleteAlarm(alarmToDelete.id);
              }
          }
      }
  };

  const openNewAlarmModal = (e, coin) => {
      e.stopPropagation();
      if (!currentUser) { toast.warn("Giriş yapmalısın!"); setShowUserAuth(true); return; }
      setEditingAlarmId(null);
      setAlarmCoin(coin);
      setAlarmTarget(coin.price); 
      setAlarmMessage(''); 
      setAlarmModalOpen(true);
  };

  const openEditAlarmModal = (alarm) => {
      let coin = coins.find(c => c.symbol === alarm.symbol);
      if (!coin) {
          coin = { symbol: alarm.symbol, price: alarm.currentPrice || 0, name: alarm.symbol };
      }
      setEditingAlarmId(alarm.id);
      setAlarmCoin(coin);
      setAlarmTarget(alarm.targetPrice);
      setAlarmMessage(alarm.note || alarm.message || ''); 
      setAlarmModalOpen(true);
  };

    const handleLogout = async () => {
        if (currentUser) {
            try {
                await AuthService.logout(currentUser.username);
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        }

        setCurrentUser(null);
        setFavorites([]);
        setMyAlarms([]);
        setSelectedCoin('BTCUSDT');
        setActiveTab('CRYPTO');
      
        toast.info("Başarıyla çıkış yapıldı", { position: "top-right", theme: "dark" });
    };

  const handleSetAlarm = async (e) => {
      e.preventDefault();
      if (!alarmCoin || !alarmTarget) return;
      try {
          let res;
          if (editingAlarmId) {
              res = await AuthService.updateAlarm(currentUser.username, editingAlarmId, alarmTarget, alarmCoin.price, alarmMessage);
              toast.success("Alarm güncellendi!");
          } else {
              res = await AuthService.setAlarm(currentUser.username, alarmCoin.symbol, alarmTarget, alarmCoin.price, alarmMessage);
              toast.success("Alarm kuruldu!");
          }
          setAlarmModalOpen(false);
          fetchAlarms(); 
      } catch (err) { toast.error("İşlem başarısız."); }
  };

  const toggleNotifPanel = () => {
      setShowNotifPanel(!showNotifPanel);
      if (!showNotifPanel) {
          setUnreadCount(0); 
      }
  };

  const clearNotifications = () => {
      setNotifications([]);
      setUnreadCount(0);
  };

  const deleteNotification = (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => { if (!currentUser && activeTab === 'FAVORITES') { setActiveTab('CRYPTO'); setSelectedCoin('BTCUSDT'); } }, [currentUser, activeTab]);

  const getTradingViewSymbol = (coinInput) => {
    if (!coinInput) return 'BINANCE:BTCUSDT';
    const symbol = (typeof coinInput === 'object') ? coinInput.symbol : coinInput;
    if (!symbol || typeof symbol !== 'string') return 'BINANCE:BTCUSDT';
    if (symbol.endsWith('USDT')) return `BINANCE:${symbol}`;
    
    const specialMap = { 'VODL.IS': 'LSE:VOD' };
    if (specialMap[symbol]) return specialMap[symbol];

    const bistMap = {
        'THYAO.IS': 'THYAO', 'AKBNK.IS': 'AKBNK', 'KCHOL.IS': 'KCHOL', 
        'BIMAS.IS': 'BIMAS', 'TCELL.IS': 'TCELL', 'TTKOM.IS': 'TTKOM'
    };
    if (bistMap[symbol]) return bistMap[symbol];

    const symbolMap = { 
        'TRY=X': 'FX_IDC:USDTRY', 'EURTRY=X': 'FX_IDC:EURTRY', 'GBPTRY=X': 'FX_IDC:GBPTRY', 
        'EURUSD=X': 'FX_IDC:EURUSD', 'JPYTRY=X': 'FX_IDC:JPYTRY', 'CHFTRY=X': 'FX_IDC:CHFTRY', 
        'CADTRY=X': 'FX_IDC:CADTRY', 'AUDTRY=X': 'FX_IDC:AUDTRY', 'DX-Y.NYB': 'CAPITALCOM:DXY', 
        'CNYTRY=X': 'FX_IDC:USDTRY/FX_IDC:USDCNY', 'RUBTRY=X': 'FX_IDC:USDTRY/FX_IDC:USDRUB',
        'GC=F': 'TVC:GOLD', 'SI=F': 'TVC:SILVER', 'CL=F': 'TVC:USOIL', 'BZ=F': 'TVC:UKOIL', 
        'HG=F': 'OANDA:XCUUSD', 'NG=F': 'CAPITALCOM:NATURALGAS',
        'GRAM-ALTIN': 'FX_IDC:XAUTRYG', 'CEYREK-ALTIN': 'FX_IDC:XAUTRYG*1.635',  
        'YARIM-ALTIN': 'FX_IDC:XAUTRYG*3.27', 'TAM-ALTIN': 'FX_IDC:XAUTRYG*6.54', 'GRAM-GUMUS': 'FX_IDC:XAGTRYG'       
    };

    if (symbolMap[symbol]) return symbolMap[symbol];
    if (symbol.endsWith('USDT')) return `BINANCE:${symbol}`;
    if (symbol.endsWith('.IS')) return symbol.replace('.IS', '').trim();
    return symbol.replace('=X', '').replace('=F', '').replace('.NYB', '');
  };

  const getCurrencySymbol = (coin) => {
      if (coin.type === 'BIST') return '₺';
      if (['GRAM-ALTIN', 'CEYREK-ALTIN', 'YARIM-ALTIN', 'TAM-ALTIN', 'GRAM-GUMUS'].includes(coin.symbol)) return '₺';
      if (coin.type === 'FOREX') return ''; 
      return '$'; 
  };

  let processedCoins = coins.filter(coin => {
    if (activeTab === 'ALARMS') return false; 
    if (activeTab === 'FAVORITES') { if (!currentUser) return false; return favorites.includes(coin.symbol); }
    if (!coin.type && activeTab === 'CRYPTO') return true;
    return coin.type === activeTab;
  });

  if (searchTerm) {
      processedCoins = processedCoins.filter(coin => coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  if (sortConfig.key) {
      processedCoins.sort((a, b) => {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'descending' ? 1 : -1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'descending' ? -1 : 1;
          return 0;
      });
  } else if (activeTab === 'CRYPTO') {
      processedCoins.sort((a, b) => defaultSortOrder.indexOf(a.symbol) - defaultSortOrder.indexOf(b.symbol));
  }

  useEffect(() => { if (processedCoins.length > 0 && !selectedCoin && activeTab !== 'ALARMS') setSelectedCoin(processedCoins[0].symbol); }, [activeTab, coins, searchTerm]);

  const handleSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') direction = 'ascending';
    setSortConfig({ key, direction });
  };

  return (
    <div style={{ backgroundColor: '#13131a', minHeight: '100vh', width: '100vw', color: 'white', fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box', overflowX:'hidden', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer />

      {showUserAuth && <UserAuth onClose={()=>setShowUserAuth(false)} onSuccess={(u)=>{setCurrentUser(u);setFavorites(u.favorites);setShowUserAuth(false)}} />}
    
        {showProfileModal && currentUser && (
            <ProfileModal 
                user={currentUser} 
                onClose={() => setShowProfileModal(false)} 
                onUpdateSuccess={(updatedUser) => {
                    setCurrentUser({...currentUser, username: updatedUser.username});
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({...storedUser, username: updatedUser.username}));
                }}
            />
        )}
        
            {alarmModalOpen && (
          <div style={modalStyle}>
              <div style={overlayStyle} onClick={() => setAlarmModalOpen(false)}></div>
              <div style={{ background: '#1e1e2e', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '320px', zIndex: 10001, position:'relative', textAlign:'center' }}>
                  <h3 style={{color:'#00d2ff', margin:'0 0 10px 0'}}>
                      {editingAlarmId ? '✏️ Alarmı Düzenle' : '🔔 Yeni Alarm Kur'}
                  </h3>
                  <p style={{color:'#aaa', marginBottom:'20px'}}><strong>{alarmCoin?.name}</strong> için hedef fiyat:</p>
                  
                  <div style={{background:'#111', padding:'10px', borderRadius:'8px', marginBottom:'15px', color:'#fff', display:'flex', justifyContent:'space-between'}}>
                      <span>Güncel:</span>
                      <span style={{color:'#00ff88', fontWeight:'bold'}}>{alarmCoin?.price?.toFixed(2)}</span>
                  </div>

                  <form onSubmit={handleSetAlarm}>
                      <input type="number" step="any" placeholder="Hedef Fiyat" value={alarmTarget} onChange={e=>setAlarmTarget(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#15151b', border:'1px solid #333', color:'white', borderRadius:'8px', fontSize:'1.1rem', textAlign:'center'}} />
                      <input type="text" placeholder="Notun (Opsiyonel)" value={alarmMessage} onChange={e=>setAlarmMessage(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', background:'#15151b', border:'1px solid #333', color:'#ddd', borderRadius:'8px', fontSize:'0.9rem'}} />
                      <div style={{marginBottom:'20px', fontSize:'0.85rem', color:'#888'}}>
                          {parseFloat(alarmTarget) > alarmCoin?.price 
                            ? <span>Koşul: Fiyat <strong style={{color:'#00ff88'}}>YÜKSELİRSE</strong><br/>(Target &ge; Current)</span>
                            : <span>Koşul: Fiyat <strong style={{color:'#ff4d4d'}}>DÜŞERSE</strong><br/>(Target &le; Current)</span>
                          }
                      </div>
                      <div style={{display:'flex', gap:'10px'}}>
                          <button type="button" onClick={()=>setAlarmModalOpen(false)} style={{flex:1, background:'#333', color:'#fff', border:'none', padding:'10px', borderRadius:'8px', cursor:'pointer'}}>İptal</button>
                          <button type="submit" style={{flex:1, background:'linear-gradient(90deg, #00d2ff, #007aff)', color:'#fff', border:'none', padding:'10px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                              {editingAlarmId ? 'GÜNCELLE' : 'KUR'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <style>{`
        .star-btn { background:none; border:none; color:#444; font-size:1.2rem; cursor:pointer; transition: color 0.2s; padding:0 5px; }
        .star-btn.active { color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
        .star-btn:hover { color: #fff; }
        .bell-btn { background:none; border:none; color:#444; font-size:1.1rem; cursor:pointer; padding:0 5px; transition:0.2s; }
        .bell-btn:hover { color: #00d2ff; transform: scale(1.1); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1e1e2e; } ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .flash-cell-pro { font-family: 'Consolas', monospace; font-weight: 600; padding: 6px 12px; border-radius: 6px; transition: background-color 0.5s ease-out; white-space: nowrap; }
        .nav-btn { background: transparent; border: 1px solid #3a3a45; color: #888; padding: 8px 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; font-weight: 600; font-size: 0.9rem; white-space: nowrap; }
        .nav-btn.active { background: #00d2ff; color: #000; border-color: #00d2ff; box-shadow: 0 0 10px rgba(0, 210, 255, 0.3); }
        .search-box { background: #181820; border: 1px solid #333; color: white; padding: 6px 12px; border-radius: 16px; outline: none; width: 180px; transition: all 0.3s; font-size: 0.9rem; }
        .search-box:focus { border-color: #00d2ff; width: 220px; }
        .search-clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #666; cursor: pointer; }
        th { cursor: pointer; transition: color 0.2s; font-size: 0.85rem; font-weight: 600; color: #888; } th:hover { color: #00d2ff; }
        .ticker-wrap { width: 100%; overflow: hidden; background: linear-gradient(270deg, rgba(30, 30, 50, 0.95), rgba(40, 40, 70, 0.95)); border-bottom: 1px solid rgba(0, 210, 255, 0.3); height: 45px; display: flex; align-items: center; }
        .ticker-track { display: flex; animation: ticker-scroll 120s linear infinite; gap: 15px; padding-left: 20px; }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-card { display: flex; align-items: center; background: rgba(37, 37, 48, 0.6); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); white-space: nowrap; font-size: 0.85rem; }
        .badge-count { background: #ff4d4d; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; position: absolute; top: -5px; right: -5px; border: 1px solid #1e1e2e; font-weight: bold; }
        @keyframes flashGreenPro { 0% { background-color: rgba(0, 255, 136, 0.25); color: #fff; } 100% { background-color: transparent; } }
        @keyframes flashRedPro { 0% { background-color: rgba(255, 77, 77, 0.25); color: #fff; } 100% { background-color: transparent; } }
      `}</style>

      <div className="ticker-wrap"><div className="ticker-track">{[...coins, ...coins].map((c, i) => <div key={`${c.symbol}-${i}`} className="ticker-card"><span style={{fontWeight:'700', marginRight:'8px'}}>{c.symbol}</span><span style={{fontFamily:'Consolas', marginRight:'10px'}}>{getCurrencySymbol(c)}{c.price?.toFixed(2)}</span></div>)}</div></div>

      <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding:'0 5px' }}>
              <h1 style={{ color: '#00d2ff', margin: 0, fontSize:'1.8rem', fontWeight:'800' }}>CryptoLive</h1> 
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  
                  {/* BİLDİRİM KUTUSU */}
                  <div style={{position: 'relative'}}>
                      <button onClick={toggleNotifPanel} style={{background: 'none', border: 'none', color: '#ccc', fontSize: '1.5rem', cursor: 'pointer', position:'relative'}}>
                          🔔
                          {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
                      </button>

                      {/* BİLDİRİM PANELİ DROPDOWN */}
                      {showNotifPanel && (
                          <div style={{position: 'absolute', top: '40px', right: '-50px', width: '320px', background: '#1e1e2e', border: '1px solid #444', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.5)', zIndex: 1000, overflow:'hidden'}}>
                                <div style={{padding: '10px 15px', borderBottom: '1px solid #333', background: '#222', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#eee'}}>Bildirimler</span>
                                    {notifications.length > 0 && <button onClick={clearNotifications} style={{background: 'none', border: 'none', color: '#ff4d4d', fontSize: '0.8rem', cursor: 'pointer'}}>Temizle</button>}
                                </div>
                                <div style={{maxHeight: '350px', overflowY: 'auto'}}>
                                    {notifications.length > 0 ? (
                                        notifications.map(n => (
                                            <div key={n.id} style={{padding: '12px 15px', borderBottom: '1px solid #2a2a35', fontSize: '0.85rem', position: 'relative'}}>
                                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px'}}>
                                                    <div style={{fontWeight: '700', color: n.type === 'success' ? '#00ff88' : (n.type === 'error' ? '#ff4d4d' : '#00d2ff')}}>
                                                    {n.title}
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                                        style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '0 5px', lineHeight: '1'}}
                                                        title="Sil"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                                <div style={{color: '#ccc', marginBottom: '5px', paddingRight: '15px'}}>{n.message}</div>
                                                <div style={{fontSize: '0.7rem', color: '#666', textAlign: 'right'}}>{n.time}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem'}}>Hiç bildirim yok.</div>
                                    )}
                                </div>
                          </div>
                      )}
                  </div>

                  {currentUser ? (
                      <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#222', padding:'5px 15px', borderRadius:'20px', border:'1px solid #333'}}>
                        <button 
                            onClick={() => setShowProfileModal(true)} 
                            style={{background:'none', border:'none', color:'#00ff88', fontWeight:'bold', fontSize:'0.9rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}
                            title="Profili Düzenle"
                        >
                            👤 {currentUser.username} <span style={{fontSize:'0.7rem', color:'#888'}}>⚙️</span>
                        </button>
                          <button onClick={handleLogout} style={{background:'#333', border:'none', color:'#bbb', cursor:'pointer', fontSize:'0.8rem'}}>Çıkış</button>
                      </div>
                  ) : ( <button onClick={() => setShowUserAuth(true)} style={{ background: '#222', border: '1px solid #444', padding: '8px 20px', borderRadius: '20px', fontWeight: '600', fontSize:'0.9rem', cursor:'pointer', color:'#eee' }}>Üye Girişi / Kayıt</button> )}
              </div>
          </div>

          <div style={{ width: '100%', display: 'flex', gap: '10px', padding: '0 5px', marginBottom: '10px', overflowX: 'auto', paddingBottom:'5px' }}>
              {markets.map(m => {
                  if (m.id === 'ALARMS' && (!currentUser || myAlarms.length === 0)) return null;
                  if (m.id === 'FAVORITES' && !currentUser) return null;
                  return (
                      <button key={m.id} className={`nav-btn ${activeTab === m.id ? 'active' : ''}`} onClick={() => { setActiveTab(m.id); setSelectedCoin(null); }}>
                          {m.label} {m.id === 'ALARMS' ? <span style={{background:'#ff4d4d', borderRadius:'50%', padding:'0 5px', fontSize:'0.7rem', color:'white', marginLeft:'5px'}}>{myAlarms.length}</span> : ''}
                      </button>
                  );
              })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '15px', width: '100%', height: 'calc(100vh - 180px)' }}>
              <div style={{ background: '#1e1e2e', borderRadius: '12px', overflow:'hidden', display:'flex', flexDirection:'column', border:'1px solid #333' }}>
                  
                  {/* ALARM TABLOSU */}
                  {activeTab === 'ALARMS' ? (
                      <>
                        <div style={{ padding:'12px 15px', borderBottom:'1px solid #333', background:'#22222a' }}>
                            <h3 style={{margin:0, fontSize:'1rem', fontWeight:'700', color:'#00d2ff'}}>🔔 Aktif Alarmlar</h3>
                        </div>
                        <div style={{ overflowY:'auto', overflowX: 'auto', flex:1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                                <thead style={{ position:'sticky', top:0, background:'#1e1e2e', zIndex:10 }}>
                                    <tr style={{ color: '#888', textAlign: 'left', fontSize:'0.8rem', borderBottom:'1px solid #333' }}>
                                        <th style={{padding:'10px 15px'}}>Coin</th>
                                        <th style={{padding:'10px', textAlign:'right'}}>Hedef</th>
                                        <th style={{padding:'10px', textAlign:'right'}}>Şu An</th>
                                        <th style={{padding:'10px', textAlign:'center'}}>Koşul</th>
                                        <th style={{padding:'10px', textAlign:'center', width:'80px'}}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myAlarms.map(alarm => {
                                        const currentCoin = coins.find(c => c.symbol === alarm.symbol);
                                        const currentPrice = currentCoin ? currentCoin.price : 0;
                                        const coinInfo = coins.find(c => c.symbol === alarm.symbol);
                                        const displayName = coinInfo ? coinInfo.name : alarm.symbol;
                                        const displayLogo = coinInfo ? coinInfo.logo : null;

                                        return (
                                            <tr 
                                                key={alarm.id} 
                                                onClick={() => setSelectedCoin(alarm.symbol)}
                                                style={{
                                                    borderBottom:'1px solid #2a2a35', 
                                                    cursor: 'pointer', 
                                                    background: selectedCoin === alarm.symbol ? 'rgba(0, 210, 255, 0.05)' : 'transparent'
                                                }}
                                            >
                                                <td style={{padding:'10px 15px', color:'#eee'}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                        {displayLogo && <img src={displayLogo} width="24" style={{borderRadius:'50%'}} />}
                                                        <div style={{fontWeight:'bold'}}>{displayName}</div>
                                                    </div>
                                                </td>
                                                <td style={{padding:'10px', textAlign:'right', color:'#00d2ff', fontFamily:'Consolas'}}>{parseFloat(alarm.targetPrice).toFixed(2)}</td>
                                                <td style={{padding:'10px', textAlign:'right', color:'#eee', fontFamily:'Consolas'}}>{currentPrice.toFixed(2)}</td>
                                                <td style={{padding:'10px', textAlign:'center'}}>
                                                    {alarm.direction === 'UP' 
                                                        ? <span style={{color:'#00ff88', fontSize:'0.8rem', background:'rgba(0,255,136,0.1)', padding:'2px 6px', borderRadius:'4px'}}>▲ Yükseliş</span> 
                                                        : <span style={{color:'#ff4d4d', fontSize:'0.8rem', background:'rgba(255,77,77,0.1)', padding:'2px 6px', borderRadius:'4px'}}>▼ Düşüş</span>
                                                    }
                                                </td>
                                                <td style={{padding:'10px', textAlign:'center', display:'flex', gap:'5px', justifyContent:'center'}}>
                                                    <button onClick={(e) => { e.stopPropagation(); openEditAlarmModal(alarm); }} style={{background:'#00d2ff', border:'none', borderRadius:'6px', color:'white', width:'30px', height:'30px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>✏️</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAlarm(alarm.id); }} style={{background:'#ff4d4d', border:'none', borderRadius:'6px', color:'white', width:'30px', height:'30px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>🗑️</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                      </>
                  ) : (
                      <>
                        <div style={{ padding:'12px 15px', borderBottom:'1px solid #333', background:'#22222a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <h3 style={{margin:0, fontSize:'1rem', fontWeight:'700', color:'#eee'}}>{markets.find(m => m.id === activeTab)?.label}</h3>
                            <div style={{position:'relative'}}><input type="text" placeholder="Ara..." className="search-box" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{paddingRight: searchTerm ? '30px' : '12px'}} />{searchTerm && <span className="search-clear-btn" onClick={() => setSearchTerm("")}>✕</span>}</div>
                        </div>
                        <div style={{ overflowY:'auto', overflowX: 'auto', flex:1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                                <thead style={{ position:'sticky', top:0, background:'#1e1e2e', zIndex:10 }}>
                                    <tr style={{ color: '#888', textAlign: 'left', fontSize:'0.8rem', borderBottom:'1px solid #333' }}>
                                        <th style={{width:'30px', padding:'10px 5px', textAlign:'center'}}>★</th>
                                        {currentUser && activeTab === 'FAVORITES' && <th style={{width:'30px', padding:'10px 5px', textAlign:'center'}}>🔔</th>}
                                        <th style={{ padding: '10px 15px', position:'sticky', left:0, background:'#1e1e2e', zIndex:11 }}>Enstrüman</th>
                                        <th style={{ padding: '10px', textAlign:'right', width:'110px' }} onClick={() => handleSort('price')}>Fiyat</th>
                                        <th style={{ padding: '10px', textAlign:'right', width:'90px' }} onClick={() => handleSort('change')}>24s</th>
                                        <th style={{ padding: '10px', textAlign:'right', width:'100px' }}>Piyasa Değ.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedCoins.length > 0 ? processedCoins.map((coin) => {
                                        const isFav = favorites.includes(coin.symbol);
                                        return (
                                        <tr key={coin.symbol} onClick={() => setSelectedCoin(coin.symbol)} style={{ borderBottom: '1px solid #2a2a35', cursor: 'pointer', background: selectedCoin === coin.symbol ? 'rgba(0, 210, 255, 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                            <td style={{textAlign:'center', borderRight:'1px solid #2a2a35'}} onClick={(e) => handleToggleFavorite(e, coin.symbol)}><button className={`star-btn ${isFav ? 'active' : ''}`}>★</button></td>
                                            {currentUser && activeTab === 'FAVORITES' && (
                                                <td style={{textAlign:'center', borderRight:'1px solid #2a2a35'}}>
                                                    <button className="bell-btn" onClick={(e) => openNewAlarmModal(e, coin)}>🔔</button>
                                                </td>
                                            )}
                                            <td style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px', position:'sticky', left:0, background: selectedCoin === coin.symbol ? '#22262d' : '#1e1e2e', zIndex:1, borderRight:'1px solid #2a2a35' }}> 
                                                {coin.logo && <img src={coin.logo} alt={coin.name} width="28" height="28" style={{ borderRadius: '50%', background:'white', padding:'2px' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                                                <div> <div style={{ fontWeight: '700', fontSize:'0.9rem', color:'#eee' }}>{coin.name}</div> <div style={{ fontSize: '0.7rem', color: '#777' }}>{coin.symbol}</div> </div> 
                                            </td>
                                            <FlashCell value={coin.price} prefix={getCurrencySymbol(coin)} align="right" width="110px" />
                                            <FlashCell value={coin.change} suffix="%" align="right" isChange={true} width="90px" />
                                            <td style={{ textAlign:'right', padding:'0 10px', color:'#999', fontFamily:'Consolas, monospace', fontWeight:'600', fontSize:'0.85rem' }}>{formatMarketCap(coin.mcap, getCurrencySymbol(coin))}</td>
                                        </tr>
                                        )}) : ( <tr><td colSpan="6" style={{padding:'20px', textAlign:'center', color:'#666'}}>Veri yok.</td></tr> )
                                    }
                                </tbody>
                            </table>
                        </div>
                      </>
                  )}
              </div>

              {/* GRAFİK */}
              <div style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, background: '#1e1e2e', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } : { background: '#1e1e2e', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: '1px solid #333', position: 'relative' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding: '0 5px', flexShrink: 0 }}>
                      <div><h2 style={{ margin: 0, fontSize:'1.3rem', fontWeight:'700', color:'#eee' }}>{coins.find(c => c.symbol === selectedCoin)?.name || selectedCoin || "Seçim Yapın"}</h2><span style={{ color:'#777', fontSize: '0.8rem' }}>TradingView Analiz</span></div>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px'}}><div style={{textAlign:'right'}}><div style={{fontFamily:'Consolas', fontWeight:'bold', fontSize:'1.2rem'}}>{currentTime.toLocaleTimeString()}</div><div style={{fontSize:'0.75rem', color:'#888'}}>{currentTime.toLocaleDateString()}</div></div><button onClick={() => setIsFullScreen(!isFullScreen)} style={{background:'rgba(255,255,255,0.1)', border:'none', color:'white', width:'32px', height:'32px', borderRadius:'6px', cursor:'pointer'}}>⤢</button></div>
                  </div>
                  <div style={{ flex: 1, width: '100%', minHeight: '0', overflow:'hidden', borderRadius:'8px', position:'relative' }}> 
                    {selectedCoin ? (<div key={getTradingViewSymbol(selectedCoin)} style={{ width: '100%', height: '100%' }}><TradingViewWidget symbol={getTradingViewSymbol(selectedCoin)} theme="dark" autosize interval="D" timezone="Etc/UTC" style="1" locale="tr" toolbar_bg="#f1f3f6" enable_publishing={false} hide_side_toolbar={false} allow_symbol_change={true} /></div>) : ( <div style={{ display:'flex', height:'100%', justifyContent:'center', alignItems:'center', color:'#444', border:'2px dashed #333', borderRadius:'8px', fontSize:'0.9rem' }}>Grafik yükleniyor...</div> )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}

const modalStyle = {position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:10000, display:'flex', justifyContent:'center', alignItems:'center'};
const overlayStyle = {position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)'};

const ProfileModal = ({ user, onClose, onUpdateSuccess }) => {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newUsername, setNewUsername] = useState(user.username);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!currentPass) {
            toast.warn("İşlem yapmak için mevcut şifrenizi girmelisiniz.");
            return;
        }
        setLoading(true);
        try {
            const res = await AuthService.updateProfile(user.username, currentPass, newPass, newUsername);
            toast.success(res.message);
            if (res.user) {
                onUpdateSuccess(res.user); 
            }
            onClose(); 
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={modalStyle}>
            <div style={overlayStyle} onClick={onClose}></div>
            <div style={{ background: '#1e1e2e', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '300px', zIndex: 10001, position:'relative' }}>
                <h3 style={{color:'#00d2ff', marginTop:0, textAlign:'center'}}>Profil Ayarları</h3>
                
                <form onSubmit={handleUpdate}>
                    {/* KULLANICI ADI */}
                    <div style={{marginBottom:'15px'}}>
                        <label style={{color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'5px'}}>Kullanıcı Adı</label>
                        <input 
                            type="text" 
                            value={newUsername} 
                            onChange={e=>setNewUsername(e.target.value)} 
                            style={{width:'100%', padding:'10px', background:'#15151b', border:'1px solid #333', color:'white', borderRadius:'8px', boxSizing:'border-box', fontWeight:'bold'}} 
                        />
                    </div>

                    <div style={{marginBottom:'15px'}}>
                        <label style={{color:'#ff4d4d', fontSize:'0.8rem', display:'block', marginBottom:'5px'}}>Mevcut Şifre <span style={{fontSize:'0.7rem'}}>(Onay için gerekli)</span></label>
                        <input 
                            type="password" 
                            value={currentPass} 
                            onChange={e=>setCurrentPass(e.target.value)} 
                            style={{width:'100%', padding:'10px', background:'#2a1a1a', border:'1px solid #ff4d4d', color:'white', borderRadius:'8px', boxSizing:'border-box'}} 
                            required
                        />
                    </div>

                    <div style={{marginBottom:'20px'}}>
                        <label style={{color:'#888', fontSize:'0.8rem', display:'block', marginBottom:'5px'}}>Yeni Şifre <span style={{fontSize:'0.7rem'}}>(Değişmeyecekse boş bırak)</span></label>
                        <input 
                            type="password" 
                            value={newPass} 
                            onChange={e=>setNewPass(e.target.value)} 
                            placeholder="Yeni şifreyi buraya girin"
                            style={{width:'100%', padding:'10px', background:'#15151b', border:'1px solid #333', color:'white', borderRadius:'8px', boxSizing:'border-box'}} 
                        />
                    </div>

                    <button type="submit" disabled={loading} style={{width:'100%', padding:'10px', background:'linear-gradient(90deg, #00d2ff, #007aff)', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                        {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </form>
                
                <button onClick={onClose} style={{width:'100%', marginTop:'10px', background:'transparent', color:'#666', border:'none', cursor:'pointer', fontSize:'0.8rem'}}>İptal</button>
            </div>
        </div>
    );
};

export default App;