import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = null;

export async function setupMongoClient() {
  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
}

export async function connectToDB() {
  if (!client) {
    console.error("❌ MongoDB client is not set up");
    throw new Error("MongoDB client is not set up");
  }
  let db = client.db("test");

  return db;
}

export async function closeDB() {
  await client.close();
  console.log("❌ MongoDB connection closed.");
}

export { client };
