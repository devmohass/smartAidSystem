import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT
app.use(express.json());


app.get('/helth',(req,res)=>{
    res.status(200).json({message:"Server is running"});
});


app.listen(PORT,()=>{
    console.log(`Server is running on this url http://localhost:${PORT}`);
})