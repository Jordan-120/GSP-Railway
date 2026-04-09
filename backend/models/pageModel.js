const mongoose = require('mongoose');

const DataEntriesSchema = new mongoose.Schema(
  {
    entry_title: { type: String, required: true },
    content_text: { type: String },
  },
  { _id: true }
);

const FunctionSchema = new mongoose.Schema(
  {
    function_name: { type: String, required: true },
  },
  { _id: true }
);

const SectionSchema = new mongoose.Schema(
  {
    section_title: { type: String, required: true },
    section_number: { type: Number, required: true },
    data_entries: [DataEntriesSchema],
    functions: [FunctionSchema],
  },
  { _id: true }
);

const PageSchema = new mongoose.Schema({
  page_name: { type: String, required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  sections: [SectionSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const Page = mongoose.model('Page', PageSchema);

module.exports = Page;
