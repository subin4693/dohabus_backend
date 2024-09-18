const express = require("express");

const categorysController = require("../controllers/categorysController");

const router = express.Router();
// router.use(verifyAdminToken);

router
  .route("/")
  .post(categorysController.createCategory)
  .get(categorysController.getCategories);
router.route("/cat-tour").get(categorysController.getCategoriesWithTours);

router
  .route("/:id")
  .delete(categorysController.deleteCategory)
  .put(categorysController.editCategory);

module.exports = router;
