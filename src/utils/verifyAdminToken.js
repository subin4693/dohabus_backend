const jwt = require("jsonwebtoken");
const catchAsync = require("./catchAsync");
const appError = require("./appError");

exports.verifyAdminToken = catchAsync(async (req, res, next) => {
  const testToken = req.cookies.token;

  let token;
  if (testToken && testToken.startsWith("bearer")) {
    token = testToken.split(" ")[1];
  }

  if (!token) {
    return res.status(200).json({
      status: "success",
      message: "You are not logged in",
    });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRECT);

  if (decoded.role !== 'admin') {
    return res.status(403).json({
      status: "fail",
      message: "You do not have permission to perform this action",
    });
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };

  next();
});
