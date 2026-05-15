const mongoose = require('mongoose');
const BusRoute = require('../models/BusRoute');
const BusTicket = require('../models/BusTicket');
const BusAlert = require('../models/BusAlert');
const BusDriver = require('../models/BusDriver');
const BusOwner = require('../models/BusOwner');

exports.getAllRoutes = async (req, res) => {
    try {
        let routes = await BusRoute.find();
        res.json({ success: true, routes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRouteDetails = async (req, res) => {
    try {
        const { routeId } = req.params;
        const route = await BusRoute.findOne({ $or: [{ routeId }, { number: routeId }] });
        if (!route) return res.status(404).json({ success: false, message: "Route not found" });
        res.json({ success: true, route });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.findRoutesBetween = async (req, res) => {
    try {
        const { from, to } = req.query;
        // Simple search by name match in stops or route name for demo
        const routes = await BusRoute.find({
            $or: [
                { name: new RegExp(from, 'i') },
                { name: new RegExp(to, 'i') },
                { "stops.name": new RegExp(from, 'i') },
                { "stops.name": new RegExp(to, 'i') }
            ]
        });
        res.json({ success: true, routes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStops = async (req, res) => {
    try {
        const routes = await BusRoute.find();
        const stopsSet = new Set();
        routes.forEach(route => {
            if (route.stops && route.stops.length > 0) {
                route.stops.forEach(stop => stopsSet.add(stop.name));
            }
            // Also add from route name if it's "A - B" format
            const names = route.name.split(' - ');
            names.forEach(n => {
                if (n.trim()) stopsSet.add(n.trim());
            });
        });
        res.json({ success: true, stops: Array.from(stopsSet).sort() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.bookTicket = async (req, res) => {
    try {
        const { userId, routeId, from, to, fare, busNumber } = req.body;
        const ticketId = 'BT-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const newTicket = new BusTicket({
            ticketId,
            userId,
            routeId,
            busNumber,
            from,
            to,
            fare,
            purchaseDate: new Date(),
            expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours validity
        });

        await newTicket.save();
        res.json({ success: true, ticket: newTicket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getUserTickets = async (req, res) => {
    try {
        const { userId } = req.params;
        const tickets = await BusTicket.find({ userId }).sort({ purchaseDate: -1 });
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getLiveLocations = async (req, res) => {
    try {
        const routes = await BusRoute.find();
        let allLiveBuses = [];

        routes.forEach(route => {
            if (route.activeBuses && route.activeBuses.length > 0) {
                route.activeBuses.forEach(bus => {
                    allLiveBuses.push({
                        ...bus.toObject(),
                        routeNumber: route.number,
                        routeName: route.name,
                        type: route.type
                    });
                });
            }
        });

        res.json({ success: true, buses: allLiveBuses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getNearbyStops = async (req, res) => {
    try {
        const { lat, lng, radius = 5 } = req.query; // radius in km
        const userLat = parseFloat(lat) || 26.1158;
        const userLng = parseFloat(lng) || 91.7086;

        const routes = await BusRoute.find();

        const stopsMap = new Map();

        routes.forEach(route => {
            if (route.stops) {
                route.stops.forEach(stop => {
                    if (stop.location && stop.location.latitude && stop.location.longitude) {
                        const dist = getDistance(userLat, userLng, stop.location.latitude, stop.location.longitude);
                        if (dist <= radius) {
                            const stopKey = stop.name;
                            if (!stopsMap.has(stopKey)) {
                                stopsMap.set(stopKey, {
                                    id: stop._id || Math.random().toString(36).substr(2, 9),
                                    name: stop.name,
                                    coordinate: stop.location,
                                    distanceValue: dist,
                                    routes: [],
                                    type: route.type === 'Intercity' ? 'Main Hub' : 'Regular'
                                });
                            }
                            const stopData = stopsMap.get(stopKey);
                            if (!stopData.routes.includes(route.number)) {
                                stopData.routes.push(route.number);
                            }
                        }
                    }
                });
            }
        });

        let nearbyStops = Array.from(stopsMap.values());
        nearbyStops = nearbyStops.map(stop => ({
            ...stop,
            distance: stop.distanceValue < 1 ? `${Math.round(stop.distanceValue * 1000)}m` : `${stop.distanceValue.toFixed(1)} km`,
            walkingTime: `${Math.round(stop.distanceValue * 15)} min`,
            facilities: ['Covered', 'Seating', 'CCTV'],
            nextArrival: `${stop.routes[0]} in ${Math.floor(Math.random() * 15) + 2} min`
        })).sort((a, b) => a.distanceValue - b.distanceValue);

        res.json({ success: true, stops: nearbyStops });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.setAlert = async (req, res) => {
    try {
        const { userId, destinationName, location, radius } = req.body;
        const newAlert = new BusAlert({
            userId,
            destinationName,
            location,
            radius
        });
        await newAlert.save();
        res.json({ success: true, alert: newAlert });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getUserAlerts = async (req, res) => {
    try {
        const { userId } = req.params;
        const alerts = await BusAlert.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, alerts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        await BusAlert.findByIdAndDelete(alertId);
        res.json({ success: true, message: "Alert deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.driverLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const driver = await BusDriver.findOne({ email });
        if (!driver || !(await driver.comparePassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        res.json({ success: true, driver, role: 'driver' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.ownerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const owner = await BusOwner.findOne({ email });
        if (!owner || !(await owner.comparePassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        res.json({ success: true, owner, role: 'owner' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDriverLocation = async (req, res) => {
    try {
        const { driverId, latitude, longitude } = req.body;
        const driver = await BusDriver.findOneAndUpdate(
            { driverId },
            {
                currentLocation: {
                    latitude,
                    longitude,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );
        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

        // Also update the active bus location in BusRoute if assigned
        if (driver.assignedBus && driver.assignedBus.number) {
            await BusRoute.updateOne(
                { "activeBuses.busNumber": driver.assignedBus.number },
                {
                    $set: {
                        "activeBuses.$.location": { latitude, longitude },
                        "activeBuses.$.lastUpdate": new Date()
                    }
                }
            );
        }

        res.json({ success: true, message: "Location updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDriverProfile = async (req, res) => {
    try {
        const { driverId } = req.params;
        const driver = await BusDriver.findOne({ driverId });
        if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
        res.json({ success: true, driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDriverProfile = async (req, res) => {
    try {
        const { driverId, name, phone, photo, licensePhoto } = req.body;
        const driver = await BusDriver.findOneAndUpdate(
            { driverId },
            { name, phone, photo, licensePhoto },
            { new: true }
        );
        res.json({ success: true, driver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getBusLiveLocation = async (req, res) => {
    try {
        const { busNumber } = req.params;
        const driver = await BusDriver.findOne({ "assignedBus.number": busNumber });
        if (!driver || !driver.currentLocation) {
            return res.status(404).json({ success: false, message: "Live location not available for this bus" });
        }
        res.json({
            success: true,
            location: {
                ...driver.currentLocation,
                address: 'Real-time track',
                speed: 'Calculating...',
                status: 'Active'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Owner Fleet Management
exports.getFleet = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const owner = await BusOwner.findOne({ ownerId });
        if (!owner) return res.status(404).json({ success: false, message: "Owner not found" });
        res.json({ success: true, fleet: owner.fleet });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addBus = async (req, res) => {
    try {
        const { ownerId, busData } = req.body;
        const owner = await BusOwner.findOne({ ownerId });
        if (!owner) return res.status(404).json({ success: false, message: "Owner not found" });

        const newBus = {
            busId: "B" + Date.now(),
            ...busData
        };
        owner.fleet.push(newBus);
        await owner.save();

        res.json({ success: true, bus: newBus });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateBus = async (req, res) => {
    try {
        const { ownerId, busId, busData } = req.body;
        const owner = await BusOwner.findOne({ ownerId });
        if (!owner) return res.status(404).json({ success: false, message: "Owner not found" });

        const busIndex = owner.fleet.findIndex(b => b.busId === busId);
        if (busIndex === -1) return res.status(404).json({ success: false, message: "Bus not found" });

        owner.fleet[busIndex] = { ...owner.fleet[busIndex], ...busData };
        await owner.save();

        res.json({ success: true, bus: owner.fleet[busIndex] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Driver Management
exports.getOwnerDrivers = async (req, res) => {
    try {
        const { ownerId } = req.params;
        const drivers = await BusDriver.find({ ownerId });
        res.json({ success: true, drivers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addDriver = async (req, res) => {
    try {
        const { ownerId, driverData } = req.body;
        const driverId = "D" + Date.now();
        const newDriver = new BusDriver({
            driverId,
            ownerId,
            ...driverData,
            status: "active",
            verificationStatus: "verified"
        });
        await newDriver.save();

        res.json({ success: true, driver: newDriver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Route & Timing Management
exports.updateBusRoute = async (req, res) => {
    try {
        const { busNumber, routeData } = req.body;
        let route = await BusRoute.findOne({ busNumber });
        if (route) {
            route.from = routeData.from || route.from;
            route.to = routeData.to || route.to;
            if (routeData.stops) route.stops = routeData.stops;
            await route.save();
        } else {
            route = new BusRoute({
                routeId: "R" + Date.now(),
                busNumber,
                ...routeData
            });
            await route.save();
        }
        res.json({ success: true, route });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateStopStatus = async (req, res) => {
    try {
        const { busNumber, stopId, status } = req.body;
        const route = await BusRoute.findOne({ busNumber });
        if (!route) return res.status(404).json({ success: false, message: "Route not found" });

        const stop = route.stops.id(stopId);
        if (!stop) return res.status(404).json({ success: false, message: "Stop not found" });

        stop.status = status;
        await route.save();
        res.json({ success: true, route });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Profile setup
exports.updateOwnerProfile = async (req, res) => {
    try {
        const { ownerId, profileData } = req.body;
        const owner = await BusOwner.findOneAndUpdate({ ownerId }, profileData, { new: true });
        res.json({ success: true, owner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
