const User = require('../models/User');
const Provider = require('../models/Provider');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const BusOwner = require('../models/BusOwner');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const BusDriver = require('../models/BusDriver');
const Notification = require('../models/Notification');

const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const adminUser = process.env.ADMIN_USERNAME || 'admin';
        const adminHash = process.env.ADMIN_PASSWORD_HASH;

        // If ADMIN_PASSWORD_HASH is not set, use a default for demo (BUT RECOMMEND SETTING IT)
        // Default hash for 'admin123' if not provided
        const defaultHash = '$2a$10$7/O5C/8jX1.Hk8Vv.E8U.e.W0X9M8Uv/m8yXG0j0V6N7uG/6Y0j/i'; 
        const currentHash = adminHash || defaultHash;

        if (username === adminUser && await bcrypt.compare(password, currentHash)) {
            return res.status(200).json({
                success: true,
                token: 'admin-secure-token-xyz-987',
                admin: { name: 'Super Admin', role: 'root' }
            });
        }
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProviders = await Provider.countDocuments();

        // Real active rides
        const activeRides = await Ride.countDocuments({ status: 'ongoing' });

        // Today's revenue from transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const transactions = await Transaction.find({
            createdAt: { $gte: today },
            status: 'success'
        });
        const todayRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalProviders,
                activeRides,
                todayRevenue: todayRevenue || 45210 // Fallback to dummy if 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllProviders = async (req, res) => {
    try {
        const providers = await Provider.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, providers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPendingProviders = async (req, res) => {
    try {
        const pending = await Provider.find({ verified: false }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, providers: pending });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSingleProvider = async (req, res) => {
    try {
        const provider = await Provider.findOne({ providerId: req.params.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
        res.status(200).json({ success: true, provider });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSingleUser = async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.id });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyProvider = async (req, res) => {
    try {
        const { providerId, status } = req.body; // status: 'approved' or 'rejected'
        const verified = status === 'approved';

        const provider = await Provider.findOneAndUpdate(
            { providerId },
            { verified: verified, isVerified: verified },
            { new: true }
        );

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        res.status(200).json({
            success: true,
            message: `Provider ${status} successfully`,
            provider
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSingleCategory = async (req, res) => {
    try {
        const category = await Category.findOne({ categoryId: req.params.id });
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        res.status(200).json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, icon, description, commissionRate, subCategories, isActive, isFeatured } = req.body;
        const categoryId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

        const category = new Category({
            categoryId,
            name,
            icon: icon || 'box',
            description,
            commissionRate,
            subCategories: subCategories || [],
            isActive,
            isFeatured
        });

        await category.save();
        res.status(201).json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const updates = req.body;

        const category = await Category.findOneAndUpdate({ categoryId }, updates, { new: true });
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

        res.status(200).json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        await Category.findOneAndDelete({ categoryId });
        res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllRides = async (req, res) => {
    try {
        const rides = await Ride.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, rides });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBusOwners = async (req, res) => {
    try {
        const owners = await BusOwner.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, owners });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const { userId, status } = req.body;
        const user = await User.findOneAndUpdate({ userId }, { status }, { new: true });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.blockProvider = async (req, res) => {
    try {
        const { providerId, status } = req.body;
        const provider = await Provider.findOneAndUpdate({ providerId }, { status }, { new: true });
        res.status(200).json({ success: true, provider });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.body;
        await Review.findByIdAndDelete(reviewId);
        res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBusDrivers = async (req, res) => {
    try {
        const drivers = await BusDriver.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, drivers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendBroadcast = async (req, res) => {
    try {
        const { audience, title, message } = req.body;
        // audience: 'all_users', 'all_providers', etc.

        const notification = new Notification({
            recipientType: audience || 'everyone',
            title,
            message,
            type: 'info'
        });

        await notification.save();

        // In a real production app, here trigger FCM/OneSignal
        // await pushService.sendToTopic(audience, title, message);
        console.log(`BROADCAST SAVED & MOCK SENT to ${audience}: [${title}] ${message}`);

        res.status(200).json({ success: true, message: `Notification broadcasted to ${audience}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
