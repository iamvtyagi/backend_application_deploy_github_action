import express from 'express'

const app = express();

app.get('/',(req,res)=>{
     res.send("hello i am vansh tyagi , i am a software developer");
})

app.listen(8080 , ()=>{
     console.log("hello from server sir ")
})