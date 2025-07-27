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
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});
const app = express();
app.use(express.json());
app.use(cors({
  origin: ["https://second-brain-frontend-five.vercel.app","https://secondbran-frontend.vercel.app", "https://second-brain-frontend-zruo.vercel.app", "http://localhost:5173"],
  credentials: true,
}));

// Cloudinary config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    //@ts-ignore
    folder: "image_uploads", // optional folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});
const upload = multer({ storage });

const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    return {
      folder: "uploads",
      resource_type: "auto", // auto-detects pdf/image/video
      format: file.mimetype === "application/pdf" ? "pdf" : undefined,
      public_id: file.originalname.split(".")[0],
    };
  },
});

//@ts-ignore
app.get('/user/search', userMiddleware,async (req, res) => {
  //@ts-ignore
  const query = req.query.query
  console.log(query);
  

  try {
    let content;
    //@ts-ignore
    if (!query || query.trim() === '') {
      // Return all content for the user
      content = await Content.find({ userId: req.userId }).populate('userId', 'username');
    } else {
      // Return filtered content
      content = await Content.find({
        userId: req.userId,
        title: { $regex: query, $options: 'i' },
      }).populate('userId', 'username');
    }

    res.json({ content });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
  

});

export const uploadPDF = multer({ storage: pdfStorage });

// Upload route
//@ts-ignore
app.post("/user/upload/image",userMiddleware, upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { title, tags, type } = req.body;

    const newContent = new Content({
      title,
      tags,
      type,
      link: (req.file as any).path,          // Cloudinary image URL
     
      content: "image",                      // or any other field you use for identifying type
      userId: req.userId,                    // assuming you're using auth middleware
    });

    await newContent.save();

    res.status(201).json({
      message: "Image uploaded and saved to DB",
      content: newContent,
    });
  } catch (err) {
    console.error("Error uploading image:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

//@ts-ignore
app.post("/user/upload/pdf",userMiddleware, uploadPDF.single("pdf"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { title, tags, type } = req.body;

    const newContent = new Content({
      title,
      tags,
      type,
      link: (req.file as any).path,          // Cloudinary image URL
     
      content: "pdf",                      // or any other field you use for identifying type
      userId: req.userId,                    // assuming you're using auth middleware
    });

    await newContent.save();

    res.status(201).json({
      message: "pdf uploaded and saved to DB",
      content: newContent,
    });
  } catch (err) {
    console.error("Error uploading image:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});
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
