const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

// Adjust this to the full or relative path to your bot binary/script
const BOT_SCRIPT_PATH = path.resolve("/home/ubuntu/bot/demo/meetingSDKDemo");

app.post("/start-bot", (req, res) => {
  console.log("🔁 Triggering bot...");

  // Execute the bot file
  const process = exec(BOT_SCRIPT_PATH, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Bot execution error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.warn("⚠️ Bot stderr:", stderr);
    }
    console.log("✅ Bot stdout:", stdout);
  });

  res.status(200).json({ message: "Bot started (check logs for output)" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
