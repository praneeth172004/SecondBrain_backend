import express from "express";
import User from "./Database/userSchema";
import bcrypt, { hash } from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Content from "./Database/contentSchema"
import { userMiddleware } from "./Middleware/Authmiddleware";
import cors from "cors";
import Link from "./Database/linkSchema";
import { random } from "./utils";
import multer from 'multer'
import path from "path";
import pdf from "./Database/pdfSchema"
import fs from "fs";



const app = express();
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(cors({
  origin: [ "https://second-brain-frontend-zruo.vercel.app",
"http://localhost:5173"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.post('/user/signup', async (req: Request, res: Response):Promise<any> => {
  try {
    const { username, password,email } = req.body;

    if (!username) return res.status(400).json({ msg: "Please enter a username" });
    if (!password) return res.status(400).json({ msg: "Please enter a password" });
    if(!email) return res.status(400).json({msg:"Please enter an email"});

    const existingUser = await User.findOne({ username });
    console.log(existingUser);
    
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email,username, password: hashedPassword });

    return res.status(201).json({ msg: "Successfully signed up", userId: newUser._id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

app.post("/user/login", async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { username, password } = req.body;

    if (!username) return res.status(400).json({ msg: "Please enter a username" });
    if (!password) return res.status(400).json({ msg: "Please enter a password" });

    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return res.status(404).json({ msg: "User not found" });
    } else {

      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch) {
        return res.status(401).json({ msg: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: existingUser._id },
        "default_secret",
        { expiresIn: "1h" }
      );

      return res.status(200).json({ msg: "Login successful", token });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal server error" });
  }
});



app.get("/user/details", userMiddleware, async (req: Request, res: Response): Promise<any> => {
  const id = req.userId;
  console.log(id);


  try {
    if (!id) {
      return res.json({
        msg: "No id"
      })
    }
    const user = await User.findOne({ _id: id }).select("-password");
    return res.json({ user });

  } catch (err) {
    return res.status(500).json({ msg: "Error fetching user data" });
  }
});



app.post("/user/addcontent",userMiddleware,async(req:Request,res:Response):Promise<any>=>{
  const {title,link,type,content,tags}=req.body;
  console.log(req.body);
  try{
    await Content.create({
    link,
    title,
    type,
    content,
    userId:req.userId,
    tags
  })
  return res.status(201).json({msg:"Content added"})
  }catch(err){
    console.log(err);
    return res.status(500).json({ msg: "Error fetching user data" });
  }
  
})


app.get("/user/content",userMiddleware,async(req:Request,res:Response):Promise<any>=>{

  const userId=req.userId;
  const content =await Content.find({userId:userId}).populate("userId","username")
  return res.json({
    content
  })
})


app.delete("/user/content", userMiddleware, async (req: Request, res: Response): Promise<any> => {

  const userId = req.userId;
  const parseResult = req.query;

  if (!userId) {
    return res.status(401).json({ msg: "User ID not found" });
  }

  const contentId = parseResult.id

  const data = await Content.findOneAndDelete({ _id: contentId, userId });

  if (!data) {
    return res.status(404).json({ msg: "Content not found or not authorized to delete" });
  }

  return res.json({ msg: "Content successfully deleted" });
});


app.post("/user/share", userMiddleware, async (req: Request, res: Response): Promise<any> => {
  const { share } = req.body;

  const userid = req.userId;

  try {
    if (share) {
      const exisitinglink = await Link.findOne({ userId: userid });

      if (exisitinglink) {
        return res.status(200).json({ msg: "Link already shared", hash: exisitinglink.hash });
      }

      const hash = random(10);
      await Link.create({ userId: userid, hash });

      return res.status(201).json({ msg: "Link is shared", hash });
    } else {
      await Link.deleteOne({ userId: userid });
      return res.status(200).json({ msg: "Share link removed" });
    }
  } catch (err) {
    console.error("Error in /user/share:", err);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

app.get("/chek-auth",async(req:Request,res:Response):Promise<any>=>{
  const token=localStorage.getItem("user");
  if(token){
    return res.json({
      token
    })
  }else{
    return res.json({
      msg:"Please Login"
    })
  }
})

app.get("/user/share/:sharelink",async(req:Request,res:Response):Promise<any>=>{
  const sharelink=req.params.sharelink;
   if (!sharelink) {
    return res.status(400).json({ msg: "Provide the Sharelink" });
  }
  const linkDoc = await Link.findOne({ hash: sharelink });
  if (!linkDoc) {
    return res.status(404).json({ msg: "Invalid Share Link" });
  }
  const content = await Content.find({ userId: linkDoc.userId })

  return res.status(200).json({ content });
})

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


const storage=multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'./uploads')
  },
  filename:(req,file,cb)=>{
    cb(null,`${Date.now()}-${file.originalname}`);
  }
})

const upload=multer({
  storage,
  fileFilter:(req,file,cb)=>{
    const ext=path.extname(file.originalname);
    if(ext!=='.pdf') return cb(new Error("Only PDF are allowed"))
    cb(null,true)
  }
})

app.post("/user/upload/pdf", userMiddleware, upload.single('pdf'), async (req: Request, res: Response) => {
  const url = process.env.FILE_URL;
  try {
    const fileUrl = `${url}${req.file?.filename}`;
    const newPdf = new Content({
      title: req.body.title,
      fileUrl,
      type: req.body.type,
      //@ts-ignore
      userId: req.userId,
    });
    const saved = await newPdf.save();
    res.status(201).json({
      fileUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to upload PDF' });
  }
})
const PORT=process.env.PORT ;

app.listen(PORT, () => {
  console.log("Server running at " + PORT);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in environment variables.");
    process.exit(1);
  }
  mongoose.connect(dbUrl)
    .then(() => {
      console.log("Mongoose Successfully Connected");
    })
    .catch((err) => {
      console.log(err);
    });
});
