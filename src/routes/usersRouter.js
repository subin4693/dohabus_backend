const express = require("express");
const verify = require("../utils/verifyToken");

const userController = require("../controllers/usersController");

const router = express.Router();

router.route("/signup").post(userController.signup);

router.route("/signin").post(userController.signin);

router.route("/signout").post(userController.signout);

router.route("/verify").get(verify.verifyToken, userController.verify);

module.exports = router;