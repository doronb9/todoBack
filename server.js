require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
const server = http.createServer(app);
const io = new Server(server, {
   cors: { origin: "*" },
});
io.listen(3300);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

io.on("connection", (socket) => {
   console.log("Client connected:", socket.id);

   // Disconnect event
   socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
   });
   socket.on("taskCreated", (task) => {
      console.log("Task added:", task);
      io.emit("taskCreated", task);
   });
   socket.on("taskUpdated", (task) => {
      console.log("Task added:", task);
      io.emit("taskUpdated", task);
   });
   socket.on("taskDeleted", (task) => {
      console.log("taskDeleted:", task);
      io.emit("taskDeleted", task);
   });
   socket.on("taskBeenEdit", (task) => {
      console.log("taskBeenEdit:", task);
      io.emit("taskBeenEdit", task);
   });
});

const taskSchema = new mongoose.Schema({
   title: String,
   id: String,
   isDone: Boolean,
   isEditing: Boolean,
   isDeleted: Boolean,
});

const Task = mongoose.model("Task", taskSchema);

app.get("/tasks", async (req, res) => {
   try {
      const tasks = await Task.find({isDeleted: false});
      res.json(tasks);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.post("/tasks", async (req, res) => {
   try {
      const task = req.body;
      task.isDone = false;
      task.isEditing = false;
      task.isDeleted = false;
      const newTask = new Task(task);
      await newTask.save();
      res.status(201).json(newTask);
      io.emit("taskCreated", newTask);
   } catch (err) {
      res.status(400).json({ error: err.message });
   }
});

app.post("/tasks/:id/delete", async (req, res) => {
   try {
      const task = req.body;
      task.isDeleted = true;
      await Task.findByIdAndUpdate(task._id, task);
      res.status(204).send();
      io.emit("taskDeleted", task);
   } catch (err) {
      res.status(400).json({ error: err.message });
   }
});

app.put("/tasks", async (req, res) => {
   try {
      req.body.isEditing = false;
      const updatedTask = await Task.findByIdAndUpdate(req.body._id, req.body);
      if (!updatedTask) return res.status(404).json({ error: "Task not found" });
      res.json(updatedTask);
      io.emit("taskUpdated", req.body);
   } catch (err) {
      res.status(400).json({ error: err.message });
   }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
