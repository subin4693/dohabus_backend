const express = require("express");
const router = express.Router();
const hotelController = require("../controllers/hotelController");


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
