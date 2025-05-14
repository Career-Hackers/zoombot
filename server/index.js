import express from "express";
import { exec } from "child_process";
import path from "path";
import { startMeeting } from "./meeting.service.js";

const app = express();
const PORT = 3000;

// Adjust this to the full or relative path to your bot binary/script
const BOT_SCRIPT_PATH = path.resolve("/home/ubuntu/bot/demo/meetingSDKDemo");

app.post("/create-meeting", async (req, res) => {
  try {
    console.log("🛠️ Creating meeting...");

    const config = await startMeeting();

    console.log("📅 Meeting started successfully");

    res.status(200).json({
      message: "Meeting started successfully",
      meetingConfig: config,
    });
  } catch (error) {
    console.error("❌ Error creating meeting:", error.message);
    res.status(500).json({ error: error.message });
  }
});

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

app.post("/health", (req, res) => {
  console.log("🩺 Health check received");
  res.status(200).json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
