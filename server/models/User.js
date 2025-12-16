const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  birthDate: { type: Date },
  gender: { type: String },
  isAdmin: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  favorites: [{ type: String }],
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },

  walletBalance: { type: Number, default: 0 }, 
    portfolio: { type: Map, of: Number, default: {} }, 
    savedCard: { 
        number: String,
        holder: String,
        expiry: String,
        cvv: String
    }
});

module.exports = mongoose.model('User', UserSchema);