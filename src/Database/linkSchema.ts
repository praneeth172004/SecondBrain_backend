import mongoose from "mongoose";
import { Schema } from "zod";

const LinkSchema=new mongoose.Schema({
    hash:String,
    userId:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true
    }
})

const Link=mongoose.model("Link",LinkSchema);

export default Link;