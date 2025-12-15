const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  text: String,
  date: { type: String } // Tarihi string olarak tutmak frontendi daha az yorar
});

const SupportMessageSchema = new mongoose.Schema({
  username: { type: String }, // Üye ise kullanıcı adı, değilse null
  name: { type: String, required: true }, // Görünen isim (Ziyaretçi veya Üye Adı)
  contact: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  reply: { type: String, default: "" },
  status: { type: String, default: 'Bekliyor' },
  date: { type: String }, // Mesajın atıldığı tarih (formatlı string)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportMessage', SupportMessageSchema);