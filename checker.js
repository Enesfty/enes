/**
 * Roblox Username Checker Module
 * Supports Proxy Rotation
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

class RobloxChecker {
    static USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    ];

    constructor() {
        this.VALIDATION_URL = 'https://auth.roblox.com/v1/usernames/validate';
        this.checks = 0;
        this.hits = 0;
        this.errors = 0;
        this.startTime = null;
        this.proxies = [];
        this.proxyFailures = new Map();
        this.proxyCooldowns = new Map(); // {proxy: expireTime}
        this.loadProxies();
    }

    loadProxies() {
        try {
            const proxyPath = path.join(__dirname, '..', 'proxies.txt');
            if (fs.existsSync(proxyPath)) {
                const content = fs.readFileSync(proxyPath, 'utf-8');
                const newProxies = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                this.proxies = newProxies;
                this.proxyFailures = new Map();
                this.proxies.forEach(p => this.proxyFailures.set(p, 0));
                // Clean up old cooldowns
                for (const p of this.proxyCooldowns.keys()) {
                    if (!this.proxies.includes(p)) this.proxyCooldowns.delete(p);
                }
                console.log(`Loaded ${this.proxies.length} proxies.`);
            } else {
                console.log('proxies.txt not found. Using localhost.');
            }
        } catch (error) {
            console.error('Error loading proxies:', error.message);
        }
    }

    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        const now = Date.now();
        const available = this.proxies.filter(p => (this.proxyCooldowns.get(p) || 0) < now);

        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }

    _getProxyAgent(proxy) {
        if (!proxy) return null;
        const proxyUrl = proxy.startsWith('http') ? proxy : `http://${proxy}`;
        return new HttpsProxyAgent(proxyUrl);
    }

    start() {
        this.startTime = Date.now();
    }

    async checkUsername(username, useProxy = true) {
        const params = new URLSearchParams({
            Username: username,
            Birthday: '2000-01-01T00:00:00.000Z',
            Context: 'Signup'
        });

        const rawProxy = useProxy ? this.getRandomProxy() : null;

        if (useProxy && !rawProxy && this.proxies.length > 0) {
            // All proxies in cooldown
            await new Promise(r => setTimeout(r, 2000));
            return { available: false, message: 'Proxies cooling down...' };
        }

        const agent = this._getProxyAgent(rawProxy);
        const guestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const options = {
            timeout: 20000,
            agent,
            headers: {
                'User-Agent': RobloxChecker.USER_AGENTS[Math.floor(Math.random() * RobloxChecker.USER_AGENTS.length)],
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.roblox.com/',
                'Origin': 'https://www.roblox.com',
                'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'Cookie': `guestId=${guestId}; rbxid=${Math.floor(Math.random() * 999999999)}`
            }
        };

        try {
            const response = await fetch(`${this.VALIDATION_URL}?${params}`, options);

            // Reset failure count on success
            if (rawProxy) {
                this.proxyFailures.set(rawProxy, 0);
            }

            this.checks++;

            if (response.status === 200) {
                const data = await response.json();
                const code = data.code || -1;
                const message = data.message || '';

                if (code === 0) {
                    this.hits++;
                    return { available: true, message: 'Available' };
                } else {
                    return { available: false, message };
                }
            } else if (response.status === 429) {
                this.errors++;
                if (rawProxy) {
                    // 5 min cooldown
                    this.proxyCooldowns.set(rawProxy, Date.now() + 300000);
                    return { available: false, message: 'Rate Limited (5m cooldown)' };
                }

                if (!agent) {
                    await new Promise(r => setTimeout(r, 1500));
                    return { available: false, message: 'Rate Limited (local IP)' };
                }
                return { available: false, message: 'Rate Limited (proxy rotated)' };
            } else {
                this.errors++;
                return { available: false, message: `HTTP ${response.status}` };
            }
        } catch (error) {
            this.errors++;

            // Handle proxy failure
            if (rawProxy) {
                const fails = (this.proxyFailures.get(rawProxy) || 0) + 1;
                this.proxyFailures.set(rawProxy, fails);

                if (fails >= 3) {
                    this.proxies = this.proxies.filter(p => p !== rawProxy);
                    return { available: false, message: `Proxy Removed (${error.message})` };
                }
                return { available: false, message: `Proxy Error (${error.message})` };
            }

            return { available: false, message: error.message };
        }
    }

    getProxyCount() {
        return this.proxies.length;
    }

    getCPM() {
        if (!this.startTime) return 0;
        const elapsed = (Date.now() - this.startTime) / 1000;
        if (elapsed < 1) return 0;
        return Math.floor((this.checks / elapsed) * 60);
    }

    getStats() {
        return {
            checks: this.checks,
            hits: this.hits,
            errors: this.errors,
            cpm: this.getCPM(),
            proxyCount: this.getProxyCount()
        };
    }

    resetStats() {
        this.checks = 0;
        this.hits = 0;
        this.errors = 0;
        this.startTime = Date.now();
    }
}

module.exports = { RobloxChecker };
