const express = require("express");

const guidelineController = require("../controllers/guidelineController");

const router = express.Router();

router
  .route("/")
  .get(guidelineController.getGuideline)
  .post(guidelineController.createGuideline);

router.route("/:id").put(guidelineController.editGuideline);

module.exports = router;
