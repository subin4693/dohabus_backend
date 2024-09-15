const express = require("express");
const videoController = require("../controllers/videoController");
const router = express.Router();

router
  .route("/")
  .get(videoController.getVideos)
  .post(videoController.createvideo);

router.route("/:id").put(bannerController.editVideos);

module.exports = router;
