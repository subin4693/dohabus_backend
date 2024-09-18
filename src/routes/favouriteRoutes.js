const express = require("express");

const favouriteController = require("../controllers/favouriteController");

const router = express.Router();

router
  .route("/")
  .post(favouriteController.createFavourite)
  .get(favouriteController.getAllFavourites);
router
  .route("/:id")
  .get(favouriteController.getFavouriteById)
  .delete(favouriteController.deleteFavourite);

module.exports = router;
