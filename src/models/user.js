const mongoose=require("mongoose");

const userschema= new mongoose.Schema({

    githubId:{
        type:String,
        unique:true,
        required:true,
    },
    username:{
        type:String,
        required:true,
    },
    avatarUrl:{
        type:String,
    },
    totalScore:{
        type:Number,
        default:0,
    },
    prCount:{
        type:Number,
        default:0,
    },
    lastScoreAt:{
        type:Date,
        default:null,
    },
    role:{
        type:String,
        enum:["user","admin"],
        default:"user",
    },
    status:{
        type:String,
        enum:["active","banned"],
        default:"active",
    },
    strikes:{
        type:Number,
        default:0,
    },
    falseReportCount:{
        type:Number,
        default:0,
    },
    accessToken:{
        type:String,
        select:false,
    }
    },
    { timestamps: true }
)

userschema.index({ totalScore: -1, lastScoreAt: 1 });

const usermodel=mongoose.model("User",userschema);

module.exports=usermodel;