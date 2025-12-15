import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next'; 
import TradingViewWidget from './TradingViewWidget';
import UserAuth from './pages/UserAuth'; 
import { AuthService } from './services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const socket = io.connect("http://localhost:3001");

const formatMarketCap = (value, currencySymbol) => {
    if (!value) return '-';
    let val = parseFloat(value);
    if (val >= 1e9) return `${currencySymbol}${(val / 1e9).toFixed(2)}B`; 
    if (val >= 1e6) return `${currencySymbol}${(val / 1e6).toFixed(2)}M`; 
    return `${currencySymbol}${val.toFixed(0)}`;
};

const FlashCell = ({ value, type = 'text', prefix = '', suffix = '', align = 'right', isChange = false, width = 'auto', fontSize='0.95rem', style={} }) => {
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
        <td className={`flash-cell-pro ${flashClass}`} style={{ textAlign: align, color: flashClass ? 'inherit' : textColor, width: width, minWidth: width, maxWidth: width, fontSize: fontSize, ...style }}>
            {displayValue !== '-' ? prefix : ''}{displayValue}{displayValue !== '-' ? suffix : ''}
        </td>
    );
};

const PortfolioChart = ({ portfolio, coins, walletBalance, usdRate }) => {
    const labels = [];
    const dataValues = [];
    const backgroundColors = [];
    const borderColors = [];

    const colorPalette = [
        '#00d2ff', '#ff4d4d', '#ffbf00', '#a32bff', '#ff00ff', '#00ffea', '#ff8800', '#99ff00'
    ];

    const balance = parseFloat(walletBalance) || 0;
    if (balance > 0) {
        labels.push('Nakit (TL)');
        dataValues.push(balance);
        backgroundColors.push('#00ff88');
        borderColors.push('#00331a');
    }

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
        maintainAspectRatio: false, 
        animation: {
            duration: 0 
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

  const [portfolio, setPortfolio] = useState({}); 
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeCoin, setTradeCoin] = useState(null);

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

  const { t, i18n } = useTranslation();

  const getLocalizedAssetName = (coin) => {
      const key = `assets.${coin.symbol}`;
      if (i18n.exists(key)) {
          return t(key);
      }
      return coin.name;
  };

  const changeLanguage = (lng) => {
      i18n.changeLanguage(lng);
  };

  const markets = [
      { id: 'CRYPTO', label: t('tabs.crypto') },
      { id: 'BIST', label: t('tabs.bist') },
      { id: 'FOREX', label: t('tabs.forex') },
      { id: 'COMMODITY', label: t('tabs.commodity') },
      { id: 'US_STOCK', label: t('tabs.us_stock') },
      { id: 'FAVORITES', label: t('tabs.favorites') },
      { id: 'ALARMS', label: t('tabs.alarms') },
      { id: 'PORTFOLIO', label: t('tabs.portfolio') }
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
                const generateRandomChange = (range) => (Math.random() * range * 2) - range;

                if (index !== -1) {
                    const existingCoin = newCoinsList[index];

                    newCoinsList[index] = { 
                        ...existingCoin, 
                        ...newCoin, 
                        logo: newCoin.logo || existingCoin.logo,

                        change1w: existingCoin.change1w || generateRandomChange(8),  
                        change1m: existingCoin.change1m || generateRandomChange(15), 
                        change3m: existingCoin.change3m || generateRandomChange(25), 
                        change1y: existingCoin.change1y || generateRandomChange(60), 
                        change5y: existingCoin.change5y || generateRandomChange(150),
                        mcap: existingCoin.mcap || (newCoin.price * (Math.random() * 1000000 + 500000))
                    };
                } else {
                    newCoinsList.push({ 
                        ...newCoin, 
                        type: newCoin.type || 'CRYPTO', 
                        mcap: newCoin.price * (Math.random() * 1000000 + 500000), 
                        change1w: generateRandomChange(8),
                        change1m: generateRandomChange(15),
                        change3m: generateRandomChange(25),
                        change6m: generateRandomChange(40), 
                        change1y: generateRandomChange(60), 
                        change5y: generateRandomChange(150) 
                    });
                }
            });
            return newCoinsList;
        });
    };

    socket.on("tickerUpdate", handleDataUpdate);
    socket.on("marketUpdate", handleDataUpdate);

    socket.on('notification', (notif) => {
        if (notif.targetUser) {
            if (!currentUser || currentUser.username !== notif.targetUser) return;
        }
        
        let finalColor = '#00d2ff';
        let displayTitle = notif.title || "Bildirim"; 

        if (notif.type === 'error') {
            finalColor = '#ff4d4d'; 
            displayTitle = "Hata";
        } else if (notif.type === 'success') {
            finalColor = '#00ff88'; 
            displayTitle = "Başarılı";
        } else if (notif.type === 'support_reply') {
            finalColor = '#e0aaff'; 
            displayTitle = t('support.reply_title') || "Destek Yanıtı";
        }

        const CustomToastContent = () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ 
                    color: finalColor, 
                    fontWeight: '800', 
                    fontSize: '1rem', 
                    borderBottom: `1px solid ${finalColor}`,
                    paddingBottom: '4px',
                    marginBottom: '4px',
                    display: 'block' 
                }}>
                    {displayTitle}
                </span>

                {notif.type === 'support_reply' ? (
                    /* DESTEK MESAJI TASARIMI */
                    <div style={{ fontSize:'0.9rem' }}>
                        <div style={{ 
                            background:'rgba(255,255,255,0.05)', 
                            padding:'8px', 
                            borderRadius:'6px', 
                            marginBottom:'8px', 
                            color:'#aaa', 
                            fontStyle:'italic',
                            fontSize: '0.8rem'
                        }}>
                            <span style={{ fontWeight:'bold', display:'block', marginBottom:'2px', color:'#666' }}>
                                {t('notifications_panel.you')}:
                            </span>
                            "{notif.originalMessage}"
                        </div>

                        {/* Ekibin Yanıtı */}
                        <div style={{ 
                            paddingLeft:'10px', 
                            borderLeft:`3px solid ${finalColor}`, 
                            color: 'white'
                        }}>
                            <span style={{ 
                                fontSize:'0.85rem', 
                                fontWeight:'bold', 
                                display:'block', 
                                color: finalColor,
                                marginBottom: '2px'
                            }}>
                                {t('notifications_panel.team')}:
                            </span>
                            <span style={{ lineHeight: '1.4', display: 'block' }}>
                                {notif.message}
                            </span>
                        </div>
                    </div>
                ) : (
                    <span style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {notif.message}
                    </span>
                )}
            </div>
        );

        const options = { position: "top-right", theme: "dark", autoClose: 8000 };

        if (notif.type === 'error') toast.error(CustomToastContent, options);
        else if (notif.type === 'success') toast.success(CustomToastContent, options);
        else if (notif.type === 'support_reply') toast.info(CustomToastContent, options); 
        else toast.info(CustomToastContent, options);

        const newNotification = {
            id: notif._id || Date.now(),
            title: displayTitle,
            message: notif.message,
            originalMessage: notif.originalMessage,
            time: new Date().toLocaleTimeString(),
            type: notif.type 
        };
        
        setNotifications(prev => [newNotification, ...prev]); 
        setUnreadCount(prev => prev + 1); 

        if (notif.type === 'success' && currentUser) fetchAlarms && fetchAlarms();
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
        if (currentUser) {
            AuthService.getNotifications(currentUser.username)
                .then(data => {
                    const formattedNotifs = data.map(n => ({
                        id: n._id,
                        title: n.type === 'support_reply' 
                               ? (t('support.reply_title') || 'Destek Yanıtı') 
                               : n.title,
                        
                        message: n.message,
                        originalMessage: n.originalMessage,
                        time: new Date(n.date).toLocaleTimeString(),
                        type: n.type,
                        read: n.read
                    }));
                    
                    setNotifications(formattedNotifs);
                    setUnreadCount(formattedNotifs.filter(n => !n.read).length); 
                })
                .catch(err => console.error("Bildirim geçmişi hatası:", err));
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [currentUser, t]); 

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
            const activeUserId = currentUser.id || currentUser._id;
            const alarms = await AuthService.getAlarms(activeUserId);
            setMyAlarms(alarms);
          } catch (e) { console.error("Alarm fetch error", e); }
      }
  };

  const handleDeleteAlarm = async (alarmId) => {
      if(!currentUser) return;
      const activeUserId = currentUser.id || currentUser._id;
      try {
        await AuthService.deleteAlarm(activeUserId, currentUser.username, alarmId);
        toast.info(t('notifications.alarm_deleted'));
        fetchAlarms(); 
      } catch (e) { 
          console.error("Silme hatası:", e);
          toast.error(t('notifications.process_failed')); 
      }
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
                  await handleDeleteAlarm(alarmToDelete._id);
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
      setEditingAlarmId(alarm._id);
      setAlarmCoin(coin);
      setAlarmTarget(alarm.targetPrice);
      setAlarmMessage(alarm.note || alarm.message || ''); 
      setAlarmModalOpen(true);
  };

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

    const handleLogout = async () => {
        if (currentUser) {
            try {
                await AuthService.logout(currentUser.username);
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        }

        localStorage.removeItem('user');
        setCurrentUser(null);
        setFavorites([]);
        setMyAlarms([]);
        setPortfolio({}); 
        setSelectedCoin('BTCUSDT');
        setActiveTab('CRYPTO');
        setNotifications([]); 
        setUnreadCount(0);
        toast.info(t('auth.logout_success'));
    };

  const handleSetAlarm = async (e) => {
      e.preventDefault();
      if (!alarmCoin || !alarmTarget) return;
      
      const activeUserId = currentUser.id || currentUser._id;

      try {
          let res;
          if (editingAlarmId) {
              res = await AuthService.updateAlarm(
                  activeUserId, 
                  currentUser.username,
                  editingAlarmId, 
                  alarmTarget, 
                  alarmCoin.price, 
                  alarmMessage
              );
              toast.success(t('notifications.alarm_updated'));
          } else {
              res = await AuthService.setAlarm(
                  activeUserId, 
                  currentUser.username, 
                  alarmCoin.symbol, 
                  alarmTarget, 
                  alarmCoin.price, 
                  alarmMessage
              );
              toast.success(t('notifications.alarm_created'));
          }
          setAlarmModalOpen(false);
          fetchAlarms(); 
      } catch (err) { toast.error(t('notifications.process_failed')); }
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

  const usdCoin = coins.find(c => c.symbol === 'TRY=X' || c.symbol === 'USDTRY');
  const currentUsdRate = usdCoin ? usdCoin.price : 35.00;

  let processedCoins = coins.filter(coin => {
    if (activeTab === 'ALARMS') return false; 
    if (activeTab === 'FAVORITES') { if (!currentUser) return false; return favorites.includes(coin.symbol); }
    if (activeTab === 'PORTFOLIO') {
        return false;
    }
    if (!coin.type && activeTab === 'CRYPTO') return true;
    return coin.type === activeTab;
  });

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
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
      `}</style>

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
                      {/* BAŞLIK ÇEVİRİSİ */}
                      {editingAlarmId ? t('alarm_modal.title_edit') : t('alarm_modal.title_create')}
                  </h3>
                  {/* COIN İSMİ İÇİN DİNAMİK YAPI */}
                  <p style={{color:'#aaa', marginBottom:'20px'}}><strong>{alarmCoin?.name}</strong></p>
                  
                  <div style={{background:'#111', padding:'10px', borderRadius:'8px', marginBottom:'15px', color:'#fff', display:'flex', justifyContent:'space-between'}}>
                      <span>{t('alarm_modal.current_price')}:</span>
                      <span style={{color:'#00ff88', fontWeight:'bold'}}>{alarmCoin?.price?.toFixed(2)}</span>
                  </div>

                  <form onSubmit={handleSetAlarm}>
                      <input type="number" step="any" placeholder={t('alarm_modal.target_price')} value={alarmTarget} onChange={e=>setAlarmTarget(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px', background:'#15151b', border:'1px solid #333', color:'white', borderRadius:'8px', fontSize:'1.1rem', textAlign:'center'}} />
                      <input type="text" placeholder={t('alarm_modal.note_placeholder')} value={alarmMessage} onChange={e=>setAlarmMessage(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', background:'#15151b', border:'1px solid #333', color:'#ddd', borderRadius:'8px', fontSize:'0.9rem'}} />
                      
                      <div style={{marginBottom:'20px', fontSize:'0.85rem', color:'#888'}}>
                          {parseFloat(alarmTarget) > alarmCoin?.price 
                            ? <span>{t('alarm_modal.condition_rise')}<br/>{t('alarm_modal.condition_rise_desc')}</span>
                            : <span>{t('alarm_modal.condition_fall')}<br/>{t('alarm_modal.condition_fall_desc')}</span>
                          }
                      </div>
                      
                      <div style={{display:'flex', gap:'10px'}}>
                          <button type="button" onClick={()=>setAlarmModalOpen(false)} style={{flex:1, background:'#333', color:'#fff', border:'none', padding:'10px', borderRadius:'8px', cursor:'pointer'}}>
                              {t('alarm_modal.btn_cancel')}
                          </button>
                          <button type="submit" style={{flex:1, background:'linear-gradient(90deg, #00d2ff, #007aff)', color:'#fff', border:'none', padding:'10px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
                              {editingAlarmId ? t('alarm_modal.btn_update') : t('alarm_modal.btn_create')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* KAYAN BANT (TICKER) */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...coins, ...coins].map((c, i) => {
            const changeVal = parseFloat(c.change || 0);

            let textColor = '#ccc';
            let bgBackground = 'linear-gradient(180deg, rgba(150, 150, 150, 0.3) 0%, rgba(100, 100, 100, 0.5) 100%)';
            let borderStyle = '1px solid rgba(150, 150, 150, 0.5)';
            let boxShadow = 'none';

            if (changeVal > 0) {
                textColor = '#00ff88';
                bgBackground = 'linear-gradient(180deg, rgba(0, 255, 136, 0.3) 0%, rgba(0, 200, 100, 0.6) 100%)';
                borderStyle = '1px solid rgba(0, 255, 136, 0.8)';
                boxShadow = '0 0 5px rgba(0, 255, 136, 0.3)';
            } else if (changeVal < 0) {
                textColor = '#ff4d4d'; 
                bgBackground = 'linear-gradient(180deg, rgba(255, 77, 77, 0.3) 0%, rgba(200, 50, 50, 0.6) 100%)';
                borderStyle = '1px solid rgba(255, 77, 77, 0.8)';
                boxShadow = '0 0 5px rgba(255, 77, 77, 0.3)';
            }

            return (
              <div key={`${c.symbol}-${i}`} className="ticker-card" style={{ gap: '8px', alignItems: 'center' }}>

                <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>
                  {c.symbol}
                </span>

                <span style={{ fontFamily: 'Consolas', color: '#ccc', fontSize: '0.85rem' }}>
                  {getCurrencySymbol(c)}{c.price?.toFixed(2)}
                </span>

                <span style={{ 
                    color: textColor, 
                    background: bgBackground,
                    border: borderStyle,     
                    boxShadow: boxShadow,   
                    fontWeight: 'bold', 
                    fontSize: '0.75rem',
                    padding: '2px 6px',      
                    borderRadius: '4px',     
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textShadow: '0 0 2px rgba(0,0,0,0.5)' 
                }}>
                  {changeVal > 0 ? '' : ''}{changeVal.toFixed(2)}%
                </span>

              </div>
            );
          })}
        </div>
      </div>

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
                                    {/* BAŞLIK ÇEVİRİSİ */}
                                    <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#eee'}}>{t('notifications_panel.title')}</span>
                                    {/* BUTON ÇEVİRİSİ */}
                                    {notifications.length > 0 && <button onClick={clearNotifications} style={{background: 'none', border: 'none', color: '#ff4d4d', fontSize: '0.8rem', cursor: 'pointer'}}>{t('notifications_panel.clear')}</button>}
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
                                                            {t('notifications_panel.you')}: "{n.originalMessage}"
                                                        </div>
                                                        <div style={{color:'#eee'}}>
                                                            <em>{t('notifications_panel.team')}</em>: {n.message}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{color: '#ccc', marginBottom: '5px', paddingRight: '15px'}}>{n.message}</div>
                                                )}

                                                <div style={{fontSize: '0.7rem', color: '#666', textAlign: 'right', marginTop:'5px'}}>{n.time}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem'}}>{t('notifications_panel.empty')}</div>
                                    )}
                                </div>
                            </div>
                        )}
                  </div>

                  {/* KULLANICI ALANI VE DİL SEÇENEKLERİ (DİKEY HİZALAMA) */}
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'}}>
                      
                      {/* 1. ÜST KISIM: KULLANICI BUTONU (Değişken) */}
                      {currentUser ? (
                          <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#222', padding:'5px 15px', borderRadius:'20px', border:'1px solid #333'}}>
                              <button 
                                  onClick={() => setShowProfileModal(true)} 
                                  style={{background:'none', border:'none', color:'#00ff88', fontWeight:'bold', fontSize:'0.9rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}
                                  title={t('profile.title')}
                              >
                                  👤 {currentUser.username} <span style={{fontSize:'0.7rem', color:'#888'}}>⚙️</span>
                              </button>
                              <button onClick={handleLogout} style={{background:'#333', border:'none', color:'#bbb', cursor:'pointer', fontSize:'0.8rem'}}>{t('logout')}</button>
                          </div>
                      ) : ( 
                          <button onClick={() => setShowUserAuth(true)} style={{ background: '#222', border: '1px solid #444', padding: '8px 20px', borderRadius: '20px', fontWeight: '600', fontSize:'0.9rem', cursor:'pointer', color:'#eee' }}>
                              {t('login_register')}
                          </button>
                      )}

                      {/* 2. ALT KISIM: DİL SEÇENEKLERİ (SABİT) */}
                      <div style={{display:'flex', gap:'10px'}}>
                          <button onClick={() => changeLanguage('tr')} style={{background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', opacity: i18n.language === 'tr' ? 1 : 0.4, transition:'0.3s'}}>
                              <span style={{fontSize:'1.2rem'}}>🇹🇷</span> 
                              <span style={{color:'white', fontSize:'0.7rem', fontWeight:'bold'}}>TR</span>
                          </button>
                          
                          <div style={{width:'1px', height:'15px', background:'#444'}}></div>
                          
                          <button onClick={() => changeLanguage('en')} style={{background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', opacity: i18n.language === 'en' ? 1 : 0.4, transition:'0.3s'}}>
                              <span style={{fontSize:'1.2rem'}}>🇬🇧</span> 
                              <span style={{color:'white', fontSize:'0.7rem', fontWeight:'bold'}}>EN</span>
                          </button>
                      </div>

                  </div>
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
                          {m.id === 'ALARMS' && myAlarms.length > 0 && <span style={{background:'#ff4d4d', borderRadius:'50%', padding:'0 5px', fontSize:'0.7rem', color:'white', marginLeft:'5px'}}>{myAlarms.length}</span>}
                          {m.id === 'FAVORITES' && favorites.length > 0 && (
                            <span style={{background:'#ff4d4d', borderRadius:'50%', padding:'0 5px', fontSize:'0.7rem', color:'white', marginLeft:'5px'}}>
                                {favorites.length}
                            </span>
                        )}
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
                            <h3 style={{margin:0, fontSize:'1rem', fontWeight:'700', color:'#00d2ff'}}>🔔 {t('alarms_table.title')}</h3>
                        </div>
                        {/* TABLO WRAPPER */}
                        <div style={{ overflowY:'auto', overflowX: 'auto', flex:1, width:'100%' }}>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                <thead style={{ position:'sticky', top:0, background:'#1e1e2e', zIndex:10 }}>
                                    <tr style={{ color: '#888', fontSize:'0.75rem', borderBottom:'1px solid #444' }}>
                                        <th style={{width:'25px', padding:'10px 0', textAlign:'center', borderRight:'1px solid #444'}}>★</th>
                                        {currentUser && activeTab === 'FAVORITES' && <th style={{width:'25px', padding:'10px 0', textAlign:'center', borderRight:'1px solid #444'}}>🔔</th>}
                                        
                                        {/* ENSTRÜMAN */}
                                        <th style={{ padding: '10px 0px 10px 5px', textAlign:'left', position:'sticky', left:0, background:'#1e1e2e', zIndex:11, width:'1px', whiteSpace:'nowrap', borderRight:'1px solid #444' }}>{t('table.instrument')}</th>
                                        
                                        {/* FİYAT */}
                                        <th style={{ padding: '5px 0 5px 8px', textAlign:'left', width:'70px', borderRight:'1px solid #444' }} onClick={() => handleSort('price')}>{t('table.price')}</th>

                                        <th style={{ padding: '5px', textAlign:'center', width:'55px', borderRight:'1px solid #444' }} onClick={() => handleSort('change')}>24S</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'55px', borderRight:'1px solid #444' }}>1H</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'55px', borderRight:'1px solid #444' }}>1A</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'55px', borderRight:'1px solid #444' }}>3A</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'55px', borderRight:'1px solid #444' }} onClick={() => handleSort('change1y')}>1Y</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'55px', borderRight:'1px solid #444' }} onClick={() => handleSort('change5y')}>5Y</th>
                                        
                                        <th style={{ padding: '5px', textAlign:'center', width:'85px', borderRight:'1px solid #444' }}>{t('table.market_cap')}</th>
                                        
                                        {/* SPACER */}
                                        <th style={{ width:'99%' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedCoins.length > 0 ? processedCoins.map((coin) => {
                                        const isFav = favorites.includes(coin.symbol);
                                        const cellStyle = { borderRight: '1px solid #444' };

                                        return (
                                        <tr key={coin.symbol} onClick={() => setSelectedCoin(coin.symbol)} style={{ borderBottom: '1px solid #333', cursor: 'pointer', background: selectedCoin === coin.symbol ? 'rgba(0, 210, 255, 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                            
                                            <td style={{textAlign:'center', ...cellStyle}} onClick={(e) => handleToggleFavorite(e, coin.symbol)}>
                                                <button className={`star-btn ${isFav ? 'active' : ''}`}>★</button>
                                            </td>

                                            {currentUser && activeTab === 'FAVORITES' && (
                                                <td style={{textAlign:'center', ...cellStyle}}>
                                                    <button className="bell-btn" onClick={(e) => openNewAlarmModal(e, coin)}>🔔</button>
                                                </td>
                                            )}

                                            <td style={{ 
                                                padding: '8px 0px 8px 5px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '4px',
                                                position:'sticky', 
                                                left:0, 
                                                background: selectedCoin === coin.symbol ? '#22262d' : '#1e1e2e', 
                                                zIndex:1, 
                                                whiteSpace: 'nowrap',
                                                ...cellStyle 
                                            }}> 
                                                {coin.logo && <img src={coin.logo} alt={coin.name} width="22" height="22" style={{ borderRadius: '50%', background:'white', padding:'1px' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                                                <div> 
                                                    <div style={{fontWeight:'700', fontSize:'0.85rem', color:'#eee', lineHeight:'1.1'}}>
                                                        {getLocalizedAssetName(coin)}
                                                    </div> 
                                                    <div style={{ fontSize: '0.65rem', color: '#777' }}>{coin.symbol}</div> 
                                                </div> 
                                            </td>

                                            <FlashCell 
                                                value={coin.price} 
                                                prefix={getCurrencySymbol(coin)} 
                                                align="left" 
                                                width="70px" 
                                                fontSize="0.85rem" 
                                                style={{...cellStyle, paddingLeft:'8px'}} 
                                            />

                                            <FlashCell value={coin.change} suffix="%" align="center" isChange={true} width="55px" fontSize="0.85rem" style={cellStyle} />

                                            <FlashCell value={coin.change1w} suffix="%" align="center" isChange={true} width="55px" fontSize="0.85rem" style={cellStyle} />

                                            <FlashCell value={coin.change1m} suffix="%" align="center" isChange={true} width="55px" fontSize="0.85rem" style={cellStyle} />

                                            <FlashCell value={coin.change3m} suffix="%" align="center" isChange={true} width="55px" fontSize="0.85rem" style={cellStyle} />

                                            <FlashCell value={coin.change1y} suffix="%" align="center" isChange={true} width="55px" fontSize="0.85rem" style={cellStyle} />

                                            <FlashCell value={coin.change5y} suffix="%" align="center" isChange={true} width="55px" fontSize="0.85rem" style={cellStyle} />

                                            <td style={{ textAlign:'center', padding:'0 5px', color:'#999', fontFamily:'Consolas, monospace', fontWeight:'600', fontSize:'0.8rem', width:'85px', ...cellStyle }}>
                                                {formatMarketCap(coin.mcap, getCurrencySymbol(coin))}
                                            </td>

                                            <td></td>
                                        </tr>
                                        )}) : ( <tr><td colSpan="12" style={{padding:'20px', textAlign:'center', color:'#666'}}>Veri yok.</td></tr> )
                                    }
                                </tbody>
                            </table>
                        </div>
                      </>
                  ) : (
                      <>
                        <div style={{ padding:'12px 15px', borderBottom:'1px solid #333', background:'#22222a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <h3 style={{margin:0, fontSize:'1rem', fontWeight:'700', color:'#eee'}}>{markets.find(m => m.id === activeTab)?.label}</h3>
                            <div style={{position:'relative'}}><input type="text" placeholder={t('search')} className="search-box" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{paddingRight: searchTerm ? '30px' : '12px'}} />{searchTerm && <span className="search-clear-btn" onClick={() => setSearchTerm("")}>✕</span>}</div>
                        </div>
                        {/* TABLO WRAPPER */}
                        <div style={{ overflowY:'auto', overflowX: 'auto', flex:1, width:'100%' }}>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                <thead style={{ position:'sticky', top:0, background:'#1e1e2e', zIndex:10 }}>
                                    <tr style={{ color: '#888', fontSize:'0.75rem', borderBottom:'1px solid #555' }}>

                                        <th style={{width:'30px', padding:'10px 0', textAlign:'center', borderRight:'1px solid #444'}}>★</th>
                                        {currentUser && activeTab === 'FAVORITES' && <th style={{width:'30px', padding:'10px 0', textAlign:'center', borderRight:'1px solid #444'}}>🔔</th>}
                                        
                                        {/* ENSTRÜMAN */}
                                        <th style={{ padding: '10px 5px 10px 5px', textAlign:'left', position:'sticky', left:0, background:'#1e1e2e', zIndex:11, width:'1px', whiteSpace:'nowrap', borderRight:'1px solid #444' }}>{t('table.instrument')}</th>
                                        
                                        {/* FİYAT (SOLA YASLI - İSİMLE YAPIŞIK OLMASI İÇİN) */}
                                        <th style={{ padding: '10px 5px 10px 8px', textAlign:'left', width:'80px', borderRight:'1px solid #444' }} onClick={() => handleSort('price')}>{t('table.price')}</th>
                                        
                                        {/* DEĞİŞİMLER (ORTALI) */}
                                        <th style={{ padding: '5px', textAlign:'center', width:'60px', borderRight:'1px solid #444' }} onClick={() => handleSort('change')}>24S</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'60px', borderRight:'1px solid #444' }}>1H</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'60px', borderRight:'1px solid #444' }}>1A</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'60px', borderRight:'1px solid #444' }}>3A</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'60px', borderRight:'1px solid #444' }} onClick={() => handleSort('change1y')}>1Y</th>
                                        <th style={{ padding: '5px', textAlign:'center', width:'60px', borderRight:'1px solid #444' }} onClick={() => handleSort('change5y')}>5Y</th>
                                        
                                        {/* PİYASA DEĞERİ */}
                                        <th style={{ padding: '5px', textAlign:'center', width:'90px', borderRight:'1px solid #444' }}>{t('table.market_cap')}</th>
                                        
                                        {/* SPACER (Kalan boşluğu doldurur) */}
                                        <th style={{ width:'auto' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedCoins.length > 0 ? processedCoins.map((coin) => {
                                        const isFav = favorites.includes(coin.symbol);
                                        const borderStyle = { borderRight: '1px solid #444' };

                                        return (
                                        <tr key={coin.symbol} onClick={() => setSelectedCoin(coin.symbol)} style={{ borderBottom: '1px solid #333', cursor: 'pointer', background: selectedCoin === coin.symbol ? 'rgba(0, 210, 255, 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                            
                                            <td style={{textAlign:'center', ...borderStyle}} onClick={(e) => handleToggleFavorite(e, coin.symbol)}>
                                                <button className={`star-btn ${isFav ? 'active' : ''}`}>★</button>
                                            </td>

                                            {currentUser && activeTab === 'FAVORITES' && (
                                                <td style={{textAlign:'center', ...borderStyle}}>
                                                    <button className="bell-btn" onClick={(e) => openNewAlarmModal(e, coin)}>🔔</button>
                                                </td>
                                            )}

                                            {/* ENSTRÜMAN HÜCRESİ */}
                                            <td style={{ 
                                                padding: '8px 5px 8px 5px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '5px',
                                                position:'sticky', 
                                                left:0, 
                                                background: selectedCoin === coin.symbol ? '#22262d' : '#1e1e2e', 
                                                zIndex:1, 
                                                whiteSpace: 'nowrap',
                                                ...borderStyle
                                            }}> 
                                                {coin.logo && <img src={coin.logo} alt={coin.name} width="22" height="22" style={{ borderRadius: '50%', background:'white', padding:'1px' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                                                <div> 
                                                    <div style={{fontWeight:'700', fontSize:'0.85rem', color:'#eee', lineHeight:'1.1'}}>
                                                        {getLocalizedAssetName(coin)}
                                                    </div> 
                                                    <div style={{ fontSize: '0.65rem', color: '#777' }}>{coin.symbol}</div> 
                                                </div> 
                                            </td>

                                            <FlashCell 
                                                value={coin.price} 
                                                prefix={getCurrencySymbol(coin)} 
                                                align="left"  
                                                width="80px" 
                                                fontSize="0.85rem" 
                                                style={{...borderStyle, paddingLeft:'8px'}} 
                                            />

                                            <FlashCell value={coin.change} suffix="%" align="center" isChange={true} width="60px" fontSize="0.85rem" style={borderStyle} />

                                            <FlashCell value={coin.change1w} suffix="%" align="center" isChange={true} width="60px" fontSize="0.85rem" style={borderStyle} />

                                            <FlashCell value={coin.change1m} suffix="%" align="center" isChange={true} width="60px" fontSize="0.85rem" style={borderStyle} />

                                            <FlashCell value={coin.change3m} suffix="%" align="center" isChange={true} width="60px" fontSize="0.85rem" style={borderStyle} />

                                            <FlashCell value={coin.change1y} suffix="%" align="center" isChange={true} width="60px" fontSize="0.85rem" style={borderStyle} />

                                            <FlashCell value={coin.change5y} suffix="%" align="center" isChange={true} width="60px" fontSize="0.85rem" style={borderStyle} />

                                            <td style={{ textAlign:'center', padding:'0 5px', color:'#999', fontFamily:'Consolas, monospace', fontWeight:'600', fontSize:'0.8rem', width:'90px', ...borderStyle }}>
                                                {formatMarketCap(coin.mcap, getCurrencySymbol(coin))}
                                            </td>

                                            <td></td>
                                        </tr>
                                        )}) : ( <tr><td colSpan="12" style={{padding:'20px', textAlign:'center', color:'#666'}}>Veri yok.</td></tr> )
                                    }
                                </tbody>
                            </table>
                        </div>
                      </>
                  )}
              </div>

              <div style={{ 
                  background: '#1e1e2e', 
                  borderRadius: '12px', 
                  padding: '10px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)', 
                  border: '1px solid #333', 
                  position: 'relative', 
                  minHeight: '400px',
                  ...(isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 } : {})
              }}>
                  
                  {activeTab === 'PORTFOLIO' ? (
                        /* PORTFÖY DAİRE GRAFİĞİ */
                        <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
                            <h3 style={{color:'#eee', marginBottom:'15px'}}>Varlık Dağılımı</h3>
                            <div style={{flex: 1, width: '100%', minHeight: '350px'}}> 
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

// TRADE MODAL
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
    const { t } = useTranslation(); 
    const [activeSection, setActiveSection] = useState(0); 

    const [newUsername, setNewUsername] = useState(user.username);
    const [newGender, setNewGender] = useState(user.gender || 'Erkek');
    const initialBirthDate = user.birthDate ? user.birthDate.split('T')[0] : '';
    const [newBirthDate, setNewBirthDate] = useState(initialBirthDate); 
     
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

    const hasChanges = () => {
        if (activeSection === 1) { 
            return (newUsername !== user.username || newGender !== (user.gender || 'Erkek') || newBirthDate !== initialBirthDate || newPass !== '');
        }
        if (activeSection === 2) { 
            return (newEmail !== (user.email || '') || newPhone !== (user.phone || ''));
        }
        return false;
    };

    const handleInitiateUpdate = async (e) => {
        e.preventDefault();
        if (!hasChanges()) return;

        if(newBirthDate) {
            const birth = new Date(newBirthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            if (age < 18) { toast.warn("Yaşınız 18'den küçük olamaz."); return; }
        }
        if (newPhone && !/^5\d{9}$/.test(newPhone)) { toast.warn("Telefon: 5 ile başlamalı ve 10 hane olmalı."); return; }

        setLoading(true);
        try {
            await AuthService.sendVerificationCode(user.username);
            setTempData({ newUsername, newGender, newBirthDate, newPass, newEmail, newPhone });
            toast.info(`📧 Doğrulama kodu ${user.email} adresine gönderildi.`);
            setShowVerifyInput(true); 
        } catch (err) { toast.error(err.message); } 
        finally { setLoading(false); }
    };

    const handleFinalVerify = async () => {
        if(!verificationCode || verificationCode.length < 6) { toast.warn("Lütfen 6 haneli kodu giriniz."); return; }
        setLoading(true);
        try {
            const payload = { username: user.username, code: verificationCode, ...tempData, newPassword: newPass || undefined };
            const res = await AuthService.verifyAndUpdateProfile(payload);
            toast.success(res.message);
            if (res.user) onUpdateSuccess(res.user);
            setShowVerifyInput(false); setVerificationCode('');
        } catch (err) { toast.error(err.message); } 
        finally { setLoading(false); }
    };

    const handleDelete = async () => { 
        if(!deletePass) { toast.warn("Şifre girin."); return; }
        if(window.confirm(t('profile.delete_warning'))) {
            try { await AuthService.deleteAccount(user.username, deletePass); toast.info("Hesap silindi."); window.location.reload(); } catch(e) { toast.error(e.message); }
        }
    };

    const handleSendSupport = async (e) => {
        e.preventDefault(); 

        if(!supportMsg.trim()) { 
            toast.warn(t('support.msg_placeholder')); 
            return; 
        } 
         
        setLoading(true);
        try { 
            await AuthService.sendSupport(user.username, supportSubject, supportMsg, user.email); 
            toast.success(t('support.success')); 
            setSupportMsg(''); 
        } catch(e) { 
            console.error(e);
            toast.error(t('notifications.process_failed')); 
        } finally { 
            setLoading(false); 
        }
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
                    <h3 style={{color:'#00d2ff', margin:0, fontSize:'1.1rem'}}>{t('profile.title')}</h3>
                    <button onClick={onClose} style={{background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'1.2rem'}}>✕</button>
                </div>

                {/* 1. KİŞİSEL BİLGİLERİM */}
                <SectionBtn id={1} icon="👤" title={t('profile.personal_info')} color="#00d2ff" />
                {activeSection === 1 && (
                    <div style={{padding:'20px', background:'#1a1a24'}}>
                        <form onSubmit={handleInitiateUpdate}>
                            <label style={labelStyle}>{t('profile.username')}</label>
                            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={inputStyle} placeholder={t('profile.username_placeholder')} />
                            <div style={{display:'flex', gap:'10px'}}>
                                <div style={{flex:1}}>
                                    <label style={labelStyle}>{t('profile.gender')}</label>
                                    <select value={newGender} onChange={e=>setNewGender(e.target.value)} style={inputStyle}>
                                        <option value="Erkek">{t('auth.male')}</option>
                                        <option value="Kadın">{t('auth.female')}</option>
                                    </select>
                                </div>
                                <div style={{flex:1}}>
                                    <label style={labelStyle}>{t('profile.birth_date')}</label>
                                    <input type="date" value={newBirthDate} onChange={e=>setNewBirthDate(e.target.value)} style={{...inputStyle, colorScheme:'dark'}} />
                                </div>
                            </div>
                            <label style={labelStyle}>{t('profile.new_password')}</label>
                            <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder={t('profile.new_password_placeholder')} style={inputStyle} />
                            
                            <button type="submit" disabled={loading || !hasChanges()} style={{...btnStyle, opacity: (!hasChanges() || loading) ? 0.5 : 1, cursor: (!hasChanges() || loading) ? 'not-allowed' : 'pointer'}}>
                                {t('profile.send_verify_code')}
                            </button>
                        </form>
                    </div>
                )}

                {/* 2. İLETİŞİM BİLGİLERİM */}
                <SectionBtn id={2} icon="📞" title={t('profile.contact_info')} color="#f1c40f" />
                {activeSection === 2 && (
                    <div style={{padding:'20px', background:'#1f1f1a'}}>
                        <form onSubmit={handleInitiateUpdate}>
                            <label style={labelStyle}>{t('profile.email')}</label>
                            <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} style={inputStyle} />
                            <label style={labelStyle}>{t('profile.phone')}</label>
                            <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} maxLength={10} placeholder="532..." style={inputStyle} />
                            
                            <button type="submit" disabled={loading || !hasChanges()} style={{...btnStyle, opacity: (!hasChanges() || loading) ? 0.5 : 1, cursor: (!hasChanges() || loading) ? 'not-allowed' : 'pointer'}}>
                                {t('profile.send_verify_code')}
                            </button>
                        </form>
                    </div>
                )}

                {/* 3. HESABIMI SİL */}
                <SectionBtn id={3} icon="🗑️" title={t('profile.delete_account')} color="#ff4d4d" />
                {activeSection === 3 && (
                    <div style={{padding:'20px', background:'#2a1a1a'}}>
                        <p style={{color:'#ccc', fontSize:'0.9rem', marginTop:0}}>{t('profile.delete_warning')}</p>
                        <label style={{...labelStyle, color:'#ff4d4d'}}>{t('profile.current_password')}</label>
                        <input type="password" value={deletePass} onChange={e=>setDeletePass(e.target.value)} style={{...inputStyle, borderColor:'#ff4d4d', background:'#1a0a0a'}} />
                        <button onClick={handleDelete} style={{...btnStyle, background:'transparent', border:'1px solid #ff4d4d', color:'#ff4d4d'}}>⚠️ {t('profile.delete_account')}</button>
                    </div>
                )}

                {/* 4. YARDIM (DÜZELTİLDİ) */}
                <SectionBtn id={4} icon="💬" title={t('profile.help_support')} color="#00ff88" />
                {activeSection === 4 && (
                    <div style={{padding:'20px', background:'#1a2420'}}>
                        <form onSubmit={handleSendSupport}>
                            <label style={labelStyle}>{t('profile.subject')}</label>
                            <select value={supportSubject} onChange={e=>setSupportSubject(e.target.value)} style={inputStyle}>
                                <option value="Öneri">{t('support.type_suggestion')}</option>
                                <option value="Şikayet">{t('support.type_complaint')}</option>
                                <option value="Teknik">{t('support.type_technical')}</option>
                            </select>
                            <label style={labelStyle}>{t('profile.message')}</label>
                            <textarea rows="3" value={supportMsg} onChange={e=>setSupportMsg(e.target.value)} style={{...inputStyle, resize:'none'}} placeholder={t('support.msg_placeholder')}></textarea>
                            <button type="submit" disabled={loading} style={{...btnStyle, background:'#00ff88', color:'#000'}}>{t('profile.send')}</button>
                        </form>
                    </div>
                )}

                {/* DOĞRULAMA KODU */}
                {showVerifyInput && (
                    <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'#1e1e2e', zIndex:10002, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'20px', boxSizing:'border-box'}}>
                        <h3 style={{color:'#00d2ff', marginTop:0}}>🔐 {t('modal.security_check')}</h3>
                        <p style={{color:'#ccc', textAlign:'center', fontSize:'0.9rem'}}><b>{user.email}</b> {t('modal.verify_text')}</p>
                        <input type="text" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} style={{...inputStyle, textAlign:'center', fontSize:'1.5rem', letterSpacing:'5px', width:'200px', borderColor:'#00d2ff'}} />
                        <button onClick={handleFinalVerify} disabled={loading} style={btnStyle}>{loading ? '...' : t('modal.confirm')}</button>
                        <button onClick={() => setShowVerifyInput(false)} style={{background:'none', border:'none', color:'#666', marginTop:'15px', cursor:'pointer'}}>{t('modal.cancel')}</button>
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
                    <button onClick={onClose} style={{background: 'linear-gradient(90deg, #ff4d4d, #ff6b6b)', border: 'none', color: 'white', padding: '12px 30px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'}}>Kapat</button>
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
            if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) { setErrorMessage('Kart numarası 16 haneli olmalıdır'); return; }
            if (!cardHolder.trim()) { setErrorMessage('Kart sahibi adı giriniz'); return; }
            if (!expiryDate || expiryDate.length !== 5) { setErrorMessage('Geçerli bir tarih giriniz (MM/YY)'); return; }
            if (!cvv || cvv.length !== 3) { setErrorMessage('CVV 3 haneli olmalıdır'); return; }
            setStep(1);
        } else if (step === 1) {
            if (!amount || parseFloat(amount) <= 0) { setErrorMessage('Geçerli bir miktar giriniz'); return; }
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
        setCardNumber(''); setCardHolder(''); setExpiryDate(''); setCvv(''); setAmount(''); setStep(0); setSuccessMessage('');
    };

    return (
  <div style={modalStyle}>
    <div style={overlayStyle} onClick={onClose}></div>

    <div
      style={{
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        borderRadius: '20px',
        border: '2px solid #00d2ff',
        width: '420px',
        zIndex: 10001,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0, 210, 255, 0.3)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 50%, rgba(0, 210, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      />

      {/* HEADER */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(0, 210, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <h2 style={{ color: '#00d2ff', margin: 0 }}>💳 Sanal Cüzdan</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '30px', position: 'relative', zIndex: 1 }}>

        {/* ================= STEP 0 ================= */}
        {step === 0 && (
          <form onSubmit={handleSubmit}>
            <h3 style={{ color: '#eee', textAlign: 'center' }}>
              Kart Bilgilerinizi Giriniz
            </h3>

            {/* KART GÖRÜNÜM */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '25px',
                border: '2px solid #00d2ff',
                color: 'white',
                fontFamily: 'monospace'
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                {cardNumber || '•••• •••• •••• ••••'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{cardHolder || 'ADIM SOYADIM'}</span>
                <span>{expiryDate || 'MM/YY'}</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength="19"
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="ADIM SOYADIM"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              style={inputStyle}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={handleExpiryChange}
                maxLength="5"
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="CVV"
                value={cvv}
                onChange={handleCvvChange}
                maxLength="3"
                style={inputStyle}
              />
            </div>

            <button type="submit" style={btnStyle}>
              Devam Et →
            </button>
          </form>
        )}

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <form onSubmit={handleSubmit}>
            <h3 style={{ color: '#eee', textAlign: 'center' }}>Para Yükle</h3>

            <div
              style={{
                background: 'rgba(0, 210, 255, 0.1)',
                border: '2px solid #00d2ff',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'center'
              }}
            >
              <div style={{ color: '#888' }}>Mevcut Bakiye</div>
              <div style={{ color: '#00ff88', fontSize: '1.8rem' }}>
                {walletBalance.toFixed(2)} ₺
              </div>
            </div>

            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              min="1"
              style={inputStyle}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '20px'
              }}
            >
              {[50, 100, 250].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  style={btnStyle}
                >
                  {val} ₺
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button type="button" onClick={() => setStep(0)} style={btnStyle}>
                ← Geri
              </button>
              <button type="submit" disabled={isLoading} style={btnStyle}>
                {isLoading ? '⏳ İşleniyor...' : '✓ Yükle'}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem' }}>✅</div>
            <h3 style={{ color: '#00ff88' }}>Başarılı!</h3>
            <p>{successMessage}</p>

            <div
              style={{
                background: 'rgba(0, 255, 136, 0.1)',
                border: '1px solid #00ff88',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}
            >
              <div>Yeni Bakiye</div>
              <div style={{ fontSize: '1.6rem' }}>
                {walletBalance.toFixed(2)} ₺
              </div>
            </div>

            <button onClick={resetForm} style={btnStyle}>
              Yeniden Yükle
            </button>
            <button onClick={onClose} style={btnStyle}>
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

};

                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                `}</style>
const GuestSupportModal = ({ onClose, type }) => { 
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [contact, setContact] = useState(''); 

    const [subject, setSubject] = useState(
        type === 'LOGIN' ? t('support.option_login') : 
        (type === 'REGISTER' ? t('support.option_register') : t('support.option_other'))
    );
    
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!contact.trim() || !msg.trim()) { 
            toast.warn(t('support.msg_placeholder')); 
            return; 
        }
        
        setLoading(true);
        try {
            await AuthService.sendSupport(name || 'Ziyaretçi', subject, msg, contact);
            toast.success(t('support.success')); 
            onClose();
        } catch (err) { 
            console.error(err);
            toast.error(t('notifications.process_failed')); 
        } 
        finally { setLoading(false); }
    };

    return (
        <div style={modalStyle}>
            <div style={overlayStyle} onClick={onClose}></div>
            <div style={{ background: '#1e1e2e', padding: '30px', borderRadius: '16px', border: '1px solid #333', width: '320px', zIndex: 10001, position:'relative' }}>
                <h3 style={{color:'#00ff88', marginTop:0, textAlign:'center'}}>
                    {type === 'LOGIN' ? t('support.title_login') : (type === 'REGISTER' ? t('support.title_register') : t('support.title_general'))}
                </h3>
                
                <form onSubmit={handleSend}>
                    <input type="text" placeholder={t('support.name_placeholder')} value={name} onChange={e=>setName(e.target.value)} style={inputStyle} />
                    <input type="text" placeholder={t('support.contact_placeholder')} value={contact} onChange={e=>setContact(e.target.value)} style={{...inputStyle, borderColor:'#00d2ff'}} required />

                    <select value={subject} onChange={e=>setSubject(e.target.value)} style={inputStyle}>
                        <option>{t('support.option_register')}</option>
                        <option>{t('support.option_login')}</option>
                        <option>{t('support.option_forgot')}</option>
                        <option>{t('support.option_other')}</option>
                    </select>

                    <textarea rows="4" placeholder={t('support.msg_placeholder')} value={msg} onChange={e=>setMsg(e.target.value)} style={{...inputStyle, resize:'none'}} required></textarea>

                    <button type="submit" disabled={loading} style={btnStyle}>
                        {loading ? '...' : t('support.send')}
                    </button>
                </form>
                <button onClick={onClose} style={{width:'100%', marginTop:'10px', background:'transparent', color:'#666', border:'none', cursor:'pointer'}}>{t('support.close')}</button>
            </div>
        </div>
    );
};

const inputStyle = { width:'100%', padding:'10px', marginBottom:'10px', background:'#0f0f13', border:'1px solid #333', color:'white', borderRadius:'6px', boxSizing:'border-box', outline:'none' };
const btnStyle = { width:'100%', padding:'10px', background:'linear-gradient(90deg, #00d2ff, #007aff)', color:'white', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer', marginTop:'5px' };

export default App;