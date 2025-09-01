class VoicePCDashboard {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.authToken = 'VoicePC_SecureToken_2024_abcd1234efgh5678'; // Default token
        this.stats = {
            totalCommands: 0,
            successfulCommands: 0,
            uptime: 0,
            recentCommands: []
        };
        
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.loadInitialData();
        this.setupEventListeners();
        this.updateUI();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadInitialData();
        }, 30000);
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus();
                
                // Reconnect after 5 seconds
                setTimeout(() => {
                    this.connectWebSocket();
                }, 5000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
                this.updateConnectionStatus();
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.isConnected = false;
            this.updateConnectionStatus();
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                this.updateSystemStatus(data.data);
                break;
            case 'command':
                this.addCommandToLog(data.data);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    async loadInitialData() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            this.stats.totalCommands = data.totalCommands;
            this.stats.uptime = data.uptime;
            this.stats.recentCommands = data.recentCommands || [];
            
            // Calculate success rate
            if (this.stats.recentCommands.length > 0) {
                this.stats.successfulCommands = this.stats.recentCommands.filter(cmd => cmd.status === 'success').length;
            }
            
            this.updateUI();
            // this.loadSystemInfo();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    updateSystemStatus(statusData) {
        if (statusData.systemStatus) {
            this.updateServerStatus(statusData.systemStatus);
        }
        
        if (statusData.uptime !== undefined) {
            this.stats.uptime = statusData.uptime;
            document.getElementById('uptime').textContent = this.formatUptime(statusData.uptime);
        }
        
        if (statusData.totalCommands !== undefined) {
            this.stats.totalCommands = statusData.totalCommands;
            document.getElementById('total-commands').textContent = statusData.totalCommands;
        }
    }

    updateServerStatus(status) {
        const statusBadge = document.getElementById('status-badge');
        const serverStatus = document.getElementById('server-status');
        
        statusBadge.className = `status-badge status-${status}`;
        
        const statusEmoji = {
            online: '🟢',
            busy: '🟡', 
            offline: '🔴'
        };
        
        const statusText = {
            online: 'Online',
            busy: 'Busy',
            offline: 'Offline'
        };
        
        statusBadge.innerHTML = `
            <div class="connection-dot ${status === 'online' ? '' : 'disconnected'}"></div>
            ${statusText[status] || 'Unknown'}
        `;
        
        if (serverStatus) {
            serverStatus.innerHTML = `${statusEmoji[status] || '❓'} ${statusText[status] || 'Unknown'}`;
        }
    }

    addCommandToLog(commandData) {
        this.stats.recentCommands.unshift(commandData);
        this.stats.totalCommands++;
        
        // Keep only last 20 commands
        if (this.stats.recentCommands.length > 20) {
            this.stats.recentCommands = this.stats.recentCommands.slice(0, 20);
        }
        
        // Update success rate
        this.stats.successfulCommands = this.stats.recentCommands.filter(cmd => cmd.status === 'success').length;
        
        this.updateRecentCommands();
        this.updateSuccessRate();
        this.addLogEntry(commandData);
        
        document.getElementById('total-commands').textContent = this.stats.totalCommands;
    }

    updateRecentCommands() {
        const container = document.getElementById('recent-commands');
        
        if (this.stats.recentCommands.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No recent commands</p>';
            return;
        }
        
        const html = this.stats.recentCommands.slice(0, 10).map(cmd => {
            const statusClass = cmd.status === 'success' ? 'log-status-success' : 'log-status-error';
            const statusIcon = cmd.status === 'success' ? '✅' : '❌';
            const time = new Date(cmd.timestamp).toLocaleTimeString();
            
            return `
                <div class="log-entry">
                    <div class="log-timestamp">${time}</div>
                    <div class="log-command">${cmd.command}</div>
                    <div class="${statusClass}">${statusIcon} ${cmd.status}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    updateSuccessRate() {
        const total = this.stats.recentCommands.length;
        const rate = total > 0 ? Math.round((this.stats.successfulCommands / total) * 100) : 100;
        document.getElementById('success-rate').textContent = `${rate}%`;
    }

    addLogEntry(commandData) {
        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;
        
        const statusClass = commandData.status === 'success' ? 'log-status-success' : 'log-status-error';
        const statusIcon = commandData.status === 'success' ? '✅' : '❌';
        const time = new Date(commandData.timestamp).toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <div class="log-timestamp">${time}</div>
            <div class="log-command">${commandData.command}</div>
            <div class="${statusClass}">${statusIcon} ${commandData.status}</div>
        `;
        
        // Remove loading message if it exists
        const loading = logsContainer.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
        
        logsContainer.insertBefore(logEntry, logsContainer.firstChild);
        
        // Keep only last 100 log entries
        const entries = logsContainer.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[entries.length - 1].remove();
        }
    }

    updateConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        const dot = connectionStatus.querySelector('.connection-dot');
        
        if (this.isConnected) {
            connectionStatus.innerHTML = `
                <div class="connection-dot"></div>
                Connected to server
            `;
        } else {
            connectionStatus.innerHTML = `
                <div class="connection-dot disconnected"></div>
                Disconnected from server
            `;
        }
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    updateUI() {
        // Update all dashboard elements
        document.getElementById('total-commands').textContent = this.stats.totalCommands;
        document.getElementById('uptime').textContent = this.formatUptime(this.stats.uptime);
        document.getElementById('server-port').value = window.location.port || '3000';
        document.getElementById('dashboard-url').value = window.location.origin + '/dashboard';
        
        this.updateRecentCommands();
        this.updateSuccessRate();
    }

    async loadCommands() {
        const commandsList = document.getElementById('commands-list');
        commandsList.innerHTML = '<div class="loading"><div class="spinner"></div>Loading commands...</div>';
        
        try {
            const response = await fetch('/api/commands');
            const data = await response.json();
            
            if (data.success) {
                this.commandsData = data;
                this.renderCommands(data);
            } else {
                commandsList.innerHTML = `<p style="color: var(--accent-red);">Error: ${data.error}</p>`;
            }
        } catch (error) {
            console.error('Error loading commands:', error);
            commandsList.innerHTML = '<p style="color: var(--accent-red);">Failed to load commands</p>';
        }
    }

    renderCommands(data) {
        const commandsList = document.getElementById('commands-list');
        
        if (!data.categories || data.categories.length === 0) {
            commandsList.innerHTML = '<p style="color: var(--text-secondary);">No commands found</p>';
            return;
        }
        
        // Create search and filter controls
        const controlsHtml = `
            <div style="padding: 1rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border);">
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <input type="text" id="command-search" placeholder="Search commands..." 
                           style="flex: 1; min-width: 200px;" class="command-text">
                    <select id="category-filter" class="command-text" style="width: auto;">
                        <option value="">All Categories</option>
                        ${data.categories.map(cat => 
                            `<option value="${cat.name}">${cat.name} (${cat.commands.length})</option>`
                        ).join('')}
                    </select>
                    <button class="btn btn-small" onclick="addNewCommand()">➕ Add Command</button>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                    ${data.stats.totalCommands} commands in ${data.stats.categoriesCount} categories
                </div>
            </div>
        `;
        
        // Render all commands
        let commandsHtml = '';
        
        for (const category of data.categories) {
            commandsHtml += `
                <div class="category-section" data-category="${category.name}">
                    <div style="background: var(--bg-tertiary); padding: 1rem; font-weight: 600; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div>${category.name} (${category.commands.length} commands)</div>
                                <div style="font-size: 0.875rem; font-weight: normal; color: var(--text-secondary);">
                                    ${category.description}
                                </div>
                            </div>
                            <button class="btn btn-small" onclick="toggleCategory('${category.name}')">
                                <span id="toggle-${category.name}">📂</span>
                            </button>
                        </div>
                    </div>
                    <div id="category-${category.name}" class="category-commands">
            `;
            
            for (let i = 0; i < category.commands.length; i++) {
                const cmd = category.commands[i];
                const params = cmd.parameters ? this.formatParameters(cmd.parameters) : '';
                
                commandsHtml += `
                    <div class="command-row" data-category="${category.name}" data-command="${i}">
                        <div>
                            <input type="text" class="command-text command-phrase" data-row="${i}"
                                   onchange="updateCommand('${this.escapeHtml(category.name)}', ${i}, 'phrase', this.value)"
                                   placeholder="Voice command phrase">
                        </div>
                        <div>
                            <input type="text" class="command-text command-name" data-row="${i}"
                                   onchange="updateCommand('${this.escapeHtml(category.name)}', ${i}, 'command', this.value)"
                                   placeholder="API command">
                        </div>
                        <div>
                            <input type="text" class="command-text command-params" data-row="${i}"
                                   onchange="updateCommandParams('${this.escapeHtml(category.name)}', ${i}, this.value)"
                                   placeholder="Parameters (JSON)">
                        </div>
                        <div>
                            <button class="btn-play" id="play-${category.name}-${i}" 
                                   onclick="testCommandFromRow('${this.escapeHtml(category.name)}', ${i})">
                                ▶️ Play
                            </button>
                        </div>
                        <div>
                            <button class="btn btn-small btn-danger" onclick="deleteCommand('${this.escapeHtml(category.name)}', ${i})">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            }
            
            commandsHtml += `
                    </div>
                </div>
            `;
        }
        
        commandsList.innerHTML = controlsHtml + commandsHtml;
        
        // Set input values after HTML is created to avoid parsing issues
        this.setInputValues(data);
        
        // Setup search functionality
        document.getElementById('command-search').addEventListener('input', this.filterCommands.bind(this));
        document.getElementById('category-filter').addEventListener('change', this.filterCommands.bind(this));
    }
    
    formatParameters(params) {
        if (!params || typeof params !== 'object' || Object.keys(params).length === 0) return '';
        try {
            return JSON.stringify(params);
        } catch (error) {
            return String(params);
        }
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setInputValues(commandsData) {
        commandsData.categories.forEach((category, categoryIndex) => {
            category.commands.forEach((cmd, commandIndex) => {
                const row = document.querySelector(`.command-row[data-category="${category.name}"][data-command="${commandIndex}"]`);
                if (!row) return;

                // Set phrase value
                const phraseInput = row.querySelector('.command-phrase');
                if (phraseInput) phraseInput.value = cmd.phrase || '';

                // Set command value
                const commandInput = row.querySelector('.command-name');
                if (commandInput) commandInput.value = cmd.command || '';

                // Set parameters value
                const paramsInput = row.querySelector('.command-params');
                if (paramsInput) {
                    const params = cmd.parameters ? this.formatParameters(cmd.parameters) : '';
                    paramsInput.value = params;
                }
            });
        });
    }
    
    filterCommands() {
        const searchTerm = document.getElementById('command-search').value.toLowerCase();
        const categoryFilter = document.getElementById('category-filter').value;
        
        const categorySelections = document.querySelectorAll('.category-section');
        
        categorySelections.forEach(section => {
            const categoryName = section.dataset.category;
            let hasVisibleCommands = false;
            
            // Category filter
            if (categoryFilter && categoryName !== categoryFilter) {
                section.style.display = 'none';
                return;
            } else {
                section.style.display = 'block';
            }
            
            // Search filter
            const commands = section.querySelectorAll('.command-row');
            commands.forEach(row => {
                const phrase = row.querySelector('input').value.toLowerCase();
                const command = row.querySelectorAll('input')[1].value.toLowerCase();
                
                if (!searchTerm || phrase.includes(searchTerm) || command.includes(searchTerm)) {
                    row.style.display = 'grid';
                    hasVisibleCommands = true;
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Hide category if no visible commands
            if (searchTerm && !hasVisibleCommands) {
                section.style.display = 'none';
            }
        });
    }

    setupEventListeners() {
        // Tab switching is handled by global functions
        // WebSocket reconnection is automatic
        
        // Update dashboard URL when port changes
        const portInput = document.getElementById('server-port');
        if (portInput) {
            portInput.addEventListener('input', () => {
                const newPort = portInput.value;
                const currentHost = window.location.hostname;
                document.getElementById('dashboard-url').value = `http://${currentHost}:${newPort}/dashboard`;
            });
        }
    }

    async loadSystemInfo() {
        try {
            // Load CPU info
            const cpuResponse = await fetch('/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ALICE-TOKEN': this.authToken
                },
                body: JSON.stringify({ command: 'system_cpu' })
            });
            const cpuData = await cpuResponse.json();
            
            if (cpuData.ok && cpuData.data) {
                document.getElementById('system-cpu').innerHTML = `${cpuData.data.usage}%`;
            } else {
                document.getElementById('system-cpu').innerHTML = 'N/A';
            }

            // Load Memory info  
            const memResponse = await fetch('/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ALICE-TOKEN': this.authToken
                },
                body: JSON.stringify({ command: 'system_memory' })
            });
            const memData = await memResponse.json();
            
            if (memData.ok && memData.data) {
                const usedGB = (memData.data.used / (1024 * 1024 * 1024)).toFixed(1);
                const totalGB = (memData.data.total / (1024 * 1024 * 1024)).toFixed(1);
                document.getElementById('system-memory').innerHTML = `${usedGB}/${totalGB}GB`;
            } else {
                document.getElementById('system-memory').innerHTML = 'N/A';
            }

            // Update header system info
            const systemInfo = `Port: ${window.location.port || '3000'} | ${window.location.hostname}`;
            document.getElementById('system-info').textContent = systemInfo;

        } catch (error) {
            console.error('Error loading system info:', error);
            document.getElementById('system-cpu').innerHTML = 'Error';
            document.getElementById('system-memory').innerHTML = 'Error';
        }
    }

    async testCommand(command, params = {}) {
        try {
            const payload = { command, ...params };
            
            // Show loading state
            const buttons = document.querySelectorAll('.quick-action-btn');
            const clickedButton = Array.from(buttons).find(btn => btn.onclick.toString().includes(command));
            if (clickedButton) {
                const originalText = clickedButton.innerHTML;
                clickedButton.innerHTML = '⏳ Testing...';
                clickedButton.disabled = true;
                
                setTimeout(() => {
                    clickedButton.innerHTML = originalText;
                    clickedButton.disabled = false;
                }, 3000);
            }

            const response = await fetch('/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ALICE-TOKEN': this.authToken
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            // Show result notification
            this.showNotification(
                result.ok ? '✅ Command executed successfully!' : `❌ Command failed: ${result.error}`,
                result.ok ? 'success' : 'error'
            );
            
        } catch (error) {
            console.error('Error testing command:', error);
            this.showNotification('❌ Network error occurred', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }
}

// Global functions for tab switching and actions
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active to clicked nav tab
    event.target.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'commands') {
        window.dashboard.loadCommands();
    }
}

// Global function for reload button
function loadCommands() {
    if (window.dashboard) {
        window.dashboard.loadCommands();
    }
}

async function saveCommands() {
    if (!window.dashboard.commandsData) {
        alert('No commands data loaded. Please reload the page.');
        return;
    }
    
    const saveBtn = document.querySelector('button[onclick="saveCommands()"]');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '💾 Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch('/api/commands', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categories: window.dashboard.commandsData.categories
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Commands saved successfully!\n\n${result.stats.totalCommands} commands in ${result.stats.categoriesCount} categories`);
        } else {
            alert(`❌ Error saving commands:\n\n${result.error}\n\n${result.validationErrors ? result.validationErrors.join('\n') : ''}`);
        }
    } catch (error) {
        console.error('Error saving commands:', error);
        alert('❌ Failed to save commands. Check console for details.');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

function updateCommand(categoryName, commandIndex, field, value) {
    if (!window.dashboard.commandsData) return;
    
    const category = window.dashboard.commandsData.categories.find(cat => cat.name === categoryName);
    if (category && category.commands[commandIndex]) {
        category.commands[commandIndex][field] = value;
        
        // Visual feedback
        const input = event.target;
        input.style.borderColor = 'var(--accent-green)';
        setTimeout(() => {
            input.style.borderColor = 'var(--border)';
        }, 1000);
    }
}

function updateCommandParams(categoryName, commandIndex, value) {
    if (!window.dashboard.commandsData) return;
    
    const category = window.dashboard.commandsData.categories.find(cat => cat.name === categoryName);
    if (category && category.commands[commandIndex]) {
        try {
            if (value.trim() === '') {
                category.commands[commandIndex].parameters = undefined;
            } else {
                category.commands[commandIndex].parameters = JSON.parse(value);
            }
            
            // Visual feedback
            event.target.style.borderColor = 'var(--accent-green)';
            setTimeout(() => {
                event.target.style.borderColor = 'var(--border)';
            }, 1000);
        } catch (error) {
            // Invalid JSON
            event.target.style.borderColor = 'var(--accent-red)';
            setTimeout(() => {
                event.target.style.borderColor = 'var(--border)';
            }, 2000);
        }
    }
}

function deleteCommand(categoryName, commandIndex) {
    if (!window.dashboard.commandsData) return;
    
    const category = window.dashboard.commandsData.categories.find(cat => cat.name === categoryName);
    if (category && category.commands[commandIndex]) {
        const command = category.commands[commandIndex];
        
        if (confirm(`Delete command "${command.phrase}"?`)) {
            category.commands.splice(commandIndex, 1);
            window.dashboard.renderCommands(window.dashboard.commandsData);
        }
    }
}

function addNewCommand() {
    if (!window.dashboard || !window.dashboard.commandsData) {
        alert('Commands not loaded yet. Please wait or reload the page.');
        return;
    }
    
    const categoryName = document.getElementById('category-filter').value || 'General';
    
    let category = window.dashboard.commandsData.categories.find(cat => cat.name === categoryName);
    if (!category) {
        category = {
            name: categoryName,
            description: 'Custom commands',
            commands: []
        };
        window.dashboard.commandsData.categories.push(category);
    }
    
    const newCommand = {
        phrase: 'новая команда',
        command: 'say_ok',
        category: categoryName,
        description: 'Новая команда'
    };
    
    category.commands.push(newCommand);
    window.dashboard.renderCommands(window.dashboard.commandsData);
    
    // Scroll to the new command
    setTimeout(() => {
        const commandRows = document.querySelectorAll('.command-row');
        if (commandRows.length > 0) {
            const lastRow = commandRows[commandRows.length - 1];
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastRow.style.backgroundColor = 'var(--accent-blue)';
            setTimeout(() => {
                lastRow.style.backgroundColor = '';
            }, 2000);
        }
    }, 100);
}

function toggleCategory(categoryName) {
    const categoryDiv = document.getElementById(`category-${categoryName}`);
    const toggleIcon = document.getElementById(`toggle-${categoryName}`);
    
    if (categoryDiv.style.display === 'none') {
        categoryDiv.style.display = 'block';
        toggleIcon.textContent = '📂';
    } else {
        categoryDiv.style.display = 'none';
        toggleIcon.textContent = '📁';
    }
}

function clearLogs() {
    const logsContainer = document.getElementById('logs-container');
    logsContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem;">Logs cleared</p>';
}

function exportLogs() {
    const logs = document.getElementById('logs-container').innerText;
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-pc-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function editCommandsFile() {
    alert('This will open the command mappings file in your default editor (coming soon)');
}

// Global function to test commands from dashboard
function testCommand(command, params = {}) {
    if (window.dashboard) {
        window.dashboard.testCommand(command, params);
    } else {
        console.error('Dashboard not initialized');
    }
}

// Global function to test command from table row
function testCommandFromRow(categoryName, commandIndex) {
    if (!window.dashboard || !window.dashboard.commandsData) {
        alert('Commands not loaded yet. Please wait or reload the page.');
        return;
    }
    
    const category = window.dashboard.commandsData.categories.find(cat => cat.name === categoryName);
    if (!category || !category.commands[commandIndex]) {
        alert('Command not found.');
        return;
    }
    
    const cmd = category.commands[commandIndex];
    const playButton = document.getElementById(`play-${categoryName}-${commandIndex}`);
    
    if (!cmd.command) {
        alert('No command specified. Please fill in the API command field.');
        return;
    }
    
    // Show loading state
    if (playButton) {
        playButton.innerHTML = '⏳ Running...';
        playButton.disabled = true;
    }
    
    // Parse parameters
    let params = {};
    if (cmd.parameters) {
        try {
            params = typeof cmd.parameters === 'string' ? JSON.parse(cmd.parameters) : cmd.parameters;
        } catch (error) {
            alert('Invalid parameters JSON format.');
            if (playButton) {
                playButton.innerHTML = '▶️ Play';
                playButton.disabled = false;
            }
            return;
        }
    }
    
    // Execute command
    window.dashboard.testCommand(cmd.command, params).then(() => {
        // Reset button state
        if (playButton) {
            playButton.innerHTML = '▶️ Play';
            playButton.disabled = false;
        }
    }).catch((error) => {
        // Reset button state on error
        if (playButton) {
            playButton.innerHTML = '▶️ Play';
            playButton.disabled = false;
        }
    });
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new VoicePCDashboard();
    
    // Auto-load commands on initialization
    if (document.getElementById('commands').classList.contains('active')) {
        window.dashboard.loadCommands();
    }
});