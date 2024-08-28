const jwt = require("jsonwebtoken");
const catchAsync = require("./catchAsync");
const appError = require("./appError");

exports.verifyToken = catchAsync(async (req, res, next) => {
  const testToken = req.cookies.token;

  let token;
  if (testToken && testToken.startsWith("bearer")) {
    token = testToken.split(" ")[1];
  }
  console.log(token);

  if (!token) {
    return res.status(200).json({
      status: "success",
      message: "You are not loggedin",
    });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRECT);

  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };

  next();
});
