const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const verify = require("../utils/verifyToken");

router
  .route("/")
  .post(verify.verifyToken, blogController.createBlog)
  .get(blogController.getBlogs);

router.route("/recent").get(blogController.getRecentBlogs);

router
  .route("/:id")
  .get(blogController.getBlogById)
  .put(verify.verifyToken, blogController.updateBlog)
  .delete(verify.verifyToken, blogController.deleteBlog);

router
  .route("/:id/comments")
  .post(blogController.addComment)
  .get(verify.verifyToken, blogController.getComments);

router
  .route("/:id/comments/:commentId")
  .delete(verify.verifyToken, blogController.removeComment)
  .put(verify.verifyToken, blogController.updateComment);

router.route("/:id/like").post(verify.verifyToken, blogController.likeBlog);

module.exports = router;
