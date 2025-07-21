
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
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  userId: string;
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log("Auth Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not defined in environment variables!");
    return res.status(500).json({ message: "Server config error" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    console.log("Decoded token:", decoded);

    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
