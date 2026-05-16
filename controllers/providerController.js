const Category = require('../models/Category');
const ProviderService = require('../models/ProviderService');
const Provider = require('../models/Provider');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Update Provider Location
exports.updateLocation = async (req, res) => {
    try {
        const { providerId, latitude, longitude } = req.body;

        // Find provider first to check current status
        const provider = await Provider.findOne({ providerId });

        let updateData = {
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            coordinate: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
            }
        };

        // Only set online if not already busy
        if (provider && provider.status !== 'busy') {
            updateData.status = 'online';
        }

        await Provider.findOneAndUpdate({ providerId }, updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Check for nearby pending rides (Long Polling substitute)
exports.getNearbyRides = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        // Find rides with status 'searching' or 'pending' within 5km
        // Note: In a real prod app, we'd use robust matching logic.
        const rides = await Ride.find({
            status: { $in: ['searching', 'pending'] }
        }).limit(5); // Get multiple to simulate options

        const enhancedRides = await Promise.all(rides.map(async (ride) => {
            const user = await User.findOne({ userId: ride.userId });
            return {
                id: ride.rideId,
                customer: user?.name || 'Client',
                customerPhoto: user?.profilePhoto || 'https://i.pravatar.cc/150?img=12',
                pickup: ride.pickupLocation.address,
                drop: ride.dropLocation.address,
                price: `₹${ride.fare}`,
                distance: ride.distance,
                rating: user?.trustScore || '4.8',
                timeToPickup: '5 min',
                type: ride.type || 'ride',
                parcelImage: ride.parcelImage
            };
        }));

        if (enhancedRides.length > 0) {
            return res.json({
                success: true,
                rides: enhancedRides, // Changed to plural to be more consistent
                ride: enhancedRides[0] // Keep for backward compatibility
            });
        }

        res.json({ success: true, ride: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Accept Ride
exports.acceptRide = async (req, res) => {
    try {
        const { rideId, providerId } = req.body;
        console.log(`Accepting ride ${rideId} for provider ${providerId}`);

        const ride = await Ride.findOneAndUpdate(
            { rideId },
            {
                status: 'accepted',
                driverId: providerId,
                otp: Math.floor(1000 + Math.random() * 9000).toString() // Generate simple OTP
            },
            { new: true }
        );

        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Start Ride
exports.startRide = async (req, res) => {
    try {
        const { rideId, otp } = req.body;
        console.log(`Starting ride ${rideId} with OTP ${otp}`);

        const ride = await Ride.findOne({ rideId });
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        if (ride.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        ride.status = 'on_ride';
        ride.startTime = new Date();
        await ride.save();

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Complete Ride
exports.completeRide = async (req, res) => {
    try {
        const { rideId } = req.body;
        console.log(`Completing ride ${rideId}`);

        const ride = await Ride.findOne({ rideId });
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        ride.status = 'completed';
        ride.endTime = new Date();

        // Mock payment update
        ride.paymentStatus = 'completed';

        await ride.save();

        // Update provider earnings
        if (ride.driverId) {
            await Provider.findOneAndUpdate(
                { providerId: ride.driverId },
                { $inc: { walletBalance: ride.fare } }
            );
        }

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Provider Ride History
exports.getRideHistory = async (req, res) => {
    try {
        const { providerId } = req.params;
        const rides = await Ride.find({ driverId: providerId }).sort({ createdAt: -1 });

        // Populate customer info (if User model ref exists, or mock)
        const populatedRides = await Promise.all(rides.map(async (ride) => {
            const user = await User.findOne({ userId: ride.userId });
            return {
                id: ride.rideId,
                customer: user?.name || 'Client',
                customerPhoto: user?.profilePhoto || 'https://i.pravatar.cc/150?img=12',
                pickup: ride.pickupLocation.address,
                drop: ride.dropLocation.address,
                date: ride.createdAt.toLocaleDateString(),
                price: `₹${ride.fare}`,
                distance: ride.distance,
                status: ride.status,
                rating: ride.rating || 0,
                type: ride.vehicleType
            };
        }));

        res.json({ success: true, rides: populatedRides });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// This function is replaced by the unified one below



exports.updateRole = (req, res) => {
    const { providerId, role } = req.body;

    // In a real app, update the provider's role in the database.
    console.log(`Updated role for provider ${providerId} to ${role}`);

    res.json({ success: true, message: "Role updated successfully" });
};



exports.getBookings = async (req, res) => {
    try {
        const providerId = req.params.providerId;
        const provider = await Provider.findOne({ providerId });

        let allJobs = [];

        if (provider && provider.category === 'transport') {
            const rides = await Ride.find({ driverId: providerId }).sort({ createdAt: -1 });
            allJobs = await Promise.all(rides.map(async r => {
                const user = await User.findOne({ userId: r.userId });
                return {
                    id: r.rideId,
                    customerName: user?.name || 'Customer',
                    serviceType: r.vehicleType?.name || 'Ride',
                    address: r.pickupLocation?.address,
                    time: r.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    amount: `₹${r.fare}`,
                    status: r.status,
                    date: r.createdAt.toLocaleDateString()
                };
            }));
        } else {
            const bookings = await Booking.find({ providerId }).sort({ createdAt: -1 });
            allJobs = await Promise.all(bookings.map(async b => {
                const user = await User.findOne({ userId: b.userId });
                return {
                    id: b.bookingId,
                    customerName: user?.name || 'Customer',
                    serviceType: b.category,
                    address: b.address,
                    time: b.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    amount: `₹${b.price}`,
                    status: b.status,
                    date: b.createdAt.toLocaleDateString()
                };
            }));
        }

        res.json(allJobs);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const { providerId } = req.params;
        const provider = await Provider.findOne({ providerId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider profile not detected in system stack' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch stats from both models
        const bookings = await Booking.find({ providerId });
        const rides = await Ride.find({ driverId: providerId });

        const completedJobs = [...bookings, ...rides].filter(b => b.status === 'completed');
        const todayCompleted = completedJobs.filter(b => b.createdAt >= today);

        const totalRevenue = todayCompleted.reduce((sum, item) => sum + (item.price || item.fare || 0), 0);
        const totalCompletedCount = completedJobs.length;

        const dashboard = {
            userName: provider.name,
            isOnline: provider.status === 'online',
            stats: {
                todayRevenue: `₹${totalRevenue}`,
                revenueTrend: "+14%",
                jobOrders: totalCompletedCount.toString().padStart(2, '0'),
                rating: provider.rating || "5.0",
                walletBalance: `₹${provider.walletBalance || 0}`
            },
            businessHub: {
                newRequests: [...bookings, ...rides].filter(b => b.status === 'pending' || b.status === 'searching').length
            },
            activeJob: null
        };

        // Find active job (Booking or Ride)
        const activeBooking = await Booking.findOne({ providerId, status: { $in: ['accepted', 'ongoing', 'in_progress'] } });
        const activeRide = await Ride.findOne({ driverId: providerId, status: { $in: ['accepted', 'ongoing', 'on_ride'] } });

        const primaryActive = activeBooking || activeRide;

        if (primaryActive) {
            const user = await User.findOne({ userId: primaryActive.userId });
            dashboard.activeJob = {
                id: primaryActive.bookingId || primaryActive.rideId,
                status: primaryActive.status.toUpperCase(),
                fare: `₹${primaryActive.price || primaryActive.fare}`,
                title: primaryActive.category ? `${primaryActive.category} - ${primaryActive.subCategory || 'Service'}` : `Ride Mission`,
                location: primaryActive.address || primaryActive.pickupLocation?.address,
                clientName: user?.name || "Customer",
                clientAvatar: user?.profilePhoto || "https://i.pravatar.cc/150?img=32",
                startTime: primaryActive.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        }

        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.acceptBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        console.log(`Accepting booking ${bookingId}`);

        const booking = await Booking.findOneAndUpdate(
            { bookingId },
            { status: 'accepted' },
            { new: true }
        );

        if (booking && booking.providerId) {
            // Mark provider as busy so they don't show in user searches
            await Provider.findOneAndUpdate(
                { providerId: booking.providerId },
                { status: 'busy' }
            );
        }

        res.json({ success: true, message: "Booking accepted. Provider is now busy.", booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.completeBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        console.log(`Completing booking ${bookingId}`);

        const booking = await Booking.findOneAndUpdate(
            { bookingId },
            { status: 'completed' },
            { new: true }
        );

        if (booking && booking.providerId) {
            // Mark provider as online again
            await Provider.findOneAndUpdate(
                { providerId: booking.providerId },
                { status: 'online' }
            );
        }

        res.json({ success: true, message: "Booking completed. Provider is now online.", booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.rejectBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        console.log(`Rejected booking ${bookingId}`);
        const booking = await Booking.findOneAndUpdate(
            { bookingId },
            { status: 'rejected' },
            { new: true }
        );
        res.json({ success: true, message: "Booking rejected", booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getJobDetails = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const booking = await Booking.findOne({ bookingId: jobId });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // Format to match frontend expectation
        const job = {
            id: booking.bookingId,
            status: booking.status.toUpperCase(), // IN_PROGRESS etc
            fare: `₹${booking.price}`,
            title: `${booking.category} - ${booking.subCategory}`,
            location: booking.address,
            clientName: "Customer", // Needs populate
            clientAvatar: "https://i.pravatar.cc/150?img=32", // Mock
            startTime: booking.createdAt.toDateString(),
            services: [booking.subCategory],
            timeline: [
                { time: booking.createdAt.toLocaleTimeString(), event: "Booking Created" }
            ]
        };

        res.json(job);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



exports.getProfile = async (req, res) => {
    try {
        const providerId = req.params.providerId;
        const provider = await Provider.findOne({ providerId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const profile = {
            providerId: provider.providerId,
            name: provider.name,
            phone: provider.phone,
            email: provider.email,
            role: provider.category || "Service Provider",
            rating: provider.rating || "5.0",
            reviews: provider.reviews || 0,
            completedJobs: 0,
            avatar: provider.image || "https://i.pravatar.cc/150?img=68",
            isVerified: provider.isVerified || false,
            verified: provider.verified || false
        };

        // If it's a 'service' role, count from Booking model
        const bookingCount = await Booking.countDocuments({ providerId, status: 'completed' });
        profile.completedJobs = bookingCount;

        // If it's a 'transport' role, add from Ride model
        const rideCount = await Ride.countDocuments({ driverId: providerId, status: 'completed' });
        profile.completedJobs += rideCount;

        res.json({ success: true, provider: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getEarnings = async (req, res) => {
    try {
        const providerId = req.params.providerId;
        const provider = await Provider.findOne({ providerId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // Fetch completed bookings and rides
        const bookings = await Booking.find({ providerId, status: 'completed' });
        const rides = await Ride.find({ driverId: providerId, status: 'completed' });

        const totalEarningsValue = [...bookings, ...rides].reduce((sum, item) => sum + (item.price || item.fare || 0), 0);

        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const weeklyEarnings = [...bookings, ...rides]
            .filter(item => item.createdAt >= startOfWeek)
            .reduce((sum, item) => sum + (item.price || item.fare || 0), 0);

        const monthlyEarnings = [...bookings, ...rides]
            .filter(item => item.createdAt >= startOfMonth)
            .reduce((sum, item) => sum + (item.price || item.fare || 0), 0);

        const earnings = {
            totalEarnings: `₹${totalEarningsValue.toLocaleString()}`,
            weeklyEarnings: `₹${weeklyEarnings.toLocaleString()}`,
            monthlyEarnings: `₹${monthlyEarnings.toLocaleString()}`,
            walletBalance: `₹${(provider.walletBalance || 0).toLocaleString()}`,
            pendingPayout: "₹0.00",
            history: [...bookings, ...rides].sort((a, b) => b.createdAt - a.createdAt).map(item => ({
                id: item.bookingId || item.rideId,
                service: item.category || item.vehicleType?.name || "Service",
                amount: `₹${item.price || item.fare}`,
                status: "completed",
                date: item.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            })).slice(0, 15)
        };

        res.json(earnings);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getServiceCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getVehicleTypes = async (req, res) => {
    try {
        // Harmonized with User App TRANSPORT_TYPES, Filtered for Provider Setup
        const vehicles = [
            {
                id: '2',
                name: 'E-Rickshaw',
                icon: 'rickshaw-electric',
                color: '#00D1FF',
                description: 'Eco-friendly local',
                category: 'Green',
                requiresNumber: false
            },
            {
                id: '3',
                name: 'Auto Rickshaw',
                icon: 'rickshaw',
                color: '#FFD700',
                description: 'City standard',
                category: 'Three Wheeler',
                requiresNumber: true
            }
        ];
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addServiceToCatalog = async (req, res) => {
    try {
        const { providerId, serviceName, category, price } = req.body;
        const newService = new ProviderService({
            providerId,
            serviceName,
            category,
            price: parseFloat(price)
        });
        await newService.save();
        res.json({ success: true, message: "Service added successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.submitOnboarding = async (req, res) => {
    try {
        const { providerId, profileData, bankDetails } = req.body;
        
        // When using multipart/form-data, JSON objects often come as strings
        const parsedProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        const parsedBank = typeof bankDetails === 'string' ? JSON.parse(bankDetails) : bankDetails;

        // Extract Cloudinary URLs from uploaded files
        const docs = {};
        if (req.files) {
            if (req.files.idFront) docs.idFront = req.files.idFront[0].path;
            if (req.files.idBack) docs.idBack = req.files.idBack[0].path;
            if (req.files.license) docs.license = req.files.license[0].path;
            if (req.files.businessLicense) docs.businessLicense = req.files.businessLicense[0].path;
            if (req.files.vehicleRC) docs.vehicleRC = req.files.vehicleRC[0].path;
        }

        let updateFields = {
            name: parsedProfile?.name,
            email: parsedProfile?.email,
            category: parsedProfile?.category || 'transport',
            documents: docs,
            bankDetails: parsedBank,
            isVerified: false,
            verified: false
        };

        // If transport/driver, handle vehicle details
        if (parsedProfile?.vehicleDetails) {
            updateFields.services = [{
                category: 'transport',
                subCategory: parsedProfile.vehicleDetails.type, // '2' or '3'
                price: parsedProfile.vehicleDetails.type === '3' ? 30 : 10 // Default base price
            }];
            updateFields.category = 'transport';
        }

        const updatedProvider = await Provider.findOneAndUpdate(
            { providerId },
            updateFields,
            { new: true }
        );

        if (!updatedProvider) {
            return res.status(404).json({ success: false, message: "Provider profile not found" });
        }

        res.json({ success: true, message: "Onboarding documents synchronized. Verification protocol initiated.", provider: updatedProvider });
    } catch (error) {
        console.error('Onboarding Submission Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBankDetails = async (req, res) => {
    try {
        const { providerId, accountHolder, accountNumber, ifscCode, bankName } = req.body;

        const provider = await Provider.findOneAndUpdate(
            { providerId },
            {
                bankDetails: { accountHolder, accountNumber, ifscCode, bankName }
            },
            { new: true }
        );

        if (!provider) {
            return res.status(404).json({ success: false, message: "Provider not found" });
        }

        res.json({ success: true, message: "Bank credentials synchronized with ledger" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { providerId, status } = req.body;
        console.log(`Updating status for ${providerId} to ${status}`);

        const provider = await Provider.findOneAndUpdate(
            { providerId },
            { status },
            { new: true }
        );

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        res.json({ success: true, status: provider.status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.requestPayout = async (req, res) => {
    try {
        const { providerId, amount } = req.body;
        const provider = await Provider.findOne({ providerId });

        if (!provider) return res.status(404).json({ success: false, message: "Identity not found" });

        const requestAmount = parseFloat(amount.toString().replace('₹', '').replace(',', ''));

        if (provider.walletBalance < requestAmount) {
            return res.status(400).json({ success: false, message: "Insufficient credits for payout" });
        }

        // Deduct from wallet and log to history
        provider.walletBalance -= requestAmount;
        provider.payoutHistory.push({
            amount: requestAmount,
            status: 'pending'
        });

        await provider.save();

        res.json({ success: true, message: "Payout mission initiated. Verification in progress." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password, phone } = req.body;
        
        let query = {};
        if (email) {
            query.email = email;
        } else if (phone) {
            query.phone = phone;
        } else {
            return res.status(400).json({ success: false, message: "Email or Phone required" });
        }

        let provider = await Provider.findOne(query);
        
        if (!provider) {
            return res.status(404).json({ success: false, message: "Partner not found. Please register." });
        }

        if (!(await provider.comparePassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: provider._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        res.json({
            success: true,
            provider: {
                providerId: provider.providerId,
                name: provider.name,
                email: provider.email,
                phone: provider.phone,
                role: provider.category || 'transport',
                isVerified: provider.isVerified || false,
                isRegistered: !!provider.category
            },
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone, category } = req.body;

        let provider = await Provider.findOne({ email });
        if (provider) return res.status(400).json({ success: false, message: "Provider already exists" });

        provider = new Provider({
            providerId: 'P' + Date.now(),
            name,
            email,
            password,
            phone: phone || "",
            category: category || 'transport',
            isVerified: false,  // Must be false for admin verification flow
            verified: false,
            status: 'offline',
            walletBalance: 0
        });

        await provider.save();
        const token = jwt.sign({ id: provider._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            provider: {
                providerId: provider.providerId,
                name: provider.name,
                email: provider.email,
                phone: provider.phone,
                role: provider.category || 'transport',
                isVerified: provider.isVerified || false,
                isRegistered: !!provider.category
            },
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.verifyOTP = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        console.log(`Verifying OTP for ${phoneNumber}: ${otp}`);

        // Simple mock for testing: if OTP is '123456', it's valid
        if (otp !== '123456') {
            return res.status(401).json({ success: false, message: "Invalid security code" });
        }

        let provider = await Provider.findOne({ phone: phoneNumber });

        if (!provider) {
            // Auto-register logic for demo/testing
            provider = new Provider({
                providerId: 'P' + Date.now(),
                name: 'Elite Partner',
                phone: phoneNumber,
                email: `partner_${phoneNumber}@localservice.plus`,
                password: await bcrypt.hash('password123', 10),
                status: 'online',
                isVerified: true,
                verified: true
            });
            await provider.save();
        }

        const token = jwt.sign({ id: provider._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        res.json({
            success: true,
            provider: {
                providerId: provider.providerId,
                name: provider.name,
                email: provider.email,
                phone: provider.phone,
                role: provider.category || 'transport',
                isVerified: provider.isVerified || false
            },
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
