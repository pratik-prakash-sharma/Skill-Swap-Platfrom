const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
    name: String,
    username: String,
    email: String,
    mobile: String,
    password: String,
    otp: String,
    otpExpiresAt: Date
});

module.exports = mongoose.model("TempUser", tempUserSchema);
