const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const WebSocket = require('ws');

const app = express();
app.use(cors());

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

    console.log(cleanData);
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

// Sunucuyu Başlatır
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Sunucu aktif. http://localhost:${PORT} adresinde çalışıyor.`);
});