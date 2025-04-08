// models/Refund.js
const mongoose = require("mongoose");

const RefundSchema = new mongoose.Schema({
  ticketId: {
    // use ticketId rather than uniqueId
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["qpay", "cybersource"],
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending Approval", "Approved", "Rejected", "Request Forwarded"],
    default: "Pending Approval",
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Refund = mongoose.model("Refund", RefundSchema);
module.exports = Refund;
