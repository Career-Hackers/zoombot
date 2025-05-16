const main = async () => {
  try {
    const res = await fetch(
      "https://zoombot.api.careerhackers.io/start-interview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingUrl: "https://careerhackers.zoom.us/j/1234567890?pwd=abcdefg",
        }),
      }
    );
    const data = await res.json();
    console.log("Response data:", data);
    if (!res.ok) {
      throw new Error(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error("❌ Failed to start interview:", error.message);
  }
};

main();
