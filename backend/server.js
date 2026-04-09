const app = require('./app');
const { connectMongo } = require('./config/db');
const sequelize = require('./config/sequelize');
// Start the server on port 5000
const PORT = process.env.PORT || 5000;
(async () => {
  await connectMongo();

  try {
    await sequelize.authenticate();
    console.log('MySQL connection established via Sequelize');
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({alter:true});
    }

  } catch(err) {
    console.error('Sequelize connection error', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();