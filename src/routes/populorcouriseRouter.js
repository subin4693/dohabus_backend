const express = require("express");
const router = express.Router();
const populorCruiseController = require("../controllers/popularCouriseController");
const verify = require("../utils/verifyToken");

 

router
  .route("/")
  .post(populorCruiseController.createCourise)
  .get(populorCruiseController.getAllCourise);

router
  .route("/:id")
  .get(populorCruiseController.getCourisById)
  .put(populorCruiseController.updateCourise)
  .delete(populorCruiseController.deleteCourise)
 

module.exports = router;
