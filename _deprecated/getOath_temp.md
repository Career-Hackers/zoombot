curl -X POST \
  https://zoom.us/oauth/token?grant_type=account_credentials&account_id=YOUR_ACCOUNT_ID \
  -H 'Authorization: Basic <base64(client_id:client_secret)>'


🔁 Response:
json
複製
編輯
{
  "access_token": "YOUR_OAUTH_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 3599
}