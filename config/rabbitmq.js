const amqp = require('amqplib');

let channel;

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ successfully');
  } catch (err) {
    console.error('Error connecting to RabbitMQ:', err.message);
    process.exit(1); // Exit the process if RabbitMQ connection fails
  }
};

const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialized. Call connectToRabbitMQ() first.');
  }
  return channel;
};

module.exports = { connectToRabbitMQ, getChannel };
