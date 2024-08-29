const express = require("express");
const plansController = require("../controllers/plansController");
const { verifyAdminToken } = require("../utils/verifyAdminToken");
const verifyProduct = require("../utils/verifyProduct");

const router = express.Router();
// router.use(verifyAdminToken);

router
  .route("/")
  .post(plansController.createNewPlans)
  .get(plansController.getAllPlans);

router
  .route("/:id")
  .delete(plansController.deletePlan)
  .put(plansController.editPlan)
  .get(plansController.getSinglePlan)
  .patch(plansController.switchActive);

router
  .route("/category/:categoryId")
  .get(verifyProduct.verifyToken, plansController.getPlanByCategory);

module.exports = router;
