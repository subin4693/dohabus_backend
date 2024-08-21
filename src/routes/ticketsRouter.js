const express = require("express");
const verify = require("../utils/verifyToken");
const ticketsController = require("../controllers/ticketsController");

const router = express.Router();

router
  .route("/")
  .post(verify.verifyToken, ticketsController.bookTicket)
  .get(verify.verifyToken, ticketsController.getTickets);

router
  .route("/:id")
  .delete(verify.verifyToken, ticketsController.deleteTicket)
  .put(verify.verifyToken, ticketsController.editTicket);

module.exports = router;
