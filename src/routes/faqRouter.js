const express = require("express");

const faqController = require("../controllers/faqController");

const router = express.Router();


// Routes for FAQ
router
    .route("/")
    .post(faqController.createFAQ)  // Create a new FAQ
    .get(faqController.getFAQs);     // Get all FAQs

router
    .route("/:id")
    .get(faqController.getFAQById)   // Get a specific FAQ by ID
    .delete(faqController.deleteFAQ)  // Delete an FAQ
    .put(faqController.editFAQ);      // Edit an FAQ



module.exports = router;
