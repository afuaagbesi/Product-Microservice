const dotenv = require('dotenv');
const { Sequelize } = require('sequelize');
dotenv.config();

// Load environment variables

// Use the DATABASE_URL from your Neon PostgreSQL dashboard
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Neon
    },
  },
  logging: false, // Disable query logging in development
});

module.exports = { sequelize };
