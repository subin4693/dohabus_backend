const express = require("express");
const verify = require("../utils/verifyToken");
const plansController = require("../controllers/plansController");

const router = express.Router();

router
  .route("/")
  .post(verify.verifyToken, plansController.createNewPlans)
  .get(verify.verifyToken, plansController.getAllPlans);

router
  .route("/:id")
  .delete(verify.verifyToken, plansController.deletePlan)
  .put(verify.verifyToken, plansController.editPlan)
  .get(plansController.getSinglePlan);

router
  .route("/category/:categoryId")
  .get(plansController.getPlanByCategory);

module.exports = router;
