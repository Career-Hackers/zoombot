const axios = require("axios");
const fs = require("fs");

(async () => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBLZXkiOiJsTlR0elNMdVE1VFNmTXJlYlM0TkEiLCJzZGtLZXkiOiJsTlR0elNMdVE1VFNmTXJlYlM0TkEiLCJpYXQiOjE3NDcwNDExODcsImV4cCI6MTc0NzA0ODM4N30.ShaXZ-qDu9aWfStJ9sbmJfBHa2a8rvUackYp9NEXO-U";
  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    {
      topic: "Bot Hosted Meeting",
      type: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
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
})();
