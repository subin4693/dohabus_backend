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

// Pricing limit schema
const pricingLimitSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  adultData: [pricingSchema],
  childData: [pricingSchema],
  adultPrice: {
    type: Number,
  },
  childPrice: {
    type: Number,
  },
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

  defaultAdultPrice: {
    type: Number,
  },
  defaultChildPrice: {
    type: Number,
  },
  defaultAdultData: [pricingSchema],
  defaultChildData: [pricingSchema],
  pricingLimits: [pricingLimitSchema],
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

 
plansModel.set("toJSON", {
  virtuals: true,
  transform: function(doc, ret) {
    // Add default or null pricing fields directly at the top level
    ret.adultPrice = doc.defaultAdultPrice || null;
    ret.childPrice = doc.defaultChildPrice || null;
    ret.adultData = doc.defaultAdultData?.length > 0 ? doc.defaultAdultData : null;
    ret.childData = doc.defaultChildData?.length > 0 ? doc.defaultChildData : null;
    return ret;
  },
});

plansModel.set("toObject", {
  virtuals: true,
  transform: function(doc, ret) {
    // Add default or null pricing fields directly at the top level
    ret.adultPrice = doc.defaultAdultPrice || null;
    ret.childPrice = doc.defaultChildPrice || null;
    ret.adultData = doc.defaultAdultData?.length > 0 ? doc.defaultAdultData : null;
    ret.childData = doc.defaultChildData?.length > 0 ? doc.defaultChildData : null;
    return ret;
  },
});

// Pre-save middleware to adjust stopSales dates
plansModel.pre("save", function(next) {
  if (this.stopSales && this.stopSales.length > 0) {
    this.stopSales = this.stopSales.map((date) => {
      const adjustedDate = new Date(date);
      adjustedDate.setUTCHours(0, 0, 0, 0);
      return adjustedDate;
    });
  }
  next();
});

// Pre-update middleware to adjust stopSales dates during updates
plansModel.pre(["updateOne", "updateMany", "findOneAndUpdate"], function(next) {
  if (this.getUpdate().stopSales) {
    this.getUpdate().stopSales = this.getUpdate().stopSales.map((date) => {
      const adjustedDate = new Date(date);
      adjustedDate.setUTCHours(0, 0, 0, 0);
      return adjustedDate;
    });
  }
  next();
});

const Plan = mongoose.model("Plan", plansModel);

module.exports = Plan;

