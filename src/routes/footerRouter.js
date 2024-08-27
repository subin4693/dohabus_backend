const express = require("express");
const footerController = require("../controllers/footerController");

const router = express.Router();

router
	.route("/")
	.get(footerController.getFooterImages)
	.post(footerController.createNewFooterImage);

router.route("/:id").delete(footerController.deletetFooterImages);

module.exports = router;
