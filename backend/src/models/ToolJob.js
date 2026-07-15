import mongoose from "mongoose";

const ToolJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, index: true },
    status: { type: String, enum: ["started", "success", "failed"], default: "started", index: true },
    inputCount: { type: Number, default: 0 },
    outputName: String,
    outputBytes: Number,
    ipHash: String,
    userAgent: String,
    errorCode: String,
    errorMessage: String,
    durationMs: Number
  },
  { timestamps: true }
);

ToolJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const ToolJob = mongoose.model("ToolJob", ToolJobSchema);
