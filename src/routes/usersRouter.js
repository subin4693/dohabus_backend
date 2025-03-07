const express = require("express");
const verify = require("../utils/verifyToken");

const userController = require("../controllers/usersController");
// const { handleWebhook } = require("../controllers/ticketsController");

const router = express.Router();

router.route("/using-google").post(userController.SigninWithGoogle);

router.route("/signup").post(userController.signup);

router.route("/signin").post(userController.signin);

router.route("/signout").post(userController.signout);

router.route("/verify").get(userController.verify);

// router.route("/thewebhookendpoint").post(handleWebhook);
module.exports = router;
