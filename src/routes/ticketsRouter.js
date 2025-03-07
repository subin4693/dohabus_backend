const express = require("express");
const verify = require("../utils/verifyToken");
const ticketsController = require("../controllers/ticketsController");

const router = express.Router();

router.route("/counts").post(ticketsController.getTicketCounts);
router.route("/all").get(ticketsController.getAllTickets);

router
  .route("/")
  .get(ticketsController.getTickets)
  .post(ticketsController.bookTicket);

router.route("/qpay-response").post(ticketsController.handleQPayResponse);
router.route("/cybersource-response").post(ticketsController.cybersourcePaymentResponse);

router
  .route("/:id")
  .get(ticketsController.getTicketById)
  .delete(ticketsController.deleteTicket)
  .put(ticketsController.editTicket);

module.exports = router;
