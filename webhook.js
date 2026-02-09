const fetch = require('node-fetch');

class WebhookSender {
    constructor(webhookUrl = '') {
        this.webhookUrl = webhookUrl;
    }

    setUrl(url) {
        this.webhookUrl = url;
    }

    async sendHit(username, usernameType) {
        if (!this.webhookUrl) return false;

        const colors = {
            '3c': 0xE67E22,
            '4l': 0xFF6B6B,
            '4l_vowel': 0xF1C40F,
            '4c': 0x4ECDC4,
            '5l': 0x45B7D1,
            '5c': 0x96CEB4,
            '5l_meaningful': 0x9B59B6,
            'mixed': 0xFECE00,
            'clean_mixed': 0xDDA0DD
        };

        const color = colors[usernameType.toLowerCase()] || 0x7289DA;

        const embed = {
            title: '🎮 Username Available!',
            description: `\`\`\`${username}\`\`\``,
            color,
            fields: [
                { name: '📝 Type', value: usernameType.toUpperCase(), inline: true },
                { name: '📏 Length', value: String(username.length), inline: true },
                { name: '🔗 Register', value: '[Click Here](https://www.roblox.com/signup)', inline: true }
            ],
            footer: { text: 'Roblox Username Checker' },
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Roblox-Checker-Web/1.0'
                },
                body: JSON.stringify({ embeds: [embed] })
            });

            if (response.status !== 200 && response.status !== 204) {
                console.error(`Webhook FAILED with status ${response.status}`);
            }

            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Webhook Error:', error.message);
            return false;
        }
    }

    async sendTest() {
        if (!this.webhookUrl) return false;

        const embed = {
            title: '✅ Webhook Connected!',
            description: 'Your webhook is working correctly.',
            color: 0x00FF00,
            footer: { text: 'Roblox Username Checker' },
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Roblox-Checker-Web/1.0'
                },
                body: JSON.stringify({ embeds: [embed] })
            });
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Webhook Test Error:', error.message);
            return false;
        }
    }
}

module.exports = { WebhookSender };
