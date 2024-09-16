const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const verify = require("../utils/verifyToken");

router
  .route("/")
  .post( blogController.createBlog)
  .get(blogController.getBlogs);

router.route("/recent").get(blogController.getRecentBlogs);

router
  .route("/:id")
  .get(blogController.getBlogById)
  .put( blogController.updateBlog)
  .delete(  blogController.deleteBlog);

router
  .route("/:id/comments")
  .post(blogController.addComment)
  .get( blogController.getComments);

router
  .route("/:id/comments/:commentId")
  .delete( blogController.removeComment)
  .put(blogController.updateComment);

router.route("/:id/like").post( blogController.likeBlog);

module.exports = router;
