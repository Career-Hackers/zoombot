export {
  meetingId: "123456789",
  uuid: "abcdef-123456",
  logStreamName: "meeting_123456789_abcdef-123456",
  pid: 12345, // child process PID
  startTime: ISODate(),
  endTime: null, // will be set when the process ends
  status: "running", // "running", "completed", "failed"
  lastUpdate: ISODate()
}
