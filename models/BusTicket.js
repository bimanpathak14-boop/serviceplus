const mongoose = require('mongoose');

const busTicketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    routeId: { type: String, required: true },
    busNumber: { type: String },
    from: { type: String },
    to: { type: String },
    fare: { type: Number },
    status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' },
    purchaseDate: { type: Date, default: Date.now },
    expiryDate: { type: Date }
});

module.exports = mongoose.model('BusTicket', busTicketSchema);
