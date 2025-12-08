import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TradingViewWidget from './TradingViewWidget';

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
  const [coins, setCoins] = useState([]);
  const [activeTab, setActiveTab] = useState('CRYPTO');
  const [currentTime, setCurrentTime] = useState(new Date());

  const markets = [
      { id: 'CRYPTO', label: 'Kripto Piyasası' },
      { id: 'BIST', label: 'BIST 100' },
      { id: 'FOREX', label: 'Döviz' },
      { id: 'COMMODITY', label: 'Emtia' },
      { id: 'US_STOCK', label: 'ABD Borsası' },
      { id: 'FAVORITES', label: 'Favorilerim' }
  ];

  const [searchTerm, setSearchTerm] = useState(""); 
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' }); 
  const [selectedCoin, setSelectedCoin] = useState(null); 
  const [showAdmin, setShowAdmin] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
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
    socket.on('notification', (notif) => toast.info(<div><strong style={{color:'#00d2ff'}}>{notif.title}</strong><div>{notif.message}</div></div>, { position: "top-right", theme: "dark", autoClose: 5000 }));

    return () => { socket.off('tickerUpdate'); socket.off('marketUpdate'); socket.off('notification'); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTradingViewSymbol = (coinInput) => {
    if (!coinInput) return 'BINANCE:BTCUSDT';
    const symbol = (typeof coinInput === 'object') ? coinInput.symbol : coinInput;

    const specialMap = { 'VODL.IS': 'LSE:VOD' };
    if (specialMap[symbol]) return specialMap[symbol];

    const bistMap = {
        'XU100.IS': 'XU100', 'THYAO.IS': 'THYAO', 'GARAN.IS': 'GARAN', 'AKBNK.IS': 'AKBNK',
        'ISCTR.IS': 'ISCTR', 'YKBNK.IS': 'YKBNK', 'TUPRS.IS': 'TUPRS', 'ASELS.IS': 'ASELS',
        'KCHOL.IS': 'KCHOL', 'SAHOL.IS': 'SAHOL', 'EREGL.IS': 'EREGL', 'BIMAS.IS': 'BIMAS',
        'SASA.IS':  'SASA',  'FROTO.IS': 'FROTO', 'PGSUS.IS': 'PGSUS', 'TCELL.IS': 'TCELL',
        'TTKOM.IS': 'TTKOM'
    };
    if (bistMap[symbol]) return bistMap[symbol];

    const symbolMap = { 
        'TRY=X': 'FX_IDC:USDTRY', 
        'EURTRY=X': 'FX_IDC:EURTRY', 
        'GBPTRY=X': 'FX_IDC:GBPTRY', 
        'EURUSD=X': 'FX_IDC:EURUSD', 
        'JPYTRY=X': 'FX_IDC:JPYTRY', 
        'CHFTRY=X': 'FX_IDC:CHFTRY', 
        'CADTRY=X': 'FX_IDC:CADTRY', 
        'AUDTRY=X': 'FX_IDC:AUDTRY', 
        'DX-Y.NYB': 'CAPITALCOM:DXY', 
        
        'CNYTRY=X': 'FX_IDC:USDTRY/FX_IDC:USDCNY', 
        'RUBTRY=X': 'FX_IDC:USDTRY/FX_IDC:USDRUB',

        'GC=F': 'TVC:GOLD', 'SI=F': 'TVC:SILVER', 'CL=F': 'TVC:USOIL', 'BZ=F': 'TVC:UKOIL', 
        'HG=F': 'OANDA:XCUUSD', 'NG=F': 'CAPITALCOM:NATURALGAS',
        
        'GRAM-ALTIN':   'FX_IDC:XAUTRYG',       
        'CEYREK-ALTIN': 'FX_IDC:XAUTRYG*1.635',  
        'YARIM-ALTIN':  'FX_IDC:XAUTRYG*3.27',   
        'TAM-ALTIN':    'FX_IDC:XAUTRYG*6.54',   
        'GRAM-GUMUS':   'FX_IDC:XAGTRYG'       
    };

    if (symbolMap[symbol]) return symbolMap[symbol];
    if (symbol.endsWith('USDT')) return `BINANCE:${symbol}`;
    
    if (symbol.endsWith('.IS')) {
        return symbol.replace('.IS', '').trim();
    }

    return symbol.replace('=X', '').replace('=F', '').replace('.NYB', '');
  };

  const getCurrencySymbol = (coin) => {
      if (coin.type === 'BIST') return '₺';
      
      if (['GRAM-ALTIN', 'CEYREK-ALTIN', 'YARIM-ALTIN', 'TAM-ALTIN', 'GRAM-GUMUS'].includes(coin.symbol)) {
          return '₺';
      }

      if (coin.type === 'FOREX') return ''; 
      return '$'; 
  };

  let processedCoins = coins.filter(coin => {
    if (activeTab === 'FAVORITES') {
          return false;
      }
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

  useEffect(() => {
      if (processedCoins.length > 0) {
          const isSelectedInList = processedCoins.find(c => c.symbol === selectedCoin);
          if (!isSelectedInList) setSelectedCoin(processedCoins[0].symbol);
      }
  }, [activeTab, coins, searchTerm]);

  const handleSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') direction = 'ascending';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey) => {
      const isActive = sortConfig.key === columnKey;
      const isDesc = isActive && sortConfig.direction === 'descending'; 
      const isAsc = isActive && sortConfig.direction === 'ascending'; 
      return (
          <span style={{ display:'inline-flex', flexDirection:'column', lineHeight:'0.4', marginLeft:'8px', verticalAlign:'middle', fontSize:'0.6rem' }}>
              <span style={{ color: isDesc ? '#00ff88' : '#555', marginBottom:'2px', transition:'color 0.3s' }}>▲</span>
              <span style={{ color: isAsc ? '#ff4d4d' : '#555', transition:'color 0.3s' }}>▼</span>
          </span>
      );
  };

  const handleSendNotification = async () => {
    if(!notifTitle || !notifMsg) return;
    try { await axios.post(`${API_URL}/notification`, { title: notifTitle, message: notifMsg }); setNotifTitle(""); setNotifMsg(""); setShowAdmin(false); toast.success("Gonderildi!", { theme: "dark" }); } catch (e) { alert("Hata"); }
  };

  return (
    <div style={{ backgroundColor: '#13131a', minHeight: '100vh', width: '100vw', color: 'white', fontFamily: 'Segoe UI, sans-serif', boxSizing: 'border-box', overflowX:'hidden', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer />
      <style>{`
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1e1e2e; } ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .flash-cell-pro { font-family: 'Consolas', monospace; font-weight: 600; padding: 6px 12px; border-radius: 6px; transition: background-color 0.5s ease-out; white-space: nowrap; }
        @keyframes flashGreenPro { 0% { background-color: rgba(0, 255, 136, 0.25); color: #fff; } 100% { background-color: transparent; } }
        @keyframes flashRedPro { 0% { background-color: rgba(255, 77, 77, 0.25); color: #fff; } 100% { background-color: transparent; } }
        .flash-green-pro { animation: flashGreenPro 0.5s ease-out; } .flash-red-pro { animation: flashRedPro 0.5s ease-out; }
        .nav-btn { background: transparent; border: 1px solid #3a3a45; color: #888; padding: 8px 16px; border-radius: 16px; cursor: pointer; transition: all 0.2s; font-weight: 600; font-size: 0.9rem; white-space: nowrap; }
        .nav-btn.active { background: #00d2ff; color: #000; border-color: #00d2ff; box-shadow: 0 0 10px rgba(0, 210, 255, 0.3); }
        .search-box { background: #181820; border: 1px solid #333; color: white; padding: 6px 12px; border-radius: 16px; outline: none; width: 180px; transition: all 0.3s; font-size: 0.9rem; }
        .search-box:focus { border-color: #00d2ff; width: 220px; }
        .search-clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #666; cursor: pointer; }
        th { cursor: pointer; transition: color 0.2s; font-size: 0.85rem; font-weight: 600; color: #888; } th:hover { color: #00d2ff; }
        @keyframes bg-pan { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-wrap { width: 100%; overflow: hidden; background: linear-gradient(270deg, rgba(30, 30, 50, 0.95), rgba(40, 40, 70, 0.95)); background-size: 400% 400%; animation: bg-pan 15s ease infinite; border-bottom: 1px solid rgba(0, 210, 255, 0.3); height: 45px; display: flex; align-items: center; }
        .ticker-track { display: flex; animation: ticker-scroll 120s linear infinite; gap: 15px; padding-left: 20px; }
        .ticker-card { display: flex; align-items: center; background: rgba(37, 37, 48, 0.6); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); white-space: nowrap; font-size: 0.85rem; }
        .ticker-symbol { font-weight: 700; color: #fff; margin-right: 8px; }
        .ticker-price { font-family: 'Consolas', monospace; font-weight: 600; color: #eee; margin-right: 10px; }
        .badge { padding: 2px 5px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
        .badge.up { background: rgba(0, 255, 136, 0.1); color: #00ff88; border: 1px solid rgba(0, 255, 136, 0.3); }
        .badge.down { background: rgba(255, 77, 77, 0.1); color: #ff4d4d; border: 1px solid rgba(255, 77, 77, 0.3); }
        .badge.neutral { background: rgba(136, 136, 136, 0.1); color: #aaa; border: 1px solid #555; }
        .digital-clock-time { font-family: 'Consolas', monospace; font-size: 1.3rem; font-weight: 700; color: white; text-align: right; }
        .digital-clock-date { font-size: 0.75rem; color: #888; font-weight: 500; text-align: right; }
        .fullscreen-btn { background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; margin-left: 15px; font-size: 1.1rem; }
      `}</style>

      <div className="ticker-wrap">
          <div className="ticker-track">
              {[...coins, ...coins].map((coin, index) => {
                  const change = parseFloat(coin.change);
                  let badgeClass = 'neutral';
                  let arrow = '▬'; 
                  if (change > 0) { badgeClass = 'up'; arrow = '▲'; }
                  else if (change < 0) { badgeClass = 'down'; arrow = '▼'; }

                  return (
                      <div key={`${coin.symbol}-${index}`} className="ticker-card">
                          <span className="ticker-symbol">{coin.symbol}</span>
                          <span className="ticker-price">{getCurrencySymbol(coin)}{coin.price?.toFixed(2)}</span>
                          <span className={`badge ${badgeClass}`}>{arrow} %{Math.abs(change || 0).toFixed(2)}</span>
                      </div>
                  );
              })}
          </div>
      </div>

      <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding:'0 5px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px'}}> <h1 style={{ color: '#00d2ff', margin: 0, fontSize:'1.8rem', fontWeight:'800', letterSpacing:'-0.5px' }}>CryptoLive</h1> </div>
              <button onClick={() => setShowAdmin(!showAdmin)} style={{ background: 'linear-gradient(45deg, #00d2ff, #007aff)', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: '700', fontSize:'0.9rem', cursor:'pointer', color:'white' }}>Admin</button>
          </div>

          <div style={{ width: '100%', display: 'flex', gap: '10px', padding: '0 5px', marginBottom: '10px', overflowX: 'auto', paddingBottom:'5px' }}>
              {markets.map(market => ( <button key={market.id} className={`nav-btn ${activeTab === market.id ? 'active' : ''}`} onClick={() => { setActiveTab(market.id); setSelectedCoin(null); }}>{market.label}</button> ))}
          </div>

          {showAdmin && (
              <div style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center' }}>
                  <div style={{ background:'#2b2b3b', padding:'30px', borderRadius:'10px', border:'1px solid #444', width:'400px' }}>
                      <h2 style={{marginTop:0, color:'white'}}>Bildirim Gönder</h2>
                      <input type="text" placeholder="Başlık" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'6px', background:'#1e1e2e', color:'white', border:'1px solid #444'}} />
                      <textarea placeholder="Mesaj" value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} style={{width:'100%', padding:'10px', height:'80px', marginBottom:'15px', borderRadius:'6px', background:'#1e1e2e', color:'white', border:'1px solid #444'}} />
                      <div style={{display:'flex', gap:'10px'}}> <button onClick={() => setShowAdmin(false)} style={{flex:1, background:'#444', border:'none', padding:'10px', borderRadius:'6px', color:'white', cursor:'pointer'}}>İptal</button> <button onClick={handleSendNotification} style={{flex:1, background:'#00d2ff', border:'none', padding:'10px', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>GÖNDER</button> </div>
                  </div>
              </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '15px', width: '100%', height: 'calc(100vh - 180px)' }}>
              <div style={{ background: '#1e1e2e', borderRadius: '12px', overflow:'hidden', display:'flex', flexDirection:'column', border:'1px solid #333' }}>
                  <div style={{ padding:'12px 15px', borderBottom:'1px solid #333', background:'#22222a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 style={{margin:0, fontSize:'1rem', fontWeight:'700', color:'#eee'}}>{markets.find(m => m.id === activeTab)?.label}</h3>
                    <div style={{position:'relative'}}>
                        <input type="text" placeholder="Ara..." className="search-box" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{paddingRight: searchTerm ? '30px' : '12px'}} />
                        {searchTerm && <span className="search-clear-btn" onClick={() => setSearchTerm("")}>✕</span>}
                    </div>
                </div>
                  <div style={{ overflowY:'auto', overflowX: 'auto', flex:1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                          <thead style={{ position:'sticky', top:0, background:'#1e1e2e', zIndex:10 }}>
                              <tr style={{ color: '#888', textAlign: 'left', fontSize:'0.8rem', borderBottom:'1px solid #333' }}>
                                  <th style={{ padding: '10px 15px', position:'sticky', left:0, background:'#1e1e2e', zIndex:11 }}>Enstrüman</th>
                                  <th style={{ padding: '10px', textAlign:'right', width:'110px' }} onClick={() => handleSort('price')}>Fiyat {renderSortIcon('price')}</th>
                                  <th style={{ padding: '10px', textAlign:'right', width:'90px' }} onClick={() => handleSort('change')}>24s {renderSortIcon('change')}</th>
                                  <th style={{ padding: '10px', textAlign:'right', width:'100px' }}>Piyasa Değ.</th>
                                  <th style={{ padding: '10px', textAlign:'right' }}>6 Ay</th>
                                  <th style={{ padding: '10px', textAlign:'right' }}>1 Yıl</th>
                                  <th style={{ padding: '10px', textAlign:'right' }}>5 Yıl</th>
                              </tr>
                          </thead>
                          <tbody>
                              {processedCoins.map((coin) => (
                                  <tr key={coin.symbol} onClick={() => setSelectedCoin(coin.symbol)} style={{ borderBottom: '1px solid #2a2a35', cursor: 'pointer', background: selectedCoin === coin.symbol ? 'rgba(0, 210, 255, 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                      <td style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px', position:'sticky', left:0, background: selectedCoin === coin.symbol ? '#22262d' : '#1e1e2e', zIndex:1, borderRight:'1px solid #2a2a35' }}> 
                                          {coin.logo ? <img src={coin.logo} alt={coin.name} width="28" height="28" style={{ borderRadius: '50%', background:'white', padding:'2px' }} onError={(e) => { e.target.style.display = 'none'; }} /> : null}
                                          <div> <div style={{ fontWeight: '700', fontSize:'0.9rem', color:'#eee' }}>{coin.name}</div> <div style={{ fontSize: '0.7rem', color: '#777' }}>{coin.symbol}</div> </div> 
                                      </td>
                                      
                                      <FlashCell value={coin.price} prefix={getCurrencySymbol(coin)} align="right" width="110px" />
                                      {/* Değişim 0 ise GRİ 0.00% yazar */}
                                      <FlashCell value={coin.change} suffix="%" align="right" isChange={true} width="90px" />
                                      
                                      <td style={{ textAlign:'right', padding:'0 10px', color:'#999', fontFamily:'Consolas, monospace', fontWeight:'600', fontSize:'0.85rem' }}>{formatMarketCap(coin.mcap, getCurrencySymbol(coin))}</td>
                                      <FlashCell value={coin.change6m} suffix="%" align="right" isChange={true} width="80px" fontSize="0.85rem" />
                                      <FlashCell value={coin.change1y} suffix="%" align="right" isChange={true} width="80px" fontSize="0.85rem" />
                                      <FlashCell value={coin.change5y} suffix="%" align="right" isChange={true} width="80px" fontSize="0.85rem" />
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      {processedCoins.length === 0 && (
                          <div style={{padding:'20px', textAlign:'center', color:'#666', fontSize:'0.9rem'}}>
                              {activeTab === 'FAVORITES' ? 'Henüz favori eklenmedi.' : 'Veri bekleniyor...'}
                          </div>
                      )}
                  </div>
              </div>

              <div style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, background: '#1e1e2e', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } : { background: '#1e1e2e', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: '1px solid #333', position: 'relative' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding: '0 5px', flexShrink: 0 }}>
                      <div> 
                        <h2 style={{ margin: 0, fontSize:'1.3rem', fontWeight:'700', color:'#eee' }}>{coins.find(c => c.symbol === selectedCoin)?.name || selectedCoin || "Seçim Yapın"}</h2> 
                        <span style={{ color:'#777', fontSize: '0.8rem' }}>TradingView Analiz</span> 
                      </div>
                      <div style={{ display:'flex', alignItems:'center'}}>
                          <div className="digital-clock-container">
                              <div className="digital-clock-time">{currentTime.toLocaleTimeString()}</div>
                              <div className="digital-clock-date">{currentTime.toLocaleDateString()}</div>
                          </div>
                          <button className="fullscreen-btn" onClick={() => setIsFullScreen(!isFullScreen)}>{isFullScreen ? '✕' : '⤢'}</button>
                      </div>
                  </div>
                  
                  <div style={{ flex: 1, width: '100%', minHeight: '0', overflow:'hidden', borderRadius:'8px', position:'relative' }}> 
                    {selectedCoin ? (
                        <div key={getTradingViewSymbol(selectedCoin)} style={{ width: '100%', height: '100%' }}>
                            <TradingViewWidget 
                                symbol={getTradingViewSymbol(selectedCoin)} 
                                theme="dark" 
                                autosize 
                                interval="D"
                                timezone="Etc/UTC"
                                style="1"
                                locale="tr"
                                toolbar_bg="#f1f3f6"
                                enable_publishing={false}
                                hide_side_toolbar={false}
                                allow_symbol_change={true}
                            />
                        </div>
                    ) : (
                        <div style={{ display:'flex', height:'100%', justifyContent:'center', alignItems:'center', color:'#444', border:'2px dashed #333', borderRadius:'8px', fontSize:'0.9rem' }}>Grafik yükleniyor...</div>
                    )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}

export default App;
