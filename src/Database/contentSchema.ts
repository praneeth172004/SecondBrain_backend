import mongoose, { Types } from "mongoose";


const contTypes=['youtube','twitter','pdf','content','image','article']


const contentSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    link:{
        type:String,
        
    },
    type:{
        type:String,
        required:true,
        enum: {
    values: contTypes,
    message: '`{VALUE}` is not a valid content type.'
  }
    },
    content:{
        type:String,
    },
    fileUrl:String,
    uploadedAt:{
        type:Date,
        default:Date.now,
    },
    tags:Array<String>,
    createDate:Date,

    userId:{
        type:Types.ObjectId,
        ref:"User",
        required:true
    }
},{timestamps:true})


const Content = mongoose.model("Content", contentSchema);

export default Content