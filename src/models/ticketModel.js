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
  price: {
    type: Number,
    required: [true, "Please enter a valid price"],
  },
  quantity: {
    type: Number,
    required: [true, "Please enter a valid quantity"],
  },
  dates: {
    type: Date,
    required: [true, "Please provide a valid date"],
  },
  status: {
    type: String,
    enum: ["Booked", "Canceled"],
    default: "Booked",
  },
});
const Ticket = new mongoose.model("Ticket", ticketModel);

module.exports = Ticket;

//https://docs.google.com/spreadsheets/d/1VU54zKQwfDjtoU31kv_NqJgvVstGSaFkLk5_u1G0ekQ/edit?usp=sharing
