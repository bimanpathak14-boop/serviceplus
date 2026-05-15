const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/login', adminController.login);
router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.get('/providers', adminController.getAllProviders);
router.get('/providers/:id', adminController.getSingleProvider);
router.get('/users/:id', adminController.getSingleUser);
router.get('/pending-providers', adminController.getPendingProviders);
router.post('/verify-provider', adminController.verifyProvider);
router.get('/categories', adminController.getAllCategories);
router.get('/categories/:id', adminController.getSingleCategory);
router.post('/categories', adminController.createCategory);
router.put('/categories/:categoryId', adminController.updateCategory);
router.delete('/categories/:categoryId', adminController.deleteCategory);
router.get('/bookings', adminController.getAllBookings);
router.get('/rides', adminController.getAllRides);
router.get('/bus-owners', adminController.getBusOwners);
router.get('/bus-drivers', adminController.getBusDrivers);
router.post('/send-broadcast', adminController.sendBroadcast);
router.post('/block-user', adminController.blockUser);
router.post('/block-provider', adminController.blockProvider);
router.get('/reviews', adminController.getAllReviews);
router.post('/delete-review', adminController.deleteReview);

module.exports = router;
