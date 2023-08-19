const express = require("express");
const app = express();
const cors = require("cors");

const nodemailer = require("nodemailer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

const corsConfig = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors());
app.options("", cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("welcome");
});

const uri =
  "mongodb+srv://loginNode:vvWCSK4GdG0vOr1Q@cluster0.78xjoll.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
});

const usersCollection = client.db("loginDB").collection("users");
const postsCollection = client.db("loginDB").collection("posts");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    app.post("/signup", async (req, res) => {
      const { name, email, password } = req.body;
      const user = { name, email, password };

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const loggedUser = await usersCollection.findOne({
        email: email,
        password: password,
      });
      if (loggedUser) {
        res.json({ status: "OK" });
      } else {
        res.json({ status: "Invalid username or password" });
      }
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/reset", async (req, res) => {
      const { email } = req.body;

      try {
        const userFinding = await usersCollection.findOne({ email: email });

        if (!userFinding) {
          return res.status(404).json({ message: "User not found" });
        }

        const url = `https://login-server-six.vercel.app/reset/${userFinding?._id}`;
        console.log(url);

        var transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "sharmintonni000@gmail.com",
            pass: "dljwkqhvtprbdfzv",
          },
        });

        var mailOptions = {
          from: "sharmintonni000@gmail.com",
          to: userFinding?.email,
          subject: "Reset your password",
          text: url,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
            return res.status(500).json({ message: "Email sending failed" });
          } else {
            console.log("Email sent: " + info.response);

            // Forward the userFinding response to your frontend
            res.json({ message: "Email sent successfully" });
          }
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/reset/:id", async (req, res) => {
      const { id } = req.params;
      //   console.log(id, token);

      const userFinding = await usersCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!userFinding) {
        return res.status(404).json({ message: "User not found" });
      }

      res.send(
        '<form method="POST" action=""><input type="password" name="password" placeholder="Enter new password"><button type="submit">Reset Password</button></form>'
      );
    });

    app.post("/reset/:id", async (req, res) => {
      const { id } = req.params;
      const { password } = req.body;
      const userFinding = await usersCollection.findOne({
        _id: new ObjectId(id),
      });
      console.log(userFinding);
      if (!userFinding) {
        return res.status(404).json({ message: "User not found" });
      }
      //   const secret = token + userFinding.password;
      try {
        // const verify = jwt.verify(token, secret);
        // const encryptedPassword = await bcrypt.hash(password, 10);
        await usersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              password: password,
            },
          }
        );

        res.send({ status: "password updated" });
      } catch (error) {
        res.send({ status: "password cannot be updated" });
      }
    });

    app.post("/posts", async (req, res) => {
      const { text } = req.body;
      const post = {
        text,
        likes: 0,
        comments: [],
      };
      const result = await postsCollection.insertOne(post);
      res.send(result);
    });
    app.put("/post/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { text } = req.body;
      const updatedPost = {
        $set: {
          text: text,
        },
      };

      const result = await postsCollection.updateOne(query, updatedPost);
      res.send(result);
    });

    app.delete("/post/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/post/:id/like", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.updateOne(query, {
        $inc: { likes: 1 },
      });
      res.send(result);
    });

    app.put("/post/:id/comment", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { comment } = req.body;
      const result = await postsCollection.updateOne(query, {
        $push: { comments: comment },
      });
      res.send(result);
    });

    app.get("/allposts", async (req, res) => {
      const result = await postsCollection.find().toArray();
      res.send(result);
    });

    app.get("/singlepost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
