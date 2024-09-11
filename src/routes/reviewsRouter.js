const express = require('express');
const verify = require('../utils/verifyToken'); 
const subscriberController = require('../controllers/subscriberController');

const router = express.Router();

router.route("/all").get(subscriberController.getAllSubscribers);

router
  .route("/create")
  .post(verify.verifyToken, subscriberController.createSubscriber);

router
  .route("/:id")
  .patch(verify.verifyToken, subscriberController.editSubscriber)
  .delete(verify.verifyToken, subscriberController.deleteSubscriber);

module.exports = router;
