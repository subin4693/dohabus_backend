const express = require("express");
const offerController = require("../controllers/offerController");
const verify = require("../utils/verifyToken");

const router = express.Router();

router
  .route("/")
  .get(offerController.getOffer)
  .post(offerController.createOffer);

router.route("/apply-discount").post(verify.verifyToken, offerController.checkOffer);

router
  .route("/:id")
  .put(offerController.switchOffer)
  .delete(offerController.deleteOffer);

module.exports = router;
