const express = require("express");
const awardController = require("../controllers/awardController");

const router = express.Router();

router
    .route("/")
    .get(awardController.getFooterImages)
    .post(awardController.createNewFooterImage);

router
    .route("/:id")
    .put(awardController.editFooterImage)
    .delete(awardController.deletetFooterImages);

module.exports = router;
