const express = require("express");
const offerController = require("../controllers/offerController");

const router = express.Router();

router
  .route("/")
  .get(offerController.getOffer)
  .post(offerController.createOffer);

router
  .route("/:id")
  .patch(offerController.editOffer)
  .delete(offerController.deleteOffer);

module.exports = router;
