const express = require("express");
const verify = require("../utils/verifyToken");
const ticketsController = require("../controllers/ticketsController");
const refundController = require("../controllers/refundController");
const inquireController = require("../controllers/inquiryController");

const router = express.Router();

router.route("/counts").post(ticketsController.getTicketCounts);
router.route("/all").get(ticketsController.getAllTickets);

router
  .route("/")
  .get(ticketsController.getTickets)
  .post(ticketsController.bookTicket);

router.get("/refunds", refundController.getRefundRequests);
router.route("/qpay-refund").post(refundController.processRefund);
router.route("/qpay-refund-request").post(refundController.requestRefund);
router.route("/reject-refund").post(refundController.rejectRefundRequest);

router.route("/payment-inquire").post(inquireController.inquirePayment);
router.route("/inquire-ticket").post(inquireController.inquireTicket);
router.route("/search-tickets").post(inquireController.searchTickets);

router.route("/qpay-response").post(ticketsController.handleQPayResponse);
router.route("/cybersource-response").post(ticketsController.cybersourcePaymentResponse);

router
  .route("/:id")
  .get(ticketsController.getTicketById)
  .delete(ticketsController.deleteTicket)
  .put(ticketsController.editTicket);

module.exports = router;
