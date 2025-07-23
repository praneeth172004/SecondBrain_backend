//@ts-ignore

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Request, Response } from "express";

// Database Schemas
import User from "./Database/userSchema";
import Content from "./Database/contentSchema";
import Link from "./Database/linkSchema";

// Middleware
import { userMiddleware } from "./Middleware/Authmiddleware";

// Cloudinary
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Utils
import { random } from "./utils";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: ["https://second-brain-frontend-five.vercel.app", "https://second-brain-frontend-zruo.vercel.app", "http://localhost:5173"],
  credentials: true,
}));

// Cloudinary config


// ROUTES

// Signup
//@ts-ignore
app.post("/user/signup", async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ msg: "Missing fields" });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, password: hashedPassword, email });

    res.status(201).json({ msg: "Signup successful", userId: newUser._id });
  } catch (err) {
    res.status(500).json({ msg: "Internal server error" });
  }
});
//@ts-ignore

// Login
app.post("/user/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Login failed" });
  }
});

// Upload PDF


// Add Content
app.post("/user/addcontent", userMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, link, type, content, tags } = req.body;
    await Content.create({ title, link, type, content, tags, userId: req.userId });
    res.status(201).json({ msg: "Content added" });
  } catch (err) {
    res.status(500).json({ msg: "Failed to add content" });
  }
});

// Get Content
app.get("/user/content", userMiddleware, async (req: Request, res: Response) => {
  const content = await Content.find({ userId: req.userId }).populate("userId", "username");
  res.json({ content });
});

// Delete Content
//@ts-ignore
app.delete("/user/content", userMiddleware, async (req: Request, res: Response) => {
  const contentId = req.query.id;
  const data = await Content.findOneAndDelete({ _id: contentId, userId: req.userId });
  if (!data) return res.status(404).json({ msg: "Content not found or not authorized" });
  res.json({ msg: "Content deleted" });
});
//@ts-ignore
// Share Link
app.post("/user/share", userMiddleware, async (req: Request, res: Response) => {
  const { share } = req.body;
  const userId = req.userId;

  if (share) {
    const existing = await Link.findOne({ userId });
    if (existing) return res.json({ msg: "Already shared", hash: existing.hash });
    const hash = random(10);
    await Link.create({ userId, hash });
    res.status(201).json({ msg: "Link shared", hash });
  } else {
    await Link.deleteOne({ userId });
    res.json({ msg: "Share removed" });
  }
});
//@ts-ignore
// View Shared Content
app.get("/user/share/:sharelink", async (req: Request, res: Response) => {
  const linkDoc = await Link.findOne({ hash: req.params.sharelink });
  if (!linkDoc) return res.status(404).json({ msg: "Invalid Share Link" });
  const content = await Content.find({ userId: linkDoc.userId });
  res.json({ content });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
  mongoose.connect(process.env.DATABASE_URL!)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
});
