//MySQL-Mongo Data Conneection yooo

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');

// MongoDB connection
const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
};

// MySQL connection pool
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectMySQL = async () => {
  try {
    const conn = await mysqlPool.getConnection();
    console.log('MySQL connected');
    conn.release();
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
  }
};

module.exports = { connectMongo, connectMySQL, mysqlPool };
//module.exports = { connectMongo };