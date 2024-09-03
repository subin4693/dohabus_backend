const Blog = require("../models/blogsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Plan = require("../models/planModel");

exports.getBlogs = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10); // Get limit from query params
  const cat = req.query.cat; // Get cat from query params

  // Initialize queryParams based on the presence of the 'cat' parameter
  const queryParams = cat ? { plan: cat } : {};

  // Debugging logs (optional)
  console.log(cat); // Logs the 'cat' parameter value
  console.log(queryParams); // Logs the constructed query parameters

  // Construct the query with the populated 'user' and 'plan' fields
  const query = Blog.find(queryParams)
    .populate("user")
    .populate("plan");

  // Apply the limit if it's a valid positive integer
  if (Number.isInteger(limit) && limit > 0) {
    query.limit(limit);
  }

  // Execute the query and get the blogs
  const blogs = await query.exec();

  // Send the response with the retrieved blogs
  res.status(200).json({
    status: "success",
    results: blogs.length,
    data: {
      blogs,
    },
  });
});

// Get recent blogs
exports.getRecentBlogs = catchAsync(async (req, res, next) => {
  const recentBlogs = await Blog.find()
    .populate("user")
    .populate("plan")
    .sort({ createdAt: -1 })
    .limit(2);

  if (!recentBlogs.length) {
    return next(new AppError("No blogs found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      blogs: recentBlogs,
    },
  });
});

// Get a single blog by ID
exports.getBlogById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const blog = await Blog.findById(id)
    .populate("user")
    .populate("plan");

  if (!blog) {
    return next(new AppError("Blog not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      blog,
    },
  });
});

// Create a new blog
exports.createBlog = catchAsync(async (req, res, next) => {
  const { image, title, text, plan } = req.body;
  const user = req.user.id;
  console.log(user);
  const newBlog = await Blog.create({
    image,
    title,
    text,
    user,
    plan,
  });
  console.log("*****************");
  console.log(plan);
  console.log("*****************");

  res.status(201).json({
    status: "success",
    data: {
      blog: newBlog,
    },
  });
});

// Update a blog by ID
exports.updateBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { image, title, text, plan, comments, likes } = req.body;
  const user = req.user.id;
  console.log(user);
  const updatedBlog = await Blog.findByIdAndUpdate(
    id,
    { image, title, text, user, plan, comments, likes },
    { new: true, runValidators: true },
  );

  if (!updatedBlog) {
    return next(new AppError("Blog not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      blog: updatedBlog,
    },
  });
});

// Delete a blog by ID
exports.deleteBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedBlog = await Blog.findByIdAndDelete(id);

  if (!deletedBlog) {
    return next(new AppError("Blog not found", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Likes and Comments >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

exports.addComment = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;
  const { email, name, comment } = req.body;

  if (!email || !name || !comment) {
    return next(new AppError("Please provide all required fields (email, name, comment).", 400));
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    return next(new AppError("Blog post not found.", 404));
  }

  blog.comments.push({ email, name, comment });

  await blog.save();

  res.status(201).json({
    status: "success",
    data: {
      comments: blog.comments,
    },
  });
});

exports.getComments = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;
  const user = req.user;
  console.log("user", user);
  const blog = await Blog.findById(blogId).select("comments");

  if (!blog) {
    return next(new AppError("Blog post not found.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      comments: blog.comments,
    },
  });
});

exports.removeComment = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;
  const commentId = req.params.commentId;
  const user = req.user;

  const blog = await Blog.findById(blogId);

  if (!blog) {
    return next(new AppError("Blog post not found.", 404));
  }

  const commentIndex = blog.comments.findIndex(
    (c) => c._id.toString() === commentId && c.email === user.email,
  );

  if (commentIndex === -1) {
    return next(
      new AppError("Comment not found or you are not authorized to delete this comment.", 404),
    );
  }

  blog.comments.splice(commentIndex, 1);

  await blog.save();

  res.status(200).json({
    status: "success",
    message: "Comment removed successfully.",
    data: {
      blog,
    },
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;
  const commentId = req.params.commentId;
  const { comment } = req.body;
  const user = req.user;

  if (!comment) {
    return next(new AppError("Please provide a comment to update.", 400));
  }

  const blog = await Blog.findById(blogId);

  if (!blog) {
    return next(new AppError("Blog post not found.", 404));
  }

  const existingComment = blog.comments.find(
    (c) => c._id.toString() === commentId && c.email === user.email,
  );

  if (!existingComment) {
    return next(
      new AppError("Comment not found or you are not authorized to update this comment.", 404),
    );
  }

  existingComment.comment = comment;

  await blog.save();

  res.status(200).json({
    status: "success",
    message: "Comment updated successfully.",
    data: {
      blog,
    },
  });
});

exports.likeBlog = catchAsync(async (req, res, next) => {
  const blogId = req.params.id;

  const blog = await Blog.findById(blogId);

  if (!blog) {
    return next(new AppError("Blog post not found.", 404));
  }

  blog.likes += 1;

  await blog.save();

  res.status(200).json({
    status: "success",
    data: {
      likes: blog.likes,
    },
  });
});
