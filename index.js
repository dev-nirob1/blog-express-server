const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(express.json())
app.use(cors(corsOptions))


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

    const blogsCollection = client.db('blogs-db').collection('blogs')
    const usersCollection = client.db('blogs-db').collection('users')
    const reactionsCollection = client.db('blogs-db').collection('reactions')

    //blogs related api's

    app.get('/blogs', async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);

      let result;
      if (page && limit) {
        const skip = (page - 1) * limit
        result = await blogsCollection.find().skip(skip).limit(limit).toArray()
      }

      else {
        result = await blogsCollection.find().toArray()
      }
      res.send(result)
    })

    app.get('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query)
      res.send(result)
    })

    app.post('/blogs', async (req, res) => {
      const blogContent = req.body
      const result = await blogsCollection.insertOne(blogContent)
      res.send(result)
    })

    app.patch('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBlogs = req.body;
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: {}
      }
      const result = await blogsCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    app.delete('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await blogsCollection.deleteOne(query)
      res.send(result)
    })

    //users related api's1

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user?.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.status(400).send({ message: 'User already exists' });
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const userInfo = req.body;
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          name: userInfo.name,
          email: userInfo.email,
          profileImage: userInfo.image,
          address: userInfo.address || null,
          phone: userInfo.phone || null,
          dob: userInfo.dob || null,
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    app.patch('/users/roleUpdate/:email', async (req, res) => {
      const email = req.params.email;
      const { role } = req.body
      const query = { email: email }

      const updateDoc = {
        $set: {
          role: role
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // app.patch('/user/author/:email', async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email }
    //   const options = { upsert: true }
    //   const updateDoc = {
    //     $set: {
    //       role: 'author'
    //     }
    //   }
    //   const result = await usersCollection.updateOne(query, updateDoc)
    //   res.send(result)
    // })

    app.delete('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })




    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('working nicely')
})
app.listen(port, () => {
  console.log(`app is running on port ${port}`)
})
