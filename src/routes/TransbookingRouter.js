const express = require("express");
const router = express.Router();
const transBookingController = require("../controllers/transbookingController");
const verify = require("../utils/verifyToken");

router
    .route("/")
    .post(transBookingController.createBooking)
    .get(transBookingController.getAllBookings);

router
    .route("/:id")
    .get(transBookingController.getBookingById)
    .put(transBookingController.updateBooking)
    .delete(transBookingController.deleteBooking);

module.exports = router;
