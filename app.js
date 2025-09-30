const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

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
        
        // Send Discord webhook embed
        var discordWebhookUrl = "https://discord.com/api/webhooks/1422679259297742930/vsEJOKaGkFWlExkCYNHajU4URADmc9hI5Ue6nTjoWyYKX6rMLIOad4aHlrEgbHQXR59x";
        
        console.log("🎯 Preparing Discord webhook...");
        console.log("Webhook URL:", discordWebhookUrl);
        
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

        const webhookPayload = {
            embeds: [embed]
        };

        console.log("📦 Webhook payload:", JSON.stringify(webhookPayload, null, 2));

        // Send webhook
        console.log("🚀 Sending Discord webhook...");
        fetch(discordWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
        })
        .then(response => {
            console.log("✅ Discord webhook response status:", response.status);
            console.log("📊 Response headers:", Object.fromEntries(response.headers));
            return response.text();
        })
        .then(responseText => {
            console.log("📝 Discord webhook response body:", responseText);
            if (responseText) {
                console.log("✨ Discord webhook sent successfully!");
            } else {
                console.log("⚠️ Discord webhook sent but no response body");
            }
        })
        .catch(webhookError => {
            console.error("❌ Discord webhook error:", webhookError);
            console.error("🔍 Error details:", {
                name: webhookError.name,
                message: webhookError.message,
                stack: webhookError.stack
            });
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
