const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const { sequelize } = require('./config/db');
const { connectToRabbitMQ } = require('./config/rabbitmq');

(async () => {
  try {
    await connectToRabbitMQ();
    console.log('RabbitMQ initialized');
  } catch (err) {
    console.error('Failed to initialize RabbitMQ:', err.message);
    process.exit(1);
  }
})();

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // Sync models with DB
    console.log('Neon PostgreSQL connected for Product Service');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1); // Exit if the database connection fails
  }
})();

// Routes
app.use('/api/products', productRoutes);

// Default Route for Health Check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Product Service is up and running!' });
});

// Global Error Handler


// Server Initialization
const port = process.env.PORT || 6000;
app.listen(port, () => {
  console.log(`Product Service running on port ${port}`);
});
