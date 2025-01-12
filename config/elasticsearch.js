const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic', // Use your Elasticsearch username
    password: process.env.ELASTICSEARCH_PASSWORD || 'EK4ixKdu5FaG7rNJwzjiB1uN', // Use your Elasticsearch password
  },
});

module.exports = esClient;
