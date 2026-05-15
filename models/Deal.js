const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
    dealId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    code: { type: String, required: true },
    color: { type: String, required: true },
    icon: { type: String, required: true }
});

module.exports = mongoose.model('Deal', dealSchema);
