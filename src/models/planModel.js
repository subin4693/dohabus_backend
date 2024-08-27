const mongoose = require("mongoose");

const localizedString = {
  en: {
    type: String,
    required: [true, "Please provide the English translation"],
    trim: true,
  },
  ar: {
    type: String,
    required: [true, "Please provide the Arabic translation"],
    trim: true,
  },
};

const plansModel = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Category is required"],
    ref: "Category",
  },
  coverImage: {
    type: String,
    required: [true, "Please provide cover image for tour"],
  },
  title: localizedString,
  duration: localizedString,
  typeOfTour: localizedString,
  transportation: localizedString,
  language: localizedString,
  description: localizedString,
  highlights: [localizedString],
  includes: [localizedString],
  itinerary: [localizedString],
  knowBeforeYouGo: [localizedString],
  faq: [
    {
      question: localizedString,
      answer: localizedString,
    },
  ],

  galleryimages: [
    {
      type: String,
      required: [true, "Please provide a valid Gallery images for tour"],
    },
  ], //["image url1","imageurl2"]
  galleryvideos: [
    {
      type: String,
      required: [true, "Please provide a valid Gallery images for tour"],
    },
  ],
  availableDays: [{ type: Number, required: [true, "Please provide the valid available days"] }], //[1,2,3,4]
  sessions: [
    {
      type: String,
      required: [true, "Please provide a valid session"],
      trim: true,
    },
  ], //[8:00Am, 12:00pm]

  adultPrice: {
    type: Number,
    required: [true, "Please enter valid adult price"],
  }, //400
  childPrice: {
    type: Number,
    required: [true, "Please enter valid adult price"],
  }, //2500
  isActive: {
    type: Boolean,
    default: true,
  },
});
const Plan = new mongoose.model("Plan", plansModel);

module.exports = Plan;

//   category: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: [true, "Category is required"],
//     ref: "Category",
//   },
//   coverImage: {
//     type: String,
//     required: [true, "Please provide cover image for tour"],
//   },
//   title: localizedString,
//   duration: localizedString,
//   typeOfTour: localizedString,
//   transportation: localizedString,
//   language: localizedString,
//   description: localizedString,
//   highlights: [localizedString],
//   includes: [localizedString],
//   itinerary: [localizedString],
//   knowBeforeYouGo: [localizedString],
//   faq: [
//     {
//       question: localizedString,
//       answer: localString,
//     },
//   ],
//   galleryimages: [
//     {
//       type: String,
//       required: [true, "Please provide a valid Gallery images for tour"],
//     },
//   ], //["image url1","imageurl2"]
//   galleryvideos: [
//     {
//       type: String,
//       required: [true, "Please provide a valid Gallery images for tour"],
//     },
//   ],
//   availableDays: [{ type: Number, required: [true, "Please provide the valid available days"] }], //[1,2,3,4]
//   sessions: [
//     {
//       type: String,
//       required: [true, "Please provide a valid session"],
//       trim: true,
//     },
//   ], //[8:00Am, 12:00pm]

//   adultPrice: {
//     type: Number,
//     required: [true, "Please enter valid adult price"],
//   }, //400
//   childPrice: {
//     type: Number,
//     required: [true, "Please enter valid adult price"],
//   }, //2500
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
// });
// const Plan = new mongoose.model("Plan", plansModel);

// module.exports = Plan;
