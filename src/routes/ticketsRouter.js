const express = require("express");
const verify = require("../utils/verifyToken");
const ticketsController = require("../controllers/ticketsController");

const router = express.Router();

router.route("/counts").post(ticketsController.getTicketCounts);

router
  .route("/")
  .post(ticketsController.bookTicket)
  .get(verify.verifyToken, ticketsController.getTickets);

router
  .route("/:id")
  .get(ticketsController.getTicketById)
  .delete(verify.verifyToken, ticketsController.deleteTicket)
  .put(verify.verifyToken, ticketsController.editTicket);


module.exports = router;
