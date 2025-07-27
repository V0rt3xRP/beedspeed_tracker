// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        window.location.href = 'index.html';
    }
});

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
        const user = await authenticateUser(username, password);
        
        if (user) {
            // Save user session
            saveUserSession(user, rememberMe);
            
            showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showToast('Invalid username or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed: ' + error.message, 'error');
    }
});

// Authenticate user
async function authenticateUser(username, password) {
    try {
        // In production, this would be an API call to your backend
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Authentication failed');
        }
    } catch (error) {
        // For demo purposes, you can add a fallback here
        // But in production, remove this and only use the API
        console.warn('API call failed, using fallback authentication');
        
        // Remove this fallback in production!
        // This is only for development/demo purposes
        const fallbackUsers = {
            'admin': {
                password: 'admin123',
                role: 'admin',
                name: 'Administrator',
                permissions: ['read', 'write', 'delete', 'settings', 'users']
            }
        };
        
        const user = fallbackUsers[username];
        if (user && user.password === password) {
            return {
                username: username,
                role: user.role,
                name: user.name,
                permissions: user.permissions
            };
        }
        
        return null;
    }
}

// Save user session
function saveUserSession(user, rememberMe) {
    const sessionData = {
        user: user,
        timestamp: new Date().toISOString(),
        expires: rememberMe ? 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 days
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    
    localStorage.setItem('userSession', JSON.stringify(sessionData));
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

// Check user permissions
function hasPermission(permission) {
    const user = getCurrentUser();
    return user && user.permissions.includes(permission);
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        passwordIcon.className = 'fas fa-eye';
    }
}

// Show forgot password modal
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').classList.add('show');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Handle forgot password form
document.getElementById('resetForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    
    // In production, this would send a reset email
    showToast('Password reset link sent to your email', 'success');
    closeModal('forgotPasswordModal');
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

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