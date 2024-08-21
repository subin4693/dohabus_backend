const express = require("express");
const verify = require("../utils/verifyToken");
const favouriteController = require("../controllers/favouriteController");

const router = express.Router();

router
    .route("/")
    .post(verify.verifyToken, favouriteController.createFavourite) 
    .get(verify.verifyToken, favouriteController.getAllFavourites); 
router
    .route("/:id")
    .get(verify.verifyToken, favouriteController.getFavouriteById) 
    .delete(verify.verifyToken, favouriteController.deleteFavourite); 

module.exports = router;
