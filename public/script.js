// Global variables
let products = [];
let filteredProducts = [];
let autoRefreshInterval = null;
let settings = {};
let currentUser = null;

// DOM elements
const addProductForm = document.getElementById('addProductForm');
const loadingIndicator = document.getElementById('loadingIndicator');
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');
const addProductModal = document.getElementById('addProductModal');
const editProductForm = document.getElementById('editProductForm');
const deleteProductPreview = document.getElementById('deleteProductPreview');
const testScrapeBtn = document.getElementById('testScrapeBtn');
const testResults = document.getElementById('testResults');
const testResultsContent = document.getElementById('testResultsContent');

// Summary cards
const totalProductsEl = document.getElementById('totalProducts');
const inStockCountEl = document.getElementById('inStockCount');
const outOfStockCountEl = document.getElementById('outOfStockCount');
const activeMonitoringEl = document.getElementById('activeMonitoring');

// Load settings on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Update header with user info
    updateHeader();
    
    loadSettings();
    loadProducts();
    
    // Start auto refresh immediately
    console.log('🚀 Starting auto refresh system...');
    setupAutoRefresh();
    
    // Also setup page focus refresh
    setupPageFocusRefresh();
    setupEventListeners();
    
    // Add event listener for Refresh All button
    const refreshAllBtn = document.querySelector('.btn[onclick="handleScrapeAllProducts()"]');
    if (refreshAllBtn) {
        refreshAllBtn.addEventListener('click', handleScrapeAllProducts);
    }

    // Listen for settings updates from settings page
    window.addEventListener('message', function(event) {
        if (event.data.type === 'SETTINGS_UPDATED') {
            console.log('📋 Received settings update notification');
            reloadSettings();
        }
    });
});

// Check authentication
function checkAuthentication() {
    const sessionData = localStorage.getItem('userSession');
    if (!sessionData) return false;
    
    try {
        const session = JSON.parse(sessionData);
        const expires = new Date(session.expires);
        
        if (expires < new Date()) {
            localStorage.removeItem('userSession');
            return false;
        }
        
        currentUser = session.user;
        console.log('👤 Authenticated as:', currentUser.name, `(${currentUser.role})`);
        return true;
    } catch (error) {
        localStorage.removeItem('userSession');
        return false;
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check user permissions
function hasPermission(permission) {
    return currentUser && currentUser.permissions.includes(permission);
}

// Logout function
function logout() {
    localStorage.removeItem('userSession');
    window.location.href = 'login.html';
}

// Update header to show user info and logout
function updateHeader() {
    const header = document.querySelector('.header-left');
    if (header && currentUser) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
        `;
        header.appendChild(userInfo);
    }
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('stockTrackerSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    } else {
        settings = {
            slack: { enabled: false, webhook: '', channel: '', notifications: { outOfStock: true, backInStock: false, priceChange: false } },
            autoRefresh: { enabled: false, interval: 30, unit: 'minutes', onlyOutOfStock: true, onPageFocus: false, showNotifications: false },
            general: { dataRetention: 30, defaultStockThreshold: 5, theme: 'light' }
        };
    }
    console.log('📋 Settings loaded:', settings);
}

// Reload settings and restart auto refresh
function reloadSettings() {
    console.log('🔄 Reloading settings...');
    loadSettings();
    setupAutoRefresh();
    setupPageFocusRefresh();
    console.log('✅ Settings reloaded and auto refresh updated');
}

// Manual refresh settings (can be called from settings page)
function refreshSettings() {
    reloadSettings();
    showToast('⚙️ Settings refreshed and auto refresh updated', 'success');
}

// Setup automatic refresh
function setupAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }

    // Check if auto refresh is enabled in settings
    if (!settings.autoRefresh || !settings.autoRefresh.enabled) {
        console.log('⚠️ Auto refresh is disabled in settings');
        return;
    }

    // Calculate interval based on settings
    const intervalMs = settings.autoRefresh.unit === 'hours' 
        ? settings.autoRefresh.interval * 60 * 60 * 1000 
        : settings.autoRefresh.interval * 60 * 1000;
    
    console.log(`🔄 Setting up automatic refresh every ${settings.autoRefresh.interval} ${settings.autoRefresh.unit}...`);
    
    autoRefreshInterval = setInterval(() => {
        console.log('🔄 Auto refresh triggered at:', new Date().toLocaleTimeString());
        
        // Check if we're within active hours
        if (isWithinActiveHours()) {
            performAutoRefresh();
        } else {
            console.log('⏰ Outside active hours, skipping auto refresh');
        }
    }, intervalMs);

    // Perform initial refresh if enabled and within active hours
    if (isWithinActiveHours()) {
        setTimeout(() => {
            console.log('🔄 Performing initial auto refresh...');
            performAutoRefresh();
        }, 30000); // 30 seconds after page load
    }

    console.log(`✅ Auto refresh configured: ${settings.autoRefresh.interval} ${settings.autoRefresh.unit}, active hours: ${settings.autoRefresh.activeHours?.enabled ? 'enabled' : 'disabled'}`);
}

// Perform automatic refresh
async function performAutoRefresh() {
    try {
        console.log('🔄 Starting automatic refresh...');
        
        // Determine which products to refresh based on settings
        let productsToRefresh = [...products];
        
        if (settings.autoRefresh && settings.autoRefresh.onlyOutOfStock) {
            productsToRefresh = products.filter(product => {
                const stockStatus = product.stock_status?.toLowerCase().trim();
                return stockStatus && !isInStock(stockStatus);
            });
            console.log(`🔄 Refreshing only out-of-stock products: ${productsToRefresh.length}/${products.length}`);
        } else {
            console.log(`🔄 Refreshing all products: ${productsToRefresh.length}`);
        }
        
        if (productsToRefresh.length === 0) {
            console.log('⚠️ No products to refresh');
            return;
        }

        // Show loading state if notifications are enabled
        if (settings.autoRefresh && settings.autoRefresh.showNotifications) {
            showToast('🔄 Auto-refreshing products...', 'info');
        }

        // Refresh products in parallel with better error handling
        const refreshPromises = productsToRefresh.map(async (product, index) => {
            try {
                console.log(`🔄 Refreshing product ${index + 1}/${productsToRefresh.length}: ${product.product_name}`);
                
                const response = await apiCall(`/products/${product.id}/scrape`, {
                    method: 'POST'
                });
                
                console.log(`✅ Product refreshed: ${product.product_name}`, response);
                
                // Check for stock changes and send notifications
                await checkStockChanges(product, response);
                
                return { success: true, product: response };
            } catch (error) {
                console.error(`❌ Error refreshing product ${product.product_name}:`, error);
                return { success: false, product: product, error: error.message };
            }
        });

        const results = await Promise.all(refreshPromises);
        const successfulRefreshes = results.filter(result => result.success).map(result => result.product);
        const failedRefreshes = results.filter(result => !result.success);

        console.log(`✅ Auto refresh completed: ${successfulRefreshes.length} successful, ${failedRefreshes.length} failed`);

        // Update products array with successful refreshes
        successfulRefreshes.forEach(refreshedProduct => {
            const index = products.findIndex(p => p.id === refreshedProduct.id);
            if (index !== -1) {
                products[index] = refreshedProduct;
            }
        });

        // Update filtered products and UI
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();

        // Show results if notifications are enabled
        if (settings.autoRefresh && settings.autoRefresh.showNotifications) {
            if (successfulRefreshes.length > 0) {
                showToast(`✅ Auto refresh: ${successfulRefreshes.length} products updated`, 'success');
            }
            
            if (failedRefreshes.length > 0) {
                showToast(`⚠️ Auto refresh: ${failedRefreshes.length} products failed`, 'error');
            }
        }

        // Log any failed refreshes
        failedRefreshes.forEach(failed => {
            console.error(`Failed to refresh: ${failed.product.product_name} - ${failed.error}`);
        });

    } catch (error) {
        console.error('❌ Error during auto refresh:', error);
        if (settings.autoRefresh && settings.autoRefresh.showNotifications) {
            showToast('❌ Auto refresh failed: ' + error.message, 'error');
        }
    }
}

// Enhanced stock change detection
async function checkStockChanges(oldProduct, newProduct) {
    if (!settings.slack || !settings.slack.enabled || !settings.slack.webhook) {
        return;
    }

    const oldStock = oldProduct.stock_status?.toLowerCase().trim();
    const newStock = newProduct.stock_status?.toLowerCase().trim();

    console.log(`🔍 Checking stock changes for ${oldProduct.product_name}:`, {
        old: oldStock,
        new: newStock
    });

    // Check if product went out of stock
    if (settings.slack.notifications.outOfStock && 
        isInStock(oldStock) && !isInStock(newStock)) {
        console.log(`🚨 Product went out of stock: ${oldProduct.product_name}`);
        await sendSlackNotification(newProduct, 'out_of_stock');
    }

    // Check if product came back in stock
    if (settings.slack.notifications.backInStock && 
        !isInStock(oldStock) && isInStock(newStock)) {
        console.log(`✅ Product back in stock: ${oldProduct.product_name}`);
        await sendSlackNotification(newProduct, 'back_in_stock');
    }

    // Check for price changes (if price tracking is implemented)
    if (settings.slack.notifications.priceChange && 
        oldProduct.price !== newProduct.price) {
        console.log(`💰 Price change detected: ${oldProduct.product_name}`);
        await sendSlackNotification(newProduct, 'price_change');
    }
}

// Helper function to check if stock status indicates in stock
function isInStock(stockStatus) {
    if (!stockStatus) return false;
    
    const inStockKeywords = [
        'in stock',
        'available',
        'yes',
        'true',
        '✓',
        'check',
        'instock',
        'available now',
        'ready to ship'
    ];
    
    return inStockKeywords.some(keyword => 
        stockStatus.includes(keyword.toLowerCase())
    );
}

// Send Slack notification
async function sendSlackNotification(product, event) {
    try {
        await fetch('/api/notify-slack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                webhook: settings.slack.webhook,
                channel: settings.slack.channel,
                product: product,
                event: event
            })
        });
        
        console.log(`Slack notification sent for ${event}: ${product.product_name}`);
    } catch (error) {
        console.error('Error sending Slack notification:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add product form
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProduct);
    }
    
    // Edit product form
    if (editProductForm) {
        editProductForm.addEventListener('submit', handleEditProductSubmit);
    }
    
    // Test scrape button
    if (testScrapeBtn) {
        testScrapeBtn.addEventListener('click', handleTestScrape);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            closeAddModal();
            closeEditModal();
            closeDeleteModal();
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
        if (event.target === addProductModal) {
            closeAddModal();
        }
    });

    // Setup filter tabs
    setupFilterTabs();

    // Modal close functionality
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // Close modals with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
}

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load products from the server
async function loadProducts() {
    console.log('Loading products...');
    showLoading(true);
    try {
        console.log('Making API call to /products...');
        const response = await apiCall('/products');
        console.log('API response:', response);
        console.log('Sample product data:', response[0]);
        products = response;
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();
        console.log('Products loaded successfully:', products.length);
    } catch (error) {
        console.error('Failed to load products:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        showToast('Failed to load products: ' + error.message, 'error');
        
        // Show a fallback message in the table
        const productsTableBody = document.getElementById('productsTableBody');
        if (productsTableBody) {
            productsTableBody.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load products</h3>
                    <p>Error: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadProducts()">
                        <i class="fas fa-refresh"></i> Try Again
                    </button>
                </div>
            `;
        }
    } finally {
        showLoading(false);
    }
}

// Update summary cards
function updateSummaryCards() {
    const total = products.length;
    const inStock = products.filter(p => getStockClass(p.stock_status) === 'stock-in').length;
    const outOfStock = products.filter(p => getStockClass(p.stock_status) === 'stock-out').length;
    const active = products.length; // All products are actively monitored
    
    totalProductsEl.textContent = total;
    inStockCountEl.textContent = inStock;
    outOfStockCountEl.textContent = outOfStock;
    activeMonitoringEl.textContent = active;
}

// Render products in the grid
function renderProducts() {
    const productsTableBody = document.getElementById('productsTableBody');
    if (!productsTableBody) return;

    if (filteredProducts.length === 0) {
        productsTableBody.innerHTML = `
            <div class="no-products">
                <i class="fas fa-box-open"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or add some products to get started.</p>
            </div>
        `;
        return;
    }

    productsTableBody.innerHTML = filteredProducts.map(product => `
        <div class="table-row" data-id="${product.id}">
            <div class="table-cell checkbox-cell">
                <input type="checkbox" class="product-checkbox" value="${product.id}">
            </div>
            <div class="table-cell title-cell">
                ${product.product_name || 'Product name not found'}
            </div>
            <div class="table-cell code-cell">
                ${product.product_code ? product.product_code.replace('Product : ', '') : '-'}
            </div>
            <div class="table-cell beedspeed-cell">
                ${product.beedspeed_code || '-'}
            </div>
            <div class="table-cell updated-cell">
                ${formatDateTime(product.updated_at)}
            </div>
            <div class="table-cell stock-cell">
                <span class="status-pill ${getStockClass(product.stock_status)}">
                    ${product.stock_status || 'Unknown'}
                </span>
            </div>
            <div class="table-cell actions-cell">
                <div class="dropdown">
                    <button class="dropdown-toggle-small" onclick="toggleDropdown('${product.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-menu-small" id="dropdown-${product.id}">
                        <button class="dropdown-item-small" onclick="openEditModal('${product.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <a href="${product.url}" target="_blank" class="dropdown-item-small">
                            <i class="fas fa-external-link-alt"></i> Visit
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle image loading error
function handleImageError(imgElement, imageUrl) {
    console.error(`❌ Image failed to load: ${imageUrl}`);
    
    // Create a clean fallback without debug info
    imgElement.parentElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #a0aec0; background: #2d3748; border-radius: 8px;">
            <i class="fas fa-image" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.6;"></i>
            <div style="font-size: 0.9rem; text-align: center; opacity: 0.8;">
                No Image Available
            </div>
        </div>
    `;
}

// Handle image loading success
function handleImageLoad(imgElement) {
    console.log(`✅ Image loaded successfully: ${imgElement.src}`);
    // Remove any error styling if image loads successfully
    imgElement.style.border = 'none';
    imgElement.style.backgroundColor = 'transparent';
}

// Get stock status CSS class
function getStockClass(stockStatus) {
    if (!stockStatus || stockStatus === 'Not found') return 'stock-unknown';
    
    const status = stockStatus.toLowerCase();
    
    // Extract number from status first
    const match = status.match(/(\d+)/);
    if (match) {
        const stockNumber = parseInt(match[1]);
        // If we have a number, check if it's greater than 0
        if (stockNumber > 0) {
            return 'stock-in';
        } else {
            return 'stock-out';
        }
    }
    
    // If no number found, check for text-based indicators
    if (status.includes('0 in stock') || status.includes('0 stock') || status.includes('out of stock') || status.includes('unavailable') || status.includes('no stock')) {
        return 'stock-out';
    }
    
    // Check for positive stock indicators
    if (status.includes('in stock') || status.includes('available') || status.includes('yes')) {
        return 'stock-in';
    }
    
    return 'stock-unknown';
}

// Get stock status icon
function getStockIcon(stockStatus) {
    if (!stockStatus || stockStatus === 'Not found') return 'question-circle';
    
    const status = stockStatus.toLowerCase();
    
    // Extract number from status first
    const match = status.match(/(\d+)/);
    if (match) {
        const stockNumber = parseInt(match[1]);
        // If we have a number, check if it's greater than 0
        if (stockNumber > 0) {
            return 'check-circle';
        } else {
            return 'exclamation-circle';
        }
    }
    
    // If no number found, check for text-based indicators
    if (status.includes('0 in stock') || status.includes('0 stock') || status.includes('out of stock') || status.includes('unavailable') || status.includes('no stock')) {
        return 'exclamation-circle';
    }
    
    // Check for positive stock indicators
    if (status.includes('in stock') || status.includes('available') || status.includes('yes')) {
        return 'check-circle';
    }
    
    return 'question-circle';
}

// Get stock quantity for display
function getStockQuantity(stockStatus) {
    if (!stockStatus || stockStatus === 'Not found') return '0';
    
    const status = stockStatus.toLowerCase();
    
    // Extract number from status
    const match = status.match(/(\d+)/);
    if (match) {
        return match[1];
    }
    
    // Fallback logic
    if (status.includes('0 in stock') || status.includes('0 stock') || status.includes('out of stock') || status.includes('unavailable') || status.includes('no stock')) {
        return '0';
    } else if (status.includes('in stock') || status.includes('available') || status.includes('yes')) {
        return '11'; // Default positive stock
    }
    
    return '0';
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
        return 'Just now';
    } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    // Format as YYYY-MM-DD HH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Apply search and filter
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilterValue = document.getElementById('statusFilter').value;
    
    filteredProducts = products.filter(product => {
        // Search filter
        const matchesSearch = !searchTerm || 
            product.product_name?.toLowerCase().includes(searchTerm) ||
            product.url.toLowerCase().includes(searchTerm) ||
            product.stock_status?.toLowerCase().includes(searchTerm);
        
        // Status filter
        const productStatus = getStockClass(product.stock_status);
        const matchesStatus = statusFilterValue === 'all' || 
            (statusFilterValue === 'in-stock' && productStatus === 'stock-in') ||
            (statusFilterValue === 'out-of-stock' && productStatus === 'stock-out') ||
            (statusFilterValue === 'unknown' && productStatus === 'stock-unknown');
        
        return matchesSearch && matchesStatus;
    });
    
    renderProducts();
}

// Handle test scrape
async function handleTestScrape() {
    const url = document.getElementById('url').value;
    
    if (!url) {
        showToast('Please enter a URL to test', 'error');
        return;
    }
    
    try {
        const button = testScrapeBtn;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        button.disabled = true;
        
        // Clear previous results
        testResults.classList.add('hidden');
        testResultsContent.innerHTML = '';
        
        // Get selectors from form
        const stockSelector = document.getElementById('stockSelector').value || null;
        const nameSelector = document.getElementById('nameSelector').value || null;
        const imageSelector = document.getElementById('imageSelector').value || null;
        
        // Test the scraping
        const response = await fetch(`/api/test-scrape?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        // Show results
        testResults.classList.remove('hidden');
        
        if (result.success) {
            testResultsContent.innerHTML = `
                <div class="test-result-item test-result-success">
                    <strong>✅ Test Successful!</strong><br>
                    URL: ${result.url}
                </div>
                <div class="test-result-item test-result-info">
                    <strong>📋 Scraped Data:</strong><br>
                    Product Name: ${result.scraped_data.product_name}<br>
                    Stock Status: ${result.scraped_data.stock_status}<br>
                    Image URL: ${result.scraped_data.image_url}<br>
                    Updated: ${result.scraped_data.updated_at}
                </div>
                <div class="test-result-item test-result-info">
                    <strong>🔧 Debug Info:</strong><br>
                    Stock Selector: ${stockSelector || 'Auto-detected'}<br>
                    Name Selector: ${nameSelector || 'Auto-detected'}<br>
                    Image Selector: ${imageSelector || 'Auto-detected'}
                </div>
            `;
            showToast('Test scrape completed successfully!', 'success');
        } else {
            testResultsContent.innerHTML = `
                <div class="test-result-item test-result-error">
                    <strong>❌ Test Failed!</strong><br>
                    Error: ${result.error}<br>
                    Message: ${result.message}
                </div>
            `;
            showToast('Test scrape failed', 'error');
        }
        
    } catch (error) {
        testResults.classList.remove('hidden');
        testResultsContent.innerHTML = `
            <div class="test-result-item test-result-error">
                <strong>❌ Test Failed!</strong><br>
                Error: ${error.message}
            </div>
        `;
        showToast(`Test failed: ${error.message}`, 'error');
    } finally {
        const button = testScrapeBtn;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Handle add product form submission
async function handleAddProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = {
        url: formData.get('url'),
        stock_selector: formData.get('stockSelector') || null,
        name_selector: formData.get('nameSelector') || null,
        image_selector: formData.get('imageSelector') || null
    };
    
    const button = event.target.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    
    try {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        button.disabled = true;
        
        const newProduct = await apiCall('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
        
        products.push(newProduct);
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();
        closeAddModal();
        showToast('Product added successfully!', 'success');
    } catch (error) {
        showToast(`Failed to add product: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Open add modal
function openAddModal() {
    addProductModal.classList.remove('hidden');
}

// Close add modal
function closeAddModal() {
    addProductModal.classList.add('hidden');
    addProductForm.reset();
    testResults.classList.add('hidden');
}

// Open edit modal and populate with product data
function openEditModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('editId').value = product.id;
    document.getElementById('editUrl').value = product.url;
    document.getElementById('editStockSelector').value = product.stock_selector || '';
    document.getElementById('editNameSelector').value = product.name_selector || '';
    document.getElementById('editImageSelector').value = product.image_selector || '';
    document.getElementById('editBeedspeedCode').value = product.beedspeed_code || '';
    
    editModal.classList.remove('hidden');
}

// Handle edit product form submission
async function handleEditProductSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productId = formData.get('id');
    
    const updateData = {
        url: formData.get('url'),
        stock_selector: formData.get('stockSelector') || null,
        name_selector: formData.get('nameSelector') || null,
        image_selector: formData.get('imageSelector') || null,
        beedspeed_code: formData.get('beedspeedCode') || null
    };
    
    console.log('Updating product with data:', updateData);
    
    try {
        // First, update the product with the new data
        const updatedProduct = await apiCall(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        console.log('Server response:', updatedProduct);
        
        // Then, automatically refresh the product data
        console.log('Refreshing product data...');
        const refreshedProduct = await apiCall(`/products/${productId}/scrape`, {
            method: 'POST'
        });
        
        console.log('Refreshed product data:', refreshedProduct);
        
        // Update product in array with the refreshed data
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = refreshedProduct;
        }
        
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();
        
        closeEditModal();
        showToast('Product updated and refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        showToast(`Failed to update product: ${error.message}`, 'error');
    }
}

// Handle delete product
function handleDeleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    productToDelete = product;
    
    // Show product preview in delete modal
    deleteProductPreview.innerHTML = `
        <div class="product-name">${product.product_name || 'Product name not found'}</div>
        <div class="product-stock ${getStockClass(product.stock_status)}">
            ${product.stock_status || 'Stock status not found'}
        </div>
        <div class="product-url">${product.url}</div>
    `;
    
    // Show modal
    deleteModal.classList.remove('hidden');
}

// Confirm delete product
async function confirmDelete() {
    if (!productToDelete) return;
    
    const button = document.querySelector('#deleteModal .btn-danger');
    const originalText = button.innerHTML;
    
    try {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        button.disabled = true;
        
        await apiCall(`/products/${productToDelete.id}`, {
            method: 'DELETE'
        });
        
        // Remove product from array
        products = products.filter(p => p.id !== productToDelete.id);
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();
        
        closeDeleteModal();
        productToDelete = null;
        showToast('Product deleted successfully!', 'success');
    } catch (error) {
        showToast(`Failed to delete product: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Toggle dropdown menu
function toggleDropdown(productId) {
    const dropdown = document.getElementById(`dropdown-${productId}`);
    const allDropdowns = document.querySelectorAll('.dropdown-menu');
    
    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d.id !== `dropdown-${productId}`) {
            d.classList.remove('show');
        }
    });
    
    dropdown.classList.toggle('show');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// Handle scrape individual product
async function handleScrapeProduct(productId) {
    const button = document.querySelector(`[data-id="${productId}"] .btn-secondary`);
    const originalText = button.innerHTML;
    
    try {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        button.disabled = true;
        
        const updatedProduct = await apiCall(`/products/${productId}/scrape`, {
            method: 'POST'
        });
        
        // Update product in array
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = updatedProduct;
        }
        
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();
        showToast('Product data refreshed!', 'success');
    } catch (error) {
        showToast(`Failed to refresh product: ${error.message}`, 'error');
    } finally {
        const button = document.querySelector(`[data-id="${productId}"] .btn-secondary`);
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Refresh all products
async function handleScrapeAllProducts() {
    if (!products.length) return;
    showLoading(true);
    try {
        // Run all scrapes in parallel
        const updatedProducts = await Promise.all(products.map(product =>
            apiCall(`/products/${product.id}/scrape`, { method: 'POST' })
        ));
        // Update products array
        products = updatedProducts;
        filteredProducts = [...products];
        renderProducts();
        updateSummaryCards();
        showToast('All products refreshed!', 'success');
    } catch (error) {
        showToast(`Failed to refresh all products: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Modal functions
function closeEditModal() {
    editModal.classList.add('hidden');
    editProductForm.reset();
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    productToDelete = null;
}

// Utility functions
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Add slideOut animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    
    // Prevent body scroll when sidebar is open
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

// Toggle export dropdown
function toggleExportDropdown() {
    const exportMenu = document.getElementById('exportMenu');
    exportMenu.classList.toggle('show');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.export-dropdown')) {
            exportMenu.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// Export products to CSV
function exportProducts(filter = 'all') {
    let productsToExport = [];
    
    switch (filter) {
        case 'all':
            productsToExport = products;
            break;
        case 'in-stock':
            productsToExport = products.filter(p => p.stock_status?.toLowerCase() === 'in stock');
            break;
        case 'out-of-stock':
            productsToExport = products.filter(p => p.stock_status?.toLowerCase() === 'out of stock');
            break;
        default:
            productsToExport = products;
    }
    
    if (productsToExport.length === 0) {
        showToast('No products to export', 'warning');
        return;
    }
    
    // Create CSV content
    const csvContent = [
        ['Title', 'Product Code', 'Beedspeed Code', 'Stock Level'],
        ...productsToExport.map(product => [
            product.product_name || 'N/A',
            product.product_code ? product.product_code.replace('Product : ', '') : 'N/A',
            product.beedspeed_code || 'N/A',
            product.stock_status || 'Unknown'
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${filter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${productsToExport.length} products`, 'success');
}

// Toggle select all checkbox
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const productCheckboxes = document.querySelectorAll('.product-checkbox');
    
    productCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Setup filter tabs
function setupFilterTabs() {
    console.log('Setting up filter tabs...');
    const filterTabs = document.querySelectorAll('.filter-tab');
    console.log('Found filter tabs:', filterTabs.length);
    
    filterTabs.forEach(tab => {
        console.log('Adding click listener to tab:', tab.textContent);
        tab.addEventListener('click', () => {
            console.log('Filter tab clicked:', tab.textContent);
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            const filter = tab.getAttribute('data-filter');
            console.log('Filter value:', filter);
            filterProducts(filter);
        });
    });
}

// Filter products based on status
function filterProducts(status) {
    console.log('Filtering products by status:', status);
    console.log('Available products:', products.map(p => ({ name: p.product_name, stock: p.stock_status })));
    
    if (status === 'all') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(product => {
            const stockStatus = product.stock_status?.toLowerCase().trim();
            console.log(`Product: ${product.product_name}, Stock Status: "${stockStatus}"`);
            
            switch (status) {
                case 'in-stock':
                    // Only show products that are clearly in stock
                    return stockStatus && (
                        stockStatus === 'in stock' ||
                        stockStatus === 'available' ||
                        stockStatus === 'yes' ||
                        stockStatus === 'true' ||
                        stockStatus.includes('✓') ||
                        stockStatus.includes('check')
                    );
                case 'out-of-stock':
                    // Only show products that are clearly out of stock
                    return stockStatus && (
                        stockStatus === 'out of stock' ||
                        stockStatus === 'unavailable' ||
                        stockStatus === 'no' ||
                        stockStatus === 'false' ||
                        stockStatus.includes('✗') ||
                        stockStatus.includes('sold out')
                    );
                case 'unknown':
                    // Products with no stock status or unclear status
                    return !stockStatus || 
                           stockStatus === 'unknown' || 
                           stockStatus === '' ||
                           stockStatus === 'null' ||
                           stockStatus === 'undefined' ||
                           stockStatus === 'not found';
                default:
                    return true;
            }
        });
    }
    
    console.log(`Filtered to ${filteredProducts.length} products`);
    renderProducts();
    updateSummaryCards();
}