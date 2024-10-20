const mongoose = require("mongoose");

// Required localized string schema
const localizedStringRequired = {
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

// Optional localized string schema
const localizedStringOptional = {
  en: {
    type: String,
    required: false,
    trim: true,
  },
  ar: {
    type: String,
    required: false,
    trim: true,
  },
};

// Pricing schema for dynamic pricing data
const pricingSchema = new mongoose.Schema({
  pax: {
    type: Number,
    required: [true, "Number of pax is required"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
});
const monthlyPricingSchema = new mongoose.Schema({
  month: {
    type: Number, // 0 for January, 1 for February, ..., 11 for December
    required: true,
  },
  adultPrice: {
    type: Number,
  },
  childPrice: {
    type: Number,
  },
  adultData: [pricingSchema],
  childData: [pricingSchema],
});

// Define the Plan schema
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
  title: localizedStringRequired, // Required
  duration: localizedStringOptional, // Optional
  typeOfTour: localizedStringOptional, // Optional
  addOn: [
    {
      en: {
        type: String,

        trim: true,
      },
      ar: {
        type: String,

        trim: true,
      },
      price: {
        type: Number,
      },
    },
  ],
  transportation: localizedStringOptional, // Optional
  language: localizedStringOptional, // Optional
  description: localizedStringRequired, // Required
  highlights: [localizedStringOptional], // Optional
  includes: [localizedStringOptional], // Optional
  itinerary: [localizedStringOptional], // Optional
  knowBeforeYouGo: [localizedStringOptional], // Optional
  faq: [
    {
      question: localizedStringOptional, // Optional
      answer: localizedStringOptional, // Optional
    },
  ],
  galleryImages: [
    {
      type: String,
    },
  ],
  galleryVideos: [
    {
      type: String,
    },
  ],
  availableDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5, 6, 0],
  },
  // sessions: [
  //   {
  //     type: String,
  //     trim: true,
  //   },
  // ],
  sessions: [
    {
      name: {
        type: String,
        trim: true,
      },
      closeTime: {
        type: String,
        trim: true,
      },
    },
  ],

  // adultPrice: {
  //   type: Number,
  // },
  // childPrice: {
  //   type: Number,
  // },
  // adultData: [pricingSchema],
  // childData: [pricingSchema],
  pricingByMonth: [monthlyPricingSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  isPickupRequired: {
    type: Boolean,
    default: false,
  },
  isDropOffRequired: {
    type: Boolean,
    default: false,
  },
  minPerson: {
    type: Number,
    default: 0,
  },
  stopSales: [
    {
      type: Date,
      set: (date) => {
        if (date instanceof Date) {
          const adjustedDate = new Date(date);
          adjustedDate.setUTCHours(0, 0, 0, 0);
          return adjustedDate;
        }
        return date;
      },
    },
  ],
  limit: {
    type: Number,
    default: 0,
  },
});
plansModel.virtual("currentMonthPricing").get(function() {
  const currentMonth = new Date().getMonth(); // Get the current month (0-11)
  const currentPricing = this.pricingByMonth?.find((p) => p.month === currentMonth);

  if (currentPricing) {
    return {
      adultPrice: currentPricing.adultPrice,
      childPrice: currentPricing.childPrice,
      adultData: currentPricing.adultData,
      childData: currentPricing.childData,
    };
  }
  return {};
});

// Custom `toJSON` and `toObject` transformation to merge `currentMonthPricing` into the root object
plansModel.set("toObject", {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.currentMonthPricing) {
      // Spread the fields from currentMonthPricing into the parent object
      Object.assign(ret, ret.currentMonthPricing);
      delete ret.currentMonthPricing; // Remove the nested currentMonthPricing field
    }
    return ret;
  },
});

plansModel.set("toJSON", {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.currentMonthPricing) {
      // Spread the fields from currentMonthPricing into the parent object
      Object.assign(ret, ret.currentMonthPricing);
      delete ret.currentMonthPricing; // Remove the nested currentMonthPricing field
    }
    return ret;
  },
});

// Pre-save middleware to adjust stopSales date
plansModel.pre("save", function(next) {
  if (this.stopSales && this.stopSales.length > 0) {
    this.stopSales = this.stopSales.map((date) => {
      let adjustedDate = new Date(date);
      adjustedDate.setUTCHours(0, 0, 0, 0);
      return adjustedDate;
    });
  }
  next();
});

// Pre-update middleware to adjust dates during update operations
plansModel.pre(["updateOne", "updateMany", "findOneAndUpdate"], function(next) {
  if (this.getUpdate().stopSales) {
    this.getUpdate().stopSales = this.getUpdate().stopSales.map((date) => {
      let adjustedDate = new Date(date);
      adjustedDate.setUTCHours(0, 0, 0, 0);
      return adjustedDate;
    });
  }
  next();
});

const Plan = mongoose.model("Plan", plansModel);

module.exports = Plan;
