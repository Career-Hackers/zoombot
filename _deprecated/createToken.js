const KJUR = require("jsrsasign");

const sdkKey = "lNTtzSLuQ5TSfMrebS4NA";
const sdkSecret = "vJfi8WrWWLKvMYll4mWElOHFQ0n9cXbe";

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 2 * 60 * 60;

const oHeader = { alg: "HS256", typ: "JWT" };
const oPayload = {
  appKey: sdkKey,
  sdkKey: sdkKey,
  iat,
  exp,
};

const jwt = KJUR.jws.JWS.sign(
  "HS256",
  JSON.stringify(oHeader),
  JSON.stringify(oPayload),
  sdkSecret
);
console.log("JWT:", jwt);
