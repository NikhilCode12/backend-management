import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import grid from "gridfs-stream";
import cors from "cors";
import path from "path";
import fs from "fs";
import Student from "./model/StudentSchema.js";

const __dirname = path
  .dirname(new URL(import.meta.url).pathname)
  .replace(/^\/([A-Za-z]):/, "$1:");

const app = express();
dotenv.config();
const port = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URL;
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(bodyParser.json());

// Middleware for checking if application number passed
const checkApplicationNumber = (req, res, next) => {
  const { applicationNumber } = req.query;
  if (!applicationNumber) {
    return res.status(400).json({ message: "Application number is required" });
  }
  next();
};

// Multer disk storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { applicationNumber } = req.query;
    const folderPath = path.resolve(__dirname, `files/${applicationNumber}`);
    fs.mkdirSync(folderPath, { recursive: true });
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const { applicationNumber } = req.query;
    const filename = `${file.originalname}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// mongodb connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch((err) => {
    console.log("Error in connecting db", err);
  });

// GFS Storage connection
let gfs;
const conn = mongoose.connection;
conn.once("open", () => {
  gfs = grid(conn.db, mongoose.mongo);
  gfs.collection("files");
});

// Routes

// uploading a file
app.post(
  "/upload",
  checkApplicationNumber,
  upload.single("file"),
  (req, res) => {
    res.send("File uploaded successfully!");
  }
);

// downloading a file
app.get("/download/:applicationNumber/:filename", async (req, res) => {
  try {
    const { applicationNumber, filename } = req.params;
    const filePath = path.resolve(
      __dirname,
      `files/${applicationNumber}/${filename}`
    );
    res.download(filePath, (err) => {
      if (err) {
        res.status(404).json({ message: "File not found" });
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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
