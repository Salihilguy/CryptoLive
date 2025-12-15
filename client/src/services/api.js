import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export const AuthService = {
    // --- GİRİŞ / ÇIKIŞ ---
    adminLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/admin-login`, { username, password });
            return res.data;
        } catch (error) { throw error.response?.data || { message: 'Bağlantı hatası' }; }
    },
    userLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/user-login`, { username, password });
            return res.data;
        } catch (error) { throw error.response?.data || { message: 'Giriş başarısız.' }; }
    },
    register: async (userData) => {
        try {
            const res = await axios.post(`${API_URL}/register`, userData);
            return res.data;
        } catch (error) { throw error.response?.data || { message: 'Kayıt hatası' }; }
    },
    logout: async (username) => {
        await axios.post(`${API_URL}/logout`, { username });
    },

    // --- PROFİL ---
    sendVerificationCode: async (username) => {
        const res = await axios.post(`${API_URL}/send-code`, { username });
        return res.data;
    },
    verifyAndUpdateProfile: async (data) => {
        const res = await axios.post(`${API_URL}/verify-update`, data);
        return res.data;
    },
    updateProfile: async (currentUsername, currentPassword, newPass, newUsername, newEmail, newPhone, newGender, newBirthDate) => {
        const res = await axios.post(`${API_URL}/verify-update`, { username: currentUsername });
        return res.data; 
    },
    deleteAccount: async (username, password) => {
        const res = await axios.post(`${API_URL}/admin/delete-user`, { username });
        return res.data;
    },

    // --- ALARM / FAVORİ ---
    getAlarms: async (userId) => {
        const res = await axios.post(`${API_URL}/get-alarms`, { userId });
        return res.data.alarms;
    },
    setAlarm: async (userId, username, symbol, targetPrice, currentPrice, note) => {
        const res = await axios.post(`${API_URL}/set-alarm`, { userId, username, symbol, targetPrice, currentPrice, note });
        return res.data;
    },
    deleteAlarm: async (userId, username, alarmId) => {
        const res = await axios.post(`${API_URL}/delete-alarm`, { userId, username, alarmId });
        return res.data;
    },
    updateAlarm: async (userId, username, alarmId, targetPrice, currentPrice, note) => {
        const res = await axios.post(`${API_URL}/update-alarm`, { userId, username, alarmId, targetPrice, currentPrice, note });
        return res.data;
    },
    toggleFavorite: async (username, symbol) => {
        const res = await axios.post(`${API_URL}/toggle-favorite`, { username, symbol });
        return res.data;
    },

    // --- DESTEK VE ADMİN (HATA DÜZELTMELERİ) ---
    
    // 1. Kullanıcı Mesaj Gönderir
    sendSupport: async (name, subject, message, contact) => {
        const res = await axios.post(`${API_URL}/send-support`, { name, subject, message, contact });
        return res.data;
    },

    // 2. Admin Mesajları Çeker (İSİM DÜZELTİLDİ: adminGetSupportMessages)
    adminGetSupportMessages: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/support`);
            return res.data; // { success: true, messages: [...] }
        } catch (error) {
            return { messages: [] };
        }
    },
    // Yedek (Eski kodlar için)
    getSupportMessages: async () => {
        const res = await axios.get(`${API_URL}/admin/support`);
        return res.data;
    },

    // 3. Admin Yanıt Verir (İSİM DÜZELTİLDİ: adminReplySupport)
    // AdminPanel.jsx 3 parametre (id, username, reply) gönderiyor.
    // Ancak backend sadece id ve reply bekliyor.
    // Fonksiyonu AdminPanel'e uygun tanımlayıp, backend'e doğru veriyi gönderiyoruz.
    adminReplySupport: async (id, reply) => {
        const res = await axios.post(`${API_URL}/reply-support`, { id, reply });
        return res.data;
    },
    

    // 4. Admin Mesaj Siler (EKSİKTİ, EKLENDİ)
    adminDeleteSupportMessage: async (id) => {
        const res = await axios.post(`${API_URL}/admin/delete-support`, { id });
        return res.data;
    },

    // --- DİĞER ADMİN İŞLEMLERİ ---
    adminGetStats: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/stats`);
            return res.data;
        } catch (e) { return { totalUsers: 0 }; }
    },
    adminGetUsers: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`);
            return res.data;
        } catch (e) { return { users: [] }; }
    },
    adminDeleteUser: async (username) => {
        const res = await axios.post(`${API_URL}/admin/delete-user`, { username });
        return res.data;
    },
    adminSendBroadcast: async (title, message, type) => {
        const res = await axios.post(`${API_URL}/notification`, { title, message, type: type || 'info' });
        return res.data;
    },

    getNotifications: async (username) => {
        const res = await axios.get(`${API_URL}/notifications/${username}`);
        return res.data;
    },
};