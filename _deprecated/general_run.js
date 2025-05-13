const KJUR = require("jsrsasign");
const axios = require("axios");
const fs = require("fs");

const ZOOM_MEETING_SDK_KEY = "lNTtzSLuQ5TSfMrebS4NA";
const ZOOM_MEETING_SDK_SECRET = "vJfi8WrWWLKvMYll4mWElOHFQ0n9cXbe";

const generateToken = () => {
  //   const { meetingNumber, role, expirationSeconds, videoWebRtcMode } = data;
  const expirationSeconds = 60 * 60 * 2; // 2 hours
  const iat = Math.floor(Date.now() / 1000);
  const exp = expirationSeconds ? iat + expirationSeconds : iat + 60 * 60 * 2;
  const oHeader = { alg: "HS256", typ: "JWT" };

  const oPayload = {
    appKey: ZOOM_MEETING_SDK_KEY,
    sdkKey: ZOOM_MEETING_SDK_KEY,
    // mn: meetingNumber,
    // role,
    iat,
    exp,
    // tokenExp: exp,
    // video_webrtc_mode: videoWebRtcMode,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign(
    "HS256",
    sHeader,
    sPayload,
    ZOOM_MEETING_SDK_SECRET
  );
  console.log(`SDK JWT: ${sdkJWT}`);
  return sdkJWT;
};

// Example usage
const createMeeting = async (token) => {
  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic: "Bot Hosted Meeting",
      type: 1,
    },
    {
      headers: {
        Authorization: `Bearer yA1vZJYRQTmt_baHAHGmsQ`,
        "Content-Type": "application/json",
      },
    }
  );

  const meeting = response.data;
  const zak = new URL(meeting.start_url).searchParams.get("zak");

  const config = `
meeting_number: "${meeting.id}"
token: "${zak}"
meeting_password: "${meeting.password}"
recording_token: ""
GetVideoRawData: "true"
GetAudioRawData: "false"
SendVideoRawData: "false"
SendAudioRawData: "false"
`;

  fs.writeFileSync("./config.txt", config);
  console.log("📝 config.txt updated. Ready to launch Zoom SDK bot.");
};

const main = async () => {
  const token = generateToken();
  console.log(token);
  await createMeeting(token);
};

main();
