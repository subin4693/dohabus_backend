
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Define routes
router.get('/summary', adminController.getSummary);
router.get('/monthly', adminController.getMonthlySummary);
router.get('/pichart', adminController.getPieChartData);
router.get('/cart', adminController.getCarts);
router.get('/favourite', adminController.getFavourites);
router.get('/plans', adminController.getPlans);
router.get('/users', adminController.getUsers);
router.get('/tickets', adminController.getTickets);
module.exports = router;
