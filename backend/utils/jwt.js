const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "devsecret"; // set in .env

// Generate a token for a user
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email }, // payload
    JWT_SECRET,
    { expiresIn: "1h" } // adjust as needed
  );
}

// Verify and decode a token
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken, JWT_SECRET };
