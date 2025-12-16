require('dotenv').config();
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const WebSocket = require('ws');
const https = require('https');
const mongoose = require('mongoose');
const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();
const nodemailer = require('nodemailer');

const User = require('./models/User');
const Alarm = require('./models/Alarm');
const SupportMessage = require('./models/SupportMessage');

const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true 
}));
app.use(express.json());

// MONGODB BAĞLANTISI
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
      console.log("MongoDB Atlas'a Bağlandı.");
      fixLegacyAlarms(); // Eski alarmları tamir et
  })
  .catch((err) => console.error("MongoDB Bağlantı Hatası:", err));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cryptolivedestek@gmail.com',
        pass: 'aymr sidh iddz oybk'    
    }
});

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let userSockets = {}; // Online kullanıcıları burada tutacağız

io.on('connection', (socket) => {
    // Kullanıcı siteye girdiğinde veya giriş yaptığında bu event tetiklenir
    socket.on('user_connected', (username) => {
        if (username) {
            userSockets[username] = socket.id;
            console.log(`🔌 Kullanıcı Bağlandı: ${username} (Socket: ${socket.id})`);
        }
    });

    socket.on('disconnect', () => {
        // Kullanıcı çıkınca listeden temizleyelim
        const disconnectedUser = Object.keys(userSockets).find(key => userSockets[key] === socket.id);
        if (disconnectedUser) {
            delete userSockets[disconnectedUser];
        }
    });
});

// BİLDİRİM ŞEMASI
const notificationSchema = new mongoose.Schema({
    username: { type: String, required: true }, // Bildirimin sahibi
    title: String,
    message: String,
    originalMessage: String, // Destek talebi için
    type: String, // 'info', 'success', 'error', 'support_reply'
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// ALARM KONTROL SİSTEMİ
const checkAlarms = async (marketData) => {
    try {
        const alarms = await Alarm.find({ isActive: true });
        if (alarms.length === 0) return;

        for (const alarm of alarms) {
            const coin = marketData.find(c => c.symbol === alarm.symbol);
            if (coin && coin.price) {
                const currentPrice = parseFloat(coin.price);
                const targetPrice = alarm.targetPrice;
                let isTriggered = false;

                if (alarm.direction === 'UP' && currentPrice >= targetPrice) isTriggered = true;
                if (alarm.direction === 'DOWN' && currentPrice <= targetPrice) isTriggered = true;

                if (isTriggered) {
                    console.log(`🔔 ALARM: ${alarm.username} -> ${alarm.symbol} @ ${currentPrice}`);
                    const userNote = alarm.note ? `\n📝 Not: ${alarm.note}` : '';

                    io.emit('notification', {
                        targetUser: alarm.username, 
                        title: `🔔 FİYAT ALARMI: ${alarm.symbol}`,
                        message: `${alarm.symbol} hedef ${targetPrice} seviyesini gördü! (Anlık: ${currentPrice})${userNote}`,
                        type: 'success'
                    });

                    await Alarm.findByIdAndDelete(alarm._id);
                }
            }
        }
    } catch (err) {
        console.error("Alarm Kontrol Hatası:", err);
    }
};

// MARKET VERİLERİ
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
  if (symbol === 'TRY=X') return 'FX:USDTRY';
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
            if (item.symbol === 'CNYTRY=X' && (!item.price || item.price < 0.1)) item.price = usdTryPrice / usdCnyPrice;
            if (item.symbol === 'RUBTRY=X' && (!item.price || item.price < 0.01)) item.price = usdTryPrice / usdRubPrice;
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

        if (finalResults.length > 0) io.emit('marketUpdate', finalResults);

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
                    return { symbol: coin.s, name: info ? info.name : coin.s, logo: info ? info.logo : '', price: parseFloat(coin.c), change: parseFloat(coin.P) };
                });
                io.emit('tickerUpdate', cleanData);
                checkAlarms(cleanData); 
            }
        } catch (e) { console.error("Binance mesaj işleme hatası:", e);}
    });
} catch (e) {console.error("Binance bağlanırken kritik hata:", e);}

setTimeout(() => { if (!isBinanceWorking) startFakeTickerService(); }, 5000);


// KAYIT OL
app.post('/api/register', async (req, res) => {
    const { username, password, email, phone, birthDate, gender } = req.body; 

    if (username.toLowerCase() === 'admin') {
        return res.status(400).json({ success: false, message: 'Bu isim kullanılamaz.' });
    }

    try {
        const emailExists = await User.findOne({ email });
        if (emailExists) return res.status(400).json({ success: false, message: 'Bu e-posta zaten kullanımda.' });

        const phoneExists = await User.findOne({ phone });
        if (phoneExists) return res.status(400).json({ success: false, message: 'Bu telefon zaten kullanımda.' });

        const newUser = new User({
            username, password, email, phone, birthDate, gender, isAdmin: false, isOnline: false
        });

        await newUser.save();
        console.log(`YENİ ÜYE (MongoDB): ${username}`);
        res.json({ success: true, message: 'Kayıt başarılı! Giriş yapabilirsiniz.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// MÜŞTERİ GİRİŞİ (GÜNCELLENDİ: Cüzdan verileri eklendi)
app.post('/api/user-login', async (req, res) => {
    const { username, password } = req.body; 
    
    try {
        const user = await User.findOne({ 
            $or: [{ email: username }, { phone: username }],
            password: password 
        });

        if (user) {
            user.isOnline = true;
            await user.save();

            res.json({ 
                success: true, 
                message: 'Giriş Başarılı',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    birthDate: user.birthDate,
                    gender: user.gender,
                    favorites: user.favorites || [],
                    isAdmin: user.isAdmin,
                    // YENİLER:
                    walletBalance: user.walletBalance,
                    portfolio: user.portfolio,
                    savedCards: user.savedCards || []
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Bilgiler hatalı.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// ADMIN GİRİŞİ
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "1234";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        console.log("ADMIN PANELİNE GİRİŞ YAPILDI");
        res.json({ success: true, message: 'Giriş başarılı.', user: { username: 'admin', isAdmin: true, isOnline: true } });
    } else {
        res.status(403).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre.' });
    }
});

// FAVORİ EKLE/ÇIKAR
app.post('/api/toggle-favorite', async (req, res) => {
    const { username, symbol } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

        if (user.favorites.includes(symbol)) {
            user.favorites = user.favorites.filter(s => s !== symbol);
        } else {
            user.favorites.push(symbol);
        }
        await user.save();
        res.json({ success: true, favorites: user.favorites });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

// ALARM KUR
app.post('/api/set-alarm', async (req, res) => {
    const { userId, username, symbol, targetPrice, currentPrice, note } = req.body; 
    const direction = parseFloat(targetPrice) > parseFloat(currentPrice) ? 'UP' : 'DOWN';

    try {
        const newAlarm = new Alarm({ userId, username, symbol, targetPrice, direction, note });
        await newAlarm.save();
        console.log(`ALARM KURULDU (DB): ${username} -> ${symbol}`);
        res.json({ success: true, message: 'Alarm kuruldu!' });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

app.post('/api/get-alarms', async (req, res) => {
    const { userId } = req.body;
    try {
        const alarms = await Alarm.find({ userId });
        res.json({ success: true, alarms });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

// ALARM SİLME ENDPOINT'İ
app.delete('/api/alarms/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // MongoDB'den ID'ye göre bul ve sil
        const deletedAlarm = await Alarm.findByIdAndDelete(id);

        if (!deletedAlarm) {
            return res.status(404).json({ success: false, message: 'Alarm bulunamadı.' });
        }

        res.json({ success: true, message: 'Alarm başarıyla silindi.' });
    } catch (err) {
        console.error("Alarm silme hatası:", err);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
    }
});

// AKILLI ALARM GÜNCELLEME
app.post('/api/update-alarm', async (req, res) => {
    const { userId, alarmId, targetPrice, currentPrice, note } = req.body;
    const direction = parseFloat(targetPrice) > parseFloat(currentPrice) ? 'UP' : 'DOWN';

    try {
        const alarm = await Alarm.findById(alarmId);
        if (!alarm) return res.status(404).json({ message: 'Alarm bulunamadı.' });

        // Yetki Kontrolü
        const user = await User.findById(userId);
        let isOwner = false;
        
        if (alarm.userId) {
            isOwner = alarm.userId.toString() === userId;
        } else {
            isOwner = user && (alarm.username === user.username);
        }

        if (!isOwner) return res.status(403).json({ message: 'Yetkisiz işlem.' });

        alarm.targetPrice = targetPrice;
        alarm.direction = direction;
        alarm.note = note;
        if (!alarm.userId) alarm.userId = userId; 
        
        await alarm.save();
        res.json({ success: true, message: 'Alarm güncellendi.' });

    } catch (err) { 
        console.error("Güncelleme Hatası:", err);
        res.status(500).json({ message: 'Sunucu hatası.' }); 
    }
});

// BİLDİRİM SİLME (TEK)
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Bildirim silindi.' });
    } catch (err) {
        res.status(500).json({ message: 'Silme hatası.' });
    }
});

// BİLDİRİM SİLME (TÜMÜ)
app.delete('/api/notifications/all/:username', async (req, res) => {
    try {
        await Notification.deleteMany({ username: req.params.username });
        res.json({ success: true, message: 'Tüm bildirimler temizlendi.' });
    } catch (err) {
        res.status(500).json({ message: 'Temizleme hatası.' });
    }
});

// ADMIN İSTATİSTİKLERİ
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const onlineCount = await User.countDocuments({ isOnline: true });
        const totalAlarms = await Alarm.countDocuments();
        res.json({ totalUsers, onlineCount, totalAlarms, uptime: formatUptime(process.uptime()) });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

// ADMIN KULLANICI LİSTESİ
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find();
        const userList = await Promise.all(users.map(async (u) => {
            const alarmCount = await Alarm.countDocuments({ username: u.username });
            return {
                id: u._id,
                username: u.username,
                email: u.email,
                phone: u.phone,
                gender: u.gender,
                birthDate: u.birthDate,
                isOnline: u.isOnline,
                favCount: u.favorites.length,
                alarmCount: alarmCount
            };
        }));
        res.json({ success: true, users: userList });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/delete-user', async (req, res) => {
    const { username } = req.body;
    try {
        await User.findOneAndDelete({ username });
        await Alarm.deleteMany({ username });
        await SupportMessage.deleteMany({ username });
        io.emit('force_logout', username);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

app.get('/api/admin/support', async (req, res) => {
    try {
        const messages = await SupportMessage.find().sort({ createdAt: -1 });
        const formatted = messages.map(m => ({
            id: m._id,
            username: m.username, 
            name: m.name,
            contact: m.contactInfo || m.contact, 
            subject: m.subject,
            message: m.message,
            status: m.status,
            date: m.createdAt,
            replies: m.reply ? [{ text: m.reply }] : [] 
        }));
        res.json({ success: true, messages: formatted });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

// DESTEK MESAJI GÖNDERME 
app.post('/api/send-support', async (req, res) => {
    // Frontend'den gelen veriler:
    const { name, subject, message, contact } = req.body; 

    console.log("Destek İsteği Geldi:", req.body);

    try {
        const user = await User.findOne({ username: name });

        const newMsg = new SupportMessage({
            username: user ? user.username : null, 
            name: name, 
            contact: contact,
            subject: subject,
            message: message,
            status: 'Bekliyor',
            createdAt: new Date()
        });

        await newMsg.save();
        
        console.log(`✅ Destek mesajı kaydedildi. ID: ${newMsg._id}`);
        res.json({ success: true, message: 'İletildi' });

    } catch (err) {
        console.error("Destek Hatası:", err);
        res.status(500).json({ message: 'Hata oluştu.' });
    }
});

app.post('/api/admin/delete-support', async (req, res) => {
    const { id } = req.body;
    try {
        await SupportMessage.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: 'Hata' }); }
});

// DESTEK YANITLAMA
app.post('/api/reply-support', async (req, res) => {
    const { id, reply } = req.body; 
    
    console.log("👉 [BACKEND] Yanıt İsteği:", { id, reply });

    try {
        if (!id) return res.status(400).json({ message: 'ID eksik.' });

        // 1. Mesajı Güncelle
        const supportReq = await SupportMessage.findByIdAndUpdate(
            id,
            { $set: { reply: reply, status: 'Yanıtlandı' } },
            { new: true }
        );

        if (!supportReq) return res.status(404).json({ message: 'Talep bulunamadı.' });

        // 2. Hedef Kullanıcıyı Bul
        const targetUsername = supportReq.username || supportReq.name;

        if (targetUsername) {
            // A. VERİTABANINA BİLDİRİM KAYDET
            const newNotif = new Notification({
                username: targetUsername,
                title: "Destek Yanıtı", 
                message: reply, 
                originalMessage: supportReq.message, 
                type: 'support_reply'
            });
            await newNotif.save();
            console.log("✅ Bildirim veritabanına kaydedildi.");

            // B. SOCKET İLE CANLI GÖNDER (ANLIK GÖRÜNÜM İÇİN)
            if (typeof userSockets !== 'undefined') {
                const targetSocketId = userSockets[targetUsername];
                if (targetSocketId) {
                    io.to(targetSocketId).emit('notification', {
                        ...newNotif._doc, 
                        title: "Destek Yanıtı" 
                    });
                    console.log(`🚀 Socket bildirimi gönderildi: ${targetUsername}`);
                }
            }
        }

        res.json({ success: true, message: 'Yanıt gönderildi ve kaydedildi.' });

    } catch (err) {
        console.error("🔥 SUNUCU HATASI:", err);
        res.status(500).json({ message: 'Hata: ' + err.message });
    }
});

// DUYURU GÖNDERME
app.post('/api/notification', async (req, res) => {
    const { title, message, type } = req.body;

    try {
        const allUsers = await User.find({}, 'username');

        const notificationsToSave = allUsers.map(user => ({
            username: user.username,
            title: title,
            message: message,
            type: type || 'info',
            date: new Date()
        }));

        if (notificationsToSave.length > 0) {
            await Notification.insertMany(notificationsToSave);
            console.log(`✅ ${notificationsToSave.length} kullanıcıya duyuru kaydedildi.`);
        }

        // 3. SOCKET İLE HERKESE CANLI GÖNDER
        io.emit('notification', {
            title,
            message,
            type: type || 'info',
            date: new Date()
        });
        console.log("🚀 Duyuru tüm online kullanıcılara iletildi.");

        res.json({ success: true, message: 'Duyuru tüm kullanıcılara gönderildi.' });

    } catch (err) {
        console.error("Duyuru Hatası:", err);
        res.status(500).json({ message: 'Duyuru gönderilemedi.' });
    }
});

// KULLANICININ BİLDİRİMLERİNİ GETİR
app.get('/api/notifications/:username', async (req, res) => {
    try {
        const notifications = await Notification.find({ username: req.params.username })
                                            .sort({ date: -1 }) 
                                            .limit(20); 
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Bildirimler alınamadı.' });
    }
});

// DOĞRULAMA KODU GÖNDER
app.post('/api/send-code', async (req, res) => {
    const { username } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

        // 6 Haneli Kod Üret
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Veritabanına kaydet (10 dakika geçerli)
        user.verificationCode = code;
        user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const mailOptions = {
            from: '"CryptoLive Destek" <seninmailin@gmail.com>', 
            
            to: user.email,
            subject: '🔐 Doğrulama Kodu',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #00d2ff;">CryptoLive Profil Güncelleme</h2>
                    <p>Merhaba <b>${user.username}</b>,</p>
                    <p>Profil bilgilerini güncellemek için aşağıdaki doğrulama kodunu kullanabilirsin:</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        ${code}
                    </div>
                    <p>Bu kod 10 dakika boyunca geçerlidir. Eğer bu işlemi sen yapmadıysan, lütfen şifreni değiştir.</p>
                    <p style="font-size: 12px; color: #999; margin-top: 30px;">CryptoLive Destek Ekibi</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`MAIL GÖNDERİLDİ: ${user.email} -> Kod: ${code}`);

        res.json({ success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi.' });

    } catch (err) {
        console.error("Mail Hatası:", err);
        res.status(500).json({ message: 'Kod gönderilemedi. Gmail ayarlarınızı kontrol edin.' });
    }
});

// KODU DOĞRULA VE GÜNCELLE
app.post('/api/verify-update', async (req, res) => {
    const { 
        username, code, newUsername,
        newEmail, newPhone, newGender, newBirthDate, newPassword 
    } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

        if (!user.verificationCode || user.verificationCode !== code) {
            return res.status(400).json({ message: 'Hatalı doğrulama kodu!' });
        }

        if (user.verificationCodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Kodun süresi dolmuş. Lütfen tekrar kod isteyin.' });
        }

        if (newUsername && newUsername !== user.username) {
            await Alarm.updateMany({ userId: user._id.toString() }, { username: newUsername });
            await SupportMessage.updateMany({ username: user.username }, { username: newUsername });
            
            user.username = newUsername;
        }
        
        if (newEmail) user.email = newEmail;
        if (newPhone) user.phone = newPhone;
        if (newGender) user.gender = newGender;
        if (newBirthDate) user.birthDate = newBirthDate;
        if (newPassword) user.password = newPassword;

        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;

        await user.save();

        res.json({ 
            success: true, 
            message: 'Profiliniz başarıyla güncellendi.',
            user: { 
                id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                birthDate: user.birthDate,
                gender: user.gender,
                favorites: user.favorites || [],
                isAdmin: user.isAdmin,

                walletBalance: user.walletBalance,
                portfolio: user.portfolio,
                savedCards: user.savedCards || []
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
});

app.post('/api/logout', async (req, res) => {
    const { username } = req.body;
    await User.findOneAndUpdate({ username }, { isOnline: false });
    res.json({ success: true });
});

// PARA YÜKLEME (TEK KART SİSTEMİ - ÜZERİNE YAZMA)
app.post('/api/wallet/deposit', async (req, res) => {
    const { username, amount, cardData, saveCard } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

        // 1. Bakiyeyi Artır
        user.walletBalance = (user.walletBalance || 0) + parseFloat(amount);

        // 2. Kart Kaydetme (Varsa eskisinin yerine yaz)
        if (saveCard && cardData) {
            user.savedCard = cardData; 
        }

        await user.save();

        res.json({ 
            success: true, 
            message: 'İşlem başarılı.', 
            walletBalance: user.walletBalance,
            savedCard: user.savedCard 
        });

    } catch (err) {
        console.error("Deposit Hatası:", err);
        res.status(500).json({ message: 'İşlem başarısız: ' + err.message });
    }
});

// KART SİLME
app.post('/api/wallet/delete-card', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOneAndUpdate(
            { username }, 
            { $unset: { savedCard: 1 } }, 
            { new: true } 
        );
        res.json({ success: true, message: 'Kart bilgileri silindi.', user });
    } catch (err) {
        res.status(500).json({ message: 'Hata: ' + err.message });
    }
});

// AL/SAT İŞLEMİ 
app.post('/api/trade', async (req, res) => {
    const { username, symbol, amount, totalPrice, type } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

        if (!user.portfolio) user.portfolio = {};

        if (type === 'BUY') {
            if (user.walletBalance < totalPrice) {
                return res.status(400).json({ message: 'Yetersiz bakiye.' });
            }
            user.walletBalance -= totalPrice;

            const currentQty = user.portfolio.get(symbol) || 0;
            user.portfolio.set(symbol, currentQty + amount);

        } else if (type === 'SELL') {
            const currentQty = user.portfolio.get(symbol) || 0;
            if (currentQty < amount) {
                return res.status(400).json({ message: 'Yetersiz varlık adedi.' });
            }
            user.walletBalance += totalPrice;
            
            const newQty = currentQty - amount;
            if (newQty > 0) {
                user.portfolio.set(symbol, newQty);
            } else {
                user.portfolio.delete(symbol);
            }
        }

        await user.save();

        res.json({ 
            success: true, 
            message: 'İşlem başarılı.', 
            walletBalance: user.walletBalance,
            portfolio: user.portfolio
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'İşlem hatası: ' + err.message });
    }
});

// ESKİ ALARMLARI TAMİR ETME
const fixLegacyAlarms = async () => {
    try {
        const alarmsWithoutId = await Alarm.find({ userId: { $exists: false } });
        if (alarmsWithoutId.length > 0) {
            console.log(`${alarmsWithoutId.length} adet eski alarm onarılıyor...`);
            
            for (let alarm of alarmsWithoutId) {
                const user = await User.findOne({ username: alarm.username });
                if (user) {
                    alarm.userId = user._id.toString();
                    await alarm.save();
                    console.log(`Alarm onarıldı: ${alarm.username}`);
                } else {
                    await Alarm.deleteOne({ _id: alarm._id });
                }
            }
            console.log("Tüm alarmlar yeni sisteme uyarlandı!");
        }
    } catch (e) {
        console.error("Onarım hatası:", e);
    }
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => { console.log(`Sunucu (MongoDB) aktif: http://localhost:${PORT}`); });