import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
let client = null;
let db = null;

export async function setupMongoClient() {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("test");
}

export async function closeDB() {
  if (!client) return;
  if (!client.isConnected()) return;

  await client.close();
  console.log("❌ MongoDB connection closed.");
}

export { client, db };
