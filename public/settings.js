// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    
    // Prevent body scroll when sidebar is open
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

// Settings page functionality
let settings = {};

// Default settings
const defaultSettings = {
    slack: {
        enabled: false,
        webhook: '',
        channel: '',
        notifications: {
            outOfStock: true,
            backInStock: false,
            priceChange: false
        }
    },
    autoRefresh: {
        enabled: false,
        interval: 30,
        unit: 'minutes',
        onlyOutOfStock: true,
        onPageFocus: false,
        showNotifications: false,
        activeHours: {
            enabled: false,
            startTime: '09:00',
            endTime: '18:00'
        }
    },
    general: {
        dataRetention: 30,
        defaultStockThreshold: 5,
        theme: 'light'
    }
};

// Load settings on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadSettings();
    setupEventListeners();
    setupRoleManagement();
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
        
        return true;
    } catch (error) {
        localStorage.removeItem('userSession');
        return false;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('userSession');
    window.location.href = 'login.html';
}

// Setup role management
function setupRoleManagement() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Show role management section if user has permissions
    if (hasPermission('users')) {
        document.getElementById('roleManagementSection').style.display = 'block';
        document.getElementById('userManagementSection').style.display = 'block';
        document.getElementById('userListSection').style.display = 'block';
        
        // Load users list
        loadUsersList();
    } else {
        // Show only current user info
        document.getElementById('roleManagementSection').style.display = 'block';
    }

    // Update current user role display
    updateCurrentUserRole(currentUser);
}

// Get current user
function getCurrentUser() {
    const sessionData = localStorage.getItem('userSession');
    if (!sessionData) return null;
    
    try {
        const session = JSON.parse(sessionData);
        return session.user;
    } catch (error) {
        return null;
    }
}

// Check user permissions
function hasPermission(permission) {
    const user = getCurrentUser();
    return user && user.permissions.includes(permission);
}

// Update current user role display
function updateCurrentUserRole(user) {
    const roleElement = document.getElementById('currentUserRole');
    if (roleElement) {
        roleElement.textContent = user.role.toUpperCase();
        roleElement.className = `role-badge role-${user.role}`;
    }
}

// Get demo users (in production, this would be an API call)
function getDemoUsers() {
    // In production, this would fetch users from your backend API
    // For now, return only the current user
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    return [currentUser];
}

// Load users list
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    // Get users (in production, this would be an API call)
    const users = getDemoUsers();
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-users">No users found</div>';
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-username">@${user.username}</div>
                <div class="user-permissions">
                    ${user.permissions.map(perm => `<span class="permission-tag">${perm}</span>`).join('')}
                </div>
            </div>
            <div class="user-actions">
                <button class="btn btn-secondary btn-sm" onclick="editUser('${user.username}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.username}')" ${user.username === getCurrentUser()?.username ? 'disabled' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Show add user modal
function showAddUserModal() {
    // In production, this would show a modal for adding users
    showToast('Add user functionality would be implemented here', 'info');
}

// Edit user
function editUser(username) {
    // In production, this would show an edit modal
    showToast(`Edit user ${username} functionality would be implemented here`, 'info');
}

// Delete user
function deleteUser(username) {
    if (confirm(`Are you sure you want to delete user ${username}?`)) {
        // In production, this would delete the user via API
        showToast(`User ${username} deleted successfully`, 'success');
        loadUsersList(); // Reload the list
    }
}

// Setup event listeners for toggles and inputs
function setupEventListeners() {
    // Slack toggle
    document.getElementById('slackEnabled').addEventListener('change', function() {
        toggleSlackConfig(this.checked);
    });

    // Auto refresh toggle
    document.getElementById('autoRefreshEnabled').addEventListener('change', function() {
        toggleRefreshConfig(this.checked);
    });

    // Active hours toggle
    document.getElementById('refreshOnlyOutOfStock').addEventListener('change', function() {
        toggleActiveHours(!this.checked);
    });
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('stockTrackerSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    } else {
        settings = { ...defaultSettings };
    }
    
    applySettings();
}

// Apply settings to the UI
function applySettings() {
    // Slack settings
    document.getElementById('slackEnabled').checked = settings.slack.enabled;
    document.getElementById('slackWebhook').value = settings.slack.webhook;
    document.getElementById('slackChannel').value = settings.slack.channel;
    document.getElementById('notifyOutOfStock').checked = settings.slack.notifications.outOfStock;
    document.getElementById('notifyBackInStock').checked = settings.slack.notifications.backInStock;
    document.getElementById('notifyPriceChange').checked = settings.slack.notifications.priceChange;
    
    toggleSlackConfig(settings.slack.enabled);

    // Auto refresh settings
    document.getElementById('autoRefreshEnabled').checked = settings.autoRefresh.enabled;
    document.getElementById('refreshInterval').value = settings.autoRefresh.interval;
    document.getElementById('refreshUnit').value = settings.autoRefresh.unit;
    document.getElementById('refreshOnlyOutOfStock').checked = settings.autoRefresh.onlyOutOfStock;
    document.getElementById('refreshOnPageFocus').checked = settings.autoRefresh.onPageFocus;
    document.getElementById('showRefreshNotifications').checked = settings.autoRefresh.showNotifications;
    document.getElementById('refreshStartTime').value = settings.autoRefresh.activeHours.startTime;
    document.getElementById('refreshEndTime').value = settings.autoRefresh.activeHours.endTime;
    
    toggleRefreshConfig(settings.autoRefresh.enabled);
    toggleActiveHours(!settings.autoRefresh.onlyOutOfStock);

    // General settings
    document.getElementById('dataRetention').value = settings.general.dataRetention;
    document.getElementById('defaultStockThreshold').value = settings.general.defaultStockThreshold;
    document.getElementById('theme').value = settings.general.theme;
}

// Toggle Slack configuration visibility
function toggleSlackConfig(enabled) {
    const configElements = ['slackConfig', 'slackChannelConfig', 'notificationSettings'];
    configElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = enabled ? 'block' : 'none';
        }
    });
}

// Toggle refresh configuration visibility
function toggleRefreshConfig(enabled) {
    const configElements = ['refreshConfig', 'refreshSettings', 'refreshSchedule'];
    configElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = enabled ? 'block' : 'none';
        }
    });
}

// Toggle active hours visibility
function toggleActiveHours(show) {
    const element = document.getElementById('refreshSchedule');
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

// Save settings
async function saveSettings() {
    try {
        // Collect settings from form
        settings = {
            slack: {
                enabled: document.getElementById('slackEnabled').checked,
                webhook: document.getElementById('slackWebhook').value.trim(),
                channel: document.getElementById('slackChannel').value.trim(),
                notifications: {
                    outOfStock: document.getElementById('notifyOutOfStock').checked,
                    backInStock: document.getElementById('notifyBackInStock').checked,
                    priceChange: document.getElementById('notifyPriceChange').checked
                }
            },
            autoRefresh: {
                enabled: document.getElementById('autoRefreshEnabled').checked,
                interval: parseInt(document.getElementById('refreshInterval').value),
                unit: document.getElementById('refreshUnit').value,
                onlyOutOfStock: document.getElementById('refreshOnlyOutOfStock').checked,
                onPageFocus: document.getElementById('refreshOnPageFocus').checked,
                showNotifications: document.getElementById('showRefreshNotifications').checked,
                activeHours: {
                    enabled: !document.getElementById('refreshOnlyOutOfStock').checked,
                    startTime: document.getElementById('refreshStartTime').value,
                    endTime: document.getElementById('refreshEndTime').value
                }
            },
            general: {
                dataRetention: parseInt(document.getElementById('dataRetention').value),
                defaultStockThreshold: parseInt(document.getElementById('defaultStockThreshold').value),
                theme: document.getElementById('theme').value
            }
        };

        // Validate settings
        if (settings.slack.enabled && !settings.slack.webhook) {
            showToast('Please enter a Slack webhook URL', 'error');
            return;
        }

        if (settings.autoRefresh.enabled && settings.autoRefresh.interval < 1) {
            showToast('Refresh interval must be at least 1', 'error');
            return;
        }

        // Save to localStorage
        localStorage.setItem('stockTrackerSettings', JSON.stringify(settings));

        // Save to server if needed
        await saveSettingsToServer(settings);

        showToast('Settings saved successfully!', 'success');

        // Apply theme if changed
        applyTheme(settings.general.theme);

        // Notify main dashboard to reload settings (if on same domain)
        if (window.parent && window.parent !== window) {
            // If in iframe, notify parent
            window.parent.postMessage({ type: 'SETTINGS_UPDATED' }, '*');
        } else {
            // If on same page, try to call the function directly
            if (typeof reloadSettings === 'function') {
                reloadSettings();
            }
        }

    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Failed to save settings: ' + error.message, 'error');
    }
}

// Save settings to server
async function saveSettingsToServer(settings) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings to server');
        }

        return await response.json();
    } catch (error) {
        console.warn('Could not save settings to server:', error);
        // Don't throw error - settings are saved locally
    }
}

// Reset settings to defaults
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        settings = { ...defaultSettings };
        localStorage.removeItem('stockTrackerSettings');
        applySettings();
        showToast('Settings reset to defaults', 'success');
    }
}

// Test Slack webhook
async function testSlackWebhook() {
    const webhook = document.getElementById('slackWebhook').value.trim();
    const channel = document.getElementById('slackChannel').value.trim();

    if (!webhook) {
        showToast('Please enter a webhook URL first', 'error');
        return;
    }

    try {
        const response = await fetch('/api/test-slack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                webhook,
                channel,
                message: '🧪 Test notification from Stock Tracker!'
            })
        });

        if (response.ok) {
            showToast('Slack webhook test successful!', 'success');
        } else {
            const error = await response.json();
            showToast('Slack webhook test failed: ' + error.error, 'error');
        }
    } catch (error) {
        console.error('Error testing Slack webhook:', error);
        showToast('Failed to test Slack webhook: ' + error.message, 'error');
    }
}

// Apply theme
function applyTheme(theme) {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('theme-light', 'theme-dark');
    
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        body.classList.add('theme-dark');
    } else {
        body.classList.add('theme-light');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Export settings for backup
function exportSettings() {
    const settingsData = localStorage.getItem('stockTrackerSettings');
    if (!settingsData) {
        showToast('No settings to export', 'info');
        return;
    }

    const blob = new Blob([settingsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-tracker-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Settings exported successfully', 'success');
}

// Import settings from backup
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedSettings = JSON.parse(e.target.result);
                settings = importedSettings;
                localStorage.setItem('stockTrackerSettings', JSON.stringify(settings));
                applySettings();
                showToast('Settings imported successfully', 'success');
            } catch (error) {
                showToast('Invalid settings file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
} 