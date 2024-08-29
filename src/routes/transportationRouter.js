const express = require("express");
const verify = require("../utils/verifyToken");
const { verifyAdminToken } = require("../utils/verifyAdminToken");
const transpotationController = require("../controllers/transpotationController");

const router = express.Router();
// router.use(verifyAdminToken);

router
  .route("/")
  .post(transpotationController.createTransportation)
  .get(transpotationController.getTransportations);

router
  .route("/:id")
  .delete(transpotationController.deleteTransportation)
  .put(transpotationController.editTransportation)
  .patch(transpotationController.switchTransportation);

router.route("/admin").get(transpotationController.getAdminTransportations);

module.exports = router;
