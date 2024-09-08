const express = require("express");
const offerBannerController = require("../controllers/offerbannerControllers");
const { verifyAdminToken } = require("../utils/verifyAdminToken");
const verifyProduct = require("../utils/verifyProduct");

const router = express.Router();

router.route('/')
    .post(offerBannerController.createOfferBanner)
    .get(offerBannerController.getAllOfferBanners);
router.route('/getactive')
    .get(offerBannerController.getActiveOfferBanners);

router.route('/:id')
    .get(offerBannerController.getOfferBannerById)
    .put(offerBannerController.updateOfferBanner)
    .delete(offerBannerController.deleteOfferBanner);

router.route('/:id/status')
    .patch(offerBannerController.updateOfferBannerStatus);

module.exports = router;
