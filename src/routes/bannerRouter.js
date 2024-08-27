const express = require("express");
const bannerController = require("../controllers/bannerController");

const router = express.Router();

router
  .route("/")
  .get(bannerController.getBanner)
  .post(bannerController.createBanner);

router
  .route("/:id")
  .put(bannerController.editBanner)
  .delete(bannerController.deleteBanner);

module.exports = router;
