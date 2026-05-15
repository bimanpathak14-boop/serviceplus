const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewId: { type: String, required: true, unique: true },
    bookingId: { type: String, required: true },
    userId: { type: String, required: true },
    providerId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: [String],
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
