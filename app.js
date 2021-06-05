const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

// Read .env vars
require('dotenv').config();

// Connect MongoDB
(async() => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    console.log(`===> DB Connected to: ${connection.connection.name}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

// Define DB URL Schema
const ShortURLSchema = new mongoose.Schema({
  shortName: { type: String, required: true },
  url: { type: String, required: true },
});

// Define DB URL model
const urls = mongoose.model("URLS", ShortURLSchema);

// Initialize express app
const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'hbs');
app.set('views', './views');

// Define routes

/**
 * @route GET /:id
 * @desc Redirect short url to the saved main url
 */

app.get("/:shortName", async(req, res, next) => {
  const { shortName } = req.params;
  try {
    const url = await urls.findOne({ shortName });
    if (url) {
      return res.redirect(url.url);
    }
    return res.render("404", { url: `${req.protocol}://${req.get('host')}${req.originalUrl}` });
  } catch (err) {
    return res.render("404");
  }
});

/**
 * @route POST /url
 * @desc Create a short url
 */

app.post("/url", async(req, res, next) => {
  let { shortName, url } = req.body;
  try {
    if (!shortName) {
      shortName = nanoid(5);
    } else {
      const existing = await urls.findOne({ shortName });
      if (existing) {
        throw Error('This short name is used. Try another one please!');
      }
    };

    const newURL = new urls({ shortName, url });

    const savedURL = await newURL.save();
    if (!savedURL) {
      throw Error('Can not create url');
    }

    res.render("success", { url: `${req.protocol}://${req.get('host')}/${savedURL.shortName}` });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /
 * @desc Root route
 */

app.get("/", (req, res, next) => {
  res.send("index");
})

// Handle errors
app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.render("error", {
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? '' : error.stack,
  });
});

// 
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`===> Server running at http://localhost:${port}`);
});