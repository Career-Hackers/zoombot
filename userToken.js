const axios = require("axios");
const fs = require("fs");

(async () => {
  const accessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBLZXkiOiJsTlR0elNMdVE1VFNmTXJlYlM0TkEiLCJtbiI6Ijk2MzYzNTAxODMxIiwicm9sZSI6MSwiaWF0IjoxNzQ3MTE3ODAzLCJleHAiOjE3NDcxMjUwMDMsInRva2VuRXhwIjoxNzQ3MTI1MDAzfQ.F6KXqkvwAodsj6gh4cc7jYFK6aE6D-cKyoTIkNOMma0";
  const response = await axios.get(
    "https://api.zoom.us/v2/users/alan.fung@careerhackers.io/token?type=zak",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("Response:", response.data);
})();
