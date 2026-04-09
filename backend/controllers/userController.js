//I Sir Gilbert the 3rd, bestow this CRUD

//const mongoose = require('mongoose');
//const bcrypt = require('bcryptjs');   --- not used, commented out until working
const User = require('../models/userModel');
const Action = require('../models/actionModel');

//Controller function to create a new user
const createUser = async (req, res) => {
    try {
        const newUser = await User.create(req.body);

        await Action.create({
            userId: req.user ? req.user.id : null,
            action: "create_user",
            payload: { createdUserId: newUser.id, email: newUser.email }
        });

        res.status(201).json(newUser);
    } catch (error) {
        //console.error("Error creating user:", error); // testing
        res.status(400).json({ message: "Error creating user", error: error.message });
    }   
};

//Controller function to get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving users", error:error.message });
    }
};

//Controller function to get a specific user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);   // Sequelize uses findByPk
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user", error: error.message });
  }
};


//Controller function to update a user by ID
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await User.update(req.body, { where: { id } });
    if (!updated) return res.status(404).json({ message: "User not found" });

    const updatedUser = await User.findByPk(id);

    // Log the action
    await Action.create({
      userId: req.user ? req.user.id : null,
      action: "update_user",
      payload: { updatedUserId: updatedUser.id }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: "Error updating user", error: error.message });
  }
};


//Controller function to delete a user by ID
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();

    // Log the action
    await Action.create({
      userId: req.user ? req.user.id : null,
      action: "delete_user",
      payload: { deletedUserId: user.id, email: user.email }
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

/* ---- Not working ATM, were getting to it-------
//Controller function to change a user password
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;              // user ID from URL
    const { oldPassword, newPassword } = req.body; // passwords from request body

    // Finding user
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    //Validating old password
    const isMatch = await user.validatePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: "Invalid current password" });

    //Updating password (hooks will rehash automatically)
    user.password_hash = newPassword;  
    await user.save();

    //Logging the action
    await Action.create({
      userId: req.user ? req.user.id : null,
      action: "change_password",
      payload: { changedUserId: user.id }
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error changing password", error: error.message });
  }
};
*/
//Exporting all controller functions
module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    //changePassword,
    deleteUser
};

