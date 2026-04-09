//Template with Pages housed insde for single object as storage (pretty happy about this procedure)
const mongoose = require("mongoose");

// Represents a single page inside a template.
// This mirrors the front-end page object: { name, content, style }.
const PageStateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    content: { type: String, default: "" },
    style: {
      backgroundColor: { type: String, default: "#ffffff" },
      height: { type: String, default: "700px" },
      gridEnabled: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const TemplateSchema = mongoose.Schema({
  // Links this Mongo template back to the SQL user (users.id)
  userId: { type: Number, required: true, index: true },

  template_name: { type: String, required: true },
  version: { type: Number, default: 1 },

  publish_status: {
    type: String,
    enum: ["Published", "Requested", "Draft", "Denied"],
    default: "Draft",
  },

  // Admin review metadata (for Denied status)
  denied_reason_code: { type: String, default: null },
  denied_reason_text: { type: String, default: null },
  denied_at: { type: Date, default: null },

  reviewed_by: { type: Number, default: null }, // SQL admin user id
  reviewed_at: { type: Date, default: null },

  pages: {
    type: [PageStateSchema],
    default: [],
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const Template = mongoose.model("Template", TemplateSchema);

module.exports = Template;