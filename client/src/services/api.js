import axios from 'axios';

const API_URL = "http://localhost:3001/api";

// Grafik verisi çeker
export const getHistory = async (symbol) => {
    const response = await axios.get(`${API_URL}/history?symbol=${symbol}`);
    return response.data;
};

// Bildirim gönderir
export const sendNotification = async (title, message, type = 'info') => {
    const response = await axios.post(`${API_URL}/notification`, { 
        title, message, type 
    });
    return response.data;
};