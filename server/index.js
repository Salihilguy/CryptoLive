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

// Takip etmek istediğimiz coinlerin listesi
const myCoins = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];

// Binance Tüm Piyasalar (Mini Ticker) kanalına bağlanıldı
const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

binanceWs.on('open', () => {
    console.log('Binance Ticker Kanalına Bağlanıldı.');
});

binanceWs.on('message', (data) => {
    // Gelen veri Buffer tipinde, yazıya ve JSON'a çevrildi
    const allCoins = JSON.parse(data.toString());

    //Gelen coinler arasından filtreleme yapıldı
    const filteredCoins = allCoins.filter(coin => myCoins.includes(coin.s));

    if (filteredCoins.length > 0) {
        const cleanData = filteredCoins.map(coin => ({
            symbol: coin.s,            
            price: parseFloat(coin.c), 
            change: parseFloat(coin.P)
        }));

    // Gelen bu fiyat Frontend'e de gidiyor
    io.emit('tickerUpdate', cleanData);

    //console.log(cleanData);
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