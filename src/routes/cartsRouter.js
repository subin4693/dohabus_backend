const express = require("express");

const cartsController = require("../controllers/cartsController");

const router = express.Router();

router
  .route("/")
  .post(cartsController.addToCart)
  .get(cartsController.getCart);

router.route("/:id").delete(cartsController.removeFromCart);

module.exports = router;
