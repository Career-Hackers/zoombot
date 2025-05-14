const axios = require("axios");
const fs = require("fs");

// 🔧 Replace with your actual values
const CLIENT_ID = "J_VVwdkdRTyOam9VlTcA_A";
const CLIENT_SECRET = "elU6N1rOL39x4AWo74cm58nAIPJnWGWO";
const ACCOUNT_ID = "jPiySUuiQYmRtUkRFtNHTQ";
const BOT_USER_EMAIL = "alan.fung@careerhackers.io"; // Bot's Zoom user email

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
    throw new Error(`Failed to get access token: ${error.response?.data?.message || error.message}`);
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
    throw new Error(`Failed to get user ID: ${error.response?.data?.message || error.message}`);
  }
}

async function createMeeting(accessToken) {
  try {
    const res = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic: "Automated Bot Meeting",
        type: 2, // Scheduled meeting
        start_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Start 5 minutes from now
        duration: 60, // 60 minutes
        settings: {
          join_before_host: true,
          waiting_room: false,
          host_video: false,
          participant_video: false,
          mute_upon_entry: true,
          auto_recording: "none",
          meeting_authentication: false,
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
    throw new Error(`Failed to create meeting: ${JSON.stringify(error.response?.data, null, 2) || error.message}`);
  }
}

function extractZAK(url) {
  try {
    const parsedUrl = new URL(url);
    const zak = parsedUrl.searchParams.get("zak");
    if (!zak) throw new Error("No ZAK token found in URL");
    return zak;
  } catch (error) {
    throw new Error(`Failed to extract ZAK: ${error.message}`);
  }
}

function writeConfigFile({ id, password, start_url, join_url }, zak) {
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
  console.log("🔗 Start URL:", start_url);
  console.log("🔗 Join URL:", join_url);
}

async function main() {
  try {
    const token = await getAccessToken();
    console.log("🔐 Got access token");

    const botUserId = await getUserId(token, BOT_USER_EMAIL);
    console.log("👤 Bot user ID:", botUserId);

    const meeting = await createMeeting(token);
    console.log("📅 Meeting created:", meeting.id);

    // Try extracting ZAK from start_url or join_url
    let zak;
    try {
      zak = extractZAK(meeting.start_url);
      console.log("🔑 Got ZAK from start_url");
    } catch (error) {
      console.warn("⚠️ Failed to get ZAK from start_url:", error.message);
      zak = extractZAK(meeting.join_url);
      console.log("🔑 Got ZAK from join_url");
    }

    writeConfigFile(meeting, zak);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();