const express = require("express");
const verify = require("../utils/verifyToken");
const { verifyAdminToken } = require("../utils/verifyAdminToken");
const categorysController = require("../controllers/categorysController");

const router = express.Router();
// router.use(verifyAdminToken);

router
  .route("/")
  .post(categorysController.createCategory)
  .get(categorysController.getCategories);

router
  .route("/:id")
  .delete(categorysController.deleteCategory)
  .put(categorysController.editCategory);

module.exports = router;
