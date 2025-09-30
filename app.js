const express = require("express");
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();
const port = process.env.PORT || 3001;
const discordWebhookUrl = "https://discord.com/api/webhooks/1422679259297742930/vsEJOKaGkFWlExkCYNHajU4URADmc9hI5Ue6nTjoWyYKX6rMLIOad4aHlrEgbHQXR59x";

// Working proxy list (updated with speed test results - fastest first)
const WORKING_PROXIES = [
    '47.251.43.115:33333',    // 1.716s - Fastest
    '118.201.133.59:3128',    // 2.069s
    '52.148.130.219:8080',    // 2.315s
    '45.238.58.33:8080',      // 3.192s
    '45.118.114.30:8080',     // 3.231s
    '47.51.51.190:8080',      // 4.702s
    '179.61.111.209:999',     // 4.726s
    '199.188.204.171:8080',   // 7.270s
    '202.5.32.33:2727',       // 7.274s
    '143.198.147.156:8888'    // 7.348s
];

let currentProxyIndex = 0;

// Function to send Discord webhook with proxy rotation
async function sendDiscordWebhookWithProxies(webhookUrl, payload) {
    const maxRetries = WORKING_PROXIES.length;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const proxyAddress = WORKING_PROXIES[currentProxyIndex];
        currentProxyIndex = (currentProxyIndex + 1) % WORKING_PROXIES.length;
        
        try {
            console.log(`Attempting Discord webhook via proxy: ${proxyAddress}`);
            
            const agent = new HttpsProxyAgent(`http://${proxyAddress}`);
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                agent: agent,
                timeout: 10000 // 10 second timeout
            });
            
            if (response.status === 204) {
                console.log(`✅ Discord webhook sent successfully via ${proxyAddress}`);
                return { success: true, proxy: proxyAddress };
            } else if (response.status === 429) {
                console.log(`⏰ Rate limited via ${proxyAddress}, trying next proxy...`);
                continue;
            } else {
                console.log(`❌ Webhook failed via ${proxyAddress}: HTTP ${response.status}`);
                continue;
            }
            
        } catch (error) {
            console.log(`💥 Error via ${proxyAddress}: ${error.message}`);
            continue;
        }
    }
    
    console.error('❌ All proxies failed or rate limited');
    return { success: false, error: 'All proxies failed' };
}

// Middleware to parse JSON requests
app.use(express.json());

// Login endpoint
app.post("/login", (req, res) => {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: "Missing user ID" });
        }

        console.log(`Login attempt from user: ${id}`);

        // Default response: logged in successfully
        // You can add custom logic here to check for banned users or team members
        // Return "1" to quit/ban user, "2" for team member, "0" for normal login
        
        res.send("0");

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Purchase endpoint
app.post("/purchase", (req, res) => {
    try {
        const { id, usd } = req.body;
        
        if (!id || usd === undefined) {
            return res.status(400).json({ error: "Missing user ID or USD amount" });
        }

        console.log(`Purchase from user ${id}: $${usd}`);
                
        const embed = {
            title: "💰 New Purchase",
            color: 0x00ff00, // Green color
            fields: [
                {
                    name: "User ID",
                    value: id,
                    inline: true
                },
                {
                    name: "Amount",
                    value: `$${usd} USD`,
                    inline: true
                },
                {
                    name: "Timestamp",
                    value: new Date().toISOString(),
                    inline: false
                }
            ],
            footer: {
                text: "Gorilla Town Purchase System"
            },
            timestamp: new Date().toISOString()
        };

        // Send webhook with proxy rotation
        sendDiscordWebhookWithProxies(discordWebhookUrl, {
            embeds: [embed]
        }).catch(webhookError => {
            console.error("Discord webhook error:", webhookError);
        });

        res.json({ success: true, message: "Purchase recorded" });
    } catch (error) {
        console.error("Purchase error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Basic health check endpoint
app.get("/", (req, res) => {
    res.json({ message: "Gorilla Town API Server", status: "running" });
});

const server = app.listen(port, () => console.log(`Gorilla Town API listening on port ${port}!`));

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
