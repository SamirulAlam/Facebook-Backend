import express from "express";
import mongoose from "mongoose";
import Cors from "cors";
import Pusher from "pusher";
import multer from "multer";
import GridFsStorage from "multer-gridfs-storage"
import Grid from "gridfs-stream"
import bodyParser from "body-parser"
import path from "path"
import mongoPost from "./dbModel.js"
import dotenv from 'dotenv';
dotenv.config();

Grid.mongo=mongoose.mongo

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
app.use(bodyParser.json());
app.use(Cors());
//db config
const password = process.env.PASSWORD;
const connection_url =`mongodb+srv://admin:${password}@cluster0.bad5a.mongodb.net/<dbname>?retryWrites=true&w=majority`;

const conn=mongoose.createConnection(connection_url,{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology:true,
})
mongoose.connect(connection_url,{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology:true,
});


mongoose.connection.once("open",()=>{
    console.log("DB Connected");

    const changeStream=mongoose.connection.collection("posts").watch();
    changeStream.on("change",(change)=>{
        console.log(change);
        if(change.operationType==="insert"){
            console.log("Triggering Pusher")
            pusher.trigger("posts","inserted",{
                change:change
            })
        }else{
            console.log("Error triggering Pusher")
        }
    })
});

let gfs;
conn.once("open",()=>{
    console.log("DB Connected")
    gfs=Grid(conn.db, mongoose.mongo);
    gfs.collection("images")
})

const storage=new GridFsStorage({
    url: connection_url,
    file:(req,file)=>{
        return new Promise((resolve,reject) =>{
            const filename=`image-${Date.now()}${path.extname(file.originalname)}`
            const fileInfo={
                filename: filename,
                bucketName:"images"
            }
            resolve(fileInfo);
        })
    }
})

const upload =multer({storage})


//api
app.get("/",(req,res) => {res.status(200).send("facebook")});
app.post("/upload/image",upload.single("file"),(req,res) => {
    res.status(201).send(req.file);
})
app.post("/upload/post",(req,res)=>{
    const dbPost = req.body

    mongoPost.create(dbPost,(err, data)=>{
        if(err) {
            res.status(500).send(err)
        }else {
            res.status(201).send(data)
        }
    })
})

app.get("/retrieve/posts",(req,res) => {
    mongoPost.find((err, data)=>{
        if(err) {
            res.status(500).send(err)
        }else {
            data.sort((b,a)=>{
                return a.timestamp - b.timestamp
            })

            res.status(200).send(data)
        }
    })
})

app.get('/retrieve/images/single',(req,res)=>{
    gfs.files.findOne({filename:req.query.name}, (err,file)=>{
        if(err) {
            res.status(500).send(err)
        }else {
            if(!file || !file.length===0){
                res.status(404).json({err:"file not found"})
            }else{
                const readstream = gfs.createReadStream(file.filename);
                readstream.pipe(res)
            }
        }
    })
})
//listener
app.listen(port,()=>console.log(`listening to port ${port}`));