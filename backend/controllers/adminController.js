const User = require('../models/userModel');
const Template = require('../models/templateModel');
const { Op } = require('sequelize');

const DENIAL_REASONS = [
  { code: 'INCOMPLETE', text: 'Template is incomplete or has empty pages.' },
  {
    code: 'FORMAT',
    text: 'Formatting/layout issues (overflow, broken sections, unreadable text).',
  },
  {
    code: 'BROKEN_WIDGETS',
    text: 'Some widgets/features do not function correctly.',
  },
  {
    code: 'LOW_QUALITY',
    text: 'Overall quality needs improvement (spacing, consistency, clarity).',
  },
  {
    code: 'DUPLICATE',
    text: 'Template is too similar to an existing published template.',
  },
  { code: 'OTHER', text: 'Other (admin selected a general reason).' },
];

const getQueue = async (req, res) => {
  try {
    const filter = (req.query.filter || 'all_users').toLowerCase();

    if (filter === 'all_users') {
      const users = await User.findAll({
        attributes: ['id', 'first_name', 'last_name', 'email', 'profile_type'],
      });

      return res.json(
        users.map((u) => ({
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          template_name: '',
          status: u.profile_type,
          template_mongo_id: null,
        }))
      );
    }

    if (filter === 'banned_users') {
      const users = await User.findAll({
        where: { profile_type: 'Banned' },
        attributes: ['id', 'first_name', 'last_name', 'email', 'profile_type'],
      });

      return res.json(
        users.map((u) => ({
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          template_name: '',
          status: 'banned',
          template_mongo_id: null,
        }))
      );
    }

    if (
      filter === 'publish_pending' ||
      filter === 'publish_approved' ||
      filter === 'publish_denied'
    ) {
      const status =
        filter === 'publish_pending'
          ? 'Requested'
          : filter === 'publish_approved'
            ? 'Published'
            : 'Denied';

      const templates = await Template.find({ publish_status: status })
        .sort({ updated_at: -1, created_at: -1 })
        .lean();

      const userIds = templates
        .map((t) => t.userId)
        .filter((v) => typeof v === 'number');

      const sqlUsers = userIds.length
        ? await User.findAll({
            where: { id: { [Op.in]: userIds } },
            attributes: ['id', 'first_name', 'last_name', 'email', 'profile_type'],
          })
        : [];

      const userById = new Map(sqlUsers.map((u) => [u.id, u]));

      const rows = templates.map((t) => {
        const u = typeof t.userId === 'number' ? userById.get(t.userId) : null;
        const name = u
          ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
          : 'Unknown user';

        return {
          id: u?.id ?? t.userId ?? '',
          name,
          template_name: t.template_name || '',
          status: status.toLowerCase(),
          template_mongo_id: t._id?.toString?.() || null,
        };
      });

      return res.json(rows);
    }

    return res.json([]);
  } catch (err) {
    console.error('getQueue error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getDenialReasons = async (req, res) => {
  res.json(DENIAL_REASONS);
};

const banUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    if (req.user.id === userId) {
      return res.status(400).json({ message: 'Admins cannot ban their own account.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.profile_type === 'Admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be banned.' });
    }

    if (user.profile_type === 'Banned') {
      return res.status(400).json({ message: 'User is already banned.' });
    }

    user.profile_type = 'Banned';
    await user.save();

    return res.json({ message: 'User banned successfully.', user });
  } catch (err) {
    console.error('banUser error:', err.message);
    return res.status(500).json({ message: 'Server error banning user' });
  }
};

const unbanUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.profile_type !== 'Banned') {
      return res.status(400).json({ message: 'User is not currently banned.' });
    }

    user.profile_type = user.is_verified ? 'Registered' : 'Guest';
    await user.save();

    return res.json({ message: 'User unbanned successfully.', user });
  } catch (err) {
    console.error('unbanUser error:', err.message);
    return res.status(500).json({ message: 'Server error unbanning user' });
  }
};

const approveTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.publish_status = 'Published';
    template.denied_reason_code = null;
    template.denied_reason_text = null;
    template.denied_at = null;
    template.reviewed_by = req.user.id;
    template.reviewed_at = new Date();
    template.updated_at = new Date();

    await template.save();

    return res.json({ message: 'Template approved and published.', template });
  } catch (err) {
    console.error('approveTemplate error:', err.message);
    return res.status(500).json({ message: 'Server error approving template' });
  }
};

const rejectTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason_code } = req.body || {};

    const reason = DENIAL_REASONS.find((r) => r.code === reason_code);
    if (!reason) {
      return res.status(400).json({ message: 'Invalid reason_code' });
    }

    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.publish_status = 'Denied';
    template.denied_reason_code = reason.code;
    template.denied_reason_text = reason.text;
    template.denied_at = new Date();
    template.reviewed_by = req.user.id;
    template.reviewed_at = new Date();
    template.updated_at = new Date();

    await template.save();

    return res.json({ message: 'Template denied.', template });
  } catch (err) {
    console.error('rejectTemplate error:', err.message);
    return res.status(500).json({ message: 'Server error rejecting template' });
  }
};

module.exports = {
  getQueue,
  getDenialReasons,
  banUser,
  unbanUser,
  approveTemplate,
  rejectTemplate,
};
