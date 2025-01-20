const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0czr5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    //DBcollections
    const usersCollection = client.db('petsAdoptionDB').collection('users');
    const petsCollection = client.db('petsAdoptionDB').collection('pets');


    //------------------jwt related API-----------------
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' });
        res.send({ token });
    })

    //-----------verify token----------------- 
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }

      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }


    //------Users end points-----------
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email }
      const userAlreadyIn = await usersCollection.findOne(query);
      if (userAlreadyIn) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    })

    //--------pets end points---------
    app.post('/pets', async (req, res) => {
      const newPet = req.body;
      const result = await petsCollection.insertOne(newPet);
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Pet Squad Server is running')
})

app.listen(port, () => {
  console.log(`Pet Squad Server is running : ${port}`)
})