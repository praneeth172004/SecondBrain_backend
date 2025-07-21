import { log } from "console";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken"


export const userMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
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
console.log(authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  console.log(process.env.JWT_SECRET);
  
  const token = authHeader.split(" ")[1];
   try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || "default_secret");
      console.log(decoded);

      
      if (decoded) {

         req.userId = (decoded as JwtPayload).userId;
         next();
      } else {
         
         return res.status(401).json({ message: "Unauthorized User" });
      }
   } catch (err) {
      console.log("no token");
      return res.json({
         msg: "not token provided"
      })
   }
};