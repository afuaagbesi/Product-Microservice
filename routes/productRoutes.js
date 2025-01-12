const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/tokenValidation'); // Ensure proper import of middleware
const router = express.Router();

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Seller-only)
 */
router.post('/', authenticate, authorize('seller'), productController.createProduct);

router.get("/test",(req,res)=>{
    res.send("PROXY IS WORKINGGGGG")
})
/**
 * @route   GET /api/products
 * @desc    Retrieve all products
 * @access  Public
 */
router.get('/', productController.getAllProducts);

/**
 * @route   GET /api/products/vendor/:vendor_id
 * @desc    Retrieve products by vendor ID
 * @access  Public
 */
router.get('/vendor/:vendor_id', productController.getProductsByVendor);

/**
 * @route   GET /api/products/:id
 * @desc    Retrieve a single product by ID
 * @access  Public
 */
router.get('/:id', productController.getProductById);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private (Seller-only)
 */
router.put('/:id', authenticate, authorize('seller'), productController.updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private (Seller-only)
 */
router.delete('/:id', authenticate, authorize('seller'), productController.deleteProduct);

/**
 * @route   GET /api/products/search
 * @desc    Search for products using Elasticsearch
 * @access  Public
 */
router.get('/search', productController.searchProducts);

module.exports = router;
