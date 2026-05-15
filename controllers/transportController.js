const Ride = require('../models/Ride');
const Provider = require('../models/Provider');
const Message = require('../models/Message');

// Mock function to simulate finding nearby drivers
// In a real app, this would use geospatial queries
exports.searchDrivers = async (req, res) => {
    try {
        const { vehicleType, pickup, drop, latitude, longitude, serviceType, userId, fare, distance } = req.body;

        // Default to Guwahati if no location provided (for testing)
        const lat = parseFloat(latitude) || 26.1158;
        const lon = parseFloat(longitude) || 91.7086;

        let rideId = null;
        // Create a 'searching' Ride record to make this visible to Providers
        if (userId && drop && fare) {
            rideId = 'REQ' + Date.now();
            const newRide = new Ride({
                rideId,
                userId,
                pickupLocation: {
                    address: pickup,
                    latitude: lat,
                    longitude: lon
                },
                dropLocation: {
                    address: drop || 'Destination',
                    latitude: lat + 0.01, // Mock drop co-ords if missing
                    longitude: lon + 0.01
                },
                fare: parseFloat(fare) || 0,
                distance: distance || '0 km',
                status: 'searching',
                vehicleType: { name: vehicleType }
            });
            await newRide.save();
        }

        let query = {
            'category': 'transport',
            'status': 'online',
            'location': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lon, lat]
                    },
                    $maxDistance: 5000 // 5km radius
                }
            }
        };

        if (vehicleType) {
            // Use case-insensitive regex for more flexible matching
            query['services.subCategory'] = { $regex: new RegExp(vehicleType, 'i') };
        }

        let providers = await Provider.find(query).limit(10);

        // If no specifically matched vehicle types, just return any online transport providers
        if (providers.length === 0) {
            delete query['services.subCategory'];
            providers = await Provider.find(query).limit(10);
        }

        const drivers = providers.map(p => {
            const vType = p.services?.[0]?.subCategory || '2';
            return {
                id: p.providerId,
                name: p.name,
                rating: p.rating || 4.5,
                vehicleNumber: p.businessDetails?.registrationNumber || 'IND 29 A 4402',
                time: calculateTime(p.location.coordinates[1], p.location.coordinates[0], lat, lon) + ' min',
                photo: p.image || 'https://randomuser.me/api/portraits/men/4.jpg',
                trips: p.reviews || 0,
                phone: p.phone,
                vehicleType: vType,
                price: calculateMockPrice(p.location.coordinates[1], p.location.coordinates[0], lat, lon, vType)
            };
        });

        // Add a "Fake" driver if no real drivers are found (for testing purposes)
        if (drivers.length === 0) {
            drivers.push({
                id: 'FAKE_DRIVER_01',
                name: 'Rohan Das (Partner)',
                rating: 4.9,
                vehicleNumber: vehicleType === 'Auto Rickshaw' ? 'AS 01 AA 2024' : 'AS 01 ER 7788',
                time: '3 min',
                photo: 'https://randomuser.me/api/portraits/men/32.jpg',
                trips: 450,
                phone: '9876543210',
                vehicleType: vehicleType === 'Auto Rickshaw' ? '3' : '2',
                price: req.body.fare || 10
            });
        }

        res.status(200).json({
            success: true,
            drivers: drivers,
            rideId, // Return the rideId so frontend can poll
            message: drivers.length > 0 ? "Drivers found nearby" : "No drivers currently available in this sector"
        });
    } catch (error) {
        console.error("Search Drivers Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper to estimate time (1 min per 200m roughly)
function calculateTime(lat1, lon1, lat2, lon2) {
    const dist = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
    return Math.ceil(dist * 3); // 3 mins per km
}

function calculateMockPrice(lat1, lon1, lat2, lon2, vehicleId) {
    const dist = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
    if (vehicleId === '3') {
        return calculateAutoFare(dist, 'village');
    }
    return calculateRickshawFare(dist, 'village');
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

exports.createRide = async (req, res) => {
    try {
        const { userId, driverId, pickupLocation, dropLocation, vehicleType, fare, distance, type, parcelImage } = req.body;

        const rideId = (type === 'courier' ? 'DEL' : 'RIDE') + Math.floor(100000 + Math.random() * 900000);
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const newRide = new Ride({
            rideId,
            userId,
            driverId,
            pickupLocation,
            dropLocation,
            vehicleType,
            fare,
            otp,
            distance,
            status: 'accepted', // Automatically accept for mock purposes
            type: type || 'ride',
            parcelImage
        });

        await newRide.save();

        res.status(201).json({
            success: true,
            ride: newRide
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRideDetails = async (req, res) => {
    try {
        const { rideId } = req.params;
        const ride = await Ride.findOne({ rideId });

        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        const driver = await Provider.findOne({ providerId: ride.driverId });

        res.status(200).json({
            success: true,
            ride,
            driver: driver ? {
                name: driver.name,
                phone: driver.phone,
                rating: driver.rating,
                photo: driver.image, // Corrected from profileImage
                vehicleNumber: driver.businessDetails?.registrationNumber
            } : (ride.driverId === 'FAKE_DRIVER_01' ? {
                name: 'Rohan Das (Partner)',
                phone: '9876543210',
                rating: 4.9,
                photo: 'https://randomuser.me/api/portraits/men/32.jpg',
                vehicleNumber: ride.vehicleType === 'Auto Rickshaw' ? 'AS 01 AA 2024' : 'AS 01 ER 7788'
            } : null)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { rideId, senderId, receiverId, senderType, text } = req.body;

        const newMessage = new Message({
            rideId,
            senderId,
            receiverId,
            senderType,
            text
        });

        await newMessage.save();

        res.status(201).json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserRides = async (req, res) => {
    try {
        const { userId } = req.params;
        const rides = await Ride.find({ userId }).sort({ createdAt: -1 });

        // Populate basic driver info if needed
        const populatedRides = await Promise.all(rides.map(async (ride) => {
            const driver = await Provider.findOne({ providerId: ride.driverId });
            return {
                ...ride.toObject(),
                driver: driver ? { name: driver.name, rating: driver.rating, phone: driver.phone } : null
            };
        }));

        res.status(200).json({
            success: true,
            rides: populatedRides
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { rideId } = req.params;
        const messages = await Message.find({ rideId }).sort({ timestamp: 1 });

        res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ FARE CALCULATION LOGIC ============

function calculateRickshawFare(distanceKm, routeType) {
    const dist = Math.ceil(distanceKm);
    const baseFare = 10;
    const ratePerKm = (routeType === 'highway') ? 15 : 10;

    if (dist <= 2) return baseFare;
    return baseFare + (dist - 2) * ratePerKm;
}

function calculateAutoFare(distanceKm, routeType) {
    return calculateRickshawFare(distanceKm, routeType);
}

exports.getFareEstimate = async (req, res) => {
    try {
        const { pickup, drop, vehicleId, serviceType, pickupCoords, dropCoords, routeType } = req.body;

        let distanceKm = 0;
        if (pickupCoords && dropCoords && pickupCoords.latitude && dropCoords.latitude) {
            distanceKm = getDistanceFromLatLonInKm(
                pickupCoords.latitude, pickupCoords.longitude,
                dropCoords.latitude, dropCoords.longitude
            );
            distanceKm = distanceKm * 1.3; // Road winding factor
        } else {
            distanceKm = 2 + Math.random() * 6;
        }

        distanceKm = Math.round(distanceKm * 10) / 10;
        const duration = Math.round(distanceKm * 3);
        let detectedRouteType = routeType || 'village'; 

        // Calculate for all major types to avoid "fake" prices in frontend
        const estimates = {
            '2': {
                fare: Math.round(calculateRickshawFare(distanceKm, detectedRouteType)),
                name: 'E-Rickshaw',
                baseFare: 10
            },
            '3': {
                fare: Math.round(calculateAutoFare(distanceKm, detectedRouteType)),
                name: 'Auto Rickshaw',
                baseFare: 10
            }
        };

        // If specific vehicle requested, ensure it's in the response prominently
        const selectedFare = estimates[vehicleId]?.fare || estimates['2'].fare;

        res.status(200).json({
            success: true,
            fare: selectedFare,
            allEstimates: estimates,
            distance: `${distanceKm} km`,
            duration: `${duration}-${duration + 5}`,
            routeType: detectedRouteType,
            fareBreakdown: {
                vehicleType: estimates[vehicleId]?.name || 'Vehicle',
                routeType: detectedRouteType === 'village' ? 'Village / Local' : 'Highway',
                baseFare: estimates[vehicleId]?.baseFare || 10,
                distanceCharge: selectedFare - (estimates[vehicleId]?.baseFare || 10),
                totalFare: selectedFare
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
