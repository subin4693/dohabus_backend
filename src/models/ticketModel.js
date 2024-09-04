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
    required: [true, "Plan id is required"],
    ref: "Plan",
  },
  price: {
    type: Number,
    required: [true, "Please enter a valid price"],
  },
  adultQuantity: {
    type: Number,
    required: [true, "Please enter a valid adult quantity"],
  },
  childQuantity: {
    type: Number,
    required: [true, "Please enter a valid child quantity"],
  },
  session: {
    type: String,
    required: [true, "Please enter a session"],
  },
  date: {
    type: Date,
    required: [true, "Please provide a valid date"],
  },
  firstName: {
    type: String,
    required: [true, "First name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
  },
  pickupLocation: {
    type: String,
  },
  dropLocation: {
    type: String,
  },
  discountAmount: {
    type: Number,
    default: 0,
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
