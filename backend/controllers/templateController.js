const mongoose = require('mongoose');
const Template = require('../models/templateModel');
const Action = require('../models/actionModel');
const User = require('../models/userModel');

const MAX_TEMPLATES_PER_USER = 10;
const MAX_PAGES_PER_TEMPLATE = 10;

function isAdmin(req) {
  return req.user?.profile_type === 'Admin';
}

function ensureObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function buildDefaultPage() {
  return {
    name: 'Home',
    content: '',
    style: {
      backgroundColor: '#ffffff',
      height: '700px',
      gridEnabled: true,
      width: '800px',
    },
  };
}

function normalizePages(pages) {
  const safePages = Array.isArray(pages) ? pages.slice(0, MAX_PAGES_PER_TEMPLATE) : [];

  if (!safePages.length) {
    return [buildDefaultPage()];
  }

  return safePages.map((page, index) => ({
    name: String(page?.name || `Page ${index + 1}`).trim() || `Page ${index + 1}`,
    content: typeof page?.content === 'string' ? page.content : '',
    style: {
      backgroundColor: page?.style?.backgroundColor || '#ffffff',
      height: page?.style?.height || '700px',
      gridEnabled: page?.style?.gridEnabled !== false,
      width: page?.style?.width || '800px',
    },
  }));
}

async function countUserTemplates(userId) {
  return Template.countDocuments({ userId });
}

async function enforceTemplateLimit(req, res) {
  const total = await countUserTemplates(req.user.id);
  if (total >= MAX_TEMPLATES_PER_USER) {
    res.status(400).json({
      message: `You can only have up to ${MAX_TEMPLATES_PER_USER} templates per user.`,
    });
    return false;
  }
  return true;
}

async function updateUserLastTemplate(userId, templateId) {
  if (!userId) return;
  await User.update({ last_template_id: templateId || null }, { where: { id: userId } });
}

async function logAction({ userId, templateId, action, payload = {} }) {
  await Action.create({
    userId: userId || null,
    templateId: templateId || null,
    action,
    payload,
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapPagesForPreview(template) {
  const pages = Array.isArray(template.pages) ? template.pages : [];

  return pages.map((p, idx) => {
    const content = p && typeof p.content === 'string' ? p.content : '';
    const style = p?.style || {};
    const bg = style.backgroundColor || '#ffffff';
    const width = style.width || '800px';
    const height = style.height || '700px';
    const gridCss = style.gridEnabled === false
      ? 'none'
      : 'linear-gradient(to right, #f2f2f2 1px, transparent 1px), linear-gradient(to bottom, #f2f2f2 1px, transparent 1px)';
    const isFullDoc = /^\s*<!doctype\s+html|^\s*<html[\s>]/i.test(content);

    const html = isFullDoc
      ? content
      : `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p?.name || `Page ${idx + 1}`)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #eef3f9;
    }
    body {
      padding: 16px;
      overflow: auto;
      font-family: Arial, sans-serif;
    }
    .preview-stage {
      width: max-content;
      min-width: 100%;
    }
    .preview-canvas {
      position: relative;
      overflow: auto;
      width: ${width};
      height: ${height};
      background: ${bg};
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.12);
      background-image: ${gridCss};
      background-size: 20px 20px;
    }
    .preview-canvas > .builder-placeholder {
      position: absolute;
      top: 16px;
      left: 16px;
      color: #999;
      font-size: 13px;
      margin: 0;
    }
    .preview-canvas .builder-widget {
      position: absolute;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="preview-stage">
    <div class="preview-canvas">${content}</div>
  </div>
</body>
</html>`;

    return {
      pageNumber: idx + 1,
      name: p?.name || `Page ${idx + 1}`,
      html,
    };
  });
}

const createTemplate = async (req, res) => {
  try {
    if (!(await enforceTemplateLimit(req, res))) {
      return;
    }

    const templateName = String(req.body?.template_name || '').trim();
    if (!templateName) {
      return res.status(400).json({ message: 'Template name is required.' });
    }

    const newTemplate = new Template({
      userId: req.user.id,
      template_name: templateName,
      version: Number(req.body?.version) || 1,
      publish_status: req.body?.publish_status || 'Draft',
      denied_reason_text: req.body?.denied_reason_text || null,
      pages: normalizePages(req.body?.pages),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await newTemplate.save();
    await updateUserLastTemplate(req.user.id, newTemplate._id.toString());
    await logAction({
      userId: req.user.id,
      templateId: newTemplate._id,
      action: 'create_template',
      payload: { template_name: newTemplate.template_name },
    });

    return res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(400).json({ message: 'Error creating template', error: error.message });
  }
};

const getAllTemplates = async (req, res) => {
  try {
    const query = isAdmin(req) ? {} : { userId: req.user.id };
    const templates = await Template.find(query).sort({ updated_at: -1 }).lean();
    return res.status(200).json(templates);
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving templates', error: error.message });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await Template.findById(id).lean();
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!isAdmin(req) && template.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json(template);
  } catch (error) {
    console.error('Error retrieving template:', error.message);
    return res.status(500).json({ message: 'Error retrieving template', error: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const existing = await Template.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!isAdmin(req) && existing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const nextName = String(req.body?.template_name || existing.template_name).trim();
    if (!nextName) {
      return res.status(400).json({ message: 'Template name is required.' });
    }

    existing.template_name = nextName;
    existing.publish_status = req.body?.publish_status || existing.publish_status || 'Draft';
    existing.denied_reason_text = req.body?.denied_reason_text ?? existing.denied_reason_text ?? null;
    existing.pages = normalizePages(req.body?.pages ?? existing.pages);
    existing.updated_at = new Date();

    await existing.save();
    await updateUserLastTemplate(existing.userId, existing._id.toString());
    await logAction({
      userId: req.user.id,
      templateId: existing._id,
      action: 'update_template',
      payload: { updatedFields: req.body },
    });

    return res.status(200).json(existing);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating template', error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const existing = await Template.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!isAdmin(req) && existing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const ownerTemplateCount = await countUserTemplates(existing.userId);
    if (ownerTemplateCount <= 1) {
      return res.status(400).json({ message: 'You must keep at least one template.' });
    }

    const deletedTemplateName = existing.template_name;
    const deletedTemplateId = existing._id;
    const ownerUserId = existing.userId;

    await Template.findByIdAndDelete(id);

    const fallbackTemplate = await Template.findOne({ userId: ownerUserId })
      .sort({ updated_at: -1, created_at: -1 })
      .lean();

    await updateUserLastTemplate(ownerUserId, fallbackTemplate?._id?.toString() || null);
    await logAction({
      userId: req.user.id,
      templateId: deletedTemplateId,
      action: 'delete_template',
      payload: {
        deletedTemplateId,
        deletedTemplateName,
      },
    });

    return res.status(200).json({
      message: 'Template deleted successfully',
      nextTemplateId: fallbackTemplate?._id || null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting template', error: error.message });
  }
};

const getTemplatePages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await Template.findById(id).lean();
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!isAdmin(req) && template.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json({ template_id: template._id, pages: wrapPagesForPreview(template) });
  } catch (error) {
    console.error('Error retrieving template pages:', error.message);
    return res.status(500).json({ message: 'Error retrieving template pages', error: error.message });
  }
};

const requestPublish = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!isAdmin(req) && template.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    template.publish_status = 'Requested';
    template.denied_reason_code = null;
    template.denied_reason_text = null;
    template.denied_at = null;
    template.reviewed_by = null;
    template.reviewed_at = null;
    template.updated_at = new Date();

    await template.save();

    return res.status(200).json({
      message: 'Template submitted for publishing approval.',
      template,
    });
  } catch (error) {
    console.error('requestPublish error:', error.message);
    return res.status(500).json({ message: 'Error submitting template for publish', error: error.message });
  }
};

const listPublishedTemplates = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const query = { publish_status: 'Published' };

    if (search) {
      query.template_name = { $regex: search, $options: 'i' };
    }

    const templates = await Template.find(query)
      .sort({ updated_at: -1, created_at: -1 })
      .select('_id template_name version userId publish_status created_at updated_at')
      .lean();

    return res.status(200).json(templates);
  } catch (error) {
    console.error('listPublishedTemplates error:', error.message);
    return res.status(500).json({ message: 'Error retrieving published templates', error: error.message });
  }
};

const getPublishedTemplatePages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    const template = await Template.findById(id).lean();
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.publish_status !== 'Published') {
      return res.status(403).json({ message: 'Template is not published' });
    }

    return res.status(200).json({ template_id: template._id, pages: wrapPagesForPreview(template) });
  } catch (error) {
    console.error('getPublishedTemplatePages error:', error.message);
    return res.status(500).json({ message: 'Error retrieving published template pages', error: error.message });
  }
};

const copyPublishedTemplateToUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ensureObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format' });
    }

    if (!(await enforceTemplateLimit(req, res))) {
      return;
    }

    const source = await Template.findById(id).lean();
    if (!source) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (source.publish_status !== 'Published') {
      return res.status(403).json({ message: 'Template is not published' });
    }

    const copyName = `${source.template_name} (Copy)`;

    const newTemplate = new Template({
      userId: req.user.id,
      template_name: copyName,
      version: 1,
      publish_status: 'Draft',
      denied_reason_code: null,
      denied_reason_text: null,
      denied_at: null,
      reviewed_by: null,
      reviewed_at: null,
      pages: normalizePages(source.pages),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await newTemplate.save();
    await updateUserLastTemplate(req.user.id, newTemplate._id.toString());
    await logAction({
      userId: req.user.id,
      templateId: newTemplate._id,
      action: 'copy_published_template',
      payload: { sourceTemplateId: source._id, sourceTemplateName: source.template_name },
    });

    return res.status(201).json(newTemplate);
  } catch (error) {
    console.error('copyPublishedTemplateToUser error:', error.message);
    return res.status(500).json({ message: 'Error copying published template', error: error.message });
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  getTemplatePages,
  requestPublish,
  listPublishedTemplates,
  getPublishedTemplatePages,
  copyPublishedTemplateToUser,
};
