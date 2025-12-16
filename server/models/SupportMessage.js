const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  text: String,
  date: { type: String } 
});

const SupportMessageSchema = new mongoose.Schema({
  username: { type: String },
  name: { type: String, required: true },
  contact: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  reply: { type: String, default: "" },
  status: { type: String, default: 'Bekliyor' },
  date: { type: String }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportMessage', SupportMessageSchema);