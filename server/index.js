import express from "express";
import { exec } from "child_process";
import path from "path";
import { startMeeting } from "./meeting.service.js";
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const app = express();
const PORT = 3000;

const BOT_SCRIPT_PATH = path.resolve("/home/ubuntu/bot/main/meetingSDKDemo");

// CloudWatch setup
const REGION = "ap-southeast-1"; // Update to your region
const LOG_GROUP_NAME = "/zoom-bot";
const cloudwatchClient = new CloudWatchLogsClient({ region: REGION });

async function ensureLogStream(meetingId) {
  const logStreamName = `meeting-${meetingId}`;

  const { logStreams } = await cloudwatchClient.send(
    new DescribeLogStreamsCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamNamePrefix: logStreamName,
    })
  );

  if (!logStreams || logStreams.length === 0) {
    await cloudwatchClient.send(
      new CreateLogStreamCommand({
        logGroupName: LOG_GROUP_NAME,
        logStreamName,
      })
    );
  }

  return logStreamName;
}

async function sendToCloudWatch(logStreamName, messages) {
  const timestamp = Date.now();

  const { logStreams } = await cloudwatchClient.send(
    new DescribeLogStreamsCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamNamePrefix: logStreamName,
    })
  );

  const sequenceToken = logStreams?.[0]?.uploadSequenceToken;

  const params = {
    logGroupName: LOG_GROUP_NAME,
    logStreamName,
    logEvents: messages.map((msg) => ({
      timestamp,
      message: msg,
    })),
  };

  if (sequenceToken) params.sequenceToken = sequenceToken;

  await cloudwatchClient.send(new PutLogEventsCommand(params));
}

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

app.post("/start-bot", async (req, res) => {
  const meetingId = req.query.meetingId;

  if (!meetingId) {
    return res.status(400).json({ error: "meetingId query param is required" });
  }

  const logStreamName = await ensureLogStream(meetingId);

  console.log(`🔁 Triggering bot for meeting ${meetingId}...`);

  const process = exec(BOT_SCRIPT_PATH, async (error, stdout, stderr) => {
    const logs = [];

    if (error) {
      logs.push(`❌ Bot execution error: ${error.message}`);
      console.error("❌ Bot execution error:", error.message);
    }

    if (stderr) {
      logs.push(`⚠️ Bot stderr: ${stderr}`);
      console.warn("⚠️ Bot stderr:", stderr);
    }

    if (stdout) {
      logs.push(`✅ Bot stdout: ${stdout}`);
      console.log("✅ Bot stdout:", stdout);
    }

    try {
      await sendToCloudWatch(logStreamName, logs);
    } catch (err) {
      console.error("❌ Failed to send logs to CloudWatch:", err.message);
    }
  });

  res.status(200).json({ message: "Bot started (check CloudWatch for logs)" });
});

app.post("/health", (req, res) => {
  console.log("🩺 Health check received");
  res.status(200).json({ status: "OK" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
