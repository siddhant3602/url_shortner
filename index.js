  import express from 'express';
  import session from 'express-session';
  import mongoose  from 'mongoose';
  import bcrypt from 'bcrypt';
  import connectDb from './connection/index.js';
  import cookieParser from "cookie-parser";


  const app = express();
  const PORT = 3000;



  //connect
  connectDb("mongodb://127.0.0.1:27017/shortner");

  //middleware 
  app.use(express.urlencoded({extended:false}));
  app.use(cookieParser());


  // Configure sessions
 app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false , maxAge:  60 * 60 * 1000 } // 24 hours
}));


  //models
  const  userSchema =new mongoose.Schema(
      {
        firstName: {
          type:String,
          required:true,
        },
        lastName:{
          type:String,
          required:true,
        },
        job:{
          type:String,
          required:true,
        },
        email:{
          type:String,
          required:true,
          // unique:true,
        },
        password:{
          type:String,
          required:true,
          select:false,
        },
        isDeleted: {
        type: Boolean,
        default: false,
      },
        deletedAt: {
        type: Date,
        default: null,
      },
      },
      {
          timestamps:true
      }
  );
  userSchema.index(
    { email: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
  );
  userSchema.pre("save", async function () {
    try {
      if (!this.isModified("password")) return;

      this.password = await bcrypt.hash(this.password, 10);
    } catch (err) {
      throw err; // mongoose will catch this
    }
  });
userSchema.pre(/^find/, function () {
  this.where({
    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } }
    ]
  });
});

  userSchema.methods.comparePass=async function (enteredPass)
  {
  return bcrypt.compare(enteredPass,this.password);
  }

  const User =mongoose.model("user",userSchema);

  //set ejs
  app.set("view engine", "ejs");
  app.set("views", "./views");

  
  //routes
  app.get("/users", async (req,res) =>{
    const user=await User.find({});
    return res.status(200).json(user);
  });
  
  app.get("/users/:id", async (req,res)=>{
    const user = await User.findById(req.params.id);

  return res.status(200).json(user);
  });

  app.post("/users", async (req, res) => {
    console.log(req.cookie);
    try {
      const user=await User.create(req.body);
      return res.status(201).json({ message: "User created" ,user});
    } catch (err) {
      console.log(err);
      if (err.code === 11000) {
        return res.status(400).json({ message: "Email already exists" });
      }

      if (err.name === "ValidationError") {
        return res.status(400).json({ message: err.message });
      }

      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/users/:id", async (req,res)=>{
    
  try{
    const user = await User.findById(req.params.id);
    if(!user)
    {
      return res.status(404).json({message:"User not found"});
    }
    const allowedUpdates = ["firstName", "lastName", "job", "email", "password"];

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });

    await user.save();
    res.status(200).json({message : "User updated",user});

  }
  catch(err)
  {
    res.status(500).json({message : "Server error"});
  }

  });

  app.delete("/users/:id", async (req,res)=>{
  try{
    const user = await User.findByIdAndUpdate(req.params.id,{
      isDeleted:true,
      deletedAt: new Date(),
    },{new:true});
    if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    res.status(200).json({message: "User soft deleted"});

  }catch(err)
  {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server error" });
    
  }
});

  app.get("/login", (req, res) => {
  res.render("login");
  });
  app.post("/login", async (req,res)=>{
    const {email,password}=req.body;

    if(!email || !password)
    {
      return res.status(400).json({message:"missing email or pass"});
    }
   
    const user=await User.findOne({ email }).select("+password");   
   
    
    
    if(!user)
    {
      return res.status(401).json({message:"email not registered"})
    }
    
    const isMatch= await user.comparePass(password);
    if(!isMatch)
    { 
      return res.status(401).json({ message: "invalid credentials" });
    }
    req.session.user = {
    id: user._id,
    email: user.email
    };
    return res.status(200).json({message:"login success"})
  })


  app.get("/profile", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.session.user);
});
app.get("/logout", async (req,res)=>{
  res.render("logout");
})
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});




























  app.listen(PORT ,console.log(`Server Started At port : ${PORT}`));
