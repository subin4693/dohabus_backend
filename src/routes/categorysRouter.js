const express = require("express");
const verify = require("../utils/verifyToken");
const categorysController = require("../controllers/categorysController");

const router = express.Router();

router
  .route("/")
  .post(verify.verifyToken, categorysController.createCategory)
  .get(verify.verifyToken, categorysController.getCategorys);

router
  .route("/:id")
  .delete(verify.verifyToken, categorysController.deleteCategory)
  .put(verify.verifyToken, categorysController.editCategory);

module.exports = router;
