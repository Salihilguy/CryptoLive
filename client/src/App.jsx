import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const socket = io.connect("http://localhost:3001");
const API_URL = "http://localhost:3001/api";

function App() {
  const [coins, setCoins] = useState([]);
  const [activeTab, setActiveTab] = useState('CRYPTO');
  
  const markets = [
      { id: 'CRYPTO', label: 'Kripto Piyasası' },
<<<<<<< Updated upstream
      { id: 'FAVORITES', label: 'Favorilerim' },
      { id: 'FOREX', label: 'Döviz / Forex' },
=======
>>>>>>> Stashed changes
      { id: 'BIST', label: 'BIST 100' },
      { id: 'COMMODITY', label: 'Emtia' },
      { id: 'US_STOCK', label: 'ABD Borsası' }
  ];

  const [globalMarkets, setGlobalMarkets] = useState([
      { symbol: 'USD/TRY', price: 34.65, change: 0.12 },
      { symbol: 'EUR/TRY', price: 36.42, change: -0.05 },
      { symbol: 'GAU/TRY (Altın)', price: 2950.50, change: 0.45 },
      { symbol: 'BIST 100', price: 9650.25, change: 1.20 },
      { symbol: 'NASDAQ', price: 19200.10, change: 0.85 },
      { symbol: 'BRENT PETROL', price: 72.40, change: -1.10 },
      { symbol: 'GBP/TRY', price: 43.80, change: 0.08 }
  ]);

  const [searchTerm, setSearchTerm] = useState(""); 
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' }); 
  const [chartRange, setChartRange] = useState(24); 

  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [chartData, setChartData] = useState([]);
  
  const [showAdmin, setShowAdmin] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const prevCoinsRef = useRef({});

  const defaultSortOrder = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'TRXUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT', 'LINKUSDT', 'SHIBUSDT', 'ATOMUSDT'];

  useEffect(() => {
      const interval = setInterval(() => {
          setGlobalMarkets(prev => prev.map(item => {
              const move = (Math.random() - 0.5) * 0.02;
              return {
                  ...item,
                  price: item.price * (1 + move / 100),
                  change: item.change + (move * 10)
              };
          }));
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("tickerUpdate", (data) => {
      setCoins((prevCoins) => {
        const updatedCoins = [...prevCoins];
        data.forEach(newCoin => {
            const prevPrice = prevCoinsRef.current[newCoin.symbol];
            let priceClass = '';
            if (prevPrice) {
                if (newCoin.price > prevPrice) priceClass = 'flash-green';
                else if (newCoin.price < prevPrice) priceClass = 'flash-red';
            }
            prevCoinsRef.current[newCoin.symbol] = newCoin.price;
            const index = updatedCoins.findIndex(c => c.symbol === newCoin.symbol);
            if (index !== -1) updatedCoins[index] = { ...newCoin, priceClass };
            else updatedCoins.push({ ...newCoin, priceClass });
        });
        return updatedCoins;
      });
    });
    socket.on('notification', (notif) => toast.info(<div><strong>{notif.title}</strong><div>{notif.message}</div></div>, { theme: "dark", autoClose: 5000 }));
    return () => { socket.off('tickerUpdate'); socket.off('notification'); };
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
        try {
            if (activeTab === 'CRYPTO') {
                const res = await axios.get(`${API_URL}/history`, { params: { symbol: selectedCoin } });
                setChartData(res.data);
            } else { setChartData([]); }
        } catch (err) { console.error(err); }
    };
    fetchHistory();
  }, [selectedCoin, activeTab]);

  const getProcessedCoins = () => {
    let processed = coins.filter(coin => coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sortConfig.key) {
        processed.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'descending' ? 1 : -1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'descending' ? -1 : 1;
            return 0;
        });
    } else {
        processed.sort((a, b) => defaultSortOrder.indexOf(a.symbol) - defaultSortOrder.indexOf(b.symbol));
    }
    return processed;
  };

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

  const getFilteredChartData = () => {
      if (chartRange === 24) return chartData;
      return chartData.slice(-chartRange);
  };

  const handleSendNotification = async () => {
    if(!notifTitle || !notifMsg) return;
    try { await axios.post(`${API_URL}/notification`, { title: notifTitle, message: notifMsg }); setNotifTitle(""); setNotifMsg(""); setShowAdmin(false); toast.success("Gonderildi!", { theme: "dark" }); } catch (e) { alert("Hata"); }
  };

  return (
    <div style={{ backgroundColor: '#13131a', minHeight: '100vh', width: '100vw', color: 'white', fontFamily: 'Segoe UI, sans-serif', padding: '0', boxSizing: 'border-box', overflowX:'hidden' }}>
      <ToastContainer />
      <style>{`
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #1e1e2e; } ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        @keyframes flashGreen { 0% { color: #00ff88; text-shadow: 0 0 10px #00ff88; transform: scale(1.05); } 100% { color: white; transform: scale(1); } }
        @keyframes flashRed { 0% { color: #ff4d4d; text-shadow: 0 0 10px #ff4d4d; transform: scale(1.05); } 100% { color: white; transform: scale(1); } }
        .flash-green { animation: flashGreen 0.8s ease-out; } .flash-red { animation: flashRed 0.8s ease-out; }
        .nav-btn { background: transparent; border: 1px solid #444; color: #888; padding: 10px 20px; border-radius: 20px; cursor: pointer; transition: all 0.3s ease; font-weight: 600; white-space: nowrap; }
        .nav-btn:hover { background: #2b2b3b; color: white; border-color: #666; }
        .nav-btn.active { background: #00d2ff; color: #000; border-color: #00d2ff; box-shadow: 0 0 15px rgba(0, 210, 255, 0.4); }
        .time-btn { background: #2b2b3b; border: 1px solid #444; color: #aaa; padding: 5px 12px; margin-left: 5px; border-radius: 5px; cursor: pointer; font-size: 0.85rem; }
        .time-btn.active { background: #00d2ff; color: black; border-color: #00d2ff; font-weight: bold; }
        .search-box { background: #1e1e2e; border: 1px solid #444; color: white; padding: 8px 15px; border-radius: 20px; outline: none; width: 200px; transition: all 0.3s; }
        .search-box:focus { border-color: #00d2ff; box-shadow: 0 0 10px rgba(0, 210, 255, 0.2); width: 250px; }
        th { cursor: pointer; user-select: none; transition: color 0.2s; } th:hover { color: #00d2ff; }
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-wrap { width: 100%; overflow: hidden; background-color: #000; border-bottom: 1px solid #333; height: 40px; display: flex; align-items: center; }
        .ticker { display: flex; white-space: nowrap; animation: scroll 30s linear infinite; }
        .ticker-item { display: inline-flex; align-items: center; padding: 0 2rem; font-size: 0.9rem; color: #ccc; font-weight: 600; }
        .ticker:hover { animation-play-state: paused; }
      `}</style>

      <div className="ticker-wrap">
          <div className="ticker">
              {[...globalMarkets, ...globalMarkets].map((item, index) => (
                  <div className="ticker-item" key={index}>
                      <span style={{color:'white', marginRight:'8px'}}>{item.symbol}:</span>
                      <span style={{color: item.change > 0 ? '#00ff88' : '#ff4d4d'}}>
                          {item.price.toFixed(2)} 
                          <span style={{fontSize:'0.8em', marginLeft:'5px'}}>({item.change > 0 ? '+' : ''}%{item.change.toFixed(2)})</span>
                      </span>
                  </div>
              ))}
          </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ width: '100%', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', padding:'0 10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px'}}> <h1 style={{ color: '#00d2ff', margin: 0, fontSize:'2rem', fontWeight:'800' }}>CryptoLive</h1> </div>
            <button onClick={() => setShowAdmin(!showAdmin)} style={{ background: 'linear-gradient(45deg, #00d2ff, #007aff)', border: 'none', padding: '10px 25px', borderRadius: '30px', fontWeight: 'bold', cursor:'pointer', color:'white', boxShadow:'0 4px 15px rgba(0, 210, 255, 0.3)' }}>Admin Paneli</button>
        </div>

        <div style={{ width: '100%', display: 'flex', gap: '15px', padding: '0 10px', marginBottom: '25px', overflowX: 'auto', paddingBottom:'10px' }}>
            {markets.map(market => ( <button key={market.id} className={`nav-btn ${activeTab === market.id ? 'active' : ''}`} onClick={() => setActiveTab(market.id)}>{market.label}</button> ))}
        </div>

        {showAdmin && (
            <div style={{ position:'fixed', top:'0', left:'0', width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:999, display:'flex', justifyContent:'center', alignItems:'center' }}>
                <div style={{ background:'#2b2b3b', padding:'30px', borderRadius:'20px', border:'1px solid #00d2ff', width:'400px', boxShadow:'0 0 50px rgba(0, 210, 255, 0.2)' }}>
                    <h2 style={{marginTop:0}}>Bildirim Gonder</h2>
                    <input type="text" placeholder="Baslik" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} style={{width:'100%', padding:'12px', marginBottom:'15px', borderRadius:'8px', border:'none', background:'#1e1e2e', color:'white', boxSizing:'border-box'}} />
                    <textarea placeholder="Mesaj" value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} style={{width:'100%', padding:'12px', height:'100px', marginBottom:'15px', borderRadius:'8px', border:'none', background:'#1e1e2e', color:'white', boxSizing:'border-box'}} />
                    <div style={{display:'flex', gap:'10px'}}> <button onClick={() => setShowAdmin(false)} style={{flex:1, background:'#444', border:'none', padding:'12px', borderRadius:'8px', color:'white', cursor:'pointer'}}>Iptal</button> <button onClick={handleSendNotification} style={{flex:1, background:'#00d2ff', border:'none', padding:'12px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>GONDER</button> </div>
                </div>
            </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', width: '100%', height: 'calc(100vh - 220px)' }}>
            <div style={{ background: '#1e1e2e', borderRadius: '20px', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', border:'1px solid #333' }}>
                <div style={{ padding:'15px', borderBottom:'1px solid #333', background:'#252530', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 style={{margin:0, fontSize:'1.1rem'}}>Canli Piyasa</h3>
                    <input type="text" placeholder="Coin Ara..." className="search-box" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div style={{ overflowY:'auto', flex:1 }}>
                    {activeTab === 'CRYPTO' ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position:'sticky', top:0, background:'#1e1e2e', zIndex:10 }}>
                                <tr style={{ color: '#888', textAlign: 'left', fontSize:'0.9rem' }}>
                                    <th style={{ padding: '15px 20px' }}>Coin</th>
                                    <th style={{ padding: '15px 20px', textAlign:'right' }} onClick={() => handleSort('price')}>Fiyat {renderSortIcon('price')}</th>
                                    <th style={{ padding: '15px 20px', textAlign:'right' }} onClick={() => handleSort('change')}>Degisim {renderSortIcon('change')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getProcessedCoins().map((coin) => (
                                    <tr key={coin.symbol} onClick={() => setSelectedCoin(coin.symbol)} style={{ borderBottom: '1px solid #2a2a35', cursor:'pointer', background: selectedCoin === coin.symbol ? 'rgba(0, 210, 255, 0.08)' : 'transparent', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}> <img src={coin.logo} alt={coin.name} width="32" height="32" style={{ borderRadius: '50%' }} /> <div> <div style={{ fontWeight: 'bold', fontSize:'1rem' }}>{coin.name}</div> <div style={{ fontSize: '0.75rem', color: '#666' }}>{coin.symbol}</div> </div> </td>
                                        <td className={coin.priceClass} style={{ textAlign:'right', fontWeight: '600', fontFamily:'monospace', fontSize:'1.1rem', paddingRight:'20px' }}>${coin.price?.toFixed(2)}</td>
                                        <td style={{ textAlign:'right', fontWeight: 'bold', color: parseFloat(coin.change) > 0 ? '#00ff88' : '#ff4d4d', paddingRight:'20px' }}>%{coin.change ? coin.change.toFixed(2) : "0.00"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : ( <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}><h3>Yapim Asamasinda</h3><p>{activeTab} verileri yakinda...</p></div> )}
                </div>
            </div>

            <div style={{ background: '#1e1e2e', borderRadius: '20px', padding: '25px', display:'flex', flexDirection:'column', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', border:'1px solid #333', position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                    <div> <h2 style={{ margin: 0, fontSize:'1.8rem' }}>{selectedCoin} Grafigi</h2> <span style={{ color:'#888' }}>Performans Analizi</span> </div>
                    <div style={{ display:'flex', alignItems:'center' }}>
                        <span style={{fontSize:'0.8rem', color:'#666', marginRight:'10px'}}>Zaman:</span>
                        <button className={`time-btn ${chartRange === 6 ? 'active' : ''}`} onClick={() => setChartRange(6)}>6S</button>
                        <button className={`time-btn ${chartRange === 12 ? 'active' : ''}`} onClick={() => setChartRange(12)}>12S</button>
                        <button className={`time-btn ${chartRange === 24 ? 'active' : ''}`} onClick={() => setChartRange(24)}>24S</button>
                    </div>
                </div>
                <div style={{ flex: 1, width: '100%', minHeight: '0' }}> 
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getFilteredChartData()}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="time" stroke="#666" tick={{fontSize: 12}} minTickGap={30} />
                                <YAxis domain={['auto', 'auto']} stroke="#666" tick={{fontSize: 12}} orientation="right" />
                                <Tooltip contentStyle={{ backgroundColor: '#252530', borderColor: '#444', borderRadius:'10px', boxShadow:'0 5px 15px black' }} itemStyle={{ color: '#00d2ff' }} />
                                <Area type="monotone" dataKey="price" stroke="#00d2ff" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : ( <div style={{ display:'flex', height:'100%', justifyContent:'center', alignItems:'center', color:'#444', border:'2px dashed #333', borderRadius:'10px' }}>Veri yukleniyor...</div> )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;