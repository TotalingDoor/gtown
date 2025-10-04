const express = require("express");
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const app = express();
const port = process.env.PORT || 3001;

// Google Sheets configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1YMS62CBQoZWJOw7-dkXjIRtynM6lInPOylqB1h5H4iY';
const TOTAL_RANGE = 'Sheet1!A2'; // Cell to store the running total
const COUNT_RANGE = 'Sheet1!B2'; // Cell to store purchase count
const INSTALL_COUNT_RANGE = 'Sheet1!C2'; // Cell to store new install count
// Day of week login tracking (Monday=B6, Tuesday=B7, ..., Sunday=B12)
const DAY_RANGES = {
    'Monday': 'Sheet1!B6',
    'Tuesday': 'Sheet1!B7', 
    'Wednesday': 'Sheet1!B8',
    'Thursday': 'Sheet1!B9',
    'Friday': 'Sheet1!B10',
    'Saturday': 'Sheet1!B11',
    'Sunday': 'Sheet1!B12'
};
// Hour login tracking (00:00=E6, 01:00=E7, ..., 23:00=E29)
const HOUR_RANGES = {};
for (let hour = 0; hour < 24; hour++) {
    const paddedHour = hour.toString().padStart(2, '0');
    HOUR_RANGES[`${paddedHour}:00`] = `Sheet1!E${hour + 6}`;
}
const SERVICE_ACCOUNT_EMAIL = 'gtown-536@glowing-run-372920.iam.gserviceaccount.com';

/**
 * Creates authenticated Google Sheets client (reusable)
 * @return {Promise<object>} Authenticated Google Sheets client
 */
async function createSheetsClient() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        credentials: {
            type: "service_account",
            project_id: "glowing-run-372920",
            private_key_id: "1e916ffc8c95d6d05f6b2eceb23bf00bb9b40152",
            private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDdbbrSgmWBruKw\n1HHk5eKu3j0MXME9kX96bNrrd0GsFNlJo4Cj5aQogCcZkMEedUzAZYZwIaCJC/XR\nq7h2h3ZH2UxNMzR1wUjrH4qjdAbpkEfdL7HKrcQg6T60OesBaStdIgmPHfSG471a\naLpT6nmuLaVUfTRjMainywXdfAKU94mO0L8c7KIyZKGqEQdMJ9SbJF8Kp1rN5q8s\n5cn9QLktRpzdQvO0AdrY2xoqNBoKgaqNXKCMEA/iQKYhwg5vGrxt33nMaOGDy/CM\nIrW1mrb1hycT33wJ1LMOiOVJOf95qlOOtRni6l0AuZrKE4IAlYqlJGRlIaBrtrKT\nHIYI8v57AgMBAAECggEAXGkKGgavhELPesr+yW+jfiVjxwAC6cYKNLavWqvHraB5\n2oCxFDWnn/tz1fiSkDqWEImOZMez7t4d9iY7csQv+eZXMLTZBPfoja/5NSQcKme7\nhjT8d0Cz5KRTNfYh/NG+djzZTnBK9+ydvtiMQq9NnwKPyEYEkg1MfNJ/HSM/FJm/\nEtquA71CBnE8jg6zxtnXYauiWf7jRzxfMstuQkbX1OSPjo7lmEB9/NRl1uX1V2JT\nJKc+kCR2USHGcm6q2doeZ/V6Am6xhmPlDUUh+BwWOay+8e49SUSIZ6WaUCt7A9mH\nICgQk0qOtYD5+bHOWXPcIt+M1wQXfcP51P5OfdcQgQKBgQD+nG9kkpHRY6KJy+qm\ns0DdsnN9AE8rZrT/jXEtDq4DcsP+XK7w7ekWH6g+t19NXGImxT6sHUlRLKgvIIBK\nkEObd4lHAZW80TEEB9+tIAhwOzJXVVCiMToPXVHBt5c96Q8u791h2f8ve+u1NaGA\nRa9gG2wGO34gVIPl5ZowpIZOOwKBgQDeovSOeV05LBnel6ZDCw7Vx6HJEAOnepdD\nj/fwnuRh7GAm8shBfhJ+wYGt4dvwVnskbv+qGldgsaUV+EoEj4HGN92k+S/JfrXi\npl4D/uWQ6BKrWNys+tWljZxRnKUTW2slbaoaCbtSNWhzZLGUAK8POoLXf3My8s2a\n5xITr2HMwQKBgQD6kRlO8K9wUY1z7qpOw7nic+wT6GoBXGJj3N60aO33lsorWSsR\nEBGDJER+9BdmGrS9UwAKggfVSw1405Ntzeu65DjFGFo0J+sE/Hqz9gJX8Onp6Jwi\nAjARTtVWv0aoNuQqXQSRd+ga4ulkvBLkGbAt9M6qk4Hcb1Aev4auuDs0YQKBgQCh\nIb9t/liCMHDosUkb7Lzn7HwjUPvUEt23gFMqS1VvqexNRBm7jMtGAjcg6f6Mi4rE\na7GOI1JqISgiJnkro9GA7J318IOtiY+KYm5Y5fqwTcZ1TPMqHsDR+RPR3VV8FQYP\nKLeb8L8qWI0oNxBu1a/djbN01EFD9oboPaTPqndWAQKBgElwH9b7pij3J3FKwXtA\nP+bL26ZNybAhTEO8R9NuB3puRzg2EVuwYL/HTJEDX54vkKQ31emRUJpFrTQn8Ovo\nID9Lw9DWTpgpOND54O5O2yGOHQX70VBjToN66x5uatZmjJN7Utv1UqbTxAecnOQE\nxt/chfiyuMW1Se0ZAnRrk1l+\n-----END PRIVATE KEY-----\n",
            client_email: "gtown-536@glowing-run-372920.iam.gserviceaccount.com",
            client_id: "117456173766832239538",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/gtown-536%40glowing-run-372920.iam.gserviceaccount.com",
            universe_domain: "googleapis.com"
        },
    });
    return google.sheets({ version: 'v4', auth });
}

/**
 * Get current UK time with proper timezone handling
 * @return {Date} UK date object
 */
function getUKTime() {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/London"}));
}

/**
 * Updates the running total and purchase count in Google Sheets
 * @param {number} purchaseAmount The amount to add to the total
 * @return {Promise<object>} The new total amount and purchase count
 */
async function updateSpreadsheetsData(purchaseAmount) {
    try {
        // Create authenticated Sheets client
        const sheets = await createSheetsClient();

        // Read current total and count from spreadsheet
        let currentTotal = 0;
        let currentCount = 0;
        
        try {
            const batchResponse = await sheets.spreadsheets.values.batchGet({
                spreadsheetId: SPREADSHEET_ID,
                ranges: [TOTAL_RANGE, COUNT_RANGE],
            });
            
            const totalValue = batchResponse.data.valueRanges[0].values?.[0]?.[0];
            const countValue = batchResponse.data.valueRanges[1].values?.[0]?.[0];
            
            currentTotal = totalValue ? parseFloat(totalValue) || 0 : 0;
            currentCount = countValue ? parseInt(countValue) || 0 : 0;
            
            console.log(`📊 Current total: $${currentTotal}, Current count: ${currentCount} purchases`);
        } catch (readError) {
            console.log(`📝 No existing data found, starting from $0 and 0 purchases`);
        }

        // Calculate new values
        const newTotal = currentTotal + purchaseAmount;
        const newCount = currentCount + 1;
        console.log(`💰 Adding $${purchaseAmount}, new total: $${newTotal}, new count: ${newCount} purchases`);

        // Write new values back to spreadsheet
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'RAW',
                data: [
                    {
                        range: TOTAL_RANGE,
                        values: [[newTotal]]
                    },
                    {
                        range: COUNT_RANGE,
                        values: [[newCount]]
                    }
                ]
            }
        });

        console.log(`✅ Successfully updated spreadsheet - Total: $${newTotal}, Count: ${newCount} purchases`);
        return { total: newTotal, count: newCount };

    } catch (error) {
        console.error('❌ Google Sheets error:', error.message);
        throw error;
    }
}

/**
 * Updates the new install count in Google Sheets
 * @return {Promise<number>} The new install count
 */
async function updateNewInstallCount() {
    try {
        // Create authenticated Sheets client
        const sheets = await createSheetsClient();

        // Read current install count from spreadsheet
        let currentInstallCount = 0;
        
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: INSTALL_COUNT_RANGE,
            });
            
            const installValue = response.data.values?.[0]?.[0];
            currentInstallCount = installValue ? parseInt(installValue) || 0 : 0;
            
            console.log(`📱 Current install count: ${currentInstallCount}`);
        } catch (readError) {
            console.log(`📝 No existing install data found, starting from 0 installs`);
        }

        // Calculate new install count
        const newInstallCount = currentInstallCount + 1;
        console.log(`🆕 New install recorded, total installs: ${newInstallCount}`);

        // Write new install count back to spreadsheet
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: INSTALL_COUNT_RANGE,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[newInstallCount]]
            }
        });

        console.log(`✅ Successfully updated install count to ${newInstallCount}`);
        return newInstallCount;

    } catch (error) {
        console.error('❌ Google Sheets install count error:', error.message);
        throw error;
    }
}

/**
 * Updates the day of week login count in Google Sheets based on UK time
 * @return {Promise<object>} The day name and new count
 */
async function updateDayLoginCount() {
    try {
        // Get current UK time
        const ukDate = getUKTime();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[ukDate.getDay()];
        const dayRange = DAY_RANGES[dayName];

        // Create authenticated Sheets client
        const sheets = await createSheetsClient();

        // Read current day count from spreadsheet
        let currentDayCount = 0;
        
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: dayRange,
            });
            
            const dayValue = response.data.values?.[0]?.[0];
            currentDayCount = dayValue ? parseInt(dayValue) || 0 : 0;
            
            console.log(`📅 Current ${dayName} login count: ${currentDayCount}`);
        } catch (readError) {
            console.log(`📝 No existing ${dayName} data found, starting from 0 logins`);
        }

        // Calculate new day count
        const newDayCount = currentDayCount + 1;
        console.log(`📅 Login on ${dayName}, total ${dayName} logins: ${newDayCount}`);

        // Write new day count back to spreadsheet
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: dayRange,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[newDayCount]]
            }
        });

        console.log(`✅ Successfully updated ${dayName} login count to ${newDayCount}`);
        return { day: dayName, count: newDayCount };

    } catch (error) {
        console.error('❌ Google Sheets day login count error:', error.message);
        throw error;
    }
}

/**
 * Updates the hourly login count in Google Sheets based on UK time
 * @return {Promise<object>} The hour and new count
 */
async function updateHourlyLoginCount() {
    try {
        // Get current UK time
        const ukDate = getUKTime();
        const hour = ukDate.getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        const hourRange = HOUR_RANGES[hourKey];

        // Create authenticated Sheets client
        const sheets = await createSheetsClient();

        // Read current hour count from spreadsheet
        let currentHourCount = 0;
        
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: hourRange,
            });
            
            const hourValue = response.data.values?.[0]?.[0];
            currentHourCount = hourValue ? parseInt(hourValue) || 0 : 0;
            
            console.log(`🕐 Current ${hourKey} login count: ${currentHourCount}`);
        } catch (readError) {
            console.log(`📝 No existing ${hourKey} data found, starting from 0 logins`);
        }

        // Calculate new hour count
        const newHourCount = currentHourCount + 1;
        console.log(`🕐 Login at ${hourKey}, total ${hourKey} logins: ${newHourCount}`);

        // Write new hour count back to spreadsheet
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: hourRange,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[newHourCount]]
            }
        });

        console.log(`✅ Successfully updated ${hourKey} login count to ${newHourCount}`);
        return { hour: hourKey, count: newHourCount };

    } catch (error) {
        console.error('❌ Google Sheets hourly login count error:', error.message);
        throw error;
    }
}

// Middleware to parse JSON requests
app.use(express.json());

// Login endpoint
app.post("/login", async (req, res) => {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: "Missing user ID" });
        }

        console.log(`Login attempt from user: ${id}`);

        // Track login day and hour in Google Sheets
        try {
            const [dayResult, hourResult] = await Promise.all([
                updateDayLoginCount(),
                updateHourlyLoginCount()
            ]);
            console.log(`📊 Login tracking - ${dayResult.day}: ${dayResult.count}, ${hourResult.hour}: ${hourResult.count}`);
        } catch (trackingError) {
            console.error("Login tracking failed:", trackingError.message);
            // Continue processing even if tracking fails
        }

        // Default response: logged in successfully
        // You can add custom logic here to check for banned users or team members
        // Return "1" to quit/ban user, "2" for team member, "0" for normal login
        
        res.send("0");

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// New install endpoint
app.post("/new_install", async (req, res) => {
    try {
        console.log(`New installation recorded`);
        
        // Update Google Sheets install count
        try {
            const installCount = await updateNewInstallCount();
            console.log(`📈 Updated install count: ${installCount}`);
            res.json({ success: true, message: "New install recorded", count: installCount });
        } catch (sheetsError) {
            console.error("Google Sheets install count update failed:", sheetsError.message);
            res.status(500).json({ error: "Failed to update install count" });
        }

    } catch (error) {
        console.error("New install error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Purchase endpoint
app.post("/purchase", async (req, res) => {
    try {
        const { id, usd } = req.body;
        
        if (!id || usd === undefined) {
            return res.status(400).json({ error: "Missing user ID or USD amount" });
        }

        console.log(`Purchase from user ${id}: $${usd}`);
        
        // Update Google Sheets running total and purchase count
        try {
            const result = await updateSpreadsheetsData(parseFloat(usd));
            console.log(`📈 Updated - Total: $${result.total}, Purchases: ${result.count}`);
        } catch (sheetsError) {
            console.error("Google Sheets update failed:", sheetsError.message);
            // Continue processing even if sheets update fails
        }

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
