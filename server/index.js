import express from "express";
import { exec } from "child_process";
import { startMeeting, startInterview } from "./meeting.service.js";
import { runBot, recoverRunningBots } from "./process.service.js";
import { setupMongoClient, closeDB } from "./db.js";

// ===================================================
process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Cleaning up...");
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Cleaning up...");
  await closeDB();
  process.exit(0);
});
// ===================================================

// !! remove this later, since if many bots running, restart will kill all
exec("pkill -f meetingSDKDemo", () => {
  console.log("✅ Cleaned up old meetingSDKDemo processes");
});

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/create-meeting", async (req, res) => {
  try {
    console.log("🛠️ Creating meeting...");
    const config = await startMeeting();
    console.log("📅 Meeting started successfully");

    console.log(config);

    const { meeting_number } = config;
    console.log("🔁 Starting bot for meeting ID:", meeting_number);
    await runBot(config);

    res.status(200).json({
      message: "Meeting started successfully",
      meetingConfig: config,
    });
  } catch (error) {
    console.error("❌ Error creating meeting:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/start-interview", async (req, res) => {
  const { meetingUrl } = req.body;

  if (!meetingUrl) {
    return res.status(400).json({ error: "meetingUrl is required" });
  }

  try {
    const meeting_number = meetingUrl.split("/j/")[1].split("?")[0];
    const meeting_password = meetingUrl.split("pwd=")[1].split(".")[0];
    const meeting = {
      id: meeting_number,
      password: meeting_password,
    };
    const config = await startInterview(meeting);

    console.log("🔁 Starting interview for meeting ID:", meeting_number);
    console.log(config);

    await runBot(config);

    res.status(200).json({
      message: "Interview started successfully",
      meetingConfig: config,
    });
  } catch (error) {
    console.error("❌ Error starting interview:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/start-bot", async (req, res) => {
  const meetingId = req.query.meetingId;

  if (!meetingId) {
    return res.status(400).json({ error: "meetingId query param is required" });
  }

  // const logStreamName = await ensureLogStream(meetingId);
  // console.log(`🔁 Triggering bot for meeting ${meetingId}...`);

  // const process = exec(BOT_SCRIPT_PATH, async (error, stdout, stderr) => {
  //   const logs = [];

  //   if (error) {
  //     logs.push(`❌ Bot execution error: ${error.message}`);
  //     console.error("❌ Bot execution error:", error.message);
  //   }

  //   if (stderr) {
  //     logs.push(`⚠️ Bot stderr: ${stderr}`);
  //     console.warn("⚠️ Bot stderr:", stderr);
  //   }

  //   if (stdout) {
  //     logs.push(`✅ Bot stdout: ${stdout}`);
  //     console.log("✅ Bot stdout:", stdout);
  //   }

  //   try {
  //     await sendToCloudWatch(logStreamName, logs);
  //   } catch (err) {
  //     console.error("❌ Failed to send logs to CloudWatch:", err.message);
  //   }
  // });

  res.status(200).json({ message: "Bot started (check CloudWatch for logs)" });
});

app.post("/health", (req, res) => {
  console.log("🩺 Health check received");
  res.status(200).json({ status: "OK" });
});

app.get("/health", (req, res) => {
  console.log("🩺 Health check received");
  res.status(200).json({ status: "OK" });
});

app.listen(PORT, async () => {
  console.log("🚀 Starting server...");
  try {
    console.log("🔗 Connecting to MongoDB...");
    await setupMongoClient();
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }

  try {
    console.log("Recovering bot processes...");
    await recoverRunningBots();
  } catch (error) {
    console.error("❌ Failed to recover bot processes:", error.message);
    process.exit(1);
  }

  console.log(`🚀 Server listening on port ${PORT}`);
});
