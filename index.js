const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'https://blog-express-a0e83.web.app'],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@simplecrud.xgcpsfy.mongodb.net/?retryWrites=true&w=majority&appName=simpleCrud`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const blogsCollection = client.db('blogs-db').collection('blogs');
    const usersCollection = client.db('blogs-db').collection('users');
    const reactionsCollection = client.db('blogs-db').collection('reactions');

    // Blogs-related APIs
    app.get('/blogs', async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const query = search
        ? {
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { content: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;
      const blogs = await blogsCollection.find(query).skip(skip).limit(limit).toArray();
      const total = await blogsCollection.countDocuments(query);
      res.send({ blogs, total });
    });

    app.get('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      if (!result) {
        return res.status(404).send({ message: 'Blog not found' });
      }
      res.send(result);
    });

    app.post('/blogs', async (req, res) => {
      const blogContent = req.body;
      const result = await blogsCollection.insertOne(blogContent);
      res.send(result);
    });

    app.patch('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBlogs = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedBlogs,
      };
      const result = await blogsCollection.updateOne(query, updateDoc, { upsert: true });
      res.send(result);
    });

    app.delete('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    });

    // Users-related APIs
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.status(400).send({ message: 'User already exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const userInfo = req.body;
      const query = { email: email };
      const updateDoc = {
        $set: {
          name: userInfo.name,
          email: userInfo.email,
          profileImage: userInfo.image,
          address: userInfo.address || null,
          phone: userInfo.phone || null,
          dob: userInfo.dob || null,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, { upsert: true });
      res.send(result);
    });

    app.patch('/users/roleUpdate/:email', async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;
      const query = { email: email };
      const updateDoc = {
        $set: { role: role },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.delete('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Reaction APIs can be added similarly if required

    // MongoDB connection
    await client.connect();
    console.log("Connected to MongoDB!");

  } finally {
    // You can optionally close the MongoDB connection here if needed.
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is working nicely!');
});

app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
