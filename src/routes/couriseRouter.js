const express = require("express");
const router = express.Router();
const cruiseController = require("../controllers/cruiseController");

router
  .route("/")
  .post(cruiseController.createCruise) // Create a new cruise
  .get(cruiseController.getAllCruises); // Get all cruises

router
  .route("/:id")
  .get(cruiseController.getCruiseById) // Get cruise by ID
  .put(cruiseController.updateCruise) // Update cruise by ID
  .delete(cruiseController.deleteCruise); // Delete cruise by ID

module.exports = router;
