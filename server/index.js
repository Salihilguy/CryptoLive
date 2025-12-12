const axios = require('axios');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:5174"  
  ],
  credentials: true 
}));
app.use(express.json());

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const DB_FILE = 'data.json';

const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = { users: [], favorites: {}, alarms: [] };
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData));
            return initialData;
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        if (!parsed.alarms) parsed.alarms = [];
        
        return parsed;
    } catch (err) {
        console.error("DB Okuma Hatası:", err);
        return { users: [], favorites: {}, alarms: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("DB Yazma Hatası:", err);
    }
};

const checkAlarms = (marketData) => {
    const db = readDB();
    if (!db.alarms || db.alarms.length === 0) return; 

    let alarmTriggered = false;

    const remainingAlarms = db.alarms.filter(alarm => {
        const coin = marketData.find(c => c.symbol === alarm.symbol);
        
        if (coin && coin.price) {
            const currentPrice = parseFloat(coin.price);
            const targetPrice = parseFloat(alarm.targetPrice);
            let isTriggered = false;

            if (alarm.direction === 'UP' && currentPrice >= targetPrice) isTriggered = true;
            if (alarm.direction === 'DOWN' && currentPrice <= targetPrice) isTriggered = true;

            if (isTriggered) {
                console.log(`🔔 ALARM TETİKLENDİ: ${alarm.username} -> ${alarm.symbol} @ ${currentPrice}`);
                
                const userNote = alarm.note ? `\n📝 Notun: ${alarm.note}` : '';

                io.emit('notification', {
                    targetUser: alarm.username, 
                    title: `🔔 FİYAT ALARMI: ${alarm.symbol}`,
                    message: `${alarm.symbol} hedeflediğin ${targetPrice} fiyatına ulaştı! (Güncel: ${currentPrice})${userNote}`,
                    type: 'success'
                });
                
                alarmTriggered = true;
                return false; 
            }
        }
        return true;
    });

    if (alarmTriggered) {
        db.alarms = remainingAlarms;
        writeDB(db);
    }
};


const COIN_METADATA = {
    'BTCUSDT': { name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    'ETHUSDT': { name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    'SOLUSDT': { name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    'BNBUSDT': { name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
    'XRPUSDT': { name: 'XRP', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
    'DOGEUSDT': { name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
    'ADAUSDT': { name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
    'AVAXUSDT': { name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
    'TRXUSDT': { name: 'Tron', logo: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
    'DOTUSDT': { name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
    'MATICUSDT': { name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png' },
    'LTCUSDT': { name: 'Litecoin', logo: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
    'LINKUSDT': { name: 'Chainlink', logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
    'SHIBUSDT': { name: 'Shiba Inu', logo: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png' },
    'ATOMUSDT': { name: 'Cosmos', logo: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png' }
};

const myCoins = Object.keys(COIN_METADATA);
const BASE_PRICES = { 'BTCUSDT': 96500, 'ETHUSDT': 3650, 'SOLUSDT': 240, 'BNBUSDT': 720, 'XRPUSDT': 2.45, 'DOGEUSDT': 0.065, 'ADAUSDT': 1.25, 'AVAXUSDT': 18, 'TRXUSDT': 0.07, 'DOTUSDT': 7.5, 'MATICUSDT': 1.1, 'LTCUSDT': 65, 'LINKUSDT': 7.8, 'SHIBUSDT': 0.000008, 'ATOMUSDT': 12 };

const MARKET_ASSETS = [
    // BIST 100
    { symbol: 'THYAO.IS', name: 'Türk Hava Yolları', type: 'BIST', logo: 'https://logo.clearbit.com/turkishairlines.com' },
    { symbol: 'AKBNK.IS', name: 'Akbank', type: 'BIST', logo: 'https://www.google.com/s2/favicons?domain=akbank.com&sz=128' },
    { symbol: 'VAKBN.IS', name: 'Vakıfbank', type: 'BIST', logo: 'https://www.google.com/s2/favicons?domain=vakifbank.com.tr&sz=128' },
    { symbol: 'TCELL.IS', name: 'Turkcell', type: 'BIST', logo: 'https://logo.clearbit.com/turkcell.com.tr' },
    { symbol: 'TTKOM.IS', name: 'Türk Telekom', type: 'BIST', logo: 'https://logo.clearbit.com/turktelekom.com.tr' },
    { symbol: 'KCHOL.IS', name: 'Koç Holding', type: 'BIST', logo: 'https://logo.clearbit.com/koc.com.tr' },
    { symbol: 'SISE.IS', name: 'Şişecam', type: 'BIST', logo: '/sisecam.png' },
    { symbol: 'BIMAS.IS', name: 'BİM', type: 'BIST', logo: 'https://www.google.com/s2/favicons?domain=bim.com.tr&sz=128' },

    // DÖVİZ & FOREX
    { symbol: 'USDTRY=X', name: 'USD / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/us.png' }, 
    { symbol: 'EURTRY=X', name: 'EUR / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/eu.png' },
    { symbol: 'GBPTRY=X', name: 'GBP / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/gb.png' }, 
    { symbol: 'EURUSD=X', name: 'EUR / USD', type: 'FOREX', logo: 'https://flagcdn.com/w80/eu.png' }, 
    { symbol: 'JPYTRY=X', name: 'JPY / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/jp.png' },
    { symbol: 'CHFTRY=X', name: 'CHF / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/ch.png' }, 
    { symbol: 'CADTRY=X', name: 'CAD / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/ca.png' }, 
    { symbol: 'AUDTRY=X', name: 'AUD / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/au.png' }, 
    { symbol: 'CNYTRY=X', name: 'CNY / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/cn.png' }, 
    { symbol: 'RUBTRY=X', name: 'RUB / TRY', type: 'FOREX', logo: 'https://flagcdn.com/w80/ru.png' }, 
    { symbol: 'DX-Y.NYB', name: 'Dolar Endeksi (DXY)', type: 'FOREX', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/United-states_flag_icon_round.svg/1024px-United-states_flag_icon_round.svg.png' },

    { symbol: 'CNY=X', name: 'USD/CNY', type: 'HIDDEN' }, 
    { symbol: 'RUB=X', name: 'USD/RUB', type: 'HIDDEN' },

    // EMTİA
    { symbol: 'GC=F', name: 'Altın (Ons)', type: 'COMMODITY', logo: 'https://img.icons8.com/fluency/96/gold-bars.png' },
    { symbol: 'CL=F', name: 'Ham Petrol', type: 'COMMODITY', logo: 'https://www.google.com/s2/favicons?domain=oilprice.com&sz=128' },
    { symbol: 'BZ=F', name: 'Brent Petrol', type: 'COMMODITY', logo: 'https://cdn-icons-png.flaticon.com/512/2933/2933890.png' },  
    { symbol: 'SI=F', name: 'Gümüş', type: 'COMMODITY', logo: 'https://img.icons8.com/fluency/96/silver-bars.png' },
    { symbol: 'HG=F', name: 'Bakır', type: 'COMMODITY', logo: 'https://img.icons8.com/fluency/96/copper-bars.png' },
    { symbol: 'NG=F', name: 'Doğal Gaz', type: 'COMMODITY', logo: 'https://img.icons8.com/color/96/gas-industry.png' },

    // ABD BORSASI
    { symbol: 'AAPL', name: 'Apple', type: 'US_STOCK', logo: 'https://logo.clearbit.com/apple.com' },
    { symbol: 'TSLA', name: 'Tesla', type: 'US_STOCK', logo: 'https://logo.clearbit.com/tesla.com' },
    { symbol: 'NVDA', name: 'NVIDIA', type: 'US_STOCK', logo: 'https://logo.clearbit.com/nvidia.com' },
    { symbol: 'MSFT', name: 'Microsoft', type: 'US_STOCK', logo: 'https://logo.clearbit.com/microsoft.com' },
    { symbol: 'AMZN', name: 'Amazon', type: 'US_STOCK', logo: 'https://logo.clearbit.com/amazon.com' },
    { symbol: 'GOOG', name: 'Google', type: 'US_STOCK', logo: 'https://logo.clearbit.com/google.com' },
    { symbol: 'META', name: 'Meta (Facebook)', type: 'US_STOCK', logo: 'https://logo.clearbit.com/meta.com' },
    { symbol: 'NFLX', name: 'Netflix', type: 'US_STOCK', logo: 'https://logo.clearbit.com/netflix.com' }
];

const tradingViewMap = {
  'TCELL.IS': 'TCELL',
  'TTKOM.IS': 'TTKOM',

  'GBPTRY=X': 'FX:GBPTRY',
  'JPYTRY=X': 'FX:JPYTRY',
  'EURTRY=X': 'FX:EURTRY',
  'USDTRY=X': 'FX:USDTRY',
  'EURUSD=X': 'FX:EURUSD',
  'CHFTRY=X': 'FX:CHFTRY',
  'CADTRY=X': 'FX:CADTRY',

  'GC=F': 'COMEX:GC1!', 
  'CL=F': 'NYMEX:CL1!',

  'BTCUSDT': 'BINANCE:BTCUSDT',
  'ETHUSDT': 'BINANCE:ETHUSDT'
};

function convertToTradingView(symbol) {
  if (!symbol || typeof symbol !== 'string') return symbol;

  if (tradingViewMap[symbol]) return tradingViewMap[symbol];

  if (symbol.endsWith('=X')) {
    const core = symbol.replace('=X', '');
    return `FX:${core}`;
  }

  if (symbol === 'TRY=X') {
    return 'FX:USDTRY';
  }

  if (symbol.includes(':')) return symbol;

  return symbol;
}

async function fetchGlobalMarkets() {
    try {
        const promises = MARKET_ASSETS.map(async (asset) => {
            try {
                const result = await yf.quote(asset.symbol);
                const price = result?.regularMarketPrice ?? result?.price ?? null;
                const change = result?.regularMarketChangePercent ?? result?.regularMarketChange ?? 0;
                const tradingViewSymbol = convertToTradingView(asset.symbol);

                return {
                    symbol: asset.symbol,
                    tradingViewSymbol,
                    name: asset.name,
                    logo: asset.logo,
                    type: asset.type,
                    price,
                    change
                };
            } catch (err) {
                console.error(`${asset.symbol} verisi alınamadı:`, err && err.message ? err.message : err);
                return null;
            }
        });

        const rawResults = await Promise.all(promises);
        
        const usdTryItem = rawResults.find(d => d.symbol === 'USDTRY=X') || rawResults.find(d => d.symbol === 'TRY=X');
        const usdTryPrice = usdTryItem ? usdTryItem.price : 34.50;

        const usdCnyItem = rawResults.find(d => d.symbol === 'CNY=X');
        const usdCnyPrice = usdCnyItem ? usdCnyItem.price : 7.25;

        const usdRubItem = rawResults.find(d => d.symbol === 'RUB=X');
        const usdRubPrice = usdRubItem ? usdRubItem.price : 95.0;

        const onsGold = rawResults.find(d => d.symbol === 'GC=F')?.price;
        const onsSilver = rawResults.find(d => d.symbol === 'SI=F')?.price;

        let finalResults = rawResults.map(item => {
            if (item.type === 'HIDDEN') return null;

            if (item.symbol === 'CNYTRY=X' && (!item.price || item.price < 0.1)) {
                item.price = usdTryPrice / usdCnyPrice;
            }
            if (item.symbol === 'RUBTRY=X' && (!item.price || item.price < 0.01)) {
                item.price = usdTryPrice / usdRubPrice;
            }
            
            return item;
        }).filter(Boolean);

   if (usdTryPrice && onsGold) {
            const gramAltin = (onsGold * usdTryPrice) / 31.1035;
            finalResults.push({ symbol: 'GRAM-ALTIN', name: 'Gram Altın', type: 'COMMODITY', price: gramAltin, change: 0, logo: 'https://img.icons8.com/fluency/96/gold-bars.png', tradingViewSymbol: 'FX:XAUTRYG' });
            finalResults.push({ symbol: 'CEYREK-ALTIN', name: 'Çeyrek Altın', type: 'COMMODITY', price: gramAltin * 1.63, change: 0, logo: 'https://img.icons8.com/fluency/96/coin-wallet.png', tradingViewSymbol: 'FX:XAUTRYG' });
            finalResults.push({ symbol: 'TAM-ALTIN', name: 'Tam Altın', type: 'COMMODITY', price: gramAltin * 6.52, change: 0, logo: 'https://img.icons8.com/fluency/96/treasure-chest.png', tradingViewSymbol: 'FX:XAUTRYG' });
        }
        if (usdTryPrice && onsSilver) {
            const gramGumus = (onsSilver * usdTryPrice) / 31.1035;
            finalResults.push({ symbol: 'GRAM-GUMUS', name: 'Gram Gümüş', type: 'COMMODITY', price: gramGumus, change: 0, logo: 'https://img.icons8.com/fluency/96/silver-bars.png', tradingViewSymbol: 'FX:XAGTRY' });
        }

        if (finalResults.length > 0) {
            io.emit('marketUpdate', finalResults);
        }

        } catch (err) {
            console.error("Fetch Hatası:", err.message);
        }
}

setInterval(fetchGlobalMarkets, 5000);
fetchGlobalMarkets();

function startFakeTickerService() {
    setInterval(() => {
        const fakeData = myCoins.map(symbol => {
            const info = COIN_METADATA[symbol];
            let currentPrice = BASE_PRICES[symbol] || 100;
            const changePercent = (Math.random() - 0.5) * 0.01; 
            const newPrice = currentPrice * (1 + changePercent);
            BASE_PRICES[symbol] = newPrice;
            return { symbol, name: info.name, logo: info.logo, price: newPrice, change: changePercent * 100 };
        });
        io.emit('tickerUpdate', fakeData);
        checkAlarms(fakeData); 
    }, 1000); 
}

let isBinanceWorking = false;
try {
    const binanceWs = new WebSocket('wss://stream.binance.com:443/ws/!ticker@arr');
    binanceWs.on('open', () => { isBinanceWorking = true; console.log('Binance Bağlandı'); });
    binanceWs.on('error', (err) => {console.error("Binance WS Hatası:", err);});
    binanceWs.on('message', (data) => {
        try {
            const allCoins = JSON.parse(data.toString());
            const filteredCoins = allCoins.filter(coin => myCoins.includes(coin.s));
            if (filteredCoins.length > 0) {
                isBinanceWorking = true;
                const cleanData = filteredCoins.map(coin => {
                    const info = COIN_METADATA[coin.s];
                    if(coin.c) BASE_PRICES[coin.s] = parseFloat(coin.c);

                    return { symbol: coin.s, 
                        name: info ? info.name : coin.s, 
                        logo: info ? info.logo : '', 
                        price: parseFloat(coin.c), 
                        change: parseFloat(coin.P) 
                    };
                });
                io.emit('tickerUpdate', cleanData);
                checkAlarms(cleanData); 
            }
        } catch (e) { console.error("Binance mesaj işleme hatası:", e);}
    });
} catch (e) {console.error("Binance bağlanırken kritik hata:", e);}

setTimeout(() => { if (!isBinanceWorking) startFakeTickerService(); }, 5000);

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış.' });
    }
    db.users.push({ username, password });
    db.favorites[username] = [];
    writeDB(db);
    console.log(`YENİ KULLANICI: ${username}`);
    res.json({ success: true, message: 'Kayıt başarılı! Giriş yapabilirsin.' });
});

app.post('/api/user-login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        user.isOnline = true; 
        writeDB(db);          

        const userFavs = db.favorites[username] || [];
        res.json({ success: true, username: user.username, favorites: userFavs, isOnline: true });
    } else {
        res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre yanlış.' });
    }
});

app.post('/api/logout', (req, res) => {
    const { username } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => u.username === username);
    
    if (user) {
        user.isOnline = false;
        writeDB(db);           
        console.log(`KULLANICI ÇIKIŞ YAPTI: ${username}`);
        res.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
    } else {
        res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }
});

app.post('/api/toggle-favorite', (req, res) => {
    const { username, symbol } = req.body;
    const db = readDB();
    if (!db.favorites[username]) db.favorites[username] = [];
    const currentFavs = db.favorites[username];
    const index = currentFavs.indexOf(symbol);
    if (index === -1) currentFavs.push(symbol);
    else currentFavs.splice(index, 1);
    db.favorites[username] = currentFavs;
    writeDB(db);
    res.json({ success: true, favorites: currentFavs });
});

app.post('/api/update-alarm', (req, res) => {
    const { username, alarmId, newTargetPrice, currentPrice, note } = req.body; 
    const db = readDB();

    const alarmIndex = db.alarms.findIndex(a => a.id === alarmId && a.username === username);
    
    if (alarmIndex !== -1) {
        db.alarms[alarmIndex].targetPrice = parseFloat(newTargetPrice);
        db.alarms[alarmIndex].note = note || ""; 
        
        const direction = parseFloat(newTargetPrice) > parseFloat(currentPrice) ? 'UP' : 'DOWN';
        db.alarms[alarmIndex].direction = direction;

        writeDB(db);
        res.json({ success: true, message: 'Alarm güncellendi.' });
    } else {
        res.status(404).json({ success: false, message: 'Alarm bulunamadı.' });
    }
});

app.post('/api/get-alarms', (req, res) => {
    const { username } = req.body;
    const db = readDB();
    const userAlarms = db.alarms.filter(a => a.username === username);
    res.json({ success: true, alarms: userAlarms });
});

app.post('/api/delete-alarm', (req, res) => {
    const { username, alarmId } = req.body;
    const db = readDB();
    
    const initialLength = db.alarms.length;
    db.alarms = db.alarms.filter(a => !(a.id === alarmId && a.username === username));
    
    writeDB(db);
    res.json({ success: true, message: 'Alarm silindi.' });
});

app.post('/api/set-alarm', (req, res) => {
    const { username, symbol, targetPrice, currentPrice, note } = req.body; 
    const db = readDB();

    const direction = parseFloat(targetPrice) > parseFloat(currentPrice) ? 'UP' : 'DOWN';

    const newAlarm = {
        id: Date.now(),
        username,
        symbol,
        targetPrice: parseFloat(targetPrice),
        direction,
        note: note || "" 
    };

    db.alarms.push(newAlarm);
    writeDB(db);

    console.log(`ALARM KURULDU: ${username} -> ${symbol} Hedef: ${targetPrice}, Not: ${note}`);
    res.json({ success: true, message: `${symbol} için ${targetPrice} fiyatına alarm kuruldu!` });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '1234') {
        res.json({ success: true, token: 'admin-token' });
    } else {
        res.status(401).json({ success: false, message: 'Hatalı admin girişi!' });
    }
});

app.post('/api/notification', (req, res) => {
    const { title, message, type } = req.body;
    console.log(`BİLDİRİM: ${title}`);
    io.emit('notification', { title, message, type: type || 'info', time: new Date().toLocaleTimeString() });
    res.send({ success: true });
});

function generateMockHistory(symbol) {
    const data = [];
    let close = BASE_PRICES[symbol] || 100;
    
    for (let i = 24; i > 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i);
        
        const volatility = close * 0.02; 
        const open = close + (Math.random() - 0.5) * volatility;
        const tempClose = open + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, tempClose) + Math.random() * volatility * 0.5;
        const low = Math.min(open, tempClose) - Math.random() * volatility * 0.5;
        
        close = tempClose; 

        data.push({
            x: date.getTime(), 
            y: [parseFloat(open.toFixed(4)), parseFloat(high.toFixed(4)), parseFloat(low.toFixed(4)), parseFloat(close.toFixed(4))] 
        });
    }
    return data;
}

app.get('/api/history', async (req, res) => {
    const symbol = req.query.symbol || 'BTCUSDT';
    try {
        const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true, family: 4 });
        const url = `https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`;
        const response = await axios.get(url, { httpsAgent: agent, timeout: 4000 });

        const chartData = response.data.map(item => ({
            x: item[0], 
            y: [parseFloat(item[1]), parseFloat(item[2]), parseFloat(item[3]), parseFloat(item[4])] 
        }));

        res.send(chartData);
    } catch (error) {
        console.log(`Grafik Hatası. Mock veri dönüyor.`);
        res.send(generateMockHistory(symbol));
    }
});

app.get('/api/admin/stats', (req, res) => {
    try {
        const db = readDB();
        const users = db.users || [];
        const alarms = db.alarms || [];

        const onlineCount = users.filter(u => u.isOnline === true).length;

        res.json({
            totalUsers: users.length,
            onlineCount: onlineCount,
            totalAlarms: alarms.length,
            uptime: formatUptime(process.uptime())
        });
    } catch (error) {
        console.error("Admin Stats Hatası:", error);
        res.status(500).json({ message: "Veri alınamadı" });
    }
});

app.get('/api/admin/users', (req, res) => {
    try {
        const db = readDB();
        const users = db.users || [];
        const alarms = db.alarms || [];
        const favorites = db.favorites || {};

        const userList = users.map(user => {
            const userAlarmCount = alarms.filter(a => a.username === user.username).length;
            const userFavCount = favorites[user.username] ? favorites[user.username].length : 0;

            return {
                username: user.username,
                isOnline: user.isOnline || false, 
                alarmCount: userAlarmCount,
                favCount: userFavCount
            };
        });

        res.json({ success: true, users: userList });
    } catch (error) {
        console.error("Admin Users Hatası:", error);
        res.status(500).json({ success: false, users: [] });
    }
});

app.post('/api/admin/delete-user', (req, res) => {
    const { username } = req.body;
    const db = readDB();
    
    const initialUserLength = db.users.length;
    db.users = db.users.filter(u => u.username !== username);
    
    db.alarms = db.alarms.filter(a => a.username !== username);
    
    if (db.favorites[username]) delete db.favorites[username];

    if (db.users.length < initialUserLength) {
        writeDB(db);
        res.json({ success: true, message: 'Kullanıcı silindi' });
    } else {
        res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
});

//  PROFİL GÜNCELLEME (İSİM VE ŞİFRE)
app.post('/api/update-profile', (req, res) => {
    const { username, currentPassword, newPassword, newUsername } = req.body;
    const db = readDB();
    
    // 1. Kullanıcıyı bul
    const userIndex = db.users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }
    const user = db.users[userIndex];

    // 2. Mevcut şifre kontrolü
    if (user.password !== currentPassword) {
        return res.status(400).json({ success: false, message: 'Mevcut şifreniz hatalı.' });
    }

    // 3. Kullanıcı Adı Değişikliği
    let finalUsername = username; 
    
    if (newUsername && newUsername !== username) {
        const isTaken = db.users.find(u => u.username === newUsername);
        if (isTaken) {
            return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten dolu.' });
        }
        
        db.users[userIndex].username = newUsername;

        if (db.favorites[username]) {
            db.favorites[newUsername] = db.favorites[username]; 
            delete db.favorites[username]; 
        }

        if (db.alarms && db.alarms.length > 0) {
            db.alarms.forEach(alarm => {
                if (alarm.username === username) {
                    alarm.username = newUsername;
                }
            });
        }

        finalUsername = newUsername;
        console.log(`KULLANICI ADI DEĞİŞTİ: ${username} -> ${newUsername}`);
    }

    // 4. Şifre Değişikliği
    if (newPassword && newPassword.length > 0) {
        db.users[userIndex].password = newPassword;
        console.log(`ŞİFRE DEĞİŞTİ: ${finalUsername}`);
    }

    writeDB(db); 
    
    res.json({ 
        success: true, 
        message: 'Profil başarıyla güncellendi.',
        user: { username: finalUsername, favorites: db.favorites[finalUsername] || [] }
    });
});

const PORT = 3001;
server.listen(PORT, () => { console.log(`Sunucu aktif: http://localhost:${PORT}`); });