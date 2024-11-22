const termsAndConditionController = require("../controllers/termsAndConditionsController");
const express = require("express");

const router = express.Router();

router
  .route("/")
  .get(termsAndConditionController.getTermsAndCunditions)
  .post(termsAndConditionController.createTermsAndCundtions);

router.route("/:id").put(termsAndConditionController.editTermsAndCunditionsById);

module.exports = router;
