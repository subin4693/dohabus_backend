const express = require("express");
const cookieParser = require("cookie-parser");

const userRouter = require("./src/routes/usersRouter");
const categoryRouter = require("./src/routes/categorysRouter");
const reviewsRouter = require("./src/routes/reviewsRouter");

const planRouter = require("./src/routes/plansRouter");
const aboutRouter = require("./src/routes/aboutRouter");

const ticketRouter = require("./src/routes/ticketsRouter");
const cartRouter = require("./src/routes/cartsRouter");
const hotelRouter = require("./src/routes/hotelRouter");
const favouriteRoutes = require("./src/routes/favouriteRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const footerRoutes = require("./src/routes/footerRouter");
const awardRoutes = require("./src/routes/awardRouter");
const locationRouter = require("./src/routes/locationRouter");
const bannerRouter = require("./src/routes/bannerRouter");
const blogRouter = require("./src/routes/blogRouter");
const subscriberRoute = require("./src/routes/subscriberRouter");
const offerRouter = require("./src/routes/offerRouter");
const offerbannerRouter = require("./src/routes/offerbannerRouter");
const couriesRouter = require("./src/routes/couriseRouter");
const populorCouriesRouter = require("./src/routes/populorcouriseRouter");
const guideLineRouter = require("./src/routes/guidelineRouter");
const termsAndConditionRouter = require("./src/routes/termsAndConditionRouter");

const transportationRouter = require("./src/routes/transportationRouter");
const transbookrouters = require("./src/routes/TransbookingRouter");
const faqRouter = require("./src/routes/faqRouter");
const cron = require("node-cron");
const cors = require("cors");
const AppError = require("./src/utils/appError");
const globalErrorHandler = require("./src/controllers/errorController");

const { sendGmail } = require("./scheduler");
let app = express();
let weekCounter = 0;
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://earnest-beijinho-ce768b.netlify.app",
      "https://www.dohabus.com",
      "https://dohabus.com",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

cron.schedule("0 9 * * *", () => {
  sendGmail();
});
app.use("/api/v1/users", userRouter);
app.use("/api/v1/categorys", categoryRouter);
app.use("/api/v1/plans", planRouter);
app.use("/api/v1/tickets", ticketRouter);
app.use("/api/v1/carts", cartRouter);

app.use("/api/v1/reviews", reviewsRouter);

app.use("/api/v1/hotels", hotelRouter);
app.use("/api/v1/favourites", favouriteRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use("/api/v1/about", aboutRouter);
app.use("/api/v1/blogs", blogRouter);
app.use("/api/v1/subscribe", subscriberRoute);
app.use("/api/v1/footer", footerRoutes);
app.use("/api/v1/award", awardRoutes);
app.use("/api/v1/locations", locationRouter);
app.use("/api/v1/banner", bannerRouter);
app.use("/api/v1/transportations", transportationRouter);
app.use("/api/v1/transbook", transbookrouters);

app.use("/api/v1/offers", offerRouter);
app.use("/api/v1/offerbanner", offerbannerRouter);

app.use("/api/v1/couries", couriesRouter);
app.use("/api/v1/populor-couries", populorCouriesRouter);
app.use("/api/v1/guidelines", guideLineRouter);
app.use("/api/v1/faq", faqRouter);

app.use("/api/v1/termsandconditions", termsAndConditionRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
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
