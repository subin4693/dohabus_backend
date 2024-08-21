const express = require("express");
const cookieParser = require("cookie-parser");

const userRouter = require("./src/routes/usersRouter");
const categoryRouter = require("./src/routes/categorysRouter");

const planRouter = require("./src/routes/plansRouter");

const ticketRouter = require("./src/routes/ticketsRouter");
const cartRouter = require("./src/routes/cartsRouter");
const hotelRouter = require("./src/routes/hotelRouter");
const favouriteRoutes = require("./src/routes/favouriteRoutes");

const cors = require("cors");
const AppError = require("./src/utils/appError");
const globalErrorHandler = require("./src/controllers/errorController");

let app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/categorys", categoryRouter);
app.use("/api/v1/plans", planRouter);
app.use("/api/v1/tickets", ticketRouter);
app.use("/api/v1/carts", cartRouter);
app.use("/api/v1/hotels", hotelRouter);
app.use("/api/v1/favourites", favouriteRoutes);

app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on the server!`,
  });

  const error = new AppError(`Can't find ${req.originalUrl} on the server!`, 404);
  next(err);
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;

// //users
// /api/v1/users/signin
// /api/v1/users/signup

// //categors
// /api/v1/categorys get
// /api/v1/categorys post
// /api/v1/categorys/:categoryId delete
// /api/v1/categorys/:categoryId delete

// //Tours
// /api/v1/tour get
// /api/v1/tour post
// /api/v1/tour/:tourId delete
// /api/v1/tour/:tourId delete
