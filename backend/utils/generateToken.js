const nodeCrypto = require('crypto');

function generateRandomToken() {
  return nodeCrypto.randomBytes(32).toString('hex');
}

module.exports = generateRandomToken;
