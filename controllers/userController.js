const User = require('../models/User');
const Category = require('../models/Category');
const HeroSlide = require('../models/HeroSlide');
const Deal = require('../models/Deal');
const Provider = require('../models/Provider');
const FleetIntel = require('../models/FleetIntel');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const Ride = require('../models/Ride');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// User Login / Initialization
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

        let user = await User.findOne({ email });
        
        if (!user) {
            // Auto-register if user doesn't exist (optional, or send error)
            // For now, let's just return error to be more standard
            return res.status(404).json({ success: false, message: "User not found. Please register." });
        }

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        res.json({ success: true, user, token });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ success: false, message: "User already exists" });

        user = new User({
            userId: "USR" + Date.now(),
            name,
            email,
            password,
            phone: phone || "",
            walletBalance: 0
        });

        await user.save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        res.status(201).json({ success: true, user, token });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createProfile = async (req, res) => {
    try {
        const { name, email, profilePhoto, phone } = req.body;
        // Check if user already exists (e.g. from OTP step)
        let user = await User.findOne({ phone: phone });

        if (user) {
            // Update existing
            user.name = name;
            user.email = email;
            if (profilePhoto) user.profilePhoto = profilePhoto;
            await user.save();
        } else {
            // Create new
            const userId = "USR" + Date.now();
            user = new User({
                userId,
                name,
                email,
                profilePhoto,
                phone: phone || "1234567890",
                walletBalance: 0.00
            });
            await user.save();
        }

        res.status(201).json({
            success: true,
            message: "Profile created successfully",
            user
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getHomeData = async (req, res) => {
    try {
        const userId = req.params.userId;
        let user = await User.findOne({ userId });

        // If user not found, don't create dummy - let the frontend handle the guest/new state
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Dummy seeding removed
        let heroSlides = await HeroSlide.find();
        let deals = await Deal.find();

        // Fetch recent rides for the user
        let recentRides = await Ride.find({ userId }).sort({ createdAt: -1 }).limit(5);
        // Populate driver info for these rides
        const recentTrips = await Promise.all(recentRides.map(async (ride) => {
            const driver = await Provider.findOne({ providerId: ride.driverId });
            return {
                id: ride.rideId,
                destination: ride.dropLocation?.address || 'Trip',
                date: new Date(ride.createdAt).toLocaleDateString(),
                price: `₹${ride.fare}`,
                type: ride.vehicleType?.name || (ride.vehicleType === '2' ? 'E-Rickshaw' : 'Auto'),
                status: ride.status
            };
        }));

        // Fetch Categories for QuickNodes
        const categories = await Category.find();
        const quickNodes = categories.slice(0, 6).map(cat => ({
            id: cat._id,
            name: cat.name?.split(' ')[0] || 'Unknown',
            icon: cat.icon,
            color: '#6366F1',
            catId: cat.id
        }));

        let fleetIntelDoc = await FleetIntel.findOne({ identifier: 'main' });
        const fleetIntel = fleetIntelDoc || {};

        // Fetch Live Online Providers for Home Display (Relaxed verification as requested)
        const liveProviders = await Provider.find({
            status: 'online'
        });

        // Group them by category
        const liveProvidersByCategory = liveProviders.reduce((acc, p) => {
            const cat = p.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {});

        const homeData = {
            userId: user.userId,
            userName: user.name,
            walletBalance: user.walletBalance,
            addresses: user.addresses,
            recentSearches: user.recentSearches,
            heroSlides,
            quickNodes,
            deals,
            fleetIntel,
            recentTrips, // Dynamic trips history
            liveProvidersByCategory, // New field for home display
            stats: { activeOrders: 1, notifications: 3 }
        };

        res.json({
            success: true,
            ...homeData
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.params.userId;
        let user = await User.findOne({ userId });

        if (!user && userId === 'USR123') {
            // Seed default user for demo/testing
            user = new User({
                userId: 'USR123',
                name: 'System Test User',
                email: 'biman@localservice.plus',
                phone: '9876543210',
                profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
                walletBalance: 2500,
                missions: 128,
                trustScore: 4.98,
                xpPoints: 2400
            });
            await user.save();
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User identity not found in network" });
        }

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { userId, name, email, profilePhoto } = req.body;
        const user = await User.findOneAndUpdate(
            { userId },
            { name, email, profilePhoto },
            { new: true, upsert: true } // Create if doesn't exist during update
        );
        res.json({ success: true, message: "Profile data synchronized", user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDashboardData = (req, res) => {
    res.json({ message: "Dashboard functionality moved to Home or specific screens" });
};

exports.getProviders = async (req, res) => {
    try {
        const { category, area, pincode, latitude, longitude, radius } = req.query;

        // Dummy seeding removed - only real registered providers will be shown
        // let count = await Provider.countDocuments();
        // if (count === 0) { ... }

        // Build query based on filters
        let query = {
            // isVerified: true // Temporarily relaxed to show all sellers as requested
        };

        // Build $and conditions array
        let andConditions = [];

        // Show providers that are either 'online' or 'busy' (will be filtered in UI if needed)
        // For testing, we show everything except explicitly 'offline' ones
        andConditions.push({ status: { $ne: 'offline' } });

        // EXCLUDE transport, bus, and courier ONLY if a specific category wasn't requested
        if (!category || category === 'all') {
            andConditions.push({
                category: { $nin: ['transport', 'bus', 'courier', 'Bus/Auto'] }
            });
        }

        // Category filter - match service providers by their category
        if (category && category !== 'all') {
            andConditions.push({
                $or: [
                    { category: { $regex: category, $options: 'i' } },
                    { 'services.category': { $regex: category, $options: 'i' } }
                ]
            });
        }

        // Add $and conditions if any exist
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        // Find providers based on query
        let providers = await Provider.find(query);

        // Map and sort providers
        const userLat = latitude ? parseFloat(latitude) : null;
        const userLon = longitude ? parseFloat(longitude) : null;

        providers = providers.map(provider => {
            const providerObj = provider.toObject();
            let distance = 0;

            // Extract coordinates from either coordinate object or location GeoJSON
            let pLat = providerObj.coordinate?.latitude;
            let pLon = providerObj.coordinate?.longitude;

            if ((!pLat || !pLon) && providerObj.location?.coordinates) {
                pLon = providerObj.location.coordinates[0];
                pLat = providerObj.location.coordinates[1];
            }

            // Ensure we have a valid coordinate object for the frontend Map Marker
            const finalCoordinate = {
                latitude: pLat || 26.1158,
                longitude: pLon || 91.7086
            };

            if (userLat !== null && userLon !== null && pLat && pLon) {
                distance = calculateDistance(userLat, userLon, pLat, pLon);
            }

            return {
                ...providerObj,
                coordinate: finalCoordinate,
                distance: distance > 0 ? distance.toFixed(1) + ' km' : (providerObj.distance || 'Nearby'),
                distanceValue: distance
            };
        });

        if (userLat !== null && userLon !== null) {
            providers.sort((a, b) => a.distanceValue - b.distanceValue);
        }

        // Return response with availability status
        res.json({
            success: true,
            count: providers.length,
            available: providers.length > 0,
            message: providers.length > 0
                ? `Found ${providers.length} provider(s)`
                : 'No providers available at this time',
            filters: {
                category: category || 'all'
            },
            providers: providers
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProviderProfile = async (req, res) => {
    try {
        const providerId = req.params.providerId;
        const provider = await Provider.findOne({ providerId });
        if (!provider) {
            return res.status(404).json({ success: false, message: "Provider not found in the matrix" });
        }
        res.json({ success: true, provider });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

exports.createBooking = async (req, res) => {
    try {
        const { userId, providerId, category, subCategory, address, price, userLocation, isProject, expectedDuration } = req.body;
        const bookingId = "BK" + Math.floor(Math.random() * 1000000);
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const booking = new Booking({
            bookingId,
            userId,
            providerId,
            category,
            subCategory,
            address,
            price,
            otp,
            userLocation,
            isProject: isProject || false,
            expectedDuration: expectedDuration || 1,
            providerLocation: {
                latitude: userLocation.latitude + 0.01, // Mock provider starting position
                longitude: userLocation.longitude + 0.01
            }
        });

        await booking.save();
        res.status(201).json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getBookings = async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });

        // Add Provider data to each booking
        const bookingsWithProvider = await Promise.all(bookings.map(async (booking) => {
            const provider = await Provider.findOne({ providerId: booking.providerId });
            return { ...booking.toObject(), provider };
        }));

        res.json({ success: true, bookings: bookingsWithProvider });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        let booking = await Booking.findOne({ bookingId });

        // Seed for demo if not found
        if (!booking && bookingId.startsWith('BK')) {
            booking = new Booking({
                bookingId,
                userId: 'USR123',
                providerId: 'P1',
                category: 'plumbing',
                subCategory: 'Pipe Repair',
                address: 'Bhetapara, Guwahati',
                price: 250,
                otp: '4492',
                userLocation: { latitude: 26.1158, longitude: 91.7086 },
                providerLocation: { latitude: 26.1200, longitude: 91.7150 }
            });
            await booking.save();
        }

        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

        res.json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { bookingId, otp } = req.body;
        const booking = await Booking.findOne({ bookingId });

        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

        if (booking.otp === otp) {
            booking.status = 'ongoing';
            await booking.save();
            res.json({ success: true, message: "OTP Verified. Service Started." });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP CODE." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.submitReview = async (req, res) => {
    try {
        const { bookingId, userId, providerId, rating, tags, comment } = req.body;
        const reviewId = "REV" + Date.now();

        const review = new Review({
            reviewId,
            bookingId,
            userId,
            providerId,
            rating,
            tags,
            comment
        });

        await review.save();

        // Calculate new average rating for provider
        const reviews = await Review.find({ providerId });
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        await Provider.findOneAndUpdate(
            { providerId },
            {
                rating: avgRating.toFixed(1),
                reviews: reviews.length
            }
        );

        // Mark booking as completed
        const completedBooking = await Booking.findOneAndUpdate({ bookingId }, { status: 'completed' }, { new: true });

        if (completedBooking && completedBooking.providerId) {
            // Credit provider's wallet
            await Provider.findOneAndUpdate(
                { providerId: completedBooking.providerId },
                { $inc: { walletBalance: completedBooking.price || 0 } }
            );
        }

        // Also try Ride model just in case it's a transport job
        const Ride = require('../models/Ride'); // Ensure Ride is available
        await Ride.findOneAndUpdate({ rideId: bookingId }, { status: 'completed' });

        res.status(201).json({ success: true, message: "Review submitted successfully", review });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.processPayment = async (req, res) => {
    try {
        const { userId, amount, bookingId, description } = req.body;
        const user = await User.findOne({ userId });

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.walletBalance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        // Deduct balance
        user.walletBalance -= amount;
        await user.save();

        // Create transaction
        const transactionId = "TX" + Date.now();
        const transaction = new Transaction({
            transactionId,
            userId,
            bookingId,
            amount,
            type: 'debit',
            description: description || 'Service Payment'
        });

        await transaction.save();

        res.json({ success: true, message: "Payment processed successfully", newBalance: user.walletBalance, transaction });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addFunds = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        const user = await User.findOne({ userId });

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Add balance
        user.walletBalance += parseFloat(amount);
        await user.save();

        // Create transaction
        const transactionId = "TX" + Date.now();
        const transaction = new Transaction({
            transactionId,
            userId,
            amount: parseFloat(amount),
            type: 'credit',
            description: description || 'Wallet Top-up'
        });

        await transaction.save();

        res.json({ success: true, message: "Funds added successfully", newBalance: user.walletBalance, transaction });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.saveSearch = async (req, res) => {
    try {
        const { userId, searchTerm } = req.body;
        if (!searchTerm) {
            return res.status(400).json({ success: false, message: "Search term required" });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Add to front of array, keep only 5, remove duplicates
        let history = user.recentSearches || [];
        history = [searchTerm, ...history.filter(i => i !== searchTerm)].slice(0, 5);

        user.recentSearches = history;
        await user.save();

        res.json({ success: true, recentSearches: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
