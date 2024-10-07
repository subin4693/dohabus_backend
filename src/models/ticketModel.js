const mongoose = require("mongoose");

const ticketModel = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      required: true,
    },
    // user: {
    //   type: String,

    //   ref: "User",
    // },
    offer: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Offer",
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
      default: "",
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
    addonFeatures: {
      type: [String],
      default: [],
    },
    number: {
      type: String,
      required: [true, "Mobile number is required"],
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Cancelled"],
      default: "Pending",
    },
    visaId: String,
    expiresAt: {
      type: Date,
      // required: true,
    },
    status: {
      type: String,
      enum: ["Booked", "Canceled"],
      default: "Booked",
    },
  },
  { timestamps: true },
);
const Ticket = new mongoose.model("Ticket", ticketModel);

module.exports = Ticket;

//https://docs.google.com/spreadsheets/d/1VU54zKQwfDjtoU31kv_NqJgvVstGSaFkLk5_u1G0ekQ/edit?usp=sharing
