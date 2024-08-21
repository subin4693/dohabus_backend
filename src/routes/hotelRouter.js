const express = require("express");
const hotelController = require("../controllers/hotelController");

const router = express.Router();

router
    .route("/")
    .post(hotelController.createHotel)
    .get(hotelController.getAllHotels);

router
    .route("/:id")
    .get(hotelController.getHotelById)
    .put(hotelController.updateHotel)
    .delete(hotelController.deleteHotel);

module.exports = router;
