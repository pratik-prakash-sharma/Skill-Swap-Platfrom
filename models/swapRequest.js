const mongoose = require("mongoose");

const swapRequestSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requestedSkill: { type: mongoose.Schema.Types.ObjectId, ref: "Skill" },
    offeredSkill: String,
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
});

module.exports = mongoose.model("SwapRequest", swapRequestSchema);
