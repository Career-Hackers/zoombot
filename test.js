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
          meetingUrl:
            "https://zoom.us/j/93068960285?pwd=NCHvk1BOoT8LEv97LJzHpTxUDREasm.1",
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
