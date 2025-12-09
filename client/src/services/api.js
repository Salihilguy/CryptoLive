import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export const AuthService = {
    // Admin Girişi
    adminLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Bağlantı hatası' };
        }
    },
    
    // Kullanıcı Kayıt
    register: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/register`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Kayıt hatası' };
        }
    },

    // Kullanıcı Giriş
    userLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/user-login`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Giriş hatası' };
        }
    },

    // Favori İşlemi
    toggleFavorite: async (username, symbol) => {
        try {
            const res = await axios.post(`${API_URL}/toggle-favorite`, { username, symbol });
            return res.data;
        } catch (error) {
            console.error(error);
            return { favorites: [] };
        }
    },

    // Alarm Kurma (GÜNCELLENDİ: note parametresi eklendi)
    setAlarm: async (username, symbol, targetPrice, currentPrice, note = "") => {
        try {
            const res = await axios.post(`${API_URL}/set-alarm`, { 
                username, 
                symbol, 
                targetPrice, 
                currentPrice,
                note // <-- Yeni mesaj verisi buraya eklendi
            });
            return res.data;
        } catch (error) {
            throw { message: 'Alarm kurulamadı.' };
        }
    },

    // Alarmları Listele
    getAlarms: async (username) => {
        try {
            const res = await axios.post(`${API_URL}/get-alarms`, { username });
            return res.data.alarms; 
        } catch (error) {
            console.error("Alarm getirme hatası:", error);
            return []; 
        }
    },

    // Alarm Sil
    deleteAlarm: async (username, alarmId) => {
        try {
            const res = await axios.post(`${API_URL}/delete-alarm`, { username, alarmId });
            return res.data;
        } catch (error) {
            throw { message: 'Silme hatası' };
        }
    },

    // Alarm Güncelle (GÜNCELLENDİ: note parametresi eklendi)
    updateAlarm: async (username, alarmId, newTargetPrice, currentPrice, note = "") => {
        try {
            const res = await axios.post(`${API_URL}/update-alarm`, { 
                username, 
                alarmId, 
                newTargetPrice, 
                currentPrice,
                note // <-- Yeni mesaj verisi buraya eklendi
            });
            return res.data;
        } catch (error) {
            throw { message: 'Güncelleme hatası.' };
        }
    }
};