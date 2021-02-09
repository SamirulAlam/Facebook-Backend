import express from "express";
import mongoose from "mongoose";
import Cors from "cors";
import Pusher from "pusher";
import dotenv from 'dotenv';
dotenv.config();

//app config
const app = express();
const port = process.env.Port || 8080;
const secret = process.env.SECRET_KEY;
const pusher = new Pusher({
    appId: "1153372",
    key: "130aedb385bdf9737af2",
    secret: secret,
    cluster: "ap2",
    useTLS: true
  });

//middleware
app.use(express.json());
app.use(Cors());
//db config
const password = process.env.PASSWORD;
const connection_url =`mongodb+srv://admin:${password}@cluster0.bad5a.mongodb.net/<dbname>?retryWrites=true&w=majority`;
mongoose.connect(connection_url,{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology:true,
});

mongoose.connection.once("open",()=>{
    console.log("DB Connected");
});


//api
app.get("/",(req,res) => {res.status(200).send("instagram")});

//listener
app.listen(port,()=>console.log(`listening to port ${port}`));