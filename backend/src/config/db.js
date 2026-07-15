import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    autoIndex: env.NODE_ENV !== "production"
  });
  console.log("MongoDB connected");
}
