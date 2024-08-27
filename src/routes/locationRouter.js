const express = require("express");
const locationController = require("../controllers/locationsController");

const router = express.Router();

router
  .route("/")
  .get(locationController.getAllLocation)
  .post(locationController.createLocation);

router
  .route("/:id")
  .put(locationController.editLocation)
  .delete(locationController.deleteLocation);

module.exports = router;
