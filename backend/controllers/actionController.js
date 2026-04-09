// Controller fucntion to get all actions (newest first, also toss error if wrong)
const mongoose = require('mongoose');
const Action = require('../models/actionModel');

const getAllActions = async (req, res) => {
  try {
    const actions = await Action.find().sort({ timestamp: -1 });
    res.status(200).json(actions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching actions", error: error.message });
  }
};

// Controller function to get a single action by ID
const getActionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid action ID format" });
    }

    const action = await Action.findById(id);
    if (!action) return res.status(404).json({ message: "Action not found" });
    res.status(200).json(action);
  } catch (error) {
    res.status(500).json({ message: "Error fetching action", error: error.message });
  }
};

module.exports = { getAllActions, getActionById };