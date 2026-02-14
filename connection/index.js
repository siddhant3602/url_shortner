import mongoose from 'mongoose';


export default async function connectDb(url){
    try{
        await mongoose.connect(url);
        console.log("Database connected ...");
    }
    catch(err){
     console.error("MongoDB connection failed:", err.message);
     process.exit(1);
    }
}