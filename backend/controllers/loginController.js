const { login } = require('./authController');

const loginUser = async (req, res) => login(req, res);

module.exports = { loginUser };
