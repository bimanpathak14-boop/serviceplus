const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const busDriverSchema = new mongoose.Schema({
    driverId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { type: String, required: true },
    phone: { type: String },
    photo: { type: String },
    licenseNumber: { type: String },
    licensePhoto: { type: String },
    assignedBus: {
        number: String,
        plate: String,
        capacity: Number
    },
    ownerId: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    currentLocation: {
        latitude: Number,
        longitude: Number,
        updatedAt: { type: Date, default: Date.now }
    },
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
busDriverSchema.pre('save', async function (next) {
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
busDriverSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('BusDriver', busDriverSchema);
