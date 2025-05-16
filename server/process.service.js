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
import { v4 as uuidv4 } from "uuid";

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

  return logStreamName;
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
    meeting_password,
    recording_token,
    GetVideoRawData = "true",
    GetAudioRawData = "false",
    SendVideoRawData = "false",
    SendAudioRawData = "false",
  } = config;

  console.log(`Triggering bot for meeting ${meeting_number}...`);

  const logStreamName = await setupLogStream(meeting_number);

  const cmd = `${BOT_SCRIPT_PATH} meeting_number=${meeting_number} token=${token} meeting_password=${meeting_password} recording_token=${recording_token} GetVideoRawData=${GetVideoRawData} GetAudioRawData=${GetAudioRawData} SendVideoRawData=${SendVideoRawData} SendAudioRawData=${SendAudioRawData}`;
  console.log("🔁 Executing command:", cmd);

  const logs = [];

  const process = exec(cmd, async (error, stdout, stderr) => {
    if (error) {
      const msg = `❌ Error executing command: ${error.message}`;
      console.error(msg);
      logs.push(msg);
    }
    try {
      await sendToCloudWatch(logStreamName, logs);
    } catch (err) {
      console.error("❌ Failed to send logs to CloudWatch:", err.message);
    }
  });

  process.stdout.on("data", (data) => {
    const msg = `🔁 Bot output: ${data}`;
    console.log(msg);
    logs.push(msg);
  });

  process.stderr.on("data", (data) => {
    const msg = `❌ Bot error: ${data}`;
    console.error(msg);
    logs.push(msg);
  });

  process.on("close", async (code) => {
    const msg = `🔁 Bot process exited with code ${code}`;
    console.log(msg);
    logs.push(msg);
    try {
      await sendToCloudWatch(logStreamName, logs);
    } catch (err) {
      console.error("❌ Failed to send final logs to CloudWatch:", err.message);
    }
  });

  console.log("🔁 Bot process started");
};
