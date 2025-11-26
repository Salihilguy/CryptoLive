const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

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