import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Student from "./model/StudentSchema.js";

const app = express();
dotenv.config();
const port = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URL;

app.use(cors());

app.use(bodyParser.json());

// mongodb connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch((err) => {
    console.log("Error in connecting db", err);
  });

// Routes

// saving student data on db
app.post("/submit-form", async (req, res) => {
  const data = req.body;
  const newData = new Student(data);
  try {
    await newData.save();
    res.status(201).json({ message: "Student data submitted successfully!" });
  } catch (err) {
    res.status(400).json("Error in submitting data: ", err.message);
  }
});

// retrieving student data by application number
app.get("/student", async (req, res) => {
  const { applicationNumber } = req.query;
  try {
    const student = await Student.findOne({
      applicationNumber: applicationNumber,
    });
    if (student) return res.status(200).json(student);
    else res.status(400).json({ message: "Student not found" });
  } catch (err) {
    res.status(400).json("Error in fetching student data: ", err.message);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});
