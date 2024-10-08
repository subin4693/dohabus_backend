const mongoose = require("mongoose");

const blogsModel = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Please provide a valid image"],
    },
    title: {
      type: String,
      required: [true, "Please provide a valid link"],
    },
    text: {
      type: String,
      required: [true, "Please provide a valid link"],
    },
    
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    
    },
    comments: [
      {
        email: { type: String, required: true },
        name: { type: String, reqired: true },
        comment: { type: String, required: true },
      },
    ],
    likes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = new mongoose.model("Blog", blogsModel);

// {
// 	"image":"image url",
// 	"url":"url link"
// }
