const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');

router.post('/search', transportController.searchDrivers);
router.post('/book', transportController.createRide);
router.get('/rides/:userId', transportController.getUserRides);
router.get('/ride/:rideId', transportController.getRideDetails);
router.post('/message', transportController.sendMessage);
router.get('/messages/:rideId', transportController.getMessages);
router.post('/fare-estimate', transportController.getFareEstimate);

module.exports = router;
