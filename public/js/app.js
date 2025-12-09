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

        if (response.ok) {
            const data = await response.json();
            // Copy to clipboard
            navigator.clipboard.writeText(data.reply).then(() => {
                showSuccess('AI reply copied to clipboard!');
            });
        } else {
            showError('Failed to generate AI reply');
        }
    } catch (error) {
        console.error('Failed to generate AI reply:', error);
        showError('Failed to generate AI reply');
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
function openRequestModal() {
    elements.requestForm.reset();
    elements.requestModal.style.display = 'block';
}

async function handleRequestSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        requester_name: formData.get('requester-name'),
        channel: formData.get('channel'),
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

// Make functions globally available
window.openRequestDetail = openRequestDetail;
window.updateRequestStatus = updateRequestStatus;
window.generateAIReply = generateAIReply;
window.editRequestSolution = editRequestSolution;
window.createKbFromRequest = createKbFromRequest;
window.openKbDetail = openKbDetail;
window.exportToCsv = exportToCsv;
window.closeModal = closeModal;
