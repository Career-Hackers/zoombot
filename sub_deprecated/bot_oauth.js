const KJUR = require("jsrsasign");

const ZOOM_MEETING_SDK_KEY = "lNTtzSLuQ5TSfMrebS4NA";
const ZOOM_MEETING_SDK_SECRET = "vJfi8WrWWLKvMYll4mWElOHFQ0n9cXbe";
const meetingNumber = "96363501831";
const role = 1;

const main = () => {
  //   const { meetingNumber, role, expirationSeconds, videoWebRtcMode } = data;  
  const iat = Math.round(new Date().getTime() / 1000) - 30
  const exp = iat + 60 * 60 * 2  
  const oHeader = { alg: "HS256", typ: "JWT" };

  const oPayload = {
    appKey: ZOOM_MEETING_SDK_KEY,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
    // video_webrtc_mode: videoWebRtcMode,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign(
    "HS256",
    sHeader,
    sPayload,
    ZOOM_MEETING_SDK_SECRET
  );
  console.log(`SDK JWT: ${sdkJWT}`);
  return sdkJWT;
};

main();
