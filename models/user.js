const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String
    },
    emailVerified: { type: Boolean, default: false },
    emailToken: String,
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
})

const User = mongoose.model("User", userSchema);

module.exports = User;