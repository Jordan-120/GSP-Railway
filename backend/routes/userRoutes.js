const express = require('express');

const { createUser, getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();
//const User = require('../models/userModel');
//const sendEmail = require('../utils/sendEmail');
//const generateRandomToken = require('../utils/generateToken');
//const bcrypt = require('bcryptjs'); 

/*
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: {email} });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = generateRandomToken();
    const verificationTokenExpires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    const verifyUrl = `${process.env.CLIENT_URL}/api/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `
        <p>Hi ${user.name || ''},</p>
        <p>Thanks for registering. Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    res.status(201).json({
      message: 'User registered. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
*/
//Post create a new user
router.post('/', createUser);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

//Get retrieve all user
router.get('/', getAllUsers);

//Get retrieve a user by ID
router.get('/:id', getUserById);

//Put update a user by ID
router.put('/:id', updateUser);

//Delete delete a user by ID 
router.delete('/:id', deleteUser);

//console.log("userRoutes loaded");//Testing that routes are loaded

module.exports = router;