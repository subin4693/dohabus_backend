const express = require("express");
const verify = require("../utils/verifyToken");
const cartsController = require("../controllers/cartsController");

const router = express.Router();

router
  .route("/")
  .post(verify.verifyToken, cartsController.addToCart)
  .get(verify.verifyToken, cartsController.getCart);

router.route("/:id").delete(verify.verifyToken, cartsController.removeFromCart);

module.exports = router;
