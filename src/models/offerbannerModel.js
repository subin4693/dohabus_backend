const mongoose = require('mongoose');

const localizedString = {
  en: {
    type: String,
    required: [true, "English title is required"],
    trim: true,
  },
  ar: {
    type: String,
    required: [true, "Arabic title is required"],
    trim: true,
  },
};

const offerBannerSchema = new mongoose.Schema({
  title: localizedString,
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  tourId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: false
    }
  ],
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true
});

const OfferBanner = mongoose.model('OfferBanner', offerBannerSchema);

module.exports = OfferBanner;
