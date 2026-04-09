//MySQL sequelize with ENV

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Pick the right .env file based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'test'
    ? '../.env.test'
    : process.env.NODE_ENV === 'production'
    ? '../.env.production'
    : '../.env';

dotenv.config({ path: path.join(__dirname, envFile), override: true });

const env = process.env.NODE_ENV || 'development';

// Use MYSQL_DATABASE from whichever env file was loaded
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: env === 'development' ? console.log : false, // show SQL logs only in dev
  }
);

module.exports = sequelize;
