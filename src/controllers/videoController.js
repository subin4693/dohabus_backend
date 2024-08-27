const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const video = require("../models/videoModel");

exports.createvideo = catchAsync(async (req, res, next) => {
  const video = await video.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      video: video,
    },
  });
});

exports.getVideos = catchAsync(async (req, res, next) => {
  const newvideo = await video.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      video: newvideo,
    },
  });
});

exports.editVideos = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const videoUrl = await video.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!videoUrl) {
    return next(new AppError("No video found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      video: videoUrl,
    },
  });
});
