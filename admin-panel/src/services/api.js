import axios from 'axios';

const API_URL = "http://localhost:3001/api";

export const AuthService = {
    // GİRİŞ İŞLEMLERİ
    adminLogin: async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            return res.data;
        } catch (error) {
            throw { message: error.response?.data?.message || 'Bağlantı hatası' };
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

    // İSTATİSTİKLER
    adminGetStats: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/stats`);
            return res.data;
        } catch (error) {
            console.error("Stats fetch error", error);
            return { totalUsers: 0, totalAlarms: 0, onlineCount: 0, uptime: '00:00:00' };
        }
    },

    adminSendBroadcast: async (title, message, type) => {
        try {
            const res = await axios.post(`${API_URL}/notification`, { title, message, type });
            return res.data;
        } catch (error) {
            throw { message: 'Duyuru gönderilemedi.' };
        }
    },

    adminGetSupportMessages: async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/support`);
            return res.data;
        } catch (error) { return { messages: [] }; }
    },

    adminDeleteSupportMessage: async (id) => {
        try {
            await axios.post(`${API_URL}/admin/delete-support`, { id });
        } catch (error) { console.error(error); }
    },

    adminReplyToUser: async (targetUser, message) => {
        try {
            await axios.post(`${API_URL}/notification`, { 
                title: 'Destek Yanıtı', 
                message: message, 
                type: 'info', 
                targetUser: targetUser 
            });
        } catch (error) {
            throw { message: 'Yanıt gönderilemedi.' };
        }
    },

    adminReplySupport: async (id, username, replyMessage) => {
        try {
            await axios.post(`${API_URL}/admin/reply-support`, { id, username, replyMessage });
        } catch (error) {
            throw { message: 'Yanıt gönderilemedi.' };
        }
    }
};