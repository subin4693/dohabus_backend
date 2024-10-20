const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyAdminToken } = require("../utils/verifyAdminToken");

// router.use(verifyAdminToken);

router.get("/summary", adminController.getSummary);
router.get("/monthly", adminController.getMonthlySummary);
router.get("/pichart", adminController.getPieChartData);
router.get("/cart", adminController.getCarts);
router.get("/favourite", adminController.getFavourites);
router.get("/plans", adminController.getPlans);
router.get("/users", adminController.getUsers);
router.post("/promote", adminController.promoteUser);
router.post("/demote", adminController.demoteUser);
router.get("/tickets", adminController.getTickets);
router.put("/tickets-cancel/:id", adminController.cancelTicket);
router.get("/plans/:planId", adminController.getPlanById);
module.exports = router;
