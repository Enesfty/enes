/**
 * Roblox Username Checker - Frontend Client
 */

class CheckerApp {
    constructor() {
        this.ws = null;
        this.running = false;

        this.initElements();
        this.initEventListeners();
        this.connect();

        this.log('Welcome to Roblox Username Checker!', 'info');
        this.log('Select one or more types and click Start.', 'info');
    }

    initElements() {
        this.webhookInput = document.getElementById('webhookUrl');
        this.testWebhookBtn = document.getElementById('testWebhook');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearLogBtn = document.getElementById('clearLog');
        this.threadsSlider = document.getElementById('threads');
        this.threadsValue = document.getElementById('threadsValue');
        this.verboseCheck = document.getElementById('verbose');
        this.useProxyCheck = document.getElementById('useProxy');
        this.logArea = document.getElementById('logArea');

        // Stats
        this.statChecks = document.getElementById('statChecks');
        this.statHits = document.getElementById('statHits');
        this.statErrors = document.getElementById('statErrors');
        this.statCpm = document.getElementById('statCpm');
        this.statProxies = document.getElementById('statProxies');
        this.statusIndicator = document.getElementById('statusIndicator');

        // Checkboxes
        this.typeCheckboxes = document.querySelectorAll('.type-checkboxes input[type="checkbox"]');
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.testWebhookBtn.addEventListener('click', () => this.testWebhook());

        this.threadsSlider.addEventListener('input', () => {
            this.threadsValue.textContent = this.threadsSlider.value;
        });
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);

        this.ws.onopen = () => {
            this.log('Connected to server', 'info');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            this.log('Disconnected from server. Reconnecting...', 'warn');
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
            this.log('Connection error', 'error');
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'hit':
                this.log(`🎉 HIT [${data.genType.toUpperCase()}]: ${data.username}`, 'hit');
                break;

            case 'check':
                this.log(`CHECK [${data.genType.toUpperCase()}]: ${data.username} - ${data.message}`, 'info');
                break;

            case 'log':
                this.log(data.message, data.level);
                break;

            case 'stats':
                this.updateStats(data);
                break;

            case 'status':
                this.updateStatus(data.status);
                break;

            case 'webhook_test':
                this.log(data.message, data.success ? 'hit' : 'error');
                break;

            case 'error':
                this.log(`Error: ${data.message}`, 'error');
                break;
        }
    }

    getSelectedTypes() {
        const selected = [];
        this.typeCheckboxes.forEach(cb => {
            if (cb.checked) {
                selected.push(cb.value);
            }
        });
        return selected;
    }

    start() {
        const types = this.getSelectedTypes();

        if (types.length === 0) {
            this.log('Please select at least one username type!', 'error');
            return;
        }

        this.ws.send(JSON.stringify({
            action: 'start',
            types,
            threads: parseInt(this.threadsSlider.value),
            webhookUrl: this.webhookInput.value.trim(),
            verbose: this.verboseCheck.checked,
            useProxy: this.useProxyCheck.checked
        }));

        this.running = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.log(`Starting checker with types: ${types.join(', ')}`, 'info');
    }

    stop() {
        this.ws.send(JSON.stringify({ action: 'stop' }));
        this.running = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.log('Stopping checker...', 'warn');
    }

    testWebhook() {
        const url = this.webhookInput.value.trim();
        if (!url) {
            this.log('Please enter a webhook URL!', 'error');
            return;
        }

        this.log('Testing webhook...', 'info');
        this.ws.send(JSON.stringify({
            action: 'test_webhook',
            webhookUrl: url
        }));
    }

    clearLog() {
        this.logArea.innerHTML = '';
        this.log('Log cleared.', 'info');
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefixes = {
            info: 'ℹ️',
            hit: '🎉',
            error: '❌',
            warn: '⚠️'
        };

        const entry = document.createElement('div');
        entry.className = `log-entry ${level}`;
        entry.textContent = `[${timestamp}] ${prefixes[level] || 'ℹ️'} ${message}`;

        this.logArea.appendChild(entry);
        this.logArea.scrollTop = this.logArea.scrollHeight;

        // Limit log entries
        while (this.logArea.children.length > 500) {
            this.logArea.removeChild(this.logArea.firstChild);
        }
    }

    updateStats(stats) {
        this.statChecks.textContent = stats.checks.toLocaleString();
        this.statHits.textContent = stats.hits.toLocaleString();
        this.statErrors.textContent = stats.errors.toLocaleString();
        this.statCpm.textContent = stats.cpm.toLocaleString();
        if (stats.proxyCount !== undefined) {
            this.statProxies.textContent = stats.proxyCount.toLocaleString();
        }
    }

    updateStatus(status) {
        if (status === 'running') {
            this.statusIndicator.textContent = '🟢 Running';
            this.running = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
        } else {
            this.statusIndicator.textContent = '🔴 Stopped';
            this.running = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CheckerApp();
});
