"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userSchema_1 = __importDefault(require("./Database/userSchema"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const contentSchema_1 = __importDefault(require("./Database/contentSchema"));
const Authmiddleware_1 = require("./Middleware/Authmiddleware");
const cors_1 = __importDefault(require("cors"));
const linkSchema_1 = __importDefault(require("./Database/linkSchema"));
const utils_1 = require("./utils");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use('/uploads', express_1.default.static('uploads'));
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.post('/user/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, email } = req.body;
        if (!username)
            return res.status(400).json({ msg: "Please enter a username" });
        if (!password)
            return res.status(400).json({ msg: "Please enter a password" });
        if (!email)
            return res.status(400).json({ msg: "Please enter an email" });
        const existingUser = yield userSchema_1.default.findOne({ username });
        console.log(existingUser);
        if (existingUser)
            return res.status(400).json({ msg: "User already exists" });
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const newUser = yield userSchema_1.default.create({ email, username, password: hashedPassword });
        return res.status(201).json({ msg: "Successfully signed up", userId: newUser._id });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
app.post("/user/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        if (!username)
            return res.status(400).json({ msg: "Please enter a username" });
        if (!password)
            return res.status(400).json({ msg: "Please enter a password" });
        const existingUser = yield userSchema_1.default.findOne({ username });
        if (!existingUser) {
            return res.status(404).json({ msg: "User not found" });
        }
        else {
            const isMatch = yield bcrypt_1.default.compare(password, existingUser.password);
            if (!isMatch) {
                return res.status(401).json({ msg: "Invalid credentials" });
            }
            const token = jsonwebtoken_1.default.sign({ userId: existingUser._id }, "default_secret", { expiresIn: "1h" });
            return res.status(200).json({ msg: "Login successful", token });
        }
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
app.get("/user/details", Authmiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.userId;
    console.log(id);
    try {
        if (!id) {
            return res.json({
                msg: "No id"
            });
        }
        const user = yield userSchema_1.default.findOne({ _id: id }).select("-password");
        return res.json({ user });
    }
    catch (err) {
        return res.status(500).json({ msg: "Error fetching user data" });
    }
}));
app.post("/user/addcontent", Authmiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, link, type, content, tags } = req.body;
    yield contentSchema_1.default.create({
        link,
        title,
        type,
        content,
        userId: req.userId,
        tags
    });
    return res.status(201).json({ msg: "Content added" });
}));
app.get("/user/content", Authmiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const content = yield contentSchema_1.default.find({ userId: userId }).populate("userId", "username");
    return res.json({
        content
    });
}));
app.delete("/user/content", Authmiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const parseResult = req.query;
    if (!userId) {
        return res.status(401).json({ msg: "User ID not found" });
    }
    const contentId = parseResult.id;
    const data = yield contentSchema_1.default.findOneAndDelete({ _id: contentId, userId });
    if (!data) {
        return res.status(404).json({ msg: "Content not found or not authorized to delete" });
    }
    return res.json({ msg: "Content successfully deleted" });
}));
app.post("/user/share", Authmiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { share } = req.body;
    const userid = req.userId;
    try {
        if (share) {
            const exisitinglink = yield linkSchema_1.default.findOne({ userId: userid });
            if (exisitinglink) {
                return res.status(200).json({ msg: "Link already shared", hash: exisitinglink.hash });
            }
            const hash = (0, utils_1.random)(10);
            yield linkSchema_1.default.create({ userId: userid, hash });
            return res.status(201).json({ msg: "Link is shared", hash });
        }
        else {
            yield linkSchema_1.default.deleteOne({ userId: userid });
            return res.status(200).json({ msg: "Share link removed" });
        }
    }
    catch (err) {
        console.error("Error in /user/share:", err);
        return res.status(500).json({ msg: "Internal server error" });
    }
}));
app.get("/user/share/:sharelink", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sharelink = req.params.sharelink;
    if (!sharelink) {
        return res.status(400).json({ msg: "Provide the Sharelink" });
    }
    const linkDoc = yield linkSchema_1.default.findOne({ hash: sharelink });
    if (!linkDoc) {
        return res.status(404).json({ msg: "Invalid Share Link" });
    }
    const content = yield contentSchema_1.default.find({ userId: linkDoc.userId });
    return res.status(200).json({ content });
}));
const uploadDir = path_1.default.join(__dirname, 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        if (ext !== '.pdf')
            return cb(new Error("Only PDF are allowed"));
        cb(null, true);
    }
});
app.post("/user/upload/pdf", Authmiddleware_1.userMiddleware, upload.single('pdf'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const fileUrl = `http://localhost:2000/uploads/${(_a = req.file) === null || _a === void 0 ? void 0 : _a.filename}`;
        const newPdf = new contentSchema_1.default({
            title: req.body.title,
            fileUrl,
            type: req.body.type,
            //@ts-ignore
            userId: req.userId,
        });
        const saved = yield newPdf.save();
        res.status(201).json({
            fileUrl
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Failed to upload PDF' });
    }
}));
app.listen(2000, () => {
    console.log("Server running at " + 2000);
    mongoose_1.default.connect("mongodb+srv://sunnypraneeth3119:311977@cluster0.1dh2i2b.mongodb.net/secondbrain")
        .then(() => {
        console.log("Mongoose Successfully Connected");
    })
        .catch((err) => {
        console.log(err);
    });
});
