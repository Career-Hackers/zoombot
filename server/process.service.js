import path from "path";
import { fileURLToPath } from "url";
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_SCRIPT_PATH = path.resolve(
  __dirname,
  "../bot/main/bin/meetingSDKDemo"
);

// CloudWatch setup
const REGION = "ap-east-1";
const LOG_GROUP_NAME = "/zoom-bot";
const cloudwatchClient = new CloudWatchLogsClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ====================================================
async function setupLogStream(meetingId) {
  const uuid = uuidv4();
  const logStreamName = `meeting_${meetingId}_${uuid}`;

  // Ensure log group exists
  try {
    const existingGroups = await cloudwatchClient.send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: LOG_GROUP_NAME })
    );
    const found = existingGroups.logGroups?.find(
      (group) => group.logGroupName === LOG_GROUP_NAME
    );
    if (!found) {
      await cloudwatchClient.send(
        new CreateLogGroupCommand({ logGroupName: LOG_GROUP_NAME })
      );
      console.log(`🆕 Created log group: ${LOG_GROUP_NAME}`);
    }
  } catch (err) {
    console.error("❌ Failed to check/create log group:", err.message);
    throw err;
  }

  // Ensure log stream exists
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
    console.log(`🆕 Created log stream: ${logStreamName}`);
  }

  return { uuid, logStreamName };
}

// ====================================================
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

  if (sequenceToken) {
    params.sequenceToken = sequenceToken;
  }

  await cloudwatchClient.send(new PutLogEventsCommand(params));
}

// ====================================================
export const runBot = async (config) => {
  const {
    meeting_number,
    token,
    meeting_password = "",
    recording_token,
    GetVideoRawData = "true",
    GetAudioRawData = "false",
    SendVideoRawData = "false",
    SendAudioRawData = "false",
  } = config;

  console.log(`Triggering bot for meeting ${meeting_number}...`);

  const { uuid, logStreamName } = await setupLogStream(meeting_number);
  const args = [
    `meeting_number=${meeting_number}`,
    `token=${token}`,
    `meeting_password=${meeting_password}`,
    `recording_token=${recording_token}`,
    `GetVideoRawData=${GetVideoRawData}`,
    `GetAudioRawData=${GetAudioRawData}`,
    `SendVideoRawData=${SendVideoRawData}`,
    `SendAudioRawData=${SendAudioRawData}`,
  ];

  console.log(`🚀 Spawning Zoom bot for meeting ${meeting_number}...`);

  const botProcess = spawn(BOT_SCRIPT_PATH, args, {
    cwd: path.dirname(BOT_SCRIPT_PATH),
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];
  let logBuffer = [];

  const flushLogs = async () => {
    if (logBuffer.length > 0) {
      try {
        await sendToCloudWatch(logStreamName, logBuffer);
      } catch (err) {
        console.error("Failed to send batch to CloudWatch:", err.message);
      }
      logBuffer = [];
    }
  };

  if (!db) {
    console.error("❌ MongoDB connection not established");
    throw new Error("MongoDB connection not established");
  }

  // ==========================================
  const handleData = (prefix, data) => {
    const msg = `${prefix} ${data.toString().trim()}`;
    console.log(msg);
    logs.push(msg);
    logBuffer.push(msg);
  };
  botProcess.stdout.on("data", (data) =>
    handleData(`📤 [${meeting_number}]`, data)
  );
  botProcess.stderr.on("data", (data) =>
    handleData(`❗ [${meeting_number}]`, data)
  );

  // =========================================
  botProcess.on("close", async (code) => {
    const msg = `🛑 Bot for meeting ${meeting_number} exited with code ${code}`;
    console.log(msg);

    clearInterval(interval);
    logs.push(msg);
    await flushLogs();

    await db.collection("bot_processes").updateOne(
      { pid: botProcess.pid },
      {
        $set: {
          status: code === 0 ? "completed" : "failed",
          endTime: new Date(),
        },
      }
    );
  });

  botProcess.unref(); // Allows parent to exit without waiting for child

  // Save process info to MongoDB
  await db.collection("bot_processes").insertOne({
    meetingId: meeting_number,
    uuid,
    logStreamName,
    pid: botProcess.pid,
    startTime: new Date(),
    endTime: null,
    status: "running",
    lastUpdate: new Date(),
  });

  console.log("🔁 Bot process started");
};

export const recoverRunningBots = async () => {
  if (!db) {
    console.error("❌ MongoDB connection not established");
    throw new Error("MongoDB connection not established");
  }

  const bots = await db
    .collection("bot_processes")
    .find({ status: "running" })
    .toArray();

  if (bots.length === 0) {
    console.log("✅ No running bots found");
    return;
  }

  for (const bot of bots) {
    try {
      process.kill(bot.pid, 0); // Check if process exists
      console.log(
        `✅ Bot still running for meeting ${bot.meetingId}, PID: ${bot.pid}`
      );
    } catch (err) {
      console.log(
        `⚠️ Bot for meeting ${bot.meetingId} (PID: ${bot.pid}) no longer alive, marking as failed`
      );
      await db
        .collection("bot_processes")
        .updateOne(
          { pid: bot.pid },
          { $set: { status: "failed", endTime: new Date() } }
        );
    }
  }
};
