const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  text: String,
  date: { type: String } // Tarihi string olarak tutmak frontendi daha az yorar
});

const SupportMessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  contactInfo: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  replies: [ReplySchema],
  date: { type: String }, // Mesajın atıldığı tarih (formatlı string)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportMessage', SupportMessageSchema);