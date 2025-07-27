const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get all tracked products
 * @returns {Array} Array of products
 */
async function getAllProducts() {
  try {
    const { data, error } = await supabase
      .from('tracked_urls')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Get a single product by ID
 * @param {string} id - Product ID
 * @returns {Object|null} Product object or null
 */
async function getProductById(id) {
  try {
    const { data, error } = await supabase
      .from('tracked_urls')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Object} Created product
 */
async function createProduct(productData) {
  try {
    const product = {
      id: uuidv4(),
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tracked_urls')
      .insert([product])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 * @param {string} id - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Object|null} Updated product or null
 */
async function updateProduct(id, productData) {
  try {
    const updateData = {
      ...productData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tracked_urls')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 * @param {string} id - Product ID
 * @returns {boolean} Success status
 */
async function deleteProduct(id) {
  try {
    const { error } = await supabase
      .from('tracked_urls')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Test database connection
 * @returns {boolean} Connection status
 */
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('tracked_urls')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  testConnection
}; 