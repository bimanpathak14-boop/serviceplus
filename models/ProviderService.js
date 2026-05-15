const mongoose = require('mongoose');

const providerServiceSchema = new mongoose.Schema({
    providerId: { type: String, required: true },
    serviceName: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProviderService', providerServiceSchema);
