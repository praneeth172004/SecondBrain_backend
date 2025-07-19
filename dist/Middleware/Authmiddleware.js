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
exports.userMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //    const header = req.headers["authorization"];
    //    console.log("header",header);
    //    if (!header) {
    //     return res.status(401).json({ message: "Authorization header missing" });
    //   }
    //   const parts = header.split(" ");
    //   if (parts.length !== 2 || parts[0] !== "Bearer") {
    //     return res
    //       .status(401)
    //       .json({ message: "Authorization header must be in the format: Bearer <token>" });
    //   }
    //   const token = authHeader.split(" ")[1];
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "default_secret");
        console.log(decoded);
        if (decoded) {
            req.userId = decoded.userId;
            next();
        }
        else {
            return res.status(401).json({ message: "Unauthorized User" });
        }
    }
    catch (err) {
        console.log("no token");
        return res.json({
            msg: "not token provided"
        });
    }
});
exports.userMiddleware = userMiddleware;
