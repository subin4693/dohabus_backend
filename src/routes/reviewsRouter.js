const express = require("express");
const verify = require("../utils/verifyToken");
const reviewsController = require("../controllers/reviewsController");
const verifyProduct = require("../utils/verifyProduct");

const router = express.Router();

router
	.route("/:planId")
	.get(reviewsController.getReviews)
	.post(verifyProduct.verifyToken, reviewsController.createReview);
router
	.route("/:reviewId").delete(verify.verifyToken, reviewsController.deleteReview);

module.exports = router;
