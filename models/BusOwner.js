const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const busOwnerSchema = new mongoose.Schema({
    ownerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: { type: String, required: true },
    phone: { type: String },
    companyName: { type: String },
    fleet: [{
        busId: String,
        number: String,
        plate: String,
        capacity: Number,
        assignedDriverId: String
    }],
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
busOwnerSchema.pre('save', async function (next) {
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
busOwnerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('BusOwner', busOwnerSchema);
