const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    const adoptPetsCollection = client.db('petsAdoptionDB').collection('adoptPets');


    //------------------jwt API-----------------
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

    //------------verify admin ---------//
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }


    //------Users end points-----------
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email }
      const userAlreadyIn = await usersCollection.findOne(query);
      if (userAlreadyIn) {
        return res.send(userAlreadyIn)
      }
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    })

    //--------pets end points---------
    app.get('/pets', async (req, res) => {
      // return res.status(401).send({ message: 'unauthorized access' });
      const cursor = petsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/pets/myPets', async (req, res) => {
      const email = req.query.email;
      const query = {ownerEmail: email}
      const cursor = petsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/pets/isNotAdopted', async (req, res) => {
      const { sort = "date and time" } = req.query;
      const  filter = {adopted: "false"};
      const cursor = petsCollection.find(filter).sort({ [sort]: -1 });
      const result = await cursor.toArray();
      res.send(result);
    })


    app.get('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petsCollection.findOne(query);
      res.send(result);
    })

    app.post('/pets', async (req, res) => {
      const petData = req.body;
      const result = await petsCollection.insertOne(petData);
      res.send(result);
    })

    app.patch('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) }
      const updatedPet = {
        $set: {
          image: data.image,
          name: data.name,
          age: data.age,
          category: data.category,
          location: data.location,
          shortDescription: data.shortDescription,
          longDescription: data.longDescription
        }
      }
      const result = await petsCollection.updateOne(filter, updatedPet);
      res.send(result);
    })

    app.delete('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petsCollection.deleteOne(query);
      res.send(result);
    })

    //----------adoption---------
    app.post('/adoption', async (req, res) => {
      const adoptData = req.body;
      const result = await adoptPetsCollection.insertOne(adoptData);
      res.send(result);
    })

    app.get('/adoption/request', async(req, res) =>{
      const email = req.query.email;
      const query = {ownerEmail: email};
      let result =  adoptPetsCollection.find(query);
      result = await result.toArray()
      res.send(result)
     
    })

    app.get('/adoption/myRequest', async(req, res) =>{
      const email = req.query.email;
      const query = {adopterEmail: email};
      let result =  adoptPetsCollection.find(query);
      result = await result.toArray()
      res.send(result)
     
    })

    app.put('/adoption/update/:id', async (req, res) => {
     const id = req.params.id;
     const command = req.body.command;
    //  console.log("i am in", command)
      if(command === "accept"){
        const adoptionQuery = {_id: new ObjectId(id)}
        const adoptionRequest = await adoptPetsCollection.findOne(adoptionQuery);
        const {petId, adopterEmail} = adoptionRequest;
        // console.log(adoptionRequest);
        const filter = {_id: new ObjectId(petId)}
        const deleteFilter = {petId}
        const updatePetsData = {
          $set: {
            adopted: 'true',
            ownerEmail: adopterEmail,
        }}
        const result = await petsCollection.updateOne(filter, updatePetsData);
        // console.log(result);
        const deleteAdoption = await adoptPetsCollection.deleteMany(deleteFilter);
      res.send(deleteAdoption);
      }else{
        const adoptionQuery = {_id: new ObjectId(id)}
        const deleteRequest = await adoptPetsCollection.deleteOne(adoptionQuery);
        res.send(deleteRequest);
      }
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