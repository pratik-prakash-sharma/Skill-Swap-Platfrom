const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
    title : {
        type: String,
        required: true
    },
    desc : {
        type: String   
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
})

const Skill = mongoose.model("Skill", skillSchema);

module.exports = Skill;
