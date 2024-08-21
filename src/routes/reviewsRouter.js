const express = require("express");
const verify = require("../utils/verifyToken");
const reviewsController = require("../controllers/reviewsController");

const router = express.Router();

router.route("/:planId", reviewsController.getReviews);
router.route("/:reviewId", reviewsController.deleteReview);

module.exports = router;
