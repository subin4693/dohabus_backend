const express = require("express");

const userController = require("../controllers/usersController");

const router = express.Router();

router.route("/signup").post(userController.signup);

router.route("/signin").post(userController.signin);

router.route("/signout").post(userController.signout);
module.exports = router;
