/**
 * Roblox Username Checker - Web Server
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const { RobloxChecker } = require('./checker');
const { getGenerator } = require('./generator');
const { WebhookSender } = require('./webhook');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store active checkers per connection
const activeCheckers = new Map();

wss.on('connection', (ws) => {
    console.log('Client connected');

    let running = false;
    let checker = null;
    let webhook = null;
    let checkedUsernames = new Set();

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.action) {
                case 'start':
                    if (running) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Already running!' }));
                        return;
                    }

                    running = true;
                    checker = new RobloxChecker();
                    webhook = new WebhookSender(data.webhookUrl || '');
                    checker.start();

                    const types = data.types || ['4l'];
                    const threads = data.threads || 10;
                    const verbose = data.verbose !== false;
                    const useProxy = data.useProxy !== false;

                    ws.send(JSON.stringify({ type: 'status', status: 'running' }));

                    // Start checking
                    runChecker(ws, types, threads, verbose, useProxy, checker, webhook, checkedUsernames, () => running, () => { running = false; });
                    break;

                case 'stop':
                    running = false;
                    ws.send(JSON.stringify({ type: 'status', status: 'stopped' }));
                    break;

                case 'test_webhook':
                    const testWebhook = new WebhookSender(data.webhookUrl);
                    const success = await testWebhook.sendTest();
                    ws.send(JSON.stringify({
                        type: 'webhook_test',
                        success,
                        message: success ? 'Webhook test successful!' : 'Webhook test failed!'
                    }));
                    break;

                case 'get_stats':
                    if (checker) {
                        ws.send(JSON.stringify({ type: 'stats', ...checker.getStats() }));
                    }
                    break;
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        running = false;
    });
});

async function runChecker(ws, types, threads, verbose, useProxy, checker, webhook, checkedUsernames, isRunning, setNotRunning) {
    // Create generators for all types
    const generators = types.map(type => ({ type, gen: getGenerator(type) }));

    const checkOne = async (username, genType) => {
        try {
            const { available, message } = await checker.checkUsername(username, useProxy);

            if (available) {
                ws.send(JSON.stringify({ type: 'hit', username, genType }));
                if (webhook.webhookUrl) {
                    try {
                        const success = await webhook.sendHit(username, genType);
                        if (success) {
                            ws.send(JSON.stringify({ type: 'log', level: 'info', message: `Webhook sent: ${username}` }));
                        } else {
                            ws.send(JSON.stringify({ type: 'log', level: 'error', message: `Webhook failed: ${username}` }));
                        }
                    } catch (e) {
                        ws.send(JSON.stringify({ type: 'log', level: 'error', message: `Webhook error: ${e.message}` }));
                    }
                }
            } else if (verbose) {
                ws.send(JSON.stringify({ type: 'check', username, genType, message }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: 'log', level: 'error', message: `Check setup error: ${error.message}` }));
        }
    };

    async function worker() {
        while (isRunning() && generators.length > 0) {
            // Pick random generator
            const genInfo = generators[Math.floor(Math.random() * generators.length)];
            const { type, gen } = genInfo;

            try {
                const { value: username, done } = gen.next();

                if (done) {
                    // Remove exhausted generator
                    const idx = generators.findIndex(g => g.type === type);
                    if (idx !== -1) generators.splice(idx, 1);
                    ws.send(JSON.stringify({ type: 'log', level: 'warn', message: `Generator ${type} exhausted!` }));
                    continue;
                }

                if (checkedUsernames.has(username)) {
                    continue;
                }
                checkedUsernames.add(username);

                await checkOne(username, type);
            } catch (e) {
                // Ignore generator errors and continue
            }
        }
    }

    try {
        // Start workers
        const workerPromises = Array.from({ length: threads }, () => worker());

        // Update stats periodically (every 2 seconds or so)
        const statsInterval = setInterval(() => {
            if (isRunning()) {
                ws.send(JSON.stringify({ type: 'stats', ...checker.getStats() }));
            } else {
                clearInterval(statsInterval);
            }
        }, 2000);

        await Promise.all(workerPromises);
        clearInterval(statsInterval);

        if (generators.length === 0) {
            ws.send(JSON.stringify({ type: 'log', level: 'warn', message: 'All generators exhausted!' }));
        }
    } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }

    setNotRunning();
    ws.send(JSON.stringify({ type: 'status', status: 'stopped' }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Roblox Checker running at http://localhost:${PORT}`);
});
