const express = require("express");
const {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  getTemplatePages,
  updateTemplate,
  deleteTemplate,
  requestPublish,
  listPublishedTemplates,
  getPublishedTemplatePages,
  copyPublishedTemplateToUser,
} = require("../controllers/templateController");

const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

/* ---------------- Published Template Library ---------------- */

// IMPORTANT: these MUST come before "/:id" routes
router.get("/published", authMiddleware, listPublishedTemplates);
router.get("/published/:id/pages", authMiddleware, getPublishedTemplatePages);
router.post("/published/:id/copy", authMiddleware, copyPublishedTemplateToUser);

/* ---------------- User Templates ---------------- */

// Create template
router.post("/", authMiddleware, createTemplate);

// Get templates (user-only unless admin)
router.get("/", authMiddleware, getAllTemplates);

// Admin/owner preview pages
router.get("/:id/pages", authMiddleware, getTemplatePages);

// Request publish (or resubmit after denied)
router.patch("/:id/request-publish", authMiddleware, requestPublish);

// Get by id
router.get("/:id", authMiddleware, getTemplateById);

// Update
router.put("/:id", authMiddleware, updateTemplate);

// Delete
router.delete("/:id", authMiddleware, deleteTemplate);

module.exports = router;