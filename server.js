import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import grid from "gridfs-stream";
import { GridFSBucket } from "mongodb";
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

const allowedOrigins = [
  "http://localhost:3000",
  "https://msit-management.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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
const storage = multer.memoryStorage();

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
let bucket;
const conn = mongoose.connection;
conn.once("open", () => {
  gfs = grid(conn.db, mongoose.mongo);
  bucket = new GridFSBucket(conn.db, { bucketName: "files" });
});

// Routes

// uploading a file
app.post(
  "/upload",
  checkApplicationNumber,
  upload.array("files"),
  async (req, res) => {
    const { applicationNumber } = req.query;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    try {
      const student = await Student.findOne({ applicationNumber });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      req.files.forEach((file) => {
        const readableFile = new mongoose.mongo.GridFSBucket(conn.db, {
          bucketName: "files",
        }).openUploadStream(`${applicationNumber}-${file.originalname}`, {
          metadata: { applicationNumber },
        });
        readableFile.end(file.buffer);

        switch (file.fieldname) {
          case "registrationForm":
            student.registrationForm = readableFile.id;
            break;
          case "admitCard":
            student.admitCard = readableFile.id;
            break;
          case "categoryCertificate":
            student.categoryCertificate = readableFile.id;
            break;
          case "marksheet10":
            student.marksheet_10 = readableFile.id;
            break;
          case "marksheet12":
            student.marksheet_12 = readableFile.id;
            break;
          case "diplomaCertificate":
            student.diploma_certificate = readableFile.id;
            break;
          case "paymentReceipt":
            student.paymentReceipt = readableFile.id;
            break;
          case "candidateSignature":
            student.candidateSignature = readableFile.id;
            break;
          case "parentSignature":
            student.parentSignature = readableFile.id;
            break;
          case "passportPhoto":
            student.passportPhoto = readableFile.id;
            break;
        }
      });

      await student.save();

      res.status(201).json({
        message: "Files uploaded successfully",
        files: req.files,
      });
    } catch (err) {
      res.status(500).json({ message: "Error uploading files", error: err });
    }
  }
);

// downloading a file
app.get("/download/:applicationNumber/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const downloadStream = bucket.openDownloadStreamByName(filename);

    downloadStream.on("error", () => {
      res.status(404).json({ message: "File not found" });
    });

    downloadStream.pipe(res);
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
