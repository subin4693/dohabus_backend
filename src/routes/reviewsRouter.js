const express = require("express");
const verify = require("../utils/verifyToken");
const reviewsController = require("../controllers/reviewsController");
const verifyProduct = require("../utils/verifyProduct");

const router = express.Router();

router.route("/all").get(reviewsController.getAllReviews);

router
  .route("/:planId")
  .get(reviewsController.getReviews)
  .post(reviewsController.createReview);

router.route("/:reviewId").delete(reviewsController.deleteReview);

module.exports = router;
