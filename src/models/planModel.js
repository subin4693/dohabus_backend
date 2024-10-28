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

// Method to calculate pricing based on a booking date
plansModel.methods.getPricingForDate = function(bookingDate) {
  const date = new Date(bookingDate);
  console.log("Checking pricing for booking date:", date);

  // Find a pricing limit that applies to the booking date
  const priceLimit = this.pricingLimits.find((limit) => {
    const isWithinLimit = date >= new Date(limit.startDate) && date <= new Date(limit.endDate);
    console.log(`Checking date range: ${limit.startDate} - ${limit.endDate}, Match: ${isWithinLimit}`);
    return isWithinLimit;
  });

  if (priceLimit) {
    console.log("Matching pricing limit found:", priceLimit);

    // Prepare the response object based on what exists in priceLimit
    const response = {};

    // Add adult pricing only if it exists in priceLimit
    if (priceLimit.adultPrice !== undefined) {
      response.adultPrice = priceLimit.adultPrice;
    }

    // Add child pricing only if it exists in priceLimit
    if (priceLimit.childPrice !== undefined) {
      response.childPrice = priceLimit.childPrice;
    }

    // Add adult data only if it exists and has length
    if (priceLimit.adultData && priceLimit.adultData.length > 0) {
      response.adultData = priceLimit.adultData;
    }

    // Add child data only if it exists and has length
    if (priceLimit.childData && priceLimit.childData.length > 0) {
      response.childData = priceLimit.childData;
    }

    // If no specific price or data exists in the price limit, return the default pricing
    if (Object.keys(response).length === 0) {
      response.adultPrice = this.defaultAdultPrice;
      response.childPrice = this.defaultChildPrice;
      response.adultData = this.defaultAdultData;
      response.childData = this.defaultChildData;
    }

    return response;
  }

  console.log("No matching pricing limit found. Returning default pricing.");
  return {
    adultPrice: this.defaultAdultPrice,
    childPrice: this.defaultChildPrice,
    adultData: this.defaultAdultData,
    childData: this.defaultChildData,
  };
};


// Custom `toJSON` and `toObject` transformations to add pricing fields at the top level
plansModel.set("toJSON", {
  virtuals: true,
  transform: function(doc, ret) {
    // Calculate pricing based on the current date and merge it at the top level
    const pricing = doc.getPricingForDate(new Date());
    Object.assign(ret, pricing);
    return ret;
  },
});

plansModel.set("toObject", {
  virtuals: true,
  transform: function(doc, ret) {
    // Calculate pricing based on the current date and merge it at the top level
    const pricing = doc.getPricingForDate(new Date());
    Object.assign(ret, pricing);
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