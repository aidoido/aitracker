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
        switchSection('dashboard');
    }
});

function cacheElements() {
    // Main elements
    elements.logoutBtn = document.getElementById('logout-btn');
    elements.pageTitle = document.getElementById('page-title');
    elements.userAvatar = document.getElementById('user-avatar');

    // Navigation items
    elements.navItems = document.querySelectorAll('.nav-item');

    // Sections
    elements.dashboardSection = document.getElementById('dashboard-section');
    elements.requestsSection = document.getElementById('requests-section');
    elements.kbSection = document.getElementById('kb-section');
    elements.adminSection = document.getElementById('admin-section');

    // Dashboard elements
    elements.totalRequests = document.getElementById('total-requests');
    elements.todayRequests = document.getElementById('today-requests');
    elements.openRequests = document.getElementById('open-requests');
    elements.closedRequests = document.getElementById('closed-requests');
    elements.dashboardSearchInput = document.getElementById('dashboard-search-input');
    elements.dashboardStatusFilter = document.getElementById('dashboard-status-filter');
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
    elements.solutionModal = document.getElementById('solution-modal');
    elements.kbDetailModal = document.getElementById('kb-detail-modal');
    elements.kbModal = document.getElementById('kb-modal');

    // Debug modal elements
    console.log('Modal elements loaded:', {
        requestModal: !!elements.requestModal,
        requestDetailModal: !!elements.requestDetailModal,
        solutionModal: !!elements.solutionModal,
        kbDetailModal: !!elements.kbDetailModal,
        kbModal: !!elements.kbModal,
        requestDetailContent: !!document.getElementById('request-detail-content')
    });

    // Forms
    elements.requestForm = document.getElementById('request-form');
    elements.kbForm = document.getElementById('kb-form');
}

function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            if (section === 'admin') {
                window.location.href = '/admin';
            } else {
                switchSection(section);
            }
        });
    });

    // Authentication
    // User menu functionality
    elements.userAvatar.addEventListener('click', toggleUserDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.userAvatar.contains(e.target) && !document.getElementById('user-dropdown').contains(e.target)) {
            hideUserDropdown();
        }
    });

    // Handle both sidebar logout (if exists) and dropdown logout
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', logout);
    }
    const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', logout);
    }

    // Requests
    elements.newRequestBtn.addEventListener('click', () => openRequestModal());
    // Also handle dashboard new request button
    const dashboardNewRequestBtn = document.getElementById('dashboard-new-request-btn');
    if (dashboardNewRequestBtn) {
        dashboardNewRequestBtn.addEventListener('click', () => openRequestModal());
    }
    elements.exportCsvBtn.addEventListener('click', exportToCsv);
    elements.statusFilter.addEventListener('change', loadRequests);
    elements.searchInput.addEventListener('input', debounce(loadRequests, 300));

    // KB
    elements.newKbBtn.addEventListener('click', () => openKbModal());
    elements.kbSearchInput.addEventListener('input', debounce(loadKbArticles, 300));

    // Dashboard
    if (elements.dashboardSearchInput) {
        elements.dashboardSearchInput.addEventListener('input', debounce(loadRecentRequests, 300));
    }
    if (elements.dashboardStatusFilter) {
        elements.dashboardStatusFilter.addEventListener('change', loadRecentRequests);
    }

    // Metric card clicks for drill-down
    document.querySelectorAll('.metric-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
            const status = card.getAttribute('data-status');
            const filter = card.getAttribute('data-filter');

            if (status) {
                elements.dashboardStatusFilter.value = status;
            } else if (filter === 'today') {
                // Special handling for today's requests
                elements.dashboardStatusFilter.value = '';
            } else {
                elements.dashboardStatusFilter.value = '';
            }

            loadRecentRequests();
        });
    });

    // Forms
    elements.requestForm.addEventListener('submit', handleRequestSubmit);
    elements.solutionForm = document.getElementById('solution-form');
    if (elements.solutionForm) {
        elements.solutionForm.addEventListener('submit', handleSolutionSubmit);
    }
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
        if (currentUser.role === 'admin') {
            document.getElementById('admin-nav-item').style.display = 'flex';
        }
    }
}

// User dropdown functionality
function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    const isVisible = dropdown.classList.contains('show');

    if (isVisible) {
        hideUserDropdown();
    } else {
        showUserDropdown();
    }
}

function showUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.add('show');
    loadUserInfo();
}

function hideUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.remove('show');
}

async function loadUserInfo() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-role').textContent = user.role;
        } else {
            document.getElementById('user-name').textContent = 'Unknown User';
            document.getElementById('user-role').textContent = 'Unknown Role';
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
        document.getElementById('user-name').textContent = 'Error loading user';
        document.getElementById('user-role').textContent = 'Error loading role';
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
function switchSection(sectionName) {
    // Update navigation items
    elements.navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelector(`#${sectionName}-section`).classList.add('active');

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'requests': 'Requests',
        'kb': 'Knowledge Base'
    };
    elements.pageTitle.textContent = titles[sectionName] || 'Dashboard';

    currentSection = sectionName;

    // Load section data
    switch (sectionName) {
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

        elements.totalRequests.textContent = data.total || 0;
        elements.todayRequests.textContent = data.todayCount || 0;
        elements.openRequests.textContent = data.statusCounts.open || 0;
        elements.closedRequests.textContent = data.statusCounts.closed || 0;

        await loadRecentRequests();
        loadChartData();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// Load recent requests for dashboard
async function loadRecentRequests() {
    try {
        const search = elements.dashboardSearchInput ? elements.dashboardSearchInput.value : '';
        const status = elements.dashboardStatusFilter ? elements.dashboardStatusFilter.value : '';

        let url = '/api/requests?limit=10&';
        if (status) url += `status=${status}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;

        const response = await fetch(url);
        const requests = await response.json();

        renderRecentRequests(requests);
    } catch (error) {
        console.error('Failed to load recent requests:', error);
        showError('Failed to load recent requests');
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

// Modern SVG-based sleek chart
function renderSimpleChart(canvas, data) {
    const container = canvas.parentElement;
    const chartData = data.slice(-7); // Last 7 days
    const maxValue = Math.max(...chartData.map(d => d.count), 1);

    // Chart dimensions
    const width = 600;
    const height = 320;
    const padding = { top: 50, right: 40, bottom: 70, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Generate modern SVG chart
    const svg = `
        <svg width="${width}" height="${height}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <!-- Gradient background -->
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f093fb;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:#f5576c;stop-opacity:0.1" />
                </linearGradient>

                ${chartData.map((item, index) => `
                    <linearGradient id="barGradient${index}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
                    </linearGradient>
                `).join('')}

                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.1)"/>
                </filter>
            </defs>

            <!-- Background -->
            <rect width="${width}" height="${height}" fill="url(#bgGradient)" rx="16"/>

            <!-- Title -->
            <text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="700" fill="#2c3e50">
                📊 Request Trends
            </text>
            <text x="${width/2}" y="50" text-anchor="middle" font-size="12" fill="#666">
                Last 7 Days Performance
            </text>

            <!-- Y-axis grid and labels -->
            ${[0, 1, 2, 3, 4].map(i => {
                const value = Math.round(maxValue * (4-i) / 4);
                const y = padding.top + (chartHeight * i / 4);
                return `
                    <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"
                          stroke="#e1e8ed" stroke-width="1" opacity="0.3"/>
                    <text x="${padding.left - 15}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666" font-weight="500">
                        ${value}
                    </text>
                `;
            }).join('')}

            <!-- Bars with animations -->
            ${chartData.map((item, index) => {
                const barWidth = Math.max(chartWidth / chartData.length * 0.65, 25);
                const barSpacing = chartWidth / chartData.length;
                const barHeight = (item.count / maxValue) * chartHeight;
                const x = padding.left + (index * barSpacing) + (barSpacing - barWidth) / 2;
                const y = padding.top + chartHeight - barHeight;

                return `
                    <!-- Bar shadow -->
                    <rect x="${x+2}" y="${y+2}" width="${barWidth}" height="${barHeight}"
                          fill="#000" opacity="0.1" rx="6" filter="url(#shadow)"/>

                    <!-- Main bar -->
                    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
                          fill="url(#barGradient${index})" rx="6" class="chart-bar"
                          style="transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);"/>

                    <!-- Value label above bar -->
                    <text x="${x + barWidth/2}" y="${y - 12}" text-anchor="middle"
                          font-size="13" font-weight="700" fill="#2c3e50">
                        ${item.count}
                    </text>

                    <!-- Date label below -->
                    <text x="${x + barWidth/2}" y="${height - 25}" text-anchor="middle"
                          font-size="11" fill="#666" font-weight="500">
                        ${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </text>

                    <!-- Tooltip on hover -->
                    <rect x="${x - 10}" y="${y - 35}" width="${barWidth + 20}" height="25"
                          fill="#2c3e50" opacity="0" rx="4" class="tooltip-bg">
                        <title>${item.count} requests on ${new Date(item.date).toLocaleDateString()}</title>
                    </rect>
                `;
            }).join('')}

            <!-- X-axis line -->
            <line x1="${padding.left}" y1="${padding.top + chartHeight}"
                  x2="${width - padding.right}" y2="${padding.top + chartHeight}"
                  stroke="#ddd" stroke-width="2"/>

            <!-- Hover animations -->
            <style>
                .chart-bar { cursor: pointer; }
                .chart-bar:hover {
                    transform: translateY(-3px) scale(1.05);
                    filter: brightness(1.1);
                }
                .tooltip-bg:hover { opacity: 0.9 !important; }
            </style>
        </svg>
    `;

    container.innerHTML = `
        <div style="display: flex; justify-content: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); border-radius: 20px; margin: 25px 0; box-shadow: 0 20px 60px rgba(102, 126, 234, 0.15);">
            <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); border-radius: 16px; padding: 25px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);">
                ${svg}
            </div>
        </div>
    `;
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
        elements.requestsList.innerHTML = '<div style="padding: var(--space-8); text-align: center; color: var(--color-gray-500);">No requests found</div>';
        return;
    }

    elements.requestsList.innerHTML = requests.map(request => `
        <div class="request-item" onclick="openRequestDetail(${request.id})">
            <div class="request-info">
                <div class="request-title">${request.requester_name} - ${request.category_name || 'Uncategorized'}</div>
                <div class="request-meta">
                    <span>${new Date(request.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>${request.created_by_username}</span>
                    <span>•</span>
                    <span>${request.channel}</span>
            </div>
            </div>
            <div class="request-status status-${request.status}">${request.status.replace('_', ' ')}</div>
        </div>
    `).join('');
}

// Render recent requests for dashboard
function renderRecentRequests(requests) {
    if (!elements.recentRequestsList) return;

    if (!requests || requests.length === 0) {
        elements.recentRequestsList.innerHTML = '<div style="padding: var(--space-6); text-align: center; color: var(--color-gray-500);">No recent requests</div>';
        return;
    }

    elements.recentRequestsList.innerHTML = requests.map(request => `
        <div class="recent-request-item" onclick="openRequestDetail(${request.id})">
            <div class="recent-request-content">
                <div class="recent-request-title">${request.requester_name} - ${request.category_name || 'Uncategorized'}</div>
                <div class="recent-request-meta">
                    ${new Date(request.created_at).toLocaleDateString()} • ${request.channel} • ${request.created_by_username}
                </div>
            </div>
            <div class="recent-request-status status-${request.status}">${request.status.replace('_', ' ')}</div>
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
            <div class="request-detail-view">
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Requester Information
                        </h4>
                        <div class="detail-items">
                            <div class="detail-item">
                                <span class="detail-label">Full Name</span>
                                <span class="detail-value">${request.requester_name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Contact Channel</span>
                                <span class="detail-value">${request.channel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Created</span>
                                <span class="detail-value">${new Date(request.created_at).toLocaleDateString()} at ${new Date(request.created_at).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"></path>
                                <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h18z"></path>
                                <path d="M3 12v7c0 .552.448 1 1 1h16c.552 0 1-.448 1-1v-7"></path>
                            </svg>
                            Issue Classification
                        </h4>
                        <div class="detail-items">
                            <div class="detail-item">
                                <span class="detail-label">Category</span>
                                <span class="detail-value">${request.category_name || 'Uncategorized'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Priority Level</span>
                                <span class="detail-value priority-${request.severity}">${request.severity.charAt(0).toUpperCase() + request.severity.slice(1)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Current Status</span>
                                <select id="request-status" onchange="updateRequestStatus(${request.id}, this.value)" class="status-select">
                                    <option value="open" ${request.status === 'open' ? 'selected' : ''}>🟢 Open</option>
                                    <option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''}>🟡 In Progress</option>
                                    <option value="closed" ${request.status === 'closed' ? 'selected' : ''}>🔴 Closed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section full-width">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"></path>
                            </svg>
                            Issue Description
                        </h4>
                        <div class="description-content">
                            ${request.description.replace(/\n/g, '<br>')}
                        </div>
                    </div>

                    ${request.ai_recommendation ? `
                    <div class="detail-section full-width">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"></path>
                            </svg>
                            AI Analysis
                        </h4>
                        <div class="ai-recommendation">
                            ${request.ai_recommendation}
                        </div>
                    </div>
                    ` : ''}

                    ${request.ai_reply ? `
                    <div class="detail-section full-width">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            AI Generated Response
                        </h4>
                        <div class="ai-reply-content">
                            <div class="ai-reply">${request.ai_reply.replace(/\n/g, '<br>')}</div>
                            <button class="btn-secondary small" onclick="copyToClipboard('${request.ai_reply.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copy Reply
                            </button>
                        </div>
                    </div>
                    ` : ''}

                    ${request.solution ? `
                    <div class="detail-section full-width">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
                            </svg>
                            Resolution & Solution
                        </h4>
                        <div class="solution-content">
                            ${request.solution.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    ` : ''}

                    <div class="detail-section full-width">
                        <h4 class="detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            Actions & Tools
                        </h4>
                        <div class="action-buttons-grid">
                            <button class="btn-primary" onclick="generateAIReply(${request.id})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"></path>
                                </svg>
                                Generate AI Reply
                            </button>
                            ${currentUser.role !== 'viewer' ? `
                                <button class="btn-secondary" onclick="editRequestSolution(${request.id})">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Add/Edit Solution
                                </button>
                                <button class="btn-secondary" onclick="createKbFromRequest(${request.id})">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14,2 14,8 20,8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10,9 9,9 8,9"></polyline>
                                    </svg>
                                    Create KB Article
                                </button>
                                <button class="btn-danger" onclick="deleteRequest(${request.id}, '${request.requester_name.replace(/'/g, "\\'")}')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3,6 5,6 21,6"></polyline>
                                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                    Delete Request
                                </button>
                            ` : ''}
                        </div>
                    </div>
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
        modalElement.classList.add('show');
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
    elements.requestModal.classList.add('show');
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
        elements.kbArticlesList.innerHTML = '<div style="padding: var(--space-8); text-align: center; color: var(--color-gray-500);">No articles found</div>';
        return;
    }

    elements.kbArticlesList.innerHTML = articles.map(article => `
        <div class="kb-item" onclick="openKbDetail(${article.id})">
            <div class="kb-info">
                <div class="kb-title">${article.problem_summary}</div>
                <div class="kb-meta">
                    <span>Confidence: ${article.confidence}/5</span>
                    <span>•</span>
                    <span>${new Date(article.updated_at).toLocaleDateString()}</span>
                    ${article.category_name ? `<span>•</span><span>${article.category_name}</span>` : ''}
                </div>
                ${article.tags && article.tags.length > 0 ? `
                <div class="kb-tags">
                    ${article.tags.slice(0, 3).map(tag => `<span class="kb-tag">${tag}</span>`).join('')}
                    ${article.tags.length > 3 ? `<span class="kb-tag-more">+${article.tags.length - 3}</span>` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// KB modal functions
function openKbModal(articleId = null) {
    const title = articleId ? 'Edit Knowledge Base Article' : 'Create Knowledge Base Article';
    const subtitle = articleId ?
        'Update the article information and solution' :
        'Add a new article to help resolve future support issues';

    const modalTitle = document.querySelector('#kb-modal .modal-title');
    const modalSubtitle = document.querySelector('#kb-modal .modal-subtitle');

    if (modalTitle) modalTitle.textContent = title;
    if (modalSubtitle) modalSubtitle.textContent = subtitle;

    if (articleId) {
        // Load existing article for editing
        loadKbArticleForEdit(articleId);
    } else {
        elements.kbForm.reset();
        loadKbCategories();
    }

    elements.kbModal.classList.add('show');
}

async function loadKbCategories(selector = 'kb-category') {
    try {
        const response = await fetch('/api/dashboard/categories');
        const categories = await response.json();

        const select = document.getElementById(selector);
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>' +
                categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function handleKbSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);

    // Process tags
    let tags = [];
    const tagsInput = formData.get('kb-tags')?.trim();
    if (tagsInput) {
        tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    const articleData = {
        problem_summary: formData.get('kb-problem'),
        solution: formData.get('kb-solution'),
        category_id: formData.get('kb-category') || null,
        tags: tags,
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
        modal.classList.remove('show');
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

// Global variable to track current request for solution editing
let currentSolutionRequestId = null;

// Additional request management functions
async function editRequestSolution(requestId) {
    console.log('Opening solution modal for request:', requestId);
    currentSolutionRequestId = requestId;

    try {
        // Fetch current request data to check if solution exists
        const response = await fetch(`/api/requests/${requestId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch request data');
        }

        const request = await response.json();

        // Populate the solution form with existing data
        const solutionTextarea = document.getElementById('solution-text');
        if (solutionTextarea) {
            solutionTextarea.value = request.solution || '';
        }

        // Update modal title based on whether solution exists
        const modalTitle = document.querySelector('#solution-modal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = request.solution ? 'Edit Solution' : 'Add Solution';
        }

        const modalSubtitle = document.querySelector('#solution-modal .modal-subtitle');
        if (modalSubtitle) {
            modalSubtitle.textContent = request.solution ?
                'Update the resolution for this support request' :
                'Provide a detailed resolution for this support request';
        }

        // Show the modal
        elements.solutionModal.classList.add('show');

    } catch (error) {
        console.error('Failed to open solution modal:', error);
        showError('Failed to open solution editor');
    }
}

async function handleSolutionSubmit(event) {
    event.preventDefault();
    console.log('Solution form submitted');

    if (!currentSolutionRequestId) {
        console.error('No currentSolutionRequestId set');
        showError('No request selected for solution update');
        return;
    }

    console.log('Current solution request ID:', currentSolutionRequestId);

    const formData = new FormData(event.target);
    const solution = formData.get('solution')?.trim();

    console.log('Raw solution from form:', formData.get('solution'));
    console.log('Trimmed solution:', solution);

    if (!solution) {
        console.log('Solution is empty, showing error');
        showError('Please enter a solution');
        return;
    }

    try {
        console.log('Saving solution for request:', currentSolutionRequestId);
        console.log('Solution content:', solution.substring(0, 100) + '...');

        const response = await fetch(`/api/requests/${currentSolutionRequestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solution })
        });

        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);

        if (response.ok) {
            showSuccess('Solution saved successfully');
            closeModal();

            // Refresh the current view
            if (currentSection === 'requests') {
                loadRequests();
            } else if (elements.requestDetailModal && elements.requestDetailModal.classList.contains('show')) {
                // Refresh the request detail view
                openRequestDetail(currentSolutionRequestId);
            }

            currentSolutionRequestId = null;
        } else {
            const errorData = await response.text();
            console.error('API error response:', errorData);
            showError(`Failed to save solution: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Failed to save solution - network error:', error);
        showError(`Network error: ${error.message}`);
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

// Global variable to track current KB article for editing
let currentKbArticleId = null;

async function openKbDetail(articleId) {
    console.log('Opening KB article detail for ID:', articleId);
    currentKbArticleId = articleId;

    try {
        const response = await fetch(`/api/kb/${articleId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch KB article: ${response.status}`);
        }

        const article = await response.json();
        console.log('KB article data received:', article);

        const content = `
            <div class="kb-detail-view">
                <div class="kb-detail-grid">
                    <div class="kb-detail-section">
                        <h4 class="kb-detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"></path>
                            </svg>
                            Article Information
                        </h4>
                        <div class="kb-detail-items">
                            <div class="kb-detail-item">
                                <span class="kb-detail-label">Created</span>
                                <span class="kb-detail-value">${new Date(article.created_at).toLocaleDateString()} by ${article.created_by_username}</span>
                            </div>
                            <div class="kb-detail-item">
                                <span class="kb-detail-label">Last Updated</span>
                                <span class="kb-detail-value">${new Date(article.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div class="kb-detail-item">
                                <span class="kb-detail-label">Category</span>
                                <span class="kb-detail-value">${article.category_name || 'Uncategorized'}</span>
                            </div>
                            ${article.tags && article.tags.length > 0 ? `
                            <div class="kb-detail-item">
                                <span class="kb-detail-label">Tags</span>
                                <div class="tags-display">
                                    ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                </div>
                            </div>
                            ` : ''}
                            <div class="kb-detail-item">
                                <span class="kb-detail-label">Confidence Rating</span>
                                <div class="confidence-rating">
                                    <div class="confidence-stars">
                                        ${Array.from({length: 5}, (_, i) =>
                                            `<span class="star ${i < article.confidence ? 'filled' : ''}">★</span>`
                                        ).join('')}
                                    </div>
                                    <span class="confidence-text">${article.confidence}/5</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="kb-detail-section full-width">
                        <h4 class="kb-detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Problem Summary
                        </h4>
                        <div class="kb-problem-content">
                            ${article.problem_summary}
                        </div>
                    </div>

                    <div class="kb-detail-section full-width">
                        <h4 class="kb-detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
                            </svg>
                            Solution
                        </h4>
                        <div class="kb-solution-content">
                            ${article.solution.replace(/\n/g, '<br>')}
                        </div>
                    </div>

                    <div class="kb-detail-section full-width">
                        <h4 class="kb-detail-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            Actions
                        </h4>
                        <div class="kb-actions-grid">
                            <button class="btn-secondary" onclick="copyToClipboard('${article.solution.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copy Solution
                            </button>
                            ${currentUser.role !== 'viewer' ? `
                                <button class="btn-danger" onclick="deleteKbArticle(${article.id}, '${article.problem_summary.replace(/'/g, "\\'").substring(0, 50)}...')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3,6 5,6 21,6"></polyline>
                                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                    Delete Article
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const contentElement = document.getElementById('kb-detail-content');
        const modalElement = elements.kbDetailModal;

        if (!contentElement || !modalElement) {
            console.error('KB detail modal elements not found!');
            showError('KB detail modal not available');
            return;
        }

        contentElement.innerHTML = content;
        modalElement.classList.add('show');

        // Set up edit button
        const editBtn = document.getElementById('edit-kb-btn');
        if (editBtn) {
            editBtn.onclick = () => toggleKbEditMode(article);
        }

    } catch (error) {
        console.error('Failed to load KB article detail:', error);
        showError(`Failed to load KB article: ${error.message}`);
    }
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
        <div class="request-edit-view">
            <div class="edit-grid">
                <div class="edit-section">
                    <h4 class="edit-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Requester Information
                    </h4>
                    <div class="edit-row">
                        <div class="form-group">
                            <label for="edit-requester-name">Full Name <span class="required">*</span></label>
                            <input type="text" id="edit-requester-name" value="${request.requester_name}" placeholder="Enter full name" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-channel">Contact Channel <span class="required">*</span></label>
                            <select id="edit-channel" required>
                                <option value="">Select how they contacted you</option>
                                <option value="teams_chat" ${request.channel === 'teams_chat' ? 'selected' : ''}>💬 Teams Chat</option>
                                <option value="teams_call" ${request.channel === 'teams_call' ? 'selected' : ''}>📞 Teams Call</option>
                                <option value="email" ${request.channel === 'email' ? 'selected' : ''}>📧 Email</option>
                                <option value="phone" ${request.channel === 'phone' ? 'selected' : ''}>📱 Phone</option>
                                <option value="other" ${request.channel === 'other' ? 'selected' : ''}>🔄 Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="edit-section">
                    <h4 class="edit-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4"></path>
                            <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h18z"></path>
                            <path d="M3 12v7c0 .552.448 1 1 1h16c.552 0 1-.448 1-1v-7"></path>
                        </svg>
                        Issue Classification
                    </h4>
                    <div class="edit-row">
                        <div class="form-group">
                            <label for="edit-category">Category <span class="required">*</span></label>
                            <select id="edit-category" required>
                                <option value="">Loading categories...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-severity">Priority Level <span class="required">*</span></label>
                            <select id="edit-severity" required>
                                <option value="">Select priority level</option>
                                <option value="low" ${request.severity === 'low' ? 'selected' : ''}>🟢 Low - General inquiry</option>
                                <option value="medium" ${request.severity === 'medium' ? 'selected' : ''}>🟡 Medium - Affects work with workaround</option>
                                <option value="high" ${request.severity === 'high' ? 'selected' : ''}>🟠 High - Significantly impacts work</option>
                                <option value="critical" ${request.severity === 'critical' ? 'selected' : ''}>🔴 Critical - Complete system outage</option>
                            </select>
                        </div>
                    </div>
                    <div class="edit-row">
                        <div class="form-group">
                            <label for="request-status">Current Status</label>
                            <select id="request-status" onchange="updateRequestStatus(${request.id}, this.value)" class="status-select">
                                <option value="open" ${request.status === 'open' ? 'selected' : ''}>🟢 Open</option>
                                <option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''}>🟡 In Progress</option>
                                <option value="closed" ${request.status === 'closed' ? 'selected' : ''}>🔴 Closed</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="edit-section full-width">
                    <h4 class="edit-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"></path>
                        </svg>
                        Issue Description
                    </h4>
                    <div class="form-group">
                        <label for="edit-description">Detailed Description <span class="required">*</span></label>
                        <textarea id="edit-description" rows="5" placeholder="Please provide a detailed description of the issue..." required>${request.description}</textarea>
                        <div class="form-help">
                            <small>💡 Include screenshots, error codes, or any other relevant information</small>
                        </div>
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
// KB article edit mode functions
function toggleKbEditMode(article) {
    const contentDiv = document.getElementById('kb-detail-content');
    const editBtn = document.getElementById('edit-kb-btn');

    if (contentDiv.classList.contains('edit-mode')) {
        // Save changes
        saveKbArticleChanges(article.id);
    } else {
        // Enter edit mode
        enterKbEditMode(article);
    }
}

async function enterKbEditMode(article) {
    console.log('Entering KB edit mode for article:', article.id);
    const contentDiv = document.getElementById('kb-detail-content');
    const editBtn = document.getElementById('edit-kb-btn');

    contentDiv.classList.add('edit-mode');
    editBtn.textContent = 'Save Changes';
    editBtn.className = 'btn-primary';

    // Replace static content with editable fields
    const editableContent = `
        <div class="kb-edit-view">
            <div class="kb-edit-grid">
                <div class="kb-edit-section">
                    <h4 class="kb-edit-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"></path>
                        </svg>
                        Edit Article
                    </h4>
                    <div class="edit-row">
                        <div class="form-group">
                            <label for="edit-kb-category">Category</label>
                            <select id="edit-kb-category">
                                <option value="">Loading categories...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-kb-confidence">Confidence (1-5)</label>
                            <select id="edit-kb-confidence">
                                <option value="1" ${article.confidence === 1 ? 'selected' : ''}>1 - Low confidence</option>
                                <option value="2" ${article.confidence === 2 ? 'selected' : ''}>2 - Somewhat confident</option>
                                <option value="3" ${article.confidence === 3 ? 'selected' : ''}>3 - Moderately confident</option>
                                <option value="4" ${article.confidence === 4 ? 'selected' : ''}>4 - Highly confident</option>
                                <option value="5" ${article.confidence === 5 ? 'selected' : ''}>5 - Extremely confident</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-kb-tags">Tags (comma-separated)</label>
                        <input type="text" id="edit-kb-tags" value="${article.tags ? article.tags.join(', ') : ''}" placeholder="e.g. oracle, fusion, login, error">
                        <div class="form-help">
                            <small>💡 Add relevant tags to make this article easier to find</small>
                        </div>
                    </div>
                </div>

                <div class="kb-edit-section full-width">
                    <h4 class="kb-edit-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Problem Summary
                    </h4>
                    <div class="form-group">
                        <label for="edit-kb-problem">Problem Summary <span class="required">*</span></label>
                        <textarea id="edit-kb-problem" rows="3" placeholder="Brief summary of the problem..." required>${article.problem_summary}</textarea>
                    </div>
                </div>

                <div class="kb-edit-section full-width">
                    <h4 class="kb-edit-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
                        </svg>
                        Solution
                    </h4>
                    <div class="form-group">
                        <label for="edit-kb-solution">Solution <span class="required">*</span></label>
                        <textarea id="edit-kb-solution" rows="8" placeholder="Detailed solution steps..." required>${article.solution}</textarea>
                        <div class="form-help">
                            <small>💡 Provide clear, step-by-step instructions</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    contentDiv.innerHTML = editableContent;

    // Load categories for the dropdown
    await loadKbCategories('edit-kb-category');
}

async function saveKbArticleChanges(articleId) {
    console.log('Saving KB article changes for ID:', articleId);

    const problemSummary = document.getElementById('edit-kb-problem')?.value?.trim();
    const solution = document.getElementById('edit-kb-solution')?.value?.trim();
    const categoryId = document.getElementById('edit-kb-category')?.value;
    const confidence = document.getElementById('edit-kb-confidence')?.value;
    const tagsInput = document.getElementById('edit-kb-tags')?.value?.trim();

    if (!problemSummary || !solution) {
        showError('Problem summary and solution are required');
        return;
    }

    try {
        // Process tags
        let tags = [];
        if (tagsInput) {
            tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }

        const response = await fetch(`/api/kb/${articleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                problem_summary: problemSummary,
                solution: solution,
                category_id: categoryId || null,
                tags: tags,
                confidence: parseInt(confidence) || 3
            })
        });

        if (response.ok) {
            showSuccess('KB article updated successfully');
            closeModal();

            // Refresh the KB articles list
            if (currentSection === 'kb') {
                loadKbArticles();
            }
        } else {
            const errorData = await response.text();
            console.error('KB update error:', errorData);
            showError('Failed to update KB article');
        }
    } catch (error) {
        console.error('Failed to update KB article:', error);
        showError('Failed to update KB article');
    }
}

async function deleteKbArticle(articleId, title) {
    if (!confirm(`Are you sure you want to delete the KB article "${title}"? This action cannot be undone.`)) {
        return;
    }

    try {
        showSuccess('Deleting KB article...');

        const response = await fetch(`/api/kb/${articleId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('KB article deleted successfully');
            closeModal();

            // Refresh the KB articles list
            if (currentSection === 'kb') {
                loadKbArticles();
            }
        } else {
            showError('Failed to delete KB article');
        }
    } catch (error) {
        console.error('Failed to delete KB article:', error);
        showError('Failed to delete KB article');
    }
}

window.openKbDetail = openKbDetail;
window.exportToCsv = exportToCsv;
window.closeModal = closeModal;
window.copyToClipboard = copyToClipboard;
window.deleteRequest = deleteRequest;
window.deleteKbArticle = deleteKbArticle;
