const dotenv = require('dotenv').config('./.env');
const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, // replace with your client ID
    process.env.CLIENT_SECRET, // replace with your client secret
    'http://localhost:3000/oauth2callback' // replace with your redirect URL (e.g., http://localhost:3000/oauth2callback)
);

// Step 1: Generate authentication URL
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  res.redirect(authUrl);
});

let oAuthTokens = {};

// Step 2: Handle OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  oAuthTokens = tokens;
  res.send('Authentication successful! You can close this tab.');
});

// Step 3: Create a meeting event
app.post('/create-event', async (req, res) => {
    oauth2Client.setCredentials(oAuthTokens);
  const { summary, start, end, emails } = req.body;

  const event = {
    summary: summary,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: emails.map(email => ({ email })),
  };

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  calendar.events.insert(
    {
      auth: oauth2Client,
      calendarId: 'primary',
      resource: event,
    },
    (err, event) => {
      if (err) {
        res.status(500).send('Error creating event: ' + err);
        return;
      }
      res.send(`Event created: ${event.data.htmlLink}`);
    }
  );
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
