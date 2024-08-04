const mongoose = require("mongoose");

const ticketModel = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User id is required"],
    ref: "User",
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Category is required"],
    ref: "Category",
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "plan id is required"],
    ref: "Plan",
  },
});
const Ticket = new mongoose.model("Ticket", ticketModel);

module.exports = Ticket;
