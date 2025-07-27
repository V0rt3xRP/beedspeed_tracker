// Global variables
let csvData = null;

// DOM elements
const addProductForm = document.getElementById('addProductForm');
const testScrapeBtn = document.getElementById('testScrapeBtn');
const testResults = document.getElementById('testResults');
const testResultsContent = document.getElementById('testResultsContent');
const csvFile = document.getElementById('csvFile');
const uploadArea = document.getElementById('uploadArea');
const csvPreview = document.getElementById('csvPreview');
const previewTable = document.getElementById('previewTable');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupEventListeners();
    setupDragAndDrop();
});

// Check authentication
function checkAuthentication() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
}

// Get current user
function getCurrentUser() {
    const sessionData = localStorage.getItem('userSession');
    if (!sessionData) return null;
    
    try {
        const session = JSON.parse(sessionData);
        const expires = new Date(session.expires);
        
        if (expires < new Date()) {
            localStorage.removeItem('userSession');
            return null;
        }
        
        return session.user;
    } catch (error) {
        localStorage.removeItem('userSession');
        return null;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('userSession');
    window.location.href = 'login.html';
}

// Setup event listeners
function setupEventListeners() {
    // Add product form
    addProductForm.addEventListener('submit', handleAddProduct);
    
    // Test scrape button
    testScrapeBtn.addEventListener('click', handleTestScrape);
    
    // CSV file input
    csvFile.addEventListener('change', handleCSVFileSelect);
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
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

// Handle add product form submission
async function handleAddProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = {
        url: formData.get('url'),
        stock_selector: formData.get('stockSelector') || null,
        name_selector: formData.get('nameSelector') || null,
        image_selector: formData.get('imageSelector') || null,
        beedspeed_code: formData.get('beedspeedCode') || null
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
        
        addProductForm.reset();
        showToast('Product added successfully!', 'success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        showToast(`Failed to add product: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
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

// Setup drag and drop for CSV upload
function setupDragAndDrop() {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') {
            handleCSVFile(files[0]);
        } else {
            showToast('Please upload a valid CSV file', 'error');
        }
    });
}

// Handle CSV file selection
function handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleCSVFile(file);
    }
}

// Handle CSV file processing
function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            csvData = parseCSV(e.target.result);
            showCSVPreview();
            showToast('CSV file loaded successfully!', 'success');
        } catch (error) {
            showToast(`Error parsing CSV: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Parse CSV content
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Validate headers
    const requiredHeaders = ['url'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }
    
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles quoted values)
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const product = {};
        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });
        
        products.push(product);
    }
    
    return products;
}

// Show CSV preview
function showCSVPreview() {
    if (!csvData || csvData.length === 0) return;
    
    const previewTable = document.getElementById('previewTable');
    const headers = Object.keys(csvData[0]);
    
    let tableHTML = '<table class="preview-table">';
    
    // Header row
    tableHTML += '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead>';
    
    // Data rows (show first 5 rows)
    tableHTML += '<tbody>';
    csvData.slice(0, 5).forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            const value = row[header] || '';
            tableHTML += `<td>${value.length > 50 ? value.substring(0, 50) + '...' : value}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';
    tableHTML += '</table>';
    
    if (csvData.length > 5) {
        tableHTML += `<p class="preview-note">Showing first 5 rows of ${csvData.length} total rows</p>`;
    }
    
    previewTable.innerHTML = tableHTML;
    document.getElementById('csvPreview').classList.remove('hidden');
}

// Clear CSV data
function clearCSV() {
    csvData = null;
    csvFile.value = '';
    csvPreview.classList.add('hidden');
    previewTable.innerHTML = '';
}

// Download CSV template
function downloadCSVTemplate() {
    const csvContent = [
        ['url', 'stock_selector', 'name_selector', 'image_selector', 'beedspeed_code'],
        ['https://example.com/product1', 'cat-store-product-stock', 'cat-store-product-title', 'cat-store-product-main', 'BS001'],
        ['https://example.com/product2', 'cat-store-product-stock', 'cat-store-product-title', 'cat-store-product-main', 'BS002']
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV template downloaded!', 'success');
}

// Upload CSV products
async function uploadCSV() {
    if (!csvData || csvData.length === 0) {
        showToast('No CSV data to upload', 'error');
        return;
    }
    
    const button = document.querySelector('#csvPreview .btn-primary');
    const originalText = button.innerHTML;
    
    try {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        button.disabled = true;
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const product of csvData) {
            try {
                const productData = {
                    url: product.url,
                    stock_selector: product.stock_selector || null,
                    name_selector: product.name_selector || null,
                    image_selector: product.image_selector || null,
                    beedspeed_code: product.beedspeed_code || null
                };
                
                await apiCall('/products', {
                    method: 'POST',
                    body: JSON.stringify(productData)
                });
                
                successCount++;
            } catch (error) {
                console.error(`Failed to add product ${product.url}:`, error);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            showToast(`Successfully added ${successCount} products${errorCount > 0 ? `, ${errorCount} failed` : ''}`, 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showToast('Failed to add any products', 'error');
        }
        
    } catch (error) {
        showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
} 

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    
    // Prevent body scroll when sidebar is open
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

// New Product page functionality 