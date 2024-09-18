const express = require("express");
const plansController = require("../controllers/plansController");

const verifyProduct = require("../utils/verifyProduct");

const router = express.Router();
// router.use(verifyAdminToken);
router.route("/plan-titles").get(plansController.getAllPlanNames);
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

router.route("/category/:categoryId").get(plansController.getPlanByCategory);

module.exports = router;
