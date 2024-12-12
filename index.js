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
  methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
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

      const query = {
        approved: true,
        ...(search
          ? {
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { content: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } },
            ],
          }
          : {})
      }
      const skip = (page - 1) * limit;
      const blogs = await blogsCollection.find(query).sort({ approvedAt: -1 }).skip(skip).limit(limit).toArray();
      const total = await blogsCollection.countDocuments(query);
      res.send({ blogs, total });
    });

    //get blogs filterd by category

    app.get('/blogs/:category', async (req, res) => {
      const category = req.params.category;
      const query = { category: category, approved: true }
      const result = await blogsCollection.find(query).sort({ approvedAt: -1 }).toArray()
      res.send(result)
    })

    // blogs for pagination in dashboard
    app.get('/dashboard/blogs', async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;

      const result = await blogsCollection
        .find()
        .sort({ postAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalBlogs = await blogsCollection.countDocuments();
      res.send({ totalBlogs, result });
    });



    //get recent blogs
    app.get('/recentBlogs', async (req, res) => {
      const result = await blogsCollection.find({ approved: true }).sort({ approvedAt: -1 }).limit(5).toArray();
      res.send(result);
    });

    // get editors picked blogs 
    app.get('/editorsPick', async (req, res) => {
      const result = await blogsCollection.find({ editorsPick: true, approved: true }).sort({ approvedAt: -1 }).limit(5).toArray()
      res.send(result)
    })

    //get blogs for specific authors by email
    app.get('/blogs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'author.email': email, approved: true }
      const result = await blogsCollection.find(query).sort({ approvedAt: -1 }).toArray();
      res.send(result)
    })

    //get blogs for specific authors by email for dashboard
    app.get('/blogs/dashboard/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'author.email': email }
      const result = await blogsCollection.find(query).sort({ postAt: -1 }).toArray();
      res.send(result)
    })

    //get single blogs by id
    app.get('/blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      if (!result) {
        return res.status(404).send({ message: 'Blog not found' });
      }
      res.send(result);
    });

    //get radom blogs 
    app.get('/random-blogs', async (req, res) => {
      const randomBlogs = await blogsCollection.aggregate([
        { $match: { status: "approved" } },
        { $sample: { size: 5 } }
      ]).toArray();
      res.send(randomBlogs);
    });

    //post blogs
    app.post('/blogs', async (req, res) => {
      const blogContent = req.body;
      const result = await blogsCollection.insertOne(blogContent);
      res.send(result);
    });

    //update blogs status to approve
    app.patch('/blog/approve/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          approved: true,
          approvedAt: new Date(),
          denied: false,
          status: 'approved'
        }
      }
      const result = await blogsCollection.updateOne(query, updateDoc, { upsert: true })
      res.send(result)
    })

    //update blogs status to deny
    app.patch('/blog/deny/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          denied: true,
          approved: false,
          status: 'denied'
        }
      }
      const result = await blogsCollection.updateOne(query, updateDoc, { upsert: true })
      res.send(result)
    })

    // pick or remove from editors pick blog (dashboad)
    app.patch('/blogs/editorsPick/:id', async (req, res) => {
      const id = req.params.id;
      const { editorsPick } = req.body;
      console.log(editorsPick)
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          editorsPick: editorsPick
        }
      }
      const result = await blogsCollection.updateOne(query, updateDoc, { upsert: true })
      res.send(result)
    })


    // update blog 
    app.patch('/updateBlog/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBlogs = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedBlogs,
      };
      const result = await blogsCollection.updateOne(query, updateDoc, { upsert: true });
      res.send(result);
    });

    //delete a blog
    app.delete('/blog/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    });

    // ----------------------------------------------------------------------

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

    app.patch('/user/updateInfo/:email', async (req, res) => {
      const email = req.params.email;
      const userInfo = req.body;
      console.log(userInfo.name, email, { email: email })

      const query = { email: email };
      // console.log(email, userInfo, query)
      const updateDoc = {
        $set: {
          name: userInfo.name,
          address: userInfo.address || null,
          phone: userInfo.phone || null,
          dob: userInfo.dob || null,
          bio: userInfo.bio || '',
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

    //overall states for admin
    app.get('/admin-stats', async (req, res) => {

      const [userStats, blogStats] = await Promise.all([
        usersCollection.aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 }
            }
          }
        ]).toArray(),
        blogsCollection.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ]).toArray()
      ]);

      const totalAdmin = userStats.find(stat => stat._id === 'admin')?.count || 0;
      const totalAuthor = userStats.find(stat => stat._id === 'author')?.count || 0;
      const users = totalAdmin + totalAuthor;

      const totalPendingBlogs = blogStats.find(stat => stat._id === 'pending')?.count || 0;
      const totalApprovedBlogs = blogStats.find(stat => stat._id === 'approved')?.count || 0;
      const totalDeniedBlogs = blogStats.find(stat => stat._id === 'denied')?.count || 0;
      const blogs = totalPendingBlogs + totalApprovedBlogs + totalDeniedBlogs; // Total blogs

      res.status(200).send({
        users,
        blogs,
        totalAdmin,
        totalAuthor,
        totalPendingBlogs,
        totalApprovedBlogs,
        totalDeniedBlogs
      });
    });

    //authors stats
    app.get('/author-stats/:email', async (req, res) => {
      const { email } = req.params;

      const blogStats = await blogsCollection.aggregate([
        {
          $match: { authorEmail: email }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const totalBlogs = blogStats.reduce((sum, stat) => sum + stat.count, 0);

      const totalPendingBlogs = blogStats.find(stat => stat._id === 'pending')?.count || 0;
      const totalApprovedBlogs = blogStats.find(stat => stat._id === 'approved')?.count || 0;
      const totalDeniedBlogs = blogStats.find(stat => stat._id === 'denied')?.count || 0;

      res.status(200).send({
        totalBlogs,
        totalPendingBlogs,
        totalApprovedBlogs,
        totalDeniedBlogs
      });

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
