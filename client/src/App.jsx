import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TradingViewWidget from './TradingViewWidget';
import UserAuth from './pages/UserAuth'; 
import { AuthService } from './services/api';

// --- CHART.JS IMPORTLARI ---
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Chart.js Kaydı
ChartJS.register(ArcElement, Tooltip, Legend);

const socket = io.connect("http://localhost:3001");

const formatMarketCap = (value, currencySymbol) => {
    if (!value) return '-';
    let val = parseFloat(value);
    if (val >= 1e9) return `${currencySymbol}${(val / 1e9).toFixed(2)}B`; 
    if (val >= 1e6) return `${currencySymbol}${(val / 1e6).toFixed(2)}M`; 
    return `${currencySymbol}${val.toFixed(0)}`;
};

const FlashCell = ({ value, prefix = '', suffix = '', align = 'right', isChange = false, width = 'auto', fontSize='0.95rem' }) => {
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

// --- TAMİR EDİLMİŞ PORTFÖY GRAFİK BİLEŞENİ ---
const PortfolioChart = ({ portfolio, coins, walletBalance, usdRate }) => {
    const labels = [];
    const dataValues = [];
    const backgroundColors = [];
    const borderColors = [];

    const colorPalette = [
        '#00d2ff', '#ff4d4d', '#ffbf00', '#a32bff', '#ff00ff', '#00ffea', '#ff8800', '#99ff00'
    ];

    // Nakit Bakiyeyi Ekle
    const balance = parseFloat(walletBalance) || 0;
    if (balance > 0) {
        labels.push('Nakit (TL)');
        dataValues.push(balance);
        backgroundColors.push('#00ff88');
        borderColors.push('#00331a');
    }

    // Portföydeki Coinleri Ekle
    let colorIndex = 0;
    Object.keys(portfolio).forEach((symbol) => {
        const qty = parseFloat(portfolio[symbol]);
        if (qty > 0) {
            const coin = coins.find(c => c.symbol === symbol);
            const price = coin ? coin.price : 0; 
            const type = coin ? coin.type : '';
            
            const isTrAsset = ['BIST', 'GRAM-ALTIN', 'CEYREK-ALTIN', 'YARIM-ALTIN', 'TAM-ALTIN', 'GRAM-GUMUS'].includes(type) || symbol.endsWith('.IS');
            const rate = isTrAsset ? 1 : usdRate;
            
            const totalValueTL = price * qty * rate;

            if (totalValueTL > 0) {
                labels.push(symbol);
                dataValues.push(totalValueTL);
                backgroundColors.push(colorPalette[colorIndex % colorPalette.length]);
                borderColors.push('#1e1e2e');
                colorIndex++;
            }
        }
    });

    if (dataValues.length === 0) {
        return (
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#666'}}>
                <div style={{fontSize:'3rem', marginBottom:'10px'}}>📉</div>
                <div>Henüz varlığınız bulunmuyor.</div>
            </div>
        );
    }

    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Değer (TL)',
                data: dataValues,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false, // Bu ayar çok önemli
        animation: {
            duration: 0 // Animasyonu kapatmak kaybolma sorununu çözer
        },
        plugins: {
            legend: {
                position: 'right',
                labels: { color: '#eee', font: { size: 11 }, padding: 15 }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) label += ': ';
                        if (context.parsed !== null) {
                            label += new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(context.parsed);
                        }
                        return label;
                    }
                }
            }
        }
    };

    // Benzersiz bir key oluşturuyoruz ki React bileşeni zorla güncellesin
    const chartKey = JSON.stringify(dataValues); 

    return (
        <div style={{ position: 'relative', width: '90%', height: '350px', margin: '0 auto' }}>
            <Pie key={chartKey} data={data} options={options} />
        </div>
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

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  // --- TRADE STATE'LERİ ---
  const [portfolio, setPortfolio] = useState({}); 
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeCoin, setTradeCoin] = useState(null);
  // ------------------------

  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmCoin, setAlarmCoin] = useState(null);
  const [alarmTarget, setAlarmTarget] = useState('');
  const [alarmMessage, setAlarmMessage] = useState('');
  const [myAlarms, setMyAlarms] = useState([]);
  
  const [editingAlarmId, setEditingAlarmId] = useState(null);

  const [coins, setCoins] = useState([]);
  const [activeTab, setActiveTab] = useState('CRYPTO');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showGuestSupport, setShowGuestSupport] = useState(false);
  const [guestSupportType, setGuestSupportType] = useState('Genel');

  // --- MENÜ SIRALAMASI ---
  const markets = [
      { id: 'CRYPTO', label: 'Kripto Piyasası' },
      { id: 'BIST', label: 'BIST 100' },
      { id: 'FOREX', label: 'Döviz' },
      { id: 'COMMODITY', label: 'Emtia' },
      { id: 'US_STOCK', label: 'ABD Borsası' },
      { id: 'FAVORITES', label: 'Favorilerim' }, 
      { id: 'PORTFOLIO', label: 'Varlıklarım' }, 
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
        if (notif.targetUser) {
            if (!currentUser || currentUser.username !== notif.targetUser) {
                return;
            }
        }
        
        let finalColor = '#00d2ff';
        if (notif.type === 'error') finalColor = '#ff4d4d';
        else if (notif.type === 'success') finalColor = '#00ff88';
        else if (notif.type === 'support_reply') finalColor = '#1e1722ff'; 

        const CustomToastContent = () => (
            <div>
                <span style={{ color: finalColor, fontWeight: '800', fontSize: '1rem', display: 'block', marginBottom: '6px' }}>
                    {notif.title}
                </span>
                {notif.originalMessage ? (
                    <div style={{fontSize:'0.9rem'}}>
                        <div style={{background:'rgba(255,255,255,0.1)', padding:'6px', borderRadius:'4px', marginBottom:'6px', color:'#aaa', fontStyle:'italic'}}>
                            <span style={{fontSize:'0.7rem', display:'block', color:'#888'}}>Siz:</span>
                            "{notif.originalMessage}"
                        </div>
                        <div style={{color:'#fff', paddingLeft:'4px', borderLeft:`2px solid ${finalColor}`}}>
                            <span style={{fontSize:'0.7rem', display:'block', color: finalColor}}>CryptoLive Ekibi:</span>
                            {notif.message}
                        </div>
                    </div>
                ) : (
                    <span style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {notif.message}
                    </span>
                )}
            </div>
        );

        const options = { position: "top-right", theme: "dark", autoClose: 10000 };
        if (notif.type === 'error') toast.error(CustomToastContent, options);
        else if (notif.type === 'success') toast.success(CustomToastContent, options);
        else toast.info(CustomToastContent, options);

        const newNotification = {
            id: Date.now(),
            title: notif.title,
            message: notif.message,
            originalMessage: notif.originalMessage,
            time: new Date().toLocaleTimeString(),
            type: notif.type 
        };
        
        setNotifications(prev => [newNotification, ...prev]); 
        setUnreadCount(prev => prev + 1); 

        if (notif.type === 'success' && currentUser) fetchAlarms();
    });

    socket.on('force_logout', (targetUsername) => {
        if (currentUser && currentUser.username === targetUsername) {
            toast.error("Hesabınız yönetici tarafından silindiği için oturum sonlandırıldı.", {
                position: "top-center",
                autoClose: 5000,
                theme: "dark"
            });
            handleLogout(); 
        }
    });

    return () => { socket.off('tickerUpdate'); socket.off('marketUpdate'); socket.off('notification'); socket.off('force_logout');};
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
           if (activeTab === 'ALARMS' || activeTab === 'PORTFOLIO') setActiveTab('CRYPTO'); 
       }
   }, [currentUser]);

   const fetchAlarms = async () => {
      if(currentUser) {
          try {
            const alarms = await AuthService.getAlarms(currentUser.id);
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

    // --- ALIM SATIM HANDLERLARI ---
    const openTradeModal = (e, coin) => {
        e.stopPropagation();
        if (!currentUser) {
            toast.warn("İşlem yapmak için giriş yapmalısın!");
            setShowUserAuth(true);
            return;
        }
        setTradeCoin(coin);
        setTradeModalOpen(true);
    };

    const handleBuyAsset = (coin, amount, totalCost) => {
        const newBalance = walletBalance - totalCost;
        setWalletBalance(newBalance);

        setPortfolio(prev => {
            const currentQty = prev[coin.symbol] || 0;
            return { ...prev, [coin.symbol]: currentQty + amount };
        });

        toast.success(`Başarılı! ${amount} adet ${coin.symbol} alındı. (Tutar: ${totalCost.toFixed(2)} TL)`);
        setTradeModalOpen(false);
    };

    const handleSellAsset = (coin, amount, totalRevenue) => {
        const newBalance = walletBalance + totalRevenue;
        setWalletBalance(newBalance);

        setPortfolio(prev => {
            const currentQty = prev[coin.symbol] || 0;
            const newQty = currentQty - amount;
            return { ...prev, [coin.symbol]: newQty };
        });

        toast.success(`Başarılı! ${amount} adet ${coin.symbol} satıldı. (Kazanç: ${totalRevenue.toFixed(2)} TL)`);
        setTradeModalOpen(false);
    };
    // ------------------------------

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
        setPortfolio({}); // Portföyü sıfırla
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
              res = await AuthService.updateAlarm(currentUser.id, currentUser.username, editingAlarmId, alarmTarget, alarmCoin.price, alarmMessage);
              toast.success("Alarm güncellendi!");
          } else {
              res = await AuthService.setAlarm(currentUser.id, currentUser.username, alarmCoin.symbol, alarmTarget, alarmCoin.price, alarmMessage);
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

  useEffect(() => { if (!currentUser && (activeTab === 'FAVORITES' || activeTab === 'PORTFOLIO')) { setActiveTab('CRYPTO'); setSelectedCoin('BTCUSDT'); } }, [currentUser, activeTab]);

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

  // --- USD KURU ÇEKME ---
  const usdCoin = coins.find(c => c.symbol === 'TRY=X' || c.symbol === 'USDTRY');
  const currentUsdRate = usdCoin ? usdCoin.price : 35.00;

  let processedCoins = coins.filter(coin => {
    if (activeTab === 'ALARMS') return false; 
    if (activeTab === 'FAVORITES') { if (!currentUser) return false; return favorites.includes(coin.symbol); }
    if (activeTab === 'PORTFOLIO') {
        return false; // Portfolio logic is handled below
    }
    if (!coin.type && activeTab === 'CRYPTO') return true;
    return coin.type === activeTab;
  });

  // ÖZEL PORTFOLIO FİLTRESİ
  if (activeTab === 'PORTFOLIO' && currentUser) {
      const myAssets = Object.keys(portfolio).filter(k => portfolio[k] > 0);
      processedCoins = myAssets.map(symbol => {
          const coinData = coins.find(c => c.symbol === symbol);
          if (!coinData) return { symbol, name: symbol, price: 0, change: 0, myQty: portfolio[symbol], type: 'UNKNOWN' };
          return { ...coinData, myQty: portfolio[symbol] };
      });
  }

  if (searchTerm && activeTab !== 'PORTFOLIO') {
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

  // Toplam Portföy Değeri Hesapla
  const totalPortfolioValueTL = processedCoins.reduce((acc, coin) => {
      if(activeTab === 'PORTFOLIO'){
          const isTrAsset = ['BIST', 'GRAM-ALTIN', 'CEYREK-ALTIN', 'YARIM-ALTIN', 'TAM-ALTIN', 'GRAM-GUMUS'].includes(coin.type) || coin.symbol.endsWith('.IS');
          const rate = isTrAsset ? 1 : currentUsdRate;
          return acc + (coin.price * coin.myQty * rate);
      }
      return 0;
  }, 0);

  return (
    <div style={{ backgroundColor: '#13131a', minHeight: '100vh', width: '100vw', color: 'white', fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box', overflowX:'hidden', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer />

      {showUserAuth && <UserAuth 
            onClose={()=>setShowUserAuth(false)} 
            onSuccess={(u)=>{setCurrentUser(u);setFavorites(u.favorites);setShowUserAuth(false)}} 
            
            onGuestSupport={(type) => { 
                setGuestSupportType(type);
                setShowUserAuth(false); 
                setShowGuestSupport(true); 
            }}
        />}
    
        {showProfileModal && currentUser && (
            <ProfileModal 
                user={currentUser} 
                onClose={() => setShowProfileModal(false)} 
                onUpdateSuccess={(updatedUser) => {
                    setCurrentUser(updatedUser);

                    if (updatedUser.favorites) {
                        setFavorites(updatedUser.favorites);
                    }

                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }}
            />
        )}

        {showGuestSupport && <GuestSupportModal type={guestSupportType} onClose={() => setShowGuestSupport(false)} />}
        {showWalletModal && <WalletModal onClose={() => setShowWalletModal(false)} walletBalance={walletBalance} setWalletBalance={setWalletBalance} currentUser={currentUser} />}
        
        {/* TRADE MODAL RENDER */}
        {tradeModalOpen && tradeCoin && (
            <TradeModal 
                coin={tradeCoin}
                currentBalance={walletBalance}
                portfolio={portfolio}
                onClose={() => setTradeModalOpen(false)}
                onBuy={handleBuyAsset}
                onSell={handleSellAsset}
                getTradingViewSymbol={getTradingViewSymbol}
                usdRate={currentUsdRate}
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
                  
                  {/* SANAL CÜZDAN BUTONU */}
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <button 
                          onClick={() => setShowWalletModal(true)} 
                          style={{background: 'none', border: 'none', color: '#ccc', fontSize: '1.5rem', cursor: 'pointer', transition: 'all 0.3s', padding: '0 5px'}}
                          onMouseEnter={(e) => e.target.style.color = '#00d2ff'}
                          onMouseLeave={(e) => e.target.style.color = '#ccc'}
                          title="Sanal Cüzdan"
                      >
                          💳
                      </button>
                      <span style={{color: '#00ff88', fontWeight: 'bold', fontSize: '0.9rem', fontFamily: 'Consolas', minWidth: '60px'}}>
                          {walletBalance.toFixed(2)} ₺
                      </span>
                  </div>

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
                                                    <div style={{
                                                        fontWeight: '700', 
                                                        color: n.type === 'success' ? '#00ff88' : (n.type === 'error' ? '#ff4d4d' : (n.type === 'support_reply' ? '#e0aaff' : '#00d2ff'))
                                                    }}>
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

                                                {n.originalMessage ? (
                                                    <div style={{marginTop:'5px'}}>
                                                        <div style={{background:'rgba(255,255,255,0.05)', padding:'5px', borderRadius:'4px', marginBottom:'5px', color:'#888', fontStyle:'italic', fontSize:'0.8rem'}}>
                                                            Siz: "{n.originalMessage}"
                                                        </div>
                                                        <div style={{color:'#eee'}}>
                                                            <em>CryptoLive Ekibi</em>: {n.message}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{color: '#ccc', marginBottom: '5px', paddingRight: '15px'}}>{n.message}</div>
                                                )}

                                                <div style={{fontSize: '0.7rem', color: '#666', textAlign: 'right', marginTop:'5px'}}>{n.time}</div>
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
                  if (m.id === 'PORTFOLIO' && !currentUser) return null; 
                  return (
                      <button key={m.id} className={`nav-btn ${activeTab === m.id ? 'active' : ''}`} onClick={() => { setActiveTab(m.id); setSelectedCoin(null); }}>
                          {m.label} 
                          {m.id === 'ALARMS' ? <span style={{background:'#ff4d4d', borderRadius:'50%', padding:'0 5px', fontSize:'0.7rem', color:'white', marginLeft:'5px'}}>{myAlarms.length}</span> : ''}
                      </button>
                  );
              })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '500px 1fr', gap: '15px', width: '100%', height: 'calc(100vh - 180px)' }}>
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
                                        
                                        {/* SÜTUNLARI SEKME TÜRÜNE GÖRE DEĞİŞTİR */}
                                        {activeTab === 'PORTFOLIO' ? (
                                            <>
                                                <th style={{ padding: '10px', textAlign:'right', width:'120px' }}>Miktar</th>
                                                <th style={{ padding: '10px', textAlign:'right', width:'140px' }}>Toplam Değer</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={{ padding: '10px', textAlign:'right', width:'90px' }} onClick={() => handleSort('change')}>24s</th>
                                                <th style={{ padding: '10px', textAlign:'right', width:'100px' }}>Piyasa Değ.</th>
                                            </>
                                        )}
                                        
                                        <th style={{ padding: '10px', textAlign: 'center', width: '80px' }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedCoins.length > 0 ? processedCoins.map((coin) => {
                                        const isFav = favorites.includes(coin.symbol);
                                        const isTrAsset = ['BIST', 'GRAM-ALTIN', 'CEYREK-ALTIN', 'YARIM-ALTIN', 'TAM-ALTIN', 'GRAM-GUMUS'].includes(coin.type) || coin.symbol.endsWith('.IS');
                                        const assetValueTL = activeTab === 'PORTFOLIO' ? (coin.price * coin.myQty * (isTrAsset ? 1 : currentUsdRate)) : 0;

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
                                            
                                            {/* PORTFOLIO İÇİN ÖZEL HÜCRELER */}
                                            {activeTab === 'PORTFOLIO' ? (
                                                <>
                                                    <td style={{ textAlign:'right', padding:'0 10px', color:'#eee', fontFamily:'Consolas', fontWeight:'bold' }}>
                                                        {coin.myQty} <span style={{fontSize:'0.7rem', color:'#888', fontWeight:'normal'}}>Adet</span>
                                                    </td>
                                                    <td style={{ textAlign:'right', padding:'0 10px', color:'#00ff88', fontFamily:'Consolas', fontWeight:'bold' }}>
                                                        {assetValueTL.toFixed(2)} ₺
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <FlashCell value={coin.change} suffix="%" align="right" isChange={true} width="90px" />
                                                    <td style={{ textAlign:'right', padding:'0 10px', color:'#999', fontFamily:'Consolas, monospace', fontWeight:'600', fontSize:'0.85rem' }}>{formatMarketCap(coin.mcap, getCurrencySymbol(coin))}</td>
                                                </>
                                            )}
                                            
                                            <td style={{ textAlign: 'center', padding: '0 10px' }}>
                                                <button 
                                                    onClick={(e) => openTradeModal(e, coin)}
                                                    style={{
                                                        background: 'linear-gradient(90deg, #00d2ff, #007aff)',
                                                        border: 'none',
                                                        color: 'white',
                                                        padding: '6px 12px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.8rem',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    Al/Sat
                                                </button>
                                            </td>
                                        </tr>
                                        )}) : ( <tr><td colSpan="7" style={{padding:'20px', textAlign:'center', color:'#666'}}>Veri yok.</td></tr> )
                                    }
                                    
                                    {/* TOPLAM VARLIK ÖZETİ SATIRI */}
                                    {activeTab === 'PORTFOLIO' && processedCoins.length > 0 && (
                                        <tr style={{borderTop:'2px solid #333', background:'#1a1a24'}}>
                                            <td colSpan={4} style={{textAlign:'right', padding:'15px', color:'#aaa', fontWeight:'bold'}}>
                                                TOPLAM VARLIK DEĞERİ (TL):
                                            </td>
                                            <td style={{textAlign:'right', padding:'15px', color:'#00d2ff', fontFamily:'Consolas', fontSize:'1.1rem', fontWeight:'bold'}}>
                                                {totalPortfolioValueTL.toFixed(2)} ₺
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                      </>
                  )}
              </div>

              {/* SAĞ TARAF: GRAFİK (TradingView) VEYA DAİRE GRAFİĞİ (Portföy) */}
              <div style={{ 
                  background: '#1e1e2e', 
                  borderRadius: '12px', 
                  padding: '10px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)', 
                  border: '1px solid #333', 
                  position: 'relative', 
                  minHeight: '400px', // YÜKSEKLİK GARANTİSİ
                  ...(isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 } : {})
              }}>
                  
                  {activeTab === 'PORTFOLIO' ? (
                        /* PORTFÖY DAİRE GRAFİĞİ */
                        <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
                            <h3 style={{color:'#eee', marginBottom:'15px'}}>Varlık Dağılımı</h3>
                            <div style={{flex: 1, width: '100%', minHeight: '350px'}}> {/* Minimum yükseklik verildi */}
                                <PortfolioChart portfolio={portfolio} coins={coins} walletBalance={walletBalance} usdRate={currentUsdRate} />
                            </div>
                        </div>
                  ) : (
                        /* TRADINGVIEW GRAFİĞİ */
                        <>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding: '0 5px', flexShrink: 0 }}>
                                <div><h2 style={{ margin: 0, fontSize:'1.3rem', fontWeight:'700', color:'#eee' }}>{coins.find(c => c.symbol === selectedCoin)?.name || selectedCoin || "Seçim Yapın"}</h2><span style={{ color:'#777', fontSize: '0.8rem' }}>TradingView Analiz</span></div>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px'}}><div style={{textAlign:'right'}}><div style={{fontFamily:'Consolas', fontWeight:'bold', fontSize:'1.2rem'}}>{currentTime.toLocaleTimeString()}</div><div style={{fontSize:'0.75rem', color:'#888'}}>{currentTime.toLocaleDateString()}</div></div><button onClick={() => setIsFullScreen(!isFullScreen)} style={{background:'rgba(255,255,255,0.1)', border:'none', color:'white', width:'32px', height:'32px', borderRadius:'6px', cursor:'pointer'}}>⤢</button></div>
                            </div>
                            <div style={{ flex: 1, width: '100%', minHeight: '0', overflow:'hidden', borderRadius:'8px', position:'relative' }}> 
                                {selectedCoin ? (<div key={getTradingViewSymbol(selectedCoin)} style={{ width: '100%', height: '100%' }}><TradingViewWidget symbol={getTradingViewSymbol(selectedCoin)} theme="dark" autosize interval="D" timezone="Etc/UTC" style="1" locale="tr" toolbar_bg="#f1f3f6" enable_publishing={false} hide_side_toolbar={false} allow_symbol_change={true} /></div>) : ( <div style={{ display:'flex', height:'100%', justifyContent:'center', alignItems:'center', color:'#444', border:'2px dashed #333', borderRadius:'8px', fontSize:'0.9rem' }}>Grafik yükleniyor...</div> )}
                            </div>
                        </>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}

const modalStyle = {position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:10000, display:'flex', justifyContent:'center', alignItems:'center'};
const overlayStyle = {position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)'};

// TRADE MODAL (Düzeltilmiş ve USD Hesaplamalı)
const TradeModal = ({ coin, onClose, currentBalance, portfolio, onBuy, onSell, getTradingViewSymbol, usdRate }) => {
    const [mode, setMode] = useState('BUY'); 
    const [amount, setAmount] = useState(''); 
    const [totalPriceUsd, setTotalPriceUsd] = useState(0); 
    const [totalPriceTL, setTotalPriceTL] = useState(0);

    const currentAssetQty = portfolio[coin.symbol] || 0;

    const isTrAsset = ['BIST', 'GRAM-ALTIN', 'CEYREK-ALTIN', 'YARIM-ALTIN', 'TAM-ALTIN', 'GRAM-GUMUS'].includes(coin.type) || coin.symbol.endsWith('.IS');
    
    const effectiveRate = isTrAsset ? 1 : usdRate;
    const currencySymbol = isTrAsset ? '₺' : '$';

    useEffect(() => {
        const val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            const rawPrice = val * coin.price; 
            setTotalPriceUsd(rawPrice);
            setTotalPriceTL(rawPrice * effectiveRate); 
        } else {
            setTotalPriceUsd(0);
            setTotalPriceTL(0);
        }
    }, [amount, coin.price, effectiveRate]);

    const handleTransaction = (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            toast.warn("Geçerli bir miktar girin.");
            return;
        }

        if (mode === 'BUY') {
            if (totalPriceTL > currentBalance) {
                toast.error(`Yetersiz Bakiye! Gereken: ${totalPriceTL.toFixed(2)} ₺`);
                return;
            }
            onBuy(coin, parseFloat(amount), totalPriceTL);
        } else {
            if (parseFloat(amount) > currentAssetQty) {
                toast.error(`Yetersiz ${coin.symbol} bakiyesi!`);
                return;
            }
            onSell(coin, parseFloat(amount), totalPriceTL);
        }
    };

    const setMax = () => {
        if (mode === 'BUY') {
            const maxBuy = currentBalance / (coin.price * effectiveRate);
            setAmount(maxBuy.toFixed(4)); 
        } else {
            setAmount(currentAssetQty.toString());
        }
    };

    return (
        <div style={modalStyle}>
            <div style={overlayStyle} onClick={onClose}></div>
            <div style={{
                background: '#1e1e2e',
                borderRadius: '16px',
                border: `2px solid ${mode === 'BUY' ? '#00ff88' : '#ff4d4d'}`,
                width: '900px', 
                height: '600px',
                zIndex: 10001,
                position: 'relative',
                display: 'flex',
                overflow: 'hidden',
                boxShadow: `0 0 50px ${mode === 'BUY' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 77, 77, 0.2)'}`
            }}>
                {/* SOL TARAF - GRAFİK */}
                <div style={{ flex: 2, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '10px', background: '#15151b', borderBottom: '1px solid #333' }}>
                        <span style={{ fontWeight: 'bold', color: '#eee' }}>{coin.name} ({coin.symbol})</span>
                        {!isTrAsset && <span style={{float:'right', color:'#00d2ff', fontSize:'0.8rem'}}>Kur: {usdRate.toFixed(2)} ₺</span>}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <TradingViewWidget 
                            symbol={getTradingViewSymbol(coin)} 
                            theme="dark" 
                            autosize 
                            interval="D" 
                            hide_side_toolbar={true} 
                            style="1" 
                            locale="tr" 
                        />
                    </div>
                </div>

                {/* SAĞ TARAF - İŞLEM MENÜSÜ */}
                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: '#1a1a24' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#eee' }}>İşlem Yap</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                    </div>

                    <div style={{ display: 'flex', marginBottom: '20px', background: '#111', borderRadius: '8px', padding: '4px' }}>
                        <button 
                            onClick={() => { setMode('BUY'); setAmount(''); }} 
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: mode === 'BUY' ? '#00ff88' : 'transparent', color: mode === 'BUY' ? '#000' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                            AL
                        </button>
                        <button 
                            onClick={() => { setMode('SELL'); setAmount(''); }} 
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: mode === 'SELL' ? '#ff4d4d' : 'transparent', color: mode === 'SELL' ? '#fff' : '#888', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                            SAT
                        </button>
                    </div>

                    <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: '#aaa' }}>
                            <span>Cüzdan Bakiyesi:</span>
                            <span style={{ color: '#eee', fontWeight: 'bold' }}>{currentBalance.toFixed(2)} ₺</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#aaa' }}>
                            <span>Sahip Olunan:</span>
                            <span style={{ color: '#eee', fontWeight: 'bold' }}>{currentAssetQty} {coin.symbol}</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>Güncel Fiyat</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: mode === 'BUY' ? '#00ff88' : '#ff4d4d' }}>
                            {coin.price.toFixed(2)} <span style={{ fontSize: '1rem' }}>{currencySymbol}</span>
                        </div>
                    </div>

                    <form onSubmit={handleTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#ccc', display: 'block', marginBottom: '5px' }}>
                                Miktar ({coin.symbol})
                                <span onClick={setMax} style={{ float: 'right', color: '#00d2ff', cursor: 'pointer', fontSize: '0.75rem' }}>MAX</span>
                            </label>
                            <input 
                                type="number" 
                                step="any"
                                placeholder="0.00" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)}
                                style={{ width: '100%', padding: '12px', background: '#0f0f13', border: '1px solid #333', color: 'white', borderRadius: '8px', fontSize: '1.1rem', outline: 'none' }} 
                            />
                        </div>

                        {/* FİYAT HESAPLAMA GÖSTERGESİ */}
                        <div style={{ padding: '10px', background: '#111', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ color: '#888', fontSize: '0.9rem' }}>Tutar ({currencySymbol}):</span>
                                <span style={{ fontWeight: 'bold', color: '#ddd' }}>{totalPriceUsd.toFixed(2)} {currencySymbol}</span>
                            </div>
                            
                            {!isTrAsset && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop:'1px solid #333', paddingTop:'5px' }}>
                                    <span style={{ color: '#00d2ff', fontSize: '0.9rem' }}>İşlem Tutarı (TL):</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#eee' }}>{totalPriceTL.toFixed(2)} ₺</span>
                                </div>
                            )}
                            {isTrAsset && (
                                <div style={{ textAlign:'right', fontSize:'0.8rem', color:'#666' }}>*TL varlıklarında kur farkı yoktur.</div>
                            )}
                        </div>

                        <button type="submit" style={{ 
                            padding: '15px', 
                            background: mode === 'BUY' ? 'linear-gradient(90deg, #00ff88, #00cc6a)' : 'linear-gradient(90deg, #ff4d4d, #cc0000)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            color: mode === 'BUY' ? '#000' : '#fff', 
                            fontWeight: 'bold', 
                            fontSize: '1.1rem', 
                            cursor: 'pointer', 
                            marginTop: '10px'
                        }}>
                            {mode === 'BUY' ? `${coin.symbol} AL` : `${coin.symbol} SAT`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// PROFİL DÜZENLEME MODALI 
const ProfileModal = ({ user, onClose, onUpdateSuccess }) => {
    const [activeSection, setActiveSection] = useState(0); 

    const [newUsername, setNewUsername] = useState(user.username);
    const [newGender, setNewGender] = useState(user.gender || 'Erkek');
    const [newBirthDate, setNewBirthDate] = useState(user.birthDate ? user.birthDate.split('T')[0] : ''); 
    const [newPass, setNewPass] = useState('');
    const [newEmail, setNewEmail] = useState(user.email || '');
    const [newPhone, setNewPhone] = useState(user.phone || '');

    const [deletePass, setDeletePass] = useState(''); 

    const [supportSubject, setSupportSubject] = useState('Öneri');
    const [supportMsg, setSupportMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const [showVerifyInput, setShowVerifyInput] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');  
    const [tempData, setTempData] = useState(null); 

    const handleInitiateUpdate = async (e) => {
        e.preventDefault();

        if(newBirthDate) {
            const birth = new Date(newBirthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            if (age < 18) { toast.warn("Yaşınız 18'den küçük olamaz."); return; }
        }

        if (newPhone && !/^5\d{9}$/.test(newPhone)) {
            toast.warn("Telefon: 5 ile başlamalı ve 10 hane olmalı.");
            return;
        }

        setLoading(true);
        try {

            await AuthService.sendVerificationCode(user.username);

            setTempData({
                newUsername, newGender, newBirthDate, newPass, newEmail, newPhone
            });

            toast.info(`📧 Doğrulama kodu ${user.email} adresine gönderildi.`);
            setShowVerifyInput(true); 
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalVerify = async () => {
        if(!verificationCode || verificationCode.length < 6) {
            toast.warn("Lütfen 6 haneli kodu giriniz.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                username: user.username,
                code: verificationCode,
                ...tempData, 
                newPassword: newPass || undefined
            };

            const res = await AuthService.verifyAndUpdateProfile(payload);
            
            toast.success(res.message);
            if (res.user) onUpdateSuccess(res.user);
            
            setShowVerifyInput(false); 
            setVerificationCode('');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => { 
        if(!deletePass) { toast.warn("Şifre girin."); return; }
        if(window.confirm("Hesabınız kalıcı olarak silinecek. Emin misiniz?")) {
            try { await AuthService.deleteAccount(user.username, deletePass); toast.info("Hesap silindi."); window.location.reload(); } catch(e) { toast.error(e.message); }
        }
    };

    const handleSendSupport = async (e) => {
        e.preventDefault(); if(!supportMsg) return; setLoading(true);
        try { await AuthService.sendSupport(user.username, supportSubject, supportMsg); toast.success("İletildi!"); setSupportMsg(''); } catch(e) { toast.error("Hata."); } finally { setLoading(false); }
    };

    const SectionBtn = ({ id, icon, title, color = '#eee' }) => (
        <button onClick={() => setActiveSection(activeSection === id ? 0 : id)} style={{ width:'100%', textAlign:'left', padding:'15px', background: activeSection === id ? 'rgba(255,255,255,0.05)' : 'transparent', border:'none', borderBottom:'1px solid #333', color: color, cursor:'pointer', fontWeight:'bold', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>{icon} {title}</span><span>{activeSection === id ? '▼' : '▶'}</span>
        </button>
    );

    const labelStyle = {color:'#888', fontSize:'0.75rem', display:'block', marginBottom:'4px'};

    return (
        <div style={modalStyle}>
            <div style={overlayStyle} onClick={onClose}></div>
            <div style={{ background: '#1e1e2e', borderRadius: '16px', border: '1px solid #333', width: '360px', zIndex: 10001, maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column', position:'relative' }}>
                
                <div style={{padding:'15px', borderBottom:'1px solid #333', background:'#15151b', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3 style={{color:'#00d2ff', margin:0, fontSize:'1.1rem'}}>Profil Ayarları</h3>
                    <button onClick={onClose} style={{background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'1.2rem'}}>✕</button>
                </div>

                {/* 1. KİŞİSEL BİLGİLERİM */}
                <SectionBtn id={1} icon="👤" title="Kişisel Bilgilerim" color="#00d2ff" />
                {activeSection === 1 && (
                    <div style={{padding:'20px', background:'#1a1a24'}}>
                        <form onSubmit={handleInitiateUpdate}>
                            <label style={labelStyle}>Kullanıcı Adı</label>
                            <input 
                                type="text" 
                                value={newUsername} 
                                onChange={(e) => setNewUsername(e.target.value)}
                                style={inputStyle}
                                placeholder="Yeni kullanıcı adınızı girin"
                            />
                            
                            <div style={{display:'flex', gap:'10px'}}>
                                <div style={{flex:1}}>
                                    <label style={labelStyle}>Cinsiyet</label>
                                    <select value={newGender} onChange={e=>setNewGender(e.target.value)} style={inputStyle}>
                                        <option>Erkek</option><option>Kadın</option>
                                    </select>
                                </div>
                                <div style={{flex:1}}>
                                    <label style={labelStyle}>Doğum Tarihi</label>
                                    <input type="date" value={newBirthDate} onChange={e=>setNewBirthDate(e.target.value)} style={{...inputStyle, colorScheme:'dark'}} />
                                </div>
                            </div>

                            <label style={labelStyle}>Yeni Şifre</label>
                            <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Yeni şifreniz" style={inputStyle} />
                            
                            <button type="submit" disabled={loading} style={btnStyle}>Doğrulama Kodu Gönder</button>
                        </form>
                    </div>
                )}

                {/* 2. İLETİŞİM BİLGİLERİM */}
                <SectionBtn id={2} icon="📞" title="İletişim Bilgilerim" color="#f1c40f" />
                {activeSection === 2 && (
                    <div style={{padding:'20px', background:'#1f1f1a'}}>
                        <form onSubmit={handleInitiateUpdate}>
                            <label style={labelStyle}>E-posta Adresi</label>
                            <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} style={inputStyle} />
                            
                            <label style={labelStyle}>Telefon Numarası</label>
                            <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} maxLength={10} placeholder="532..." style={inputStyle} />
                            
                            <button type="submit" disabled={loading} style={btnStyle}>Doğrulama Kodu Gönder</button>
                        </form>
                    </div>
                )}

                {/* 3. HESABIMI SİL */}
                <SectionBtn id={3} icon="🗑️" title="Hesabımı Sil" color="#ff4d4d" />
                {activeSection === 3 && (
                    <div style={{padding:'20px', background:'#2a1a1a'}}>
                        <p style={{color:'#ccc', fontSize:'0.9rem', marginTop:0}}>Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
                        <label style={{...labelStyle, color:'#ff4d4d'}}>Mevcut Şifre</label>
                        <input type="password" value={deletePass} onChange={e=>setDeletePass(e.target.value)} style={{...inputStyle, borderColor:'#ff4d4d', background:'#1a0a0a'}} />
                        <button onClick={handleDelete} style={{...btnStyle, background:'transparent', border:'1px solid #ff4d4d', color:'#ff4d4d'}}>⚠️ Hesabı Sil</button>
                    </div>
                )}

                {/* 4. YARDIM */}
                <SectionBtn id={4} icon="💬" title="Yardım ve Destek" color="#00ff88" />
                {activeSection === 4 && (
                    <div style={{padding:'20px', background:'#1a2420'}}>
                        <form onSubmit={handleSendSupport}>
                            <label style={labelStyle}>Konu</label>
                            <select value={supportSubject} onChange={e=>setSupportSubject(e.target.value)} style={inputStyle}><option>Öneri</option><option>Şikayet</option><option>Teknik</option></select>
                            <label style={labelStyle}>Mesaj</label>
                            <textarea rows="3" value={supportMsg} onChange={e=>setSupportMsg(e.target.value)} style={{...inputStyle, resize:'none'}}></textarea>
                            <button type="submit" disabled={loading} style={{...btnStyle, background:'#00ff88', color:'#000'}}>Gönder</button>
                        </form>
                    </div>
                )}

                {/* DOĞRULAMA KODU GİRME PENCERESİ */}
                {showVerifyInput && (
                    <div style={{
                        position:'absolute', top:0, left:0, width:'100%', height:'100%', 
                        background:'#1e1e2e', zIndex:10002, display:'flex', flexDirection:'column', 
                        justifyContent:'center', alignItems:'center', padding:'20px', boxSizing:'border-box'
                    }}>
                        <h3 style={{color:'#00d2ff', marginTop:0}}>🔐 Güvenlik Kontrolü</h3>
                        <p style={{color:'#ccc', textAlign:'center', fontSize:'0.9rem'}}>
                            <b>{user.email}</b> adresine gönderilen 6 haneli kodu giriniz.
                        </p>
                        
                        <input 
                            type="text" 
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            style={{
                                ...inputStyle, textAlign:'center', fontSize:'1.5rem', 
                                letterSpacing:'5px', width:'200px', borderColor:'#00d2ff'
                            }}
                        />

                        <button onClick={handleFinalVerify} disabled={loading} style={btnStyle}>
                            {loading ? 'Doğrulanıyor...' : 'ONAYLA ve GÜNCELLE'}
                        </button>
                        
                        <button 
                            onClick={() => setShowVerifyInput(false)} 
                            style={{background:'none', border:'none', color:'#666', marginTop:'15px', cursor:'pointer'}}
                        >
                            İptal
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

const WalletModal = ({ onClose, walletBalance: parentBalance, setWalletBalance: setParentBalance, currentUser }) => {
    const [step, setStep] = useState(0);
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(parentBalance || 0);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    if (!currentUser) {
        return (
            <div style={modalStyle}>
                <div style={overlayStyle} onClick={onClose}></div>
                <div style={{
                    background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
                    borderRadius: '20px',
                    border: '2px solid #ff4d4d',
                    width: '380px',
                    zIndex: 10001,
                    position: 'relative',
                    padding: '40px',
                    textAlign: 'center',
                    boxShadow: '0 0 40px rgba(255, 77, 77, 0.3)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔐</div>
                    <h2 style={{ color: '#ff4d4d', margin: '0 0 15px 0', fontSize: '1.3rem' }}>Giriş Gerekli</h2>
                    <p style={{ color: '#ccc', marginBottom: '25px', lineHeight: '1.5' }}>
                        Sanal cüzdana erişmek için lütfen giriş yapınız.
                    </p>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(90deg, #ff4d4d, #ff6b6b)',
                            border: 'none',
                            color: 'white',
                            padding: '12px 30px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        Kapat
                    </button>
                </div>
            </div>
        );
    }

    const handleCardNumberChange = (e) => {
        let value = e.target.value.replace(/\s/g, '');
        if (value.length <= 16) {
            value = value.replace(/(\d{4})/g, '$1 ').trim();
            setCardNumber(value);
        }
    };

    const handleExpiryChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 4) {
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            setExpiryDate(value);
        }
    };

    const handleCvvChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 3) setCvv(value);
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (!isNaN(value) && value >= 0) setAmount(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        if (step === 0) {
            if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
                setErrorMessage('Kart numarası 16 haneli olmalıdır');
                return;
            }
            if (!cardHolder.trim()) {
                setErrorMessage('Kart sahibi adı giriniz');
                return;
            }
            if (!expiryDate || expiryDate.length !== 5) {
                setErrorMessage('Geçerli bir tarih giriniz (MM/YY)');
                return;
            }
            if (!cvv || cvv.length !== 3) {
                setErrorMessage('CVV 3 haneli olmalıdır');
                return;
            }
            setStep(1);
        } else if (step === 1) {
            if (!amount || parseFloat(amount) <= 0) {
                setErrorMessage('Geçerli bir miktar giriniz');
                return;
            }
            setIsLoading(true);
            setTimeout(() => {
                const newBalance = walletBalance + parseFloat(amount);
                setWalletBalance(newBalance);
                if (setParentBalance) setParentBalance(newBalance);
                setSuccessMessage(`✅ ${amount} ₺ başarıyla yüklendi! Bakiye: ${newBalance.toFixed(2)} ₺`);
                setIsLoading(false);
                setStep(2);
            }, 1500);
        }
    };

    const resetForm = () => {
        setCardNumber('');
        setCardHolder('');
        setExpiryDate('');
        setCvv('');
        setAmount('');
        setStep(0);
        setSuccessMessage('');
    };

    return (
        <div style={modalStyle}>
            <div style={overlayStyle} onClick={onClose}></div>
            <div style={{
                background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
                borderRadius: '20px',
                border: '2px solid #00d2ff',
                width: '420px',
                zIndex: 10001,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 0 40px rgba(0, 210, 255, 0.3)'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'radial-gradient(circle at 20% 50%, rgba(0, 210, 255, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none'
                }}></div>

                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(0, 210, 255, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 1
                }}>
                    <h2 style={{ color: '#00d2ff', margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
                        💳 Sanal Cüzdan
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                    }} onMouseEnter={(e) => e.target.style.color = '#ff4d4d'} onMouseLeave={(e) => e.target.style.color = '#666'}>
                        ✕
                    </button>
                </div>

                <div style={{ padding: '30px', position: 'relative', zIndex: 1 }}>
                    {step === 0 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-in' }}>
                            <h3 style={{ color: '#eee', marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
                                Kart Bilgilerinizi Giriniz
                            </h3>
                            
                            <div style={{
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                                borderRadius: '15px',
                                padding: '20px',
                                marginBottom: '25px',
                                border: '2px solid #00d2ff',
                                boxShadow: '0 8px 32px rgba(0, 210, 255, 0.2)',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                color: 'white',
                                fontFamily: 'monospace',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute', top: '-50%', right: '-50%', width: '200%', height: '200%',
                                    background: 'radial-gradient(circle, rgba(0, 210, 255, 0.1) 0%, transparent 70%)',
                                    animation: 'pulse 3s ease-in-out infinite'
                                }}></div>
                                
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '10px' }}>KART NUMARASI</div>
                                    <div style={{
                                        fontSize: '1.3rem', letterSpacing: '3px', fontWeight: 'bold', minHeight: '30px',
                                        animation: cardNumber ? 'slideIn 0.3s ease-out' : 'none'
                                    }}>
                                        {cardNumber || '•••• •••• •••• ••••'}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '5px' }}>KART SAHİBİ</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', minHeight: '20px', animation: cardHolder ? 'slideIn 0.3s ease-out' : 'none' }}>
                                            {cardHolder || 'ADIM SOYADIM'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '5px' }}>SON KULLANMA</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', minHeight: '20px', animation: expiryDate ? 'slideIn 0.3s ease-out' : 'none' }}>
                                            {expiryDate || 'MM/YY'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Kart Numarası</label>
                                    <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={handleCardNumberChange} maxLength="19" style={{ ...inputStyle, fontSize: '1.1rem', letterSpacing: '2px', fontFamily: 'monospace', textAlign: 'center' }} />
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Kart Sahibi</label>
                                    <input type="text" placeholder="ADIM SOYADIM" value={cardHolder} onChange={(e) => setCardHolder(e.target.value.toUpperCase())} style={inputStyle} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Son Kullanma</label>
                                        <input type="text" placeholder="MM/YY" value={expiryDate} onChange={handleExpiryChange} maxLength="5" style={{ ...inputStyle, marginBottom: 0, textAlign: 'center', fontSize: '1.1rem', fontFamily: 'monospace' }} />
                                    </div>
                                    <div>
                                        <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>CVV</label>
                                        <input type="password" placeholder="***" value={cvv} onChange={handleCvvChange} maxLength="3" style={{ ...inputStyle, marginBottom: 0, textAlign: 'center', fontSize: '1.1rem', fontFamily: 'monospace' }} />
                                    </div>
                                </div>

                                <button type="submit" style={{ ...btnStyle, background: 'linear-gradient(90deg, #00d2ff, #007aff)', fontSize: '1rem', padding: '12px' }}>Devam Et →</button>
                            </form>
                        </div>
                    )}

                    {step === 1 && (
                        <div style={{ animation: 'slideIn 0.5s ease-out' }}>
                            <h3 style={{ color: '#eee', marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>Para Yükle</h3>
                            <div style={{ background: 'rgba(0, 210, 255, 0.1)', border: '2px solid #00d2ff', borderRadius: '12px', padding: '15px', marginBottom: '20px', textAlign: 'center' }}>
                                <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '5px' }}>Mevcut Bakiye</div>
                                <div style={{ color: '#00ff88', fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{walletBalance.toFixed(2)} ₺</div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Yüklenecek Miktar (₺)</label>
                                <input type="number" placeholder="100" value={amount} onChange={handleAmountChange} min="1" step="1" style={{ ...inputStyle, fontSize: '1.3rem', textAlign: 'center', fontWeight: 'bold' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
                                    {[50, 100, 250].map(val => (
                                        <button key={val} type="button" onClick={() => setAmount(val.toString())} style={{ background: amount === val.toString() ? '#00d2ff' : 'rgba(0, 210, 255, 0.2)', border: '1px solid #00d2ff', color: amount === val.toString() ? '#000' : '#00d2ff', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>{val} ₺</button>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button type="button" onClick={() => setStep(0)} style={{ background: 'transparent', border: '1px solid #666', color: '#888', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>← Geri</button>
                                    <button type="submit" disabled={isLoading} style={{ ...btnStyle, background: isLoading ? '#666' : 'linear-gradient(90deg, #00ff88, #00d2ff)', color: isLoading ? '#999' : '#000', opacity: isLoading ? 0.7 : 1 }}>{isLoading ? '⏳ İşleniyor...' : '✓ Yükle'}</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ textAlign: 'center', animation: 'scaleIn 0.6s ease-out' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '15px', animation: 'bounce 0.6s ease-out' }}>✅</div>
                            <h3 style={{ color: '#00ff88', marginTop: 0, marginBottom: '10px' }}>Başarılı!</h3>
                            <p style={{ color: '#eee', marginBottom: '20px', fontSize: '1rem' }}>{successMessage}</p>
                            <div style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid #00ff88', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                                <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '5px' }}>Yeni Bakiye</div>
                                <div style={{ color: '#00ff88', fontSize: '1.6rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{walletBalance.toFixed(2)} ₺</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button onClick={resetForm} style={{ ...btnStyle, background: 'linear-gradient(90deg, #00d2ff, #007aff)' }}>Yeniden Yükle</button>
                                <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Kapat</button>
                            </div>
                        </div>
                    )}
                </div>

                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                `}</style>
            </div>
        </div>
    );
};

const inputStyle = { width:'100%', padding:'10px', marginBottom:'10px', background:'#0f0f13', border:'1px solid #333', color:'white', borderRadius:'6px', boxSizing:'border-box', outline:'none' };
const btnStyle = { width:'100%', padding:'10px', background:'linear-gradient(90deg, #00d2ff, #007aff)', color:'white', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer', marginTop:'5px' };

export default App;