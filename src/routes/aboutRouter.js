const express = require("express");

const aboutusController = require("../controllers/aboutusController");

const router = express.Router();

router
  .route("/")
  .get(aboutusController.getAboutus)
  .post(aboutusController.createAbout);

router.route("/:id").put(aboutusController.editAboutus);

module.exports = router;
