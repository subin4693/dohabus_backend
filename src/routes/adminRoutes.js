
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Define routes
router.get('/summary', adminController.getSummary); 
router.get('/monthly', adminController.getMonthlySummary); 
router.get('/pichart', adminController.getPieChartData);
router.get('/cart', adminController.getCarts);
router.get('/favourite', adminController.getFavourites);
module.exports = router;
