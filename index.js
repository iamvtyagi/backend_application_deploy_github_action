import express from 'express'

const app = express();

app.get('/',(req,res)=>{
     res.send("hello sirrrr");
})

app.listen(8080 , ()=>{
     console.log("hello from server sir ")
})