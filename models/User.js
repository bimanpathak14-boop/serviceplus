const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { type: String, required: true },
    phone: { type: String },
    profilePhoto: { type: String },
    walletBalance: { type: Number, default: 0 },
    missions: { type: Number, default: 0 },
    trustScore: { type: Number, default: 5.0 },
    xpPoints: { type: Number, default: 0 },
    addresses: [{
        label: String,
        fullAddress: String,
        latitude: Number,
        longitude: Number,
        isDefault: { type: Boolean, default: false }
    }],
    recentSearches: [String],
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
