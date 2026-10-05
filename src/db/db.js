const mongoose=require("mongoose");

async function connectdb(){
    try{
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("database connected successfully");
    }
    catch (error) {
        console.log('database connection error:', error.message);
        process.exit(1);
    }
}

module.exports=connectdb;