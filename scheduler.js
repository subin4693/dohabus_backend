const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const Cart = require("./src/models/cartModel");
const Favorites = require("./src/models/favouritesModel");
const mongoose = require("mongoose");

// Initialize Nodemailer transport
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.sendGmail = async () => {
  try {
    // Get the date for 2 weeks ago
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Query both Cart and Favorites for entries older than 2 weeks
    const carts = await Cart.find({ createdAt: { $lte: twoWeeksAgo } })
      .populate("user", "email")
      .populate("tour", "title description coverImage");

    const favorites = await Favorites.find({ createdAt: { $lte: twoWeeksAgo } })
      .populate("user", "email")
      .populate("tour", "title description coverImage");

    // Combine both cart and favorites data into a single array
    const combinedEntries = [...carts, ...favorites];

    // Loop through the combined entries and send emails
    for (const entry of combinedEntries) {
      const { email } = entry.user;
      const { title, description, coverImage } = entry.tour;

      // Define email content
      const mailOptions = {
        from: `"Dohabus"`, // Email will appear to come from "Dohabus"
        to: email, // Recipient's email
        subject: "Reminder about your plan",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <!-- Company Logo -->
            <div style="padding: 10px; background-color: #FED92E; text-align: center;">
              <img src="https://main--boisterous-dasik-d64956.netlify.app/assets/log-CDUvXj-P.png" alt="Dohabus Logo" style="padding: 10px;">
            </div>

            <!-- Greeting and Message -->
            <p>Hi there!</p>
            <p>We noticed you added the following plan to your cart/favorites 2 weeks ago:</p>

            <!-- Plan Details -->
            <h3>Plan Name: ${title.en}</h3>
            <p>Description: ${description.en}</p>

            <!-- Cover Image -->
            <div style="text-align: center; margin: 20px 0;">
              <img src="${coverImage}" alt="Plan Cover Image" style="max-width: 100%; height: auto; border-radius: 10px;">
            </div>

            <!-- Conclusion -->
            <p>We hope to see you complete your booking soon!</p>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 20px;">
              <p>Best regards,</p>
              <p>The Dohabus Team</p>
            </div>
          </div>
        `,
      };
      // Send the email
      await transporter.sendMail(mailOptions);
    }
  } catch (error) {
    console.log("Error in sending email:", error);
  }
};
