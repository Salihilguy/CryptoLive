import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export const AuthService = {
    // --- AUTH İŞLEMLERİ ---
    adminLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Bağlantı hatası' };
        }
    },
    
    register: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/register`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Kayıt hatası' };
        }
    },

    userLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/user-login`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Giriş hatası' };
        }
    },

    // --- FAVORİ İŞLEMLERİ ---
    toggleFavorite: async (username, symbol) => {
        try {
            const res = await axios.post(`${API_URL}/toggle-favorite`, { username, symbol });
            return res.data;
        } catch (error) {
            console.error(error);
            return { favorites: [] };
        }
    },

    // --- ALARM İŞLEMLERİ ---
    setAlarm: async (username, symbol, targetPrice, currentPrice, note = "") => {
        try {
            const res = await axios.post(`${API_URL}/set-alarm`, { 
                username, 
                symbol, 
                targetPrice, 
                currentPrice,
                note 
            });
            return res.data;
        } catch (error) {
            throw { message: 'Alarm kurulamadı.' };
        }
    },

    getAlarms: async (username) => {
        try {
            const res = await axios.post(`${API_URL}/get-alarms`, { username });
            return res.data.alarms; 
        } catch (error) {
            console.error("Alarm getirme hatası:", error);
            return []; 
        }
    },

    deleteAlarm: async (username, alarmId) => {
        try {
            const res = await axios.post(`${API_URL}/delete-alarm`, { username, alarmId });
            return res.data;
        } catch (error) {
            throw { message: 'Silme hatası' };
        }
    },

    updateAlarm: async (username, alarmId, newTargetPrice, currentPrice, note = "") => {
        try {
            const res = await axios.post(`${API_URL}/update-alarm`, { 
                username, 
                alarmId, 
                newTargetPrice, 
                currentPrice,
                note 
            });
            return res.data;
        } catch (error) {
            throw { message: 'Güncelleme hatası.' };
        }
    },

    // --- ADMIN İŞLEMLERİ ---
    
    adminGetUsers: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`);
            return res.data;
        } catch (error) {
            console.error("Admin user fetch error", error);
            return { users: [] };
        }
    },

    adminDeleteUser: async (username) => {
        try {
            const res = await axios.post(`${API_URL}/admin/delete-user`, { username });
            return res.data;
        } catch (error) {
            throw { message: 'Silme işlemi başarısız.' };
        }
    },

    adminGetStats: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/stats`);
            return res.data;
        } catch (error) {
            console.error("Stats fetch error", error);
            return { totalUsers: 0, totalAlarms: 0, onlineCount: 0, uptime: '00:00:00' };
        }
    },

    // YENİ EKLENEN: GLOBAL DUYURU GÖNDERME
    adminSendBroadcast: async (title, message) => {
        try {
            // Type 'info' olarak varsayılan gönderiyoruz
            const res = await axios.post(`${API_URL}/notification`, { title, message, type: 'info' });
            return res.data;
        } catch (error) {
            throw { message: 'Duyuru gönderilemedi.' };
        }
    }

};