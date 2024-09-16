const mongoose = require("mongoose");

const booktransportationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        transId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transportation",
            required: true,
        },
        date: {
            type: Date,
            required: [true, "Please provide a valid date"],
        },
        numberOfAdults: {
            type: Number,
            required: true,
        },
        numberOfChildren: {
            type: Number,
            required: true,
        },

        additionalRequest: {
            type: String,
            required: false,
        },
        email: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

const TransBooking = mongoose.model("TransBooking", booktransportationSchema);

module.exports = TransBooking;
