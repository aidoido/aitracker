// Global state
let currentUser = null;
let currentSection = 'dashboard';

// DOM elements
const elements = {};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Cache DOM elements
    cacheElements();

    // Check authentication
    await checkAuth();

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    if (currentUser) {
        loadDashboard();
    }
});

function cacheElements() {
    // Main elements
    elements.userGreeting = document.getElementById('user-greeting');
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.adminBtn = document.getElementById('admin-btn');

    // Tabs
    elements.dashboardTab = document.getElementById('dashboard-tab');
    elements.requestsTab = document.getElementById('requests-tab');
    elements.kbTab = document.getElementById('kb-tab');

    // Sections
    elements.dashboardSection = document.getElementById('dashboard-section');
    elements.requestsSection = document.getElementById('requests-section');
    elements.kbSection = document.getElementById('kb-section');

    // Dashboard elements
    elements.totalRequests = document.getElementById('total-requests');
    elements.todayRequests = document.getElementById('today-requests');
    elements.openRequests = document.getElementById('open-requests');
    elements.closedRequests = document.getElementById('closed-requests');
    elements.recentRequestsList = document.getElementById('recent-requests-list');

    // Requests elements
    elements.newRequestBtn = document.getElementById('new-request-btn');
    elements.exportCsvBtn = document.getElementById('export-csv-btn');
    elements.statusFilter = document.getElementById('status-filter');
    elements.searchInput = document.getElementById('search-input');
    elements.requestsList = document.getElementById('requests-list');

    // KB elements
    elements.newKbBtn = document.getElementById('new-kb-btn');
    elements.kbSearchInput = document.getElementById('kb-search-input');
    elements.kbArticlesList = document.getElementById('kb-articles-list');

    // Modals
    elements.requestModal = document.getElementById('request-modal');
    elements.requestDetailModal = document.getElementById('request-detail-modal');
    elements.kbModal = document.getElementById('kb-modal');

    // Debug modal elements
    console.log('Modal elements loaded:', {
        requestModal: !!elements.requestModal,
        requestDetailModal: !!elements.requestDetailModal,
        kbModal: !!elements.kbModal,
        requestDetailContent: !!document.getElementById('request-detail-content')
    });

    // Forms
    elements.requestForm = document.getElementById('request-form');
    elements.kbForm = document.getElementById('kb-form');
}

function setupEventListeners() {
    // Tab switching
    elements.dashboardTab.addEventListener('click', () => switchTab('dashboard'));
    elements.requestsTab.addEventListener('click', () => switchTab('requests'));
    elements.kbTab.addEventListener('click', () => switchTab('kb'));

    // Authentication
    elements.logoutBtn.addEventListener('click', logout);
    elements.adminBtn.addEventListener('click', () => window.location.href = '/admin');

    // Requests
    elements.newRequestBtn.addEventListener('click', () => openRequestModal());
    elements.exportCsvBtn.addEventListener('click', exportToCsv);
    elements.statusFilter.addEventListener('change', loadRequests);
    elements.searchInput.addEventListener('input', debounce(loadRequests, 300));

    // KB
    elements.newKbBtn.addEventListener('click', () => openKbModal());
    elements.kbSearchInput.addEventListener('input', debounce(loadKbArticles, 300));

    // Forms
    elements.requestForm.addEventListener('submit', handleRequestSubmit);
    elements.kbForm.addEventListener('submit', handleKbSubmit);

    // Modal close
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModal);
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    });
}

// Authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data;
            updateUserInterface();
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login';
    }
}

function updateUserInterface() {
    if (currentUser) {
        elements.userGreeting.textContent = `Hello, ${currentUser.role === 'admin' ? 'Admin' : currentUser.username}!`;
        if (currentUser.role === 'admin') {
            elements.adminBtn.style.display = 'inline-block';
        }
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`#${tabName}-tab`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelector(`#${tabName}-section`).classList.add('active');

    currentSection = tabName;

    // Load section data
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'requests':
            loadRequests();
            break;
        case 'kb':
            loadKbArticles();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard/metrics');
        const data = await response.json();

        elements.totalRequests.textContent = data.total;
        elements.todayRequests.textContent = data.todayCount;
        elements.openRequests.textContent = data.statusCounts.open;
        elements.closedRequests.textContent = data.statusCounts.closed;

        renderRecentRequests(data.recentRequests);
        loadChartData();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// Load chart data
async function loadChartData() {
    try {
        const response = await fetch('/api/dashboard/requests-by-date');
        const data = await response.json();

        renderChart(data);
    } catch (error) {
        console.error('Failed to load chart data:', error);
    }
}

// Render chart
function renderChart(data) {
    const ctx = document.getElementById('requestsChart');
    if (!ctx) return;

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded, rendering simple chart');
        renderSimpleChart(ctx, data);
        return;
    }

    const labels = data.map(item => new Date(item.date).toLocaleDateString());
    const values = data.map(item => item.count);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Requests per Day',
                data: values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Simple CSS-based chart as fallback
function renderSimpleChart(canvas, data) {
    const container = canvas.parentElement;
    container.innerHTML = `
        <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
            <h4>Request Trends (Last 7 Days)</h4>
            <div style="display: flex; justify-content: space-around; margin-top: 20px; flex-wrap: wrap;">
                ${data.slice(-7).map(item => `
                    <div style="text-align: center; margin: 5px;">
                        <div style="height: ${Math.max(item.count * 15, 30)}px; width: 40px; background: #3498db; margin: 0 auto 8px; border-radius: 4px; display: flex; align-items: end; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                            ${item.count}
                        </div>
                        <div style="font-size: 11px; color: #666;">${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                `).join('')}
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #666;">Simple chart (Chart.js not loaded due to CSP)</p>
        </div>
    `;
}

function renderRecentRequests(requests) {
    if (!requests || requests.length === 0) {
        elements.recentRequestsList.innerHTML = '<p class="loading">No recent requests</p>';
        return;
    }

    elements.recentRequestsList.innerHTML = requests.map(request => `
        <div class="request-item" onclick="openRequestDetail(${request.id})">
            <div class="request-header">
                <div class="request-title">${request.requester_name}</div>
                <div class="request-meta">${new Date(request.created_at).toLocaleDateString()}</div>
            </div>
            <div class="request-description">${truncateText(request.description, 100)}</div>
            <span class="request-status status-${request.status}">${request.status.replace('_', ' ')}</span>
        </div>
    `).join('');
}

// Requests functions
async function loadRequests() {
    try {
        const status = elements.statusFilter.value;
        const search = elements.searchInput.value;

        let url = '/api/requests?';
        if (status) url += `status=${status}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;

        const response = await fetch(url);
        const requests = await response.json();

        renderRequests(requests);
    } catch (error) {
        console.error('Failed to load requests:', error);
        showError('Failed to load requests');
    }
}

function renderRequests(requests) {
    if (!requests || requests.length === 0) {
        elements.requestsList.innerHTML = '<p class="loading">No requests found</p>';
        return;
    }

    elements.requestsList.innerHTML = requests.map(request => `
        <div class="request-item" onclick="openRequestDetail(${request.id})">
            <div class="request-header">
                <div class="request-title">${request.requester_name} - ${request.category_name || 'Uncategorized'}</div>
                <div class="request-meta">${new Date(request.created_at).toLocaleDateString()} by ${request.created_by_username}</div>
            </div>
            <div class="request-description">${truncateText(request.description, 150)}</div>
            <span class="request-status status-${request.status}">${request.status.replace('_', ' ')}</span>
        </div>
    `).join('');
}

// Request detail modal
async function openRequestDetail(requestId) {
    console.log('Opening request detail for ID:', requestId);
    try {
        const response = await fetch(`/api/requests/${requestId}`);
        console.log('API response status:', response.status);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const request = await response.json();
        console.log('Request data received:', request);

        const content = `
            <div class="request-detail">
                <div class="detail-section">
                    <div class="detail-label">Requester:</div>
                    <div class="detail-value">${request.requester_name}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Channel:</div>
                    <div class="detail-value">${request.channel.replace('_', ' ')}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Category:</div>
                    <div class="detail-value">${request.category_name || 'Uncategorized'}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Severity:</div>
                    <div class="detail-value">${request.severity}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">
                        <select id="request-status" onchange="updateRequestStatus(${request.id}, this.value)">
                            <option value="open" ${request.status === 'open' ? 'selected' : ''}>Open</option>
                            <option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="closed" ${request.status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    </div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Description:</div>
                    <div class="detail-value">${request.description}</div>
                </div>
                ${request.ai_recommendation ? `
                    <div class="detail-section">
                        <div class="detail-label">AI Recommendation:</div>
                        <div class="ai-recommendation">${request.ai_recommendation}</div>
                    </div>
                ` : ''}
                ${request.ai_reply ? `
                    <div class="detail-section">
                        <div class="detail-label">AI Generated Reply:</div>
                        <div class="ai-reply" style="background: #e8f4fd; padding: 12px; border-radius: 6px; border-left: 4px solid #3498db; margin-top: 8px;">${request.ai_reply.replace(/\n/g, '<br>')}</div>
                        <button class="btn-secondary" onclick="copyToClipboard('${request.ai_reply.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" style="margin-top: 8px; font-size: 12px;">Copy Reply</button>
                    </div>
                ` : ''}
                ${request.solution ? `
                    <div class="detail-section">
                        <div class="detail-label">Solution:</div>
                        <div class="solution-section">${request.solution}</div>
                    </div>
                ` : ''}
                <div class="action-buttons">
                    <button class="btn-primary" onclick="generateAIReply(${request.id})">Generate AI Reply</button>
                    ${currentUser.role !== 'viewer' ? `
                        <button class="btn-secondary" onclick="editRequestSolution(${request.id})">Add/Edit Solution</button>
                        <button class="btn-secondary" onclick="createKbFromRequest(${request.id})">Create KB Article</button>
                        <button class="btn-danger" onclick="deleteRequest(${request.id}, '${request.requester_name.replace(/'/g, "\\'")}')">Delete Request</button>
                    ` : ''}
                </div>
            </div>
        `;

        console.log('Setting modal content...');
        const contentElement = document.getElementById('request-detail-content');
        const modalElement = elements.requestDetailModal;

        console.log('Content element found:', !!contentElement);
        console.log('Modal element found:', !!modalElement);

        if (!contentElement || !modalElement) {
            console.error('Modal elements not found!');
            showError('Modal elements not found');
            return;
        }

        contentElement.innerHTML = content;
        modalElement.style.display = 'block';
        console.log('Modal opened successfully');

    // Set up edit button
    const editBtn = document.getElementById('edit-request-btn');
    if (editBtn) {
        editBtn.onclick = () => toggleEditMode(request);
    }

    } catch (error) {
        console.error('Failed to load request detail:', error);
        showError(`Failed to load request details: ${error.message}`);
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            showSuccess('Request status updated');
            loadDashboard();
            if (currentSection === 'requests') loadRequests();
        } else {
            showError('Failed to update request status');
        }
    } catch (error) {
        console.error('Failed to update request status:', error);
        showError('Failed to update request status');
    }
}

async function generateAIReply(requestId) {
    try {
        const response = await fetch(`/api/requests/${requestId}/generate-reply`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok) {
            // Copy to clipboard
            navigator.clipboard.writeText(data.reply).then(() => {
                showSuccess('AI reply generated and copied to clipboard!');
                // Refresh the request details to show the stored AI reply
                setTimeout(() => openRequestDetail(requestId), 500);
            }).catch(() => {
                // Fallback if clipboard fails
                showSuccess('AI reply generated! Copy from the text below:');
                console.log('AI Reply:', data.reply);
                // Still refresh to show the stored reply
                setTimeout(() => openRequestDetail(requestId), 500);
            });
        } else {
            // Show specific error messages
            const errorMsg = data.details || data.error || 'Failed to generate AI reply';
            showError(errorMsg);

            // If it's a configuration issue, suggest going to admin
            if (errorMsg.includes('not configured') || errorMsg.includes('API key')) {
                setTimeout(() => {
                    if (confirm('Would you like to configure AI settings now?')) {
                        window.location.href = '/admin';
                    }
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Failed to generate AI reply:', error);
        showError('Network error: Unable to connect to AI service');
    }
}

// Export to CSV
async function exportToCsv() {
    try {
        const status = elements.statusFilter.value;
        let url = '/api/dashboard/export/csv?';

        if (status && status !== 'all') {
            url += `status=${status}&`;
        }

        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = 'support_requests.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('CSV export started');
    } catch (error) {
        console.error('Export failed:', error);
        showError('Failed to export data');
    }
}

// Request modal functions
async function openRequestModal() {
    elements.requestForm.reset();
    await loadCategories();
    elements.requestModal.style.display = 'block';
}

// Load categories for the dropdown
async function loadCategories() {
    try {
        const response = await fetch('/api/dashboard/categories');
        const categories = await response.json();

        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">Select Category</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">Error loading categories</option>';
    }
}

// Load categories for edit mode
async function loadEditCategories(selectedCategoryId) {
    console.log('Loading edit categories for selected ID:', selectedCategoryId);
    try {
        const response = await fetch('/api/dashboard/categories');
        console.log('Categories API response status:', response.status);
        const categories = await response.json();
        console.log('Loaded categories:', categories);

        const categorySelect = document.getElementById('edit-category');
        console.log('Category select element found:', !!categorySelect);

        if (!categorySelect) {
            console.error('edit-category element not found!');
            return;
        }

        categorySelect.innerHTML = '<option value="">Select Category</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (category.id == selectedCategoryId) {
                option.selected = true;
                console.log('Selected category:', category.name);
            }
            categorySelect.appendChild(option);
        });

        console.log('Edit categories loaded successfully');
    } catch (error) {
        console.error('Failed to load edit categories:', error);
        const categorySelect = document.getElementById('edit-category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Error loading categories</option>';
        }
    }
}

async function handleRequestSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        requester_name: formData.get('requester-name'),
        channel: formData.get('channel'),
        category_id: formData.get('category_id'),
        severity: formData.get('severity'),
        description: formData.get('description')
    };

    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            showSuccess('Request created successfully');
            closeModal();
            loadDashboard();
            if (currentSection === 'requests') loadRequests();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to create request');
        }
    } catch (error) {
        console.error('Failed to create request:', error);
        showError('Failed to create request');
    }
}

// Knowledge Base functions
async function loadKbArticles() {
    try {
        const search = elements.kbSearchInput.value;
        let url = '/api/kb?';

        if (search) url += `search=${encodeURIComponent(search)}&`;

        const response = await fetch(url);
        const articles = await response.json();

        renderKbArticles(articles);
    } catch (error) {
        console.error('Failed to load KB articles:', error);
        showError('Failed to load knowledge base');
    }
}

function renderKbArticles(articles) {
    if (!articles || articles.length === 0) {
        elements.kbArticlesList.innerHTML = '<p class="loading">No articles found</p>';
        return;
    }

    elements.kbArticlesList.innerHTML = articles.map(article => `
        <div class="kb-item" onclick="openKbDetail(${article.id})">
            <div class="request-header">
                <div class="request-title">${article.problem_summary}</div>
                <div class="request-meta">Confidence: ${article.confidence}/5 • ${new Date(article.updated_at).toLocaleDateString()}</div>
            </div>
            <div class="request-description">${truncateText(article.solution, 150)}</div>
            ${article.category_name ? `<small>Category: ${article.category_name}</small>` : ''}
        </div>
    `).join('');
}

// KB modal functions
function openKbModal(articleId = null) {
    const title = articleId ? 'Edit KB Article' : 'New KB Article';
    document.getElementById('kb-modal-title').textContent = title;

    if (articleId) {
        // Load existing article for editing
        loadKbArticleForEdit(articleId);
    } else {
        elements.kbForm.reset();
        loadKbCategories();
    }

    elements.kbModal.style.display = 'block';
}

async function loadKbCategories() {
    try {
        const response = await fetch('/api/dashboard/categories');
        const categories = await response.json();

        const select = document.getElementById('kb-category');
        select.innerHTML = '<option value="">Select Category</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function handleKbSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const articleData = {
        problem_summary: formData.get('kb-problem'),
        solution: formData.get('kb-solution'),
        category_id: formData.get('kb-category') || null,
        confidence: parseInt(formData.get('kb-confidence')) || 3
    };

    try {
        const response = await fetch('/api/kb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(articleData)
        });

        if (response.ok) {
            showSuccess('KB article created successfully');
            closeModal();
            if (currentSection === 'kb') loadKbArticles();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to create KB article');
        }
    } catch (error) {
        console.error('Failed to create KB article:', error);
        showError('Failed to create KB article');
    }
}

// Utility functions
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.querySelector('main').prepend(errorDiv);

    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.querySelector('main').prepend(successDiv);

    setTimeout(() => successDiv.remove(), 3000);
}

// Additional request management functions
async function editRequestSolution(requestId) {
    const solution = prompt('Enter the solution for this request:');
    if (solution && solution.trim()) {
        try {
            const response = await fetch(`/api/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ solution: solution.trim() })
            });

            if (response.ok) {
                showSuccess('Solution added successfully');
                closeModal();
                loadDashboard();
                if (currentSection === 'requests') loadRequests();
            } else {
                showError('Failed to add solution');
            }
        } catch (error) {
            console.error('Failed to add solution:', error);
            showError('Failed to add solution');
        }
    }
}

async function createKbFromRequest(requestId) {
    try {
        // First get the request details
        const response = await fetch(`/api/requests/${requestId}`);
        const request = await response.json();

        if (!request.solution) {
            showError('Request must have a solution before creating KB article');
            return;
        }

        // Create KB article
        const kbData = {
            problem_summary: request.description,
            solution: request.solution,
            category_id: request.category_id
        };

        const kbResponse = await fetch('/api/kb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(kbData)
        });

        if (kbResponse.ok) {
            // Mark request as KB article
            await fetch(`/api/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_kb_article: true })
            });

            showSuccess('KB article created successfully');
            closeModal();
            if (currentSection === 'kb') loadKbArticles();
        } else {
            showError('Failed to create KB article');
        }
    } catch (error) {
        console.error('Failed to create KB article:', error);
        showError('Failed to create KB article');
    }
}

async function openKbDetail(articleId) {
    // This would open a detail modal for KB articles
    // For now, just show an alert
    showSuccess('KB article detail view coming soon');
}

// Toggle edit mode for request details
function toggleEditMode(request) {
    const contentDiv = document.getElementById('request-detail-content');
    const editBtn = document.getElementById('edit-request-btn');

    if (contentDiv.classList.contains('edit-mode')) {
        // Save changes
        saveRequestChanges(request.id);
    } else {
        // Enter edit mode
        enterEditMode(request);
    }
}

// Enter edit mode
async function enterEditMode(request) {
    console.log('Entering edit mode for request:', request.id, 'category:', request.category_id);
    const contentDiv = document.getElementById('request-detail-content');
    const editBtn = document.getElementById('edit-request-btn');

    contentDiv.classList.add('edit-mode');
    editBtn.textContent = 'Save Changes';
    editBtn.className = 'btn-primary';

    // Replace static content with editable fields
    const editableContent = `
        <div class="request-detail">
            <div class="detail-section">
                <div class="detail-label">Requester Name:</div>
                <div class="detail-value">
                    <input type="text" id="edit-requester-name" value="${request.requester_name}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Channel:</div>
                <div class="detail-value">
                    <select id="edit-channel" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="teams_chat" ${request.channel === 'teams_chat' ? 'selected' : ''}>Teams Chat</option>
                        <option value="teams_call" ${request.channel === 'teams_call' ? 'selected' : ''}>Teams Call</option>
                        <option value="email" ${request.channel === 'email' ? 'selected' : ''}>Email</option>
                        <option value="other" ${request.channel === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Category:</div>
                <div class="detail-value">
                    <select id="edit-category" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Loading categories...</option>
                    </select>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Severity:</div>
                <div class="detail-value">
                    <select id="edit-severity" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="low" ${request.severity === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${request.severity === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${request.severity === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                    <select id="request-status" onchange="updateRequestStatus(${request.id}, this.value)">
                        <option value="open" ${request.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="closed" ${request.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-label">Description:</div>
                <div class="detail-value">
                    <textarea id="edit-description" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${request.description}</textarea>
                </div>
            </div>
            ${request.ai_recommendation ? `
                <div class="detail-section">
                    <div class="detail-label">AI Recommendation:</div>
                    <div class="ai-recommendation">${request.ai_recommendation}</div>
                </div>
            ` : ''}
            ${request.ai_reply ? `
                <div class="detail-section">
                    <div class="detail-label">AI Generated Reply:</div>
                    <div class="ai-reply" style="background: #e8f4fd; padding: 12px; border-radius: 6px; border-left: 4px solid #3498db; margin-top: 8px;">${request.ai_reply.replace(/\n/g, '<br>')}</div>
                    <button class="btn-secondary" onclick="copyToClipboard('${request.ai_reply.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" style="margin-top: 8px; font-size: 12px;">Copy Reply</button>
                </div>
            ` : ''}
            ${request.solution ? `
                <div class="detail-section">
                    <div class="detail-label">Solution:</div>
                    <div class="solution-section">${request.solution}</div>
                </div>
            ` : ''}
            <div class="action-buttons">
                <button class="btn-primary" onclick="generateAIReply(${request.id})">Generate AI Reply</button>
                ${currentUser.role !== 'viewer' ? `
                    <button class="btn-secondary" onclick="recategorizeRequest(${request.id})">AI Suggestions</button>
                    <button class="btn-secondary" onclick="editRequestSolution(${request.id})">Add/Edit Solution</button>
                    <button class="btn-secondary" onclick="createKbFromRequest(${request.id})">Create KB Article</button>
                ` : ''}
            </div>
        </div>
    `;

    contentDiv.innerHTML = editableContent;

    // Small delay to ensure DOM is updated
    await new Promise(resolve => setTimeout(resolve, 100));

    // Load categories for the dropdown
    await loadEditCategories(request.category_id);
}

// Save request changes
async function saveRequestChanges(requestId) {
    const requesterName = document.getElementById('edit-requester-name').value;
    const channel = document.getElementById('edit-channel').value;
    const categoryId = document.getElementById('edit-category').value;
    const severity = document.getElementById('edit-severity').value;
    const description = document.getElementById('edit-description').value;

    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requester_name: requesterName,
                channel: channel,
                category_id: categoryId,
                severity: severity,
                description: description
            })
        });

        if (response.ok) {
            showSuccess('Request updated successfully!');
            // Refresh the request details
            openRequestDetail(requestId);
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to update request');
        }
    } catch (error) {
        console.error('Failed to update request:', error);
        showError('Failed to update request');
    }
}

// Recategorize request with AI
async function recategorizeRequest(requestId) {
    try {
        showSuccess('Getting AI suggestions...');

        const response = await fetch(`/api/requests/${requestId}/recategorize`, {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            showSuccess('AI suggestions updated! Check the recommendation below.');

            // Refresh the request details to show new categorization
            setTimeout(() => openRequestDetail(requestId), 1000);
        } else {
            const error = await response.json();
            showError(error.details || error.error || 'Failed to recategorize request');
        }
    } catch (error) {
        console.error('Failed to recategorize request:', error);
        showError('Network error: Unable to recategorize request');
    }
}

// Delete request
async function deleteRequest(requestId, requesterName) {
    if (!confirm(`Are you sure you want to delete the request from "${requesterName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    if (!confirm('This will permanently delete the request and all associated data. Are you absolutely sure?')) {
        return;
    }

    try {
        showSuccess('Deleting request...');

        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Request deleted successfully!');
            closeModal();
            // Refresh the dashboard/requests list
            if (window.location.pathname.includes('/requests') || document.getElementById('requests-section')) {
                loadRequests();
            } else {
                loadDashboard();
            }
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete request');
        }
    } catch (error) {
        console.error('Failed to delete request:', error);
        showError('Network error: Unable to delete request');
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccess('Copied to clipboard!');
    }).catch(() => {
        // Fallback: show in console
        console.log('Copy this text:', text);
        showSuccess('Text logged to console - copy from there');
    });
}

// Make functions globally available
window.openRequestDetail = openRequestDetail;
window.updateRequestStatus = updateRequestStatus;
window.generateAIReply = generateAIReply;
window.recategorizeRequest = recategorizeRequest;
window.editRequestSolution = editRequestSolution;
window.createKbFromRequest = createKbFromRequest;
window.openKbDetail = openKbDetail;
window.exportToCsv = exportToCsv;
window.closeModal = closeModal;
window.copyToClipboard = copyToClipboard;
window.deleteRequest = deleteRequest;
