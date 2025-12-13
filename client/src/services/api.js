import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export const AuthService = {
    // AUTH İŞLEMLERİ
    adminLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Bağlantı hatası' };
        }
    },
    
    register: async (username, password, email, phone, birthDate, gender) => { 
        try {
            const response = await axios.post(`${API_URL}/register`, { username, password, email, phone, birthDate, gender });
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : { message: 'Sunucu hatası' };
        }
    },

    userLogin: async (loginInput, password) => {
        try {
            const response = await axios.post(`${API_URL}/login`, { loginInput, password });
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : { message: 'Sunucu hatası' };
        }
    },

    logout: async (username) => {
        try {
            await axios.post(`${API_URL}/logout`, { username });
        } catch (error) {
            console.error("Çıkış hatası:", error);
        }
    },


    updateProfile: async (currentUsername, currentPassword, newPass, newUsername, newEmail, newPhone, newGender, newBirthDate) => {
        try {
            const response = await axios.post(`${API_URL}/update-profile`, { 
                currentUsername, currentPassword, 
                newPassword: newPass, newUsername,
                newEmail, newPhone, newGender, newBirthDate 
            });
            return response.data;
        } catch (error) {
            throw error.response ? error.response.data : { message: 'Hata' };
        }
    },

    deleteAccount: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/delete-my-account`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Silme hatası' };
        }
    },

    // FAVORİ İŞLEMLERİ
    toggleFavorite: async (username, symbol) => {
        try {
            const res = await axios.post(`${API_URL}/toggle-favorite`, { username, symbol });
            return res.data;
        } catch (error) {
            console.error(error);
            return { favorites: [] };
        }
    },

    // ALARM İŞLEMLERİ
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

    // ADMIN İŞLEMLERİ
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

    adminSendBroadcast: async (title, message) => {
        try {
            const res = await axios.post(`${API_URL}/notification`, { title, message, type: 'info' });
            return res.data;
        } catch (error) {
            throw { message: 'Duyuru gönderilemedi.' };
        }
    },

    sendSupport: async (username, subject, message, contactInfo = null) => {
        try {
            const res = await axios.post(`${API_URL}/support`, { username, subject, message, contactInfo });
            return res.data;
        } catch (error) {
            throw { message: 'Mesaj gönderilemedi.' };
        }
    }

};