const axios = require("axios");
const fs = require("fs");
const jwt = require("jsonwebtoken");

// 🔧 Replace with your actual values
const CLIENT_ID = "J_VVwdkdRTyOam9VlTcA_A";
const CLIENT_SECRET = "elU6N1rOL39x4AWo74cm58nAIPJnWGWO";
const ACCOUNT_ID = "jPiySUuiQYmRtUkRFtNHTQ";
const SDK_KEY = "lNTtzSLuQ5TSfMrebS4NA"; // From Meeting SDK app
const SDK_SECRET = "vJfi8WrWWLKvMYll4mWElOHFQ0n9cXbe"; // From Meeting SDK app
const BOT_USER_EMAIL = "alan.fung@careerhackers.io";

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  try {
    const res = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
      null,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data.access_token;
  } catch (error) {
    throw new Error(
      `Failed to get access token: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

async function getUserId(accessToken, email) {
  try {
    const res = await axios.get(`https://api.zoom.us/v2/users?status=active`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = res.data.users.find((u) => u.email === email);
    if (!user) throw new Error(`User ${email} not found`);
    return user.id;
  } catch (error) {
    throw new Error(
      `Failed to get user ID: ${error.response?.data?.message || error.message}`
    );
  }
}

async function createMeeting(accessToken) {
  try {
    const res = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic: "Automated Bot Meeting (Test)",
        type: 1,
        // start_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        // duration: 60,
        settings: {
          join_before_host: true,
          waiting_room: false,
          // host_video: false,
          // participant_video: false,
          // mute_upon_entry: true,
          // auto_recording: "cloud",
          meeting_authentication: false,
          // alternative_hosts: "jchill@example.com",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  } catch (error) {
    throw new Error(
      `Failed to create meeting: ${
        JSON.stringify(error.response?.data, null, 2) || error.message
      }`
    );
  }
}

function generateJWT() {
  const payload = {
    appKey: SDK_KEY,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    tokenExp: Math.floor(Date.now() / 1000) + 3600,
  };
  return jwt.sign(payload, SDK_SECRET);
}

function writeConfigFile({ id, password }) {
  const jwt = generateJWT();
  const config = `
meeting_number: "${id}"
token: "${jwt}"
meeting_password: "${password || ""}"
recording_token: ""
GetVideoRawData: "true"
GetAudioRawData: "false"
SendVideoRawData: "false"
SendAudioRawData: "false"
`;
  fs.writeFileSync("config.txt", config);
  console.log("✅ config.txt generated.");
}

async function main() {
  try {
    const token = await getAccessToken();
    console.log("🔐 Got access token");

    const botUserId = await getUserId(token, BOT_USER_EMAIL);
    console.log("👤 Bot user ID:", botUserId);

    const meeting = await createMeeting(token);
    console.log("📅 Meeting created:", meeting.id);

    writeConfigFile(meeting);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
