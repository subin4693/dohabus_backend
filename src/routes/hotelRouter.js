const express = require("express");
const router = express.Router();
const hotelController = require("../controllers/hotelController");
const verify = require("../utils/verifyToken");
router
  .route("/")
  .post(hotelController.createHotel)
  .get(hotelController.getAllHotels);

router
  .route("/:id")
  .get(hotelController.getHotelById)
  .put(hotelController.updateHotel)
  .delete(hotelController.deleteHotel)
  .post(verify.verifyToken, hotelController.bookHotels);

router
  .route("/bookings")

  .get(hotelController.getAllHotelsBookings);

module.exports = router;
