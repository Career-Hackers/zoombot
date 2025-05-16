import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = null;

let db = null;

export function setupMongoClient() {
  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

export async function connectToDB() {
  if (!db) {
    await client.connect();
    db = client.db("test");
  }
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error("DB not initialized. Call connectToDB first.");
  }
  return db;
}

export async function closeDB() {
  await client.close();
  console.log("❌ MongoDB connection closed.");
}

export { client };
