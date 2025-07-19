import mongoose from "mongoose";
import { string } from "zod";


const PdfSchema=new mongoose.Schema({
    title:String,
    fileUrl:String,
    uploadedAt:{
        type:Date,
        default:Date.now,
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
})

export default mongoose.model("PDF",PdfSchema)