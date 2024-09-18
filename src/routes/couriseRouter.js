const express = require("express");
const router = express.Router();
const cruiseController = require("../controllers/cruiseController");

router
  .route("/")
  .post(cruiseController.createCourise)
  .get(cruiseController.getAllCourise);

router
  .route("/:id")
  .get(cruiseController.getCourisById)
  .put(cruiseController.updateCourise)
  .delete(cruiseController.deleteCourise);

module.exports = router;
