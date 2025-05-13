const axios = require("axios");
const fs = require("fs");
const qs = require("querystring");

// 🔧 Replace with your actual values
const CLIENT_ID = "J_VVwdkdRTyOam9VlTcA_A";
const CLIENT_SECRET = "elU6N1rOL39x4AWo74cm58nAIPJnWGWO";
const ACCOUNT_ID = "jPiySUuiQYmRtUkRFtNHTQ";
const USER_EMAIL = "alan.fung@careerhackers.io"; // e.g., "bot@example.com"

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

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
}

async function createMeeting(accessToken) {
  const res = await axios.post(
    // `https://api.zoom.us/v2/users/${USER_EMAIL}/meetings`,
    `https://api.zoom.us/v2/users/me/meetings`,
    {
      topic: "Automated Bot Meeting",
      type: 1,
      settings: {
        join_before_host: true,
        waiting_room: false,
        host_video: false,
        participant_video: false,
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
}

function extractZAK(startUrl) {
  const url = new URL(startUrl);
  return url.searchParams.get("zak");
}

function writeConfigFile({ id, password }, zak) {
  const config = `
    meeting_number: "${id}"
    token: "${zak}"
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
    console.log("🔐 Got access token:", token);

    const meeting = await createMeeting(token);
    console.log("📅 Meeting created:", meeting.id);

    const zak = extractZAK(meeting.start_url);
    if (!zak) {
      throw new Error("❌ Failed to extract ZAK token from start_url.");
    }

    writeConfigFile(meeting, zak);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

main();
