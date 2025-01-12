const Product = require('../models/Product');
const esClient = require('../config/elasticsearch');
const { body, validationResult } = require('express-validator');
const { getChannel } = require('../config/rabbitmq');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Helper function to fetch the seller's email with improved error handling
const fetchSellerEmail = async (seller_id) => {
  try {
    // Generate service token
    const serviceToken = jwt.sign(
      { 
        service: 'ProductMicroservice',
        type: 'service'
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Construct the correct URL - note the singular 'user'
    const requestUrl = `${process.env.AUTH_SERVICE_URL}/user/${seller_id}`;
    
    console.log('Making request to Auth Service:', {
      url: requestUrl,
      sellerId: seller_id
    });

    const response = await axios.get(requestUrl, {
      headers: { 
        Authorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json'
      },
      validateStatus: null // Allow all status codes for debugging
    });

    // Log response for debugging
    console.log('Auth Service Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    if (response.status === 401) {
      console.error('Authentication failed:', response.data);
      throw new Error('Service authentication failed');
    }

    if (response.status === 404) {
      console.error('User not found:', response.data);
      return null;
    }

    if (response.status !== 200) {
      console.error(`Unexpected response status ${response.status}:`, response.data);
      return null;
    }

    if (!response.data || !response.data.email) {
      console.error('Invalid response format:', response.data);
      return null;
    }

    return response.data.email;
  } catch (error) {
    console.error('Error fetching seller email:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    throw new Error(`Failed to fetch seller email: ${error.message}`);
  }
};

// Helper function to publish events to RabbitMQ (remains the same)
const publishEvent = async (eventName, eventData) => {
  try {
    const channel = getChannel();
    await channel.assertQueue('product_events', { durable: true });
    channel.sendToQueue('product_events', Buffer.from(JSON.stringify({ event: eventName, ...eventData })));
    console.log(`Published event: ${eventName}`, eventData);
  } catch (err) {
    console.error('RabbitMQ Publish Error:', err.message);
    throw new Error('Failed to publish event to RabbitMQ');
  }
};

// Validation Rules remain the same
exports.validateProduct = [
  // ... existing validation rules ...
];

// Create a new product with improved error handling
// exports.createProduct = async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ 
//       success: false,
//       errors: errors.array() 
//     });
//   }

//   try {
//     const { seller_id, title, description, price, stock_quantity, image_url, category_id } = req.body;

//     // Fetch seller email with null check
//     const sellerEmail = await fetchSellerEmail(seller_id);
//     if (!sellerEmail) {
//       return res.status(404).json({
//         success: false,
//         msg: 'Seller not found or email not available',
//         error: 'Invalid seller_id or authentication service error'
//       });
//     }

   
//     // Create the product in the database
//     const product = await Product.create({
//       seller_id,
//       title,
//       description,
//       price: parseFloat(price),
//       stock_quantity: parseInt(stock_quantity, 10),
//       image_url,
//       category_id: parseInt(category_id, 10),
//     });

//     console.log('Product created successfully:', product);

//     try {
//       // Index the product in Elasticsearch
//       await esClient.index({
//         index: 'products',
//         id: product.id.toString(),
//         body: product.toJSON(),
//       });
//       console.log('Product indexed successfully in Elasticsearch');
//     } catch (esError) {
//       // Log Elasticsearch error but don't fail the request
//       console.error('Elasticsearch indexing error:', esError);
//       // Could implement a retry mechanism or queue for failed indexing
//     }

//     try {
//       // Publish product creation event to RabbitMQ
//       await publishEvent('product_created', {
//         product_id: product.id,
//         seller_id,
//         recipient_email: sellerEmail,
//         title,
//         price,
//         category_id,
//       });
//     } catch (eventError) {
//       // Log event publishing error but don't fail the request
//       console.error('Event publishing error:', eventError);
//       // Could implement a retry mechanism or queue for failed events
//     }

//     res.status(201).json({
//       success: true,
//       msg: 'Product created successfully',
//       product,
//     });
//   } catch (err) {
//     console.error('Product creation error:', err.message);
    
//     // Determine appropriate error response
//     if (err.message.includes('Authentication Service')) {
//       return res.status(503).json({
//         success: false,
//         msg: 'Service temporarily unavailable',
//         error: err.message
//       });
//     }

//     res.status(500).json({
//       success: false,
//       msg: 'Server error',
//       error: err.message,
//     });
//   }
// };


exports.createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { seller_id, title, description, price, stock_quantity, image_url, category_id } = req.body;
    
    // Log received data
    console.log('Received product data:', {
      seller_id,
      title,
      description,
      price,
      stock_quantity,
      image_url,
      category_id
    });

    // Validate numeric values
    const validatedPrice = parseFloat(price);
    const validatedStock = parseInt(stock_quantity, 10);
    const validatedCategory = parseInt(category_id, 10);

    if (isNaN(validatedPrice) || validatedPrice <= 0) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid price value provided',
        debug: { price }
      });
    }

    if (isNaN(validatedStock) || validatedStock < 0) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid stock quantity provided',
        debug: { stock_quantity }
      });
    }

    if (isNaN(validatedCategory)) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid category ID provided',
        debug: { category_id }
      });
    }

    // Fetch seller email with null check
    const sellerEmail = await fetchSellerEmail(seller_id);
    if (!sellerEmail) {
      return res.status(404).json({
        success: false,
        msg: 'Seller not found or email not available',
        error: 'Invalid seller_id or authentication service error'
      });
    }

    // Create the product in the database with validated values
    const product = await Product.create({
      seller_id,
      title,
      description,
      price: validatedPrice,
      stock_quantity: validatedStock,
      image_url,
      category_id: validatedCategory,
    });

    console.log('Product created successfully:', product);

    try {
      // Index the product in Elasticsearch
      await esClient.index({
        index: 'products',
        id: product.id.toString(),
        body: product.toJSON(),
      });
      console.log('Product indexed successfully in Elasticsearch');
    } catch (esError) {
      console.error('Elasticsearch indexing error:', esError);
    }

    try {
      // Publish product creation event to RabbitMQ
      await publishEvent('product_created', {
        product_id: product.id,
        seller_id,
        recipient_email: sellerEmail,
        title,
        price: validatedPrice,
        category_id: validatedCategory,
      });
    } catch (eventError) {
      console.error('Event publishing error:', eventError);
    }

    res.status(201).json({
      success: true,
      msg: 'Product created successfully',
      product,
    });
  } catch (err) {
    console.error('Product creation error:', err.message);
    
    if (err.message.includes('Authentication Service')) {
      return res.status(503).json({
        success: false,
        msg: 'Service temporarily unavailable',
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Server error',
      error: err.message,
    });
  }
};
// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    res.status(200).json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get products by vendor
exports.getProductsByVendor = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const products = await Product.findAll({ where: { seller_id: vendor_id } });
    res.status(200).json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get a product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { seller_id, title, description, price, stock_quantity, image_url, category_id } = req.body;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    if (product.seller_id !== seller_id) {
      return res.status(403).json({ msg: 'Unauthorized: You do not own this product' });
    }

    await product.update({ title, description, price, stock_quantity, image_url, category_id });

    // Publish inventory update to Order Service
    const channel = await getChannel();
    await channel.assertQueue('inventory_updates', { durable: true });
    channel.sendToQueue('inventory_updates', Buffer.from(JSON.stringify({
      product_id: id,
      stock_quantity,
    })));

    res.status(200).json({
      success: true,
      msg: 'Product updated successfully',
      product,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { seller_id } = req.body;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    if (product.seller_id !== seller_id) {
      return res.status(403).json({ msg: 'Unauthorized: You do not own this product' });
    }

    await product.destroy();

    res.status(200).json({ success: true, msg: 'Product deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Search products with Elasticsearch
exports.searchProducts = async (req, res) => {
  try {
    const { query, category_id, min_price, max_price } = req.query;

    const filters = [];
    if (category_id) filters.push({ term: { category_id } });
    if (min_price || max_price) {
      filters.push({ range: { price: { gte: min_price || 0, lte: max_price || 99999 } } });
    }

    const result = await esClient.search({
      index: 'products',
      body: {
        query: {
          bool: {
            must: query
              ? {
                  multi_match: {
                    query,
                    fields: ['title', 'description'],
                  },
                }
              : { match_all: {} },
            filter: filters,
          },
        },
      },
    });

    const products = result.hits.hits.map((hit) => hit._source);

    if (products.length === 0) {
      return res.status(404).json({ msg: 'No products found' });
    }

    res.status(200).json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};
