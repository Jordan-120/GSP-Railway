const mongoose = require('mongoose');

const ActionSchema = new mongoose.Schema({
  userId: { type: Number, required: false, index: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page' },
  sectionId: { type: mongoose.Schema.Types.ObjectId },
  entryId: { type: mongoose.Schema.Types.ObjectId },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  payload: { type: Object, default: {} },
});

const Action = mongoose.model('Action', ActionSchema);
module.exports = Action;
