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

const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

binanceWs.on('open', () => {
    console.log('✅ Binance Borsasına Bağlanıldı.');
});

binanceWs.on('message', (data) => {
    // Gelen veri Buffer tipinde, yazıya ve JSON'a çevrildi
    const tradeData = JSON.parse(data.toString());
    
    // tradeData.p = Price demek
    const price = parseFloat(tradeData.p).toFixed(2); // Küsurat 2 hane yapıldı

    // Konsola yazılsın
    console.log(`BTC Fiyatı: ${price} $`);

    // Gelen bu fiyat Frontend'e de gidiyor
    io.emit('priceUpdate', { symbol: 'BTC', price: price });
});

// Birisi siteye girdiğinde bu çalışır
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı! ID:', socket.id);

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