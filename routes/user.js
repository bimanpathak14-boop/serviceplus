const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Auth
router.post('/login', userController.login);
router.post('/register', userController.register);

// Profile creation
router.post('/create-profile', userController.createProfile);

// Home data
router.get('/home/:userId', userController.getHomeData);

// Dashboard data
router.get('/dashboard/:userId', userController.getDashboardData);

// Profile
router.get('/profile/:userId', userController.getProfile);
router.post('/update-profile', userController.updateProfile);

// Service Providers
router.get('/providers', userController.getProviders);
router.get('/provider/:providerId', userController.getProviderProfile);

// Bookings
router.post('/create-booking', userController.createBooking);
router.get('/bookings/:userId', userController.getBookings);
router.get('/booking/:bookingId', userController.getBookingDetails);
router.post('/verify-otp', userController.verifyOTP);
router.post('/submit-review', userController.submitReview);
router.post('/process-payment', userController.processPayment);
router.post('/add-funds', userController.addFunds);
router.get('/transactions/:userId', userController.getTransactions);
router.post('/save-search', userController.saveSearch);

module.exports = router;
