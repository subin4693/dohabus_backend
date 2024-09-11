const express = require('express');
const subscriberController = require('../controllers/subscriberController');

const router = express.Router();

router.route("/")
    .get(subscriberController.getAllSubscribers)
    .post(subscriberController.createSubscriber);

router.patch('/edit/:id', subscriberController.editSubscriber);
router.delete('/delete/:id', subscriberController.deleteSubscriber);

module.exports = router;
