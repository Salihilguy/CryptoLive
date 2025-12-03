const axios = require('axios');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const WebSocket = require('ws');

const app = express();
app.use(cors());

app.use(express.json());

// Socket.io Kurulumu (Canlı bağlantı için)
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Coinlerin Sabit Bilgileri
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

// Sadece sembolleri Binance'e yollamak için bir liste çıkarıldı
const myCoins = Object.keys(COIN_METADATA);

// Binance kanalına bağlanıldı
const binanceWs = new WebSocket('wss://stream.binance.com:443/ws/!ticker@arr');

binanceWs.on('open', () => {
    console.log('Binance Ticker Kanalına Bağlanıldı.');
});

binanceWs.on('error', (err) => {
    console.error('Binance Bağlantı Hatası:', err.message);
});

binanceWs.on('message', (data) => {
    try {
        const allCoins = JSON.parse(data.toString());
        const filteredCoins = allCoins.filter(coin => myCoins.includes(coin.s));

        if (filteredCoins.length > 0) {
            const cleanData = filteredCoins.map(coin => {
                // METADATA'dan ek bilgileri çek (HİBRİT YAPI)
                const info = COIN_METADATA[coin.s]; 

                return {
                    symbol: coin.s,
                    name: info ? info.name : coin.s, 
                    logo: info ? info.logo : '',    
                    price: parseFloat(coin.c),
                    change: parseFloat(coin.P)
                };
            });

            io.emit('tickerUpdate', cleanData);
        }
    } catch (err) {
        console.error("Veri işleme hatası:", err);
    }  
});

// Birisi siteye girdiğinde bu çalışır
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı. ID:', socket.id);

    // Kullanıcı çıkarsa
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

app.post('/api/notification', (req, res) => {

    const { title, message, type } = req.body;

    if (!title || !message) {
        return res.status(400).send({ error: "Başlık ve mesaj zorunludur!" });
    }

    console.log(`YENİ BİLDİRİM: ${title} - ${message}`);

    io.emit('notification', {
        title: title,
        message: message,
        type: type || 'info', 
        time: new Date().toLocaleTimeString()
    });

    res.send({ success: true, status: "Bildirim tüm kullanıcılara iletildi." });
});

app.get('/api/history', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'BTCUSDT';
        const interval = '1h'; 
        const limit = 24;      // Son 24 saati getir

        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const response = await axios.get(url);

        const chartData = response.data.map(item => ({
            time: new Date(item[0]).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), // Örn: 14:00
            price: parseFloat(item[4]) // Kapanış Fiyatı
        }));

        res.send(chartData);

    } catch (error) {
        console.error("Grafik verisi çekilemedi:", error.message);
        res.status(500).send({ error: "Veri çekilemedi" });
    }
});

// Sunucuyu Başlatır
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Sunucu aktif. http://localhost:${PORT} adresinde çalışıyor.`);
});