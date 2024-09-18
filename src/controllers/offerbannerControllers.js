const OfferBanner = require("../models/offerbannerModel");
const Tour = require("../models/planModel"); // Adjust the path as necessary

exports.createOfferBanner = async (req, res) => {
  try {
    const { title, percentage, tourIds } = req.body.payload;

    let tours = [];
    if (!tourIds || tourIds.length === 0) {
      tours = await Tour.find().select("_id");
    } else {
      tours = await Tour.find({ _id: { $in: tourIds } }).select("_id");
    }

    const tourIdList = tours.map((tour) => tour._id);
    console.log(tourIdList);

    const offerBanner = new OfferBanner({
      title,
      percentage,
      tourId: tourIdList,
    });

    await offerBanner.save();
    res.status(201).json(offerBanner);
  } catch (error) {
    console.error("Error creating offer banner:", error.message);
    res.status(400).json({ error: error.message });
  }
};

exports.getAllOfferBanners = async (req, res) => {
  try {
    const offerBanners = await OfferBanner.find();
    res.status(200).json(offerBanners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActiveOfferBanners = async (req, res) => {
  try {
    // Filter for only active offers
    const activeOfferBanners = await OfferBanner.find({ status: "Active" }).populate({
      path: "tourId",
      select: "category _id", // Select only category and _id from Plan
    });

    console.log(activeOfferBanners);

    res.status(200).json(activeOfferBanners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOfferBannerById = async (req, res) => {
  try {
    const offerBanner = await OfferBanner.findById(req.params.id);
    if (!offerBanner) {
      return res.status(404).json({ message: "OfferBanner not found" });
    }
    res.status(200).json(offerBanner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOfferBanner = async (req, res) => {
  try {
    const offerBanner = await OfferBanner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log(req.body);
    if (!offerBanner) {
      return res.status(404).json({ message: "OfferBanner not found" });
    }
    res.status(200).json(offerBanner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteOfferBanner = async (req, res) => {
  try {
    const offerBanner = await OfferBanner.findByIdAndDelete(req.params.id);
    if (!offerBanner) {
      return res.status(404).json({ message: "OfferBanner not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOfferBannerStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find and update the offer banner status
    const offerBanner = await OfferBanner.findByIdAndUpdate(id, { status }, { new: true });

    if (!offerBanner) {
      return res.status(404).json({ message: "Offer banner not found" });
    }

    res.json(offerBanner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
