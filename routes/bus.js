const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');

router.get('/routes', busController.getAllRoutes);
router.get('/route/:routeId', busController.getRouteDetails);
router.get('/search', busController.findRoutesBetween);
router.get('/stops', busController.getStops);
router.post('/book', busController.bookTicket);
router.get('/tickets/:userId', busController.getUserTickets);
router.get('/live-locations', busController.getLiveLocations);
router.get('/nearby-stops', busController.getNearbyStops);

// Destination Alerts
router.post('/alert', busController.setAlert);
router.get('/alerts/:userId', busController.getUserAlerts);
router.delete('/alert/:alertId', busController.deleteAlert);

// Driver & Owner Routes
router.post('/driver/login', busController.driverLogin);
router.post('/owner/login', busController.ownerLogin);
router.post('/driver/update-location', busController.updateDriverLocation);
router.get('/driver/profile/:driverId', busController.getDriverProfile);
router.post('/driver/update-profile', busController.updateDriverProfile);
router.get('/live-location/:busNumber', busController.getBusLiveLocation);

// Owner Fleet Management
router.get('/owner/fleet/:ownerId', busController.getFleet);
router.post('/owner/add-bus', busController.addBus);
router.post('/owner/update-bus', busController.updateBus);

// Driver Management for Owner
router.get('/owner/drivers/:ownerId', busController.getOwnerDrivers);
router.post('/owner/add-driver', busController.addDriver);

// Route & Timing Management
router.post('/route/update', busController.updateBusRoute);
router.post('/route/stop-status', busController.updateStopStatus);

// Profile setup
router.post('/owner/update-profile', busController.updateOwnerProfile);

module.exports = router;
