const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String },
    commissionRate: { type: Number, default: 10 },
    subCategories: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }
});

module.exports = mongoose.model('Category', categorySchema);
