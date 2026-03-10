process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const twilio = require('twilio');
const twilioClient = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
twilioClient.messages.create({
    body: "Test message from backend",
    from: process.env.TWILIO_PHONE_NUMBER,
    to: "+919345813730"
}).then(res => {
    console.log("Success! SID:", res.sid);
}).catch(err => {
    console.error("Twilio Error:", err.message);
});
