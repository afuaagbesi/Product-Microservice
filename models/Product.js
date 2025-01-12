const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const esClient = require('../config/elasticsearch');

const INDEX_NAME = 'products';

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: { args: [3, 100], msg: 'Title must be between 3 and 100 characters' },
    },
  },
  description: { type: DataTypes.TEXT },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isPositive(value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          throw new Error('Price must be a positive number');
        }
      }
    },
  },
  stock_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  image_url: {
    type: DataTypes.STRING,
    validate: {
      isUrl: { msg: 'Image URL must be a valid URL' },
    },
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: { msg: 'Category ID must be an integer' },
    },
  },
}, {
  tableName: 'Products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    afterCreate: async (product, options) => {
      try {
        if (!options.silent) {
          await esClient.index({
            index: INDEX_NAME,
            id: product.id,
            body: product.toJSON(),
          });
        }
      } catch (err) {
        console.error('Error indexing product in Elasticsearch:', err.message);
      }
    },
    afterUpdate: async (product, options) => {
      try {
        if (!options.silent) {
          await esClient.update({
            index: INDEX_NAME,
            id: product.id,
            body: { doc: product.toJSON() },
          });
        }
      } catch (err) {
        console.error('Error updating product in Elasticsearch:', err.message);
      }
    },
    afterDestroy: async (product, options) => {
      try {
        if (!options.silent) {
          await esClient.delete({
            index: INDEX_NAME,
            id: product.id,
          });
        }
      } catch (err) {
        console.error('Error deleting product from Elasticsearch:', err.message);
      }
    },
  },
});

module.exports = Product;
