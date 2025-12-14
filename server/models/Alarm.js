const mongoose = require('mongoose');

const AlarmSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  symbol: { type: String, required: true },
  targetPrice: { type: Number, required: true },
  direction: { type: String, enum: ['UP', 'DOWN'] },
  note: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alarm', AlarmSchema);