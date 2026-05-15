const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const providerSchema = new mongoose.Schema({
    providerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { type: String, required: true },
    phone: { type: String },
    image: { type: String },
    rating: { type: String, default: "5.0" },
    reviews: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    specialty: { type: String },
    category: { type: String },
    price: { type: String },
    status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    coordinate: {
        // Keeping this for backward compatibility if needed, but 'location' is primary for geo queries
        distance: { type: String },
        // Location details for area/pincode filtering
        area: { type: String }, // e.g., "Jalukbari", "Adabari"
        pincode: { type: String }, // e.g., "781014"
        city: { type: String, default: "Guwahati" },
        state: { type: String, default: "Assam" },
        serviceRadius: { type: Number, default: 5 }, // Service radius in km
    },
    businessDetails: {
        registrationNumber: { type: String },
        panNumber: { type: String },
        gstNumber: { type: String }
    },
    services: [{
        category: { type: String },
        subCategory: { type: String },
        price: { type: Number }
    }],
    bankDetails: {
        accountHolder: String,
        accountNumber: String,
        ifscCode: String,
        bankName: String
    },
    documents: {
        idFront: String,
        idBack: String,
        businessLicense: String,
        vehicleRC: String
    },
    walletBalance: { type: Number, default: 0 },
    payoutHistory: [{
        amount: Number,
        status: String,
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
providerSchema.pre('save', async function (next) {
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
providerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

providerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Provider', providerSchema);
