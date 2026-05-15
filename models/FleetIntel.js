const mongoose = require('mongoose');

const terminalSchema = new mongoose.Schema({
    terminalId: String,
    name: String,
    dist: String,
    type: String
}, { _id: false });

const fleetIntelSchema = new mongoose.Schema({
    identifier: { type: String, default: 'main' }, // Singleton identifier
    offer: {
        tag: String,
        title: String,
        price: String,
        icon: String
    },
    topDriver: {
        name: String,
        rating: String,
        trips: String,
        image: String
    },
    nearbyTerminals: [terminalSchema]
}, { timestamps: true });

module.exports = mongoose.model('FleetIntel', fleetIntelSchema);
