const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');

// Auth
router.post('/login', providerController.login);
router.post('/register', providerController.register);
router.post('/verify-otp', providerController.verifyOTP);

// Realtime Ride Logic
router.post('/location', providerController.updateLocation);
router.post('/update-status', providerController.updateStatus);
router.get('/nearby-rides', providerController.getNearbyRides);
router.post('/accept-ride', providerController.acceptRide);
router.post('/start-ride', providerController.startRide);
router.post('/complete-ride', providerController.completeRide);
router.get('/ride-history/:providerId', providerController.getRideHistory);

// Bookings
router.get('/bookings/:providerId', providerController.getBookings);
router.post('/bookings/accept', providerController.acceptBooking);
router.post('/bookings/reject', providerController.rejectBooking);
router.post('/bookings/complete', providerController.completeBooking);

// Jobs
router.get('/job/:jobId', providerController.getJobDetails);

// Earnings
router.get('/earnings/:providerId', providerController.getEarnings);
router.get('/dashboard/:providerId', providerController.getDashboardData);

// Profile
router.get('/profile/:providerId', providerController.getProfile);

// Service Catalog
router.get('/service-categories', providerController.getServiceCategories);
router.get('/vehicle-types', providerController.getVehicleTypes);
router.post('/add-service', providerController.addServiceToCatalog);

const { upload } = require('../utils/cloudinary');

// Onboarding
router.post('/submit-onboarding', upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'license', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
    { name: 'vehicleRC', maxCount: 1 }
]), providerController.submitOnboarding);
router.post('/update-bank-details', providerController.updateBankDetails);
router.post('/request-payout', providerController.requestPayout);

module.exports = router;
