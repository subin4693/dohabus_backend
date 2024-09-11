const express = require('express');
const subscriberController = require('../controllers/subscriberController');

const router = express.Router();

router.post('/create', subscriberController.createSubscriber);
router.get('/all', subscriberController.getAllSubscribers);
router.patch('/edit/:id', subscriberController.editSubscriber);
router.delete('/delete/:id', subscriberController.deleteSubscriber);

module.exports = router;
