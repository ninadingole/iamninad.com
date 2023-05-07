---
title: Rest Web Service Using Express Js
excerpt: 'In this post, we will be using expressjs to create REST web services. We will also learn about what is ExpressJS, its features, and as we…'
date: 2018-03-07
draft: false
## If your image is within the project start the url with `./src/images/`
postImage: https://source.unsplash.com/vw3Ahg4x1tY/920x460
postImageCredits: Greg Rakozy | https://unsplash.com/@grakozy
postImageSource: Unsplash | https://unsplash.com
tags:
  - REST
  - expressjs
  - nodejs
  - javascript
  - api
---

In this post, we will be using expressjs to create REST web services. We will also learn about what is ExpressJS, its features, and as we progress in the post we will build a rest based library app that will allow us to perform CRUD functionality using ExpressJS.

**RESTful** web services are everywhere. Many of you might have heard of this name in your current project and if not it might happen your next project will need you to build some Rest based web services. From Banking and Financial applications to social networking sites, IOT devices, gaming, the mobile development you name it REST is everywhere. And it's because of the vast popularity of REST older application based on the SOAP is also getting converted to REST. But what is REST and why do we require it?.

REST is **"Representational State Transfer"**, big name but let me break it down for you in simple terms. Over internet when two systems need to interface with each other they need some form/language to communicate, REST is that medium which enables transferring of data between two remote systems. REST is based on HTTP protocol and hence supports all the HTTP verbs like GET, POST, PUT, DELETE, PATH etc. We also have SOAP &amp; WSDL web services which are still used in many places but they are old and creepy. SOAP is based on XML format and is slow whereas with REST get the freedom to use formats like text, XML or JSON. REST takes the advantage of HTTP protocol because of which it is more faster and with json format which is faster to parse and compact as compared to XML.

Express JS is a javascript web framework that allows to easily build web apps and rest web services. It is built on top of nodejs HTTP server and with nodejs event loop architecture it gets its benefits. It is most widely used framework in the javascript community and many other web frameworks are built using ExpressJS.

## Setup

To setup express project you need to install nodejs &amp; npm first. You can download the installers(I work on a windows machine) from nodejs [site](https://nodejs.org/en/download/). Create a new folder and execute the commands in your command line.

```bash
> npm init
> npm install --save express body-parser mongoose
```

`npm init` will ask you some question, use Enter key to skip the questions if you want. It will create `package.json` file in your folder this file is required by npm. The second command will add express, body parser and mongoose packages. We need body parser to parse and format json data for request-response messages and we are going to use MongoDB for this project so we need mongoose package to connect to MongoDB. Please also install MongoDB database on your local machine.

## Hello World

Let's create our first basic setup for expressjs. We will write a program that will print `Hello World` when accessed from the browser. Create `app.js` file inside your folder with below code.

```javascript
var express = require('express');
var app = new express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('App listening on port 3000!');
});
```

Now open a terminal in your current project directory and run `node app.js` this will start the express app on port 3000. Open your browser and go to [http://localhost:3000/](http://localhost:3000/) you will see `Hello World`. It's a very basic code what we've written, it just returns the same static message for all request. If you see the message on your browser and there is no error shown in terminal it means you are good to proceed.

## Handling Post Request

What we've seen in the previous example is a basic GET request. We want to handle data that is sent from the client in form of json, a GET request can also send data to application, however, there is limitation to the amount of data so in such cases a POST request is used which sends data from the client in the body of POST request.

```javascript
var express = require('express');
var bodyParser = require('body-parser');

var app = new express();
app.use(bodyParser.urlencoded({
extended: true
}));
app.use(bodyParser.json());

app.post("/hello",function(req, res){
res.json({"message": "Hello "+req.body.name+" welcome to Express Tutorial"});
})
...
```

You can create a post route by using`app.post()` method, from the above example any `POST` request that made has been made by the client at `/` with name parameter in the body will return the welcome message along with the name. The arguments to the `get()` and `post()` methods if you have noticed is a path and a function, the path denotes that whenever any request is made for the given path the action should be handled by the function which is passed. The function is a callback with two arguments `Request` and `Response`. You can read more about the object methods and parameters at Express documentation.

We have registered a middleware `app.use(bodyParser.json())` of body-parser that converts the request and response into json. For accessing data of any post request you need to use `req.body` json object and to access any parameters of a GET URL you need to use `req.params` json object we will see how to use it further sections of the post.

### Defining Mongo Schema

For this tutorial, we are using MongoDB to store library data. Mongoose plugin helps us to work with MongoDB in nodejs. Mongoose is a straightforward schema-based approach to model the application. It includes features like query building, typecasting, validation, business logic hooks. To work with MongoDB collections you need to define a schema, as in our case it will be a Book which we will store in the collection. Let's create a Book Schema and store it in a separate folder `models` in our project structure.

```javascript
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var bookModel = new Schema({
  title: {
    type: String,
  },
  author: {
    type: String,
  },
  genre: {
    type: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Book', bookModel);
```

The schema definition is very simple for this tutorial. We are going to store information regarding a book like a title, author, genre and a property which will indicate if the book is read. We are not going to include any mongoose validation in this as we want to keep the things simple. Will dive deeper into mongoose in some other separate post.

As our schema is ready now we need some way to insert books into the collection and for this, we will add a new route that saves book information to the DB.

```javascript
... previous code here
var mongoose = require('mongoose');
var db;

var db = mongoose.connect("mongodb://localhost:27017/libraryApp",{
useMongoClient: true
});
... previous code here
var Book = require('./models/bookModel');

app.post("/addbook",function(req, res){
var book = new Book(req.body);
book.save(function(err){
if(err){
console.log(err);
res.status(500);
res.send(err);
}
});
res.status(201).json(book);
});
```

As you would see from above code for connecting to MongoDB we need to import `mongoose` package to our code and we do it using `require`. To connect to the DB mongoose has the `.connect()` method that takes in connection URL and configuration json options as parameters. As our DB is locally deployed we use the local URL and port. The `useMongoClient` is new, it tells the initialization logic that the connection mode is a client. Older mongoose version prior to 4.11.0 didn't have this option. So, if you are upgrading your mongoose library to a newer version then you will get an error if you try to connect to mongo without this option.

The new post route `/addbook` handles post requests, inside the callback function we create a new Book instance passing `req.body` to the constructor, as we have registered body-parser middleware the request body get's automatically converted to json object this new instance is called a Document which then can be saved or retrieved from the DB. However, for Book Schema to be available in our program we need to import our `Book` schema from the `model` package. Once we create a Book instance there are various static helper methods available for a Model like `save`, `update`, `remove`, `find` you can find more about those in Mongoose Documentation. After we have the instance available we call the `save` method which will store the book information to DB.

The helper method is of pattern `callback(error, results)`. Results depend upon the operation like `find`, `findOne`, `count` which returns value from the DB. For our above route, we are saving the data, we are not going to have any return value so it's just a callback which will return error object in case of any error that might happen while storing the document to mongo. We check if there is an error and return `500` status code and if everything works perfectly we will return back the same Book object as a response. Storing data to MongoDB will have some more properties added to the json object like `_id`<em>(unique key)</em> and `ver`.

If we run the program now and do a post request we will be able to save the book information to the DB. You need to have some REST client utility for testing. I use Restless Client extension of my chrome browser, you can also download it from chrome web store or you can use any other client utility for testing.

## Handling GET Request

Our POST route handles the insertion of data to our MongoDB. We need two more routes, one which will show all the books as an array and another to show individual book by its id. It might happen in a real-world application that you will not display all the details right on a single page. Take for an example of my blog, on the home page you won't see the entire blog contents, you would see some excerpt and the title but when you click on the title you are taking to a new page where you would see the entire contents, comments section etc.

```javascript
app.get('/books', function (req, res) {
  Book.find({}, function (err, books) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(books);
    }
  });
});
app.get('/book/:id', function (req, res) {
  Book.findById(req.params.id, function (err, book) {
    if (err) {
      res.status(500).send(err);
    } else if (book) {
      res.json(book);
    } else {
      res.status(404).send('Book Not Found.');
    }
  });
});
```

Our route `/books` finds all the books from `Book` model using `find({condition},{callback})` method that takes condition object like a where clause. In our case, we want to retrieve all the books so we are passing an empty object and it will return all the books to our callback. If there is an issue while getting the data the route will return status code `500` with an error message or else it will return the books object as json.

Another route `/book/:id` finds the book with the given id. For a single record from MongoDB, we use `findById` which returns the single object matching the condition.

## Handling PUT Request

Our POST and GET routes handle insertion and retrieval of book information. We now need a new route that will handle requests for updating book details. For this we will use the same route URL `/book/:id` however the update will be handled using HTTP PUT verb. The flow very is simple, first, we will find the book by its `id` which will arrive as a part of `req.params` in our request URL. Mongoose `findById` method returns document by `id` as we have seen in the previous code sample, once we get the book from DB will update the information with contents of the body. And at last a call to `save` method will update the details back to our MongoDB.

```javascript
app.put('/book/:id', function (req, res) {
  Book.findById(req.params.id, function (err, book) {
    if (err) {
      res.status(500).send(err);
    } else if (book) {
      book.title = req.body.title;
      book.genre = req.body.genre;
      book.author = req.body.author;
      book.read = req.body.read;

      book.save(function (err) {
        if (err) {
          res.status(500);
          res.send(err);
        } else {
          res.json(book);
        }
      });
    } else {
      res.status(404).send('Book Not Found.');
    }
  });
});
```

## Handling DELETE Request

At last, we are left with delete functionality in our library App. We want to delete the book from our MongoDB so based on `id` which is the unique key for our document we find it as we have done previously using `findById` method and then mongoose model has a `remove({callback})` method that removes the document. We will utilize the same route address `/book/:id` with DELETE verb. So whenever a delete request is made by the client on this URL our delete functionality will get invoked.

```javascript
app.delete('/book/:id', function (req, res) {
  Book.findById(req.params.id, function (err, book) {
    if (err) {
      res.status(500).send(err);
    } else if (book) {
      book.remove(function (err) {
        res.status(200).json('Book Removed.');
      });
    } else {
      res.status(404).send('No Book Found.');
    }
  });
});
```

## Chaining Verbs

The last three routes get, update and delete are bound to same route URL however the different HTTP methods handle the updating and deleting logic. Express allows us to chain such common routes. Let's change our code for DELETE, PUT and GET to chained to a common route `/book/:id`.

```javascript
app
  .route('/books/:id')
  .get(function (req, res) {
    Book.findById(req.params.id, function (err, book) {
      if (err) {
        res.status(500).send(err);
      } else if (book) {
        res.json(book);
      } else {
        res.status(404).send('Book Not Found.');
      }
    });
  })
  .put(function (req, res) {
    Book.findById(req.params.id, function (err, book) {
      if (err) {
        res.status(500).send(err);
      } else if (book) {
        book.title = req.body.title;
        book.genre = req.body.genre;
        book.author = req.body.author;
        book.read = req.body.read;

        book.save(function (err) {
          if (err) {
            res.status(500);
            res.send(err);
          } else {
            res.json(book);
          }
        });
      } else {
        res.status(404).send('Book Not Found.');
      }
    });
  })
  .delete(function (req, res) {
    Book.findById(req.params.id, function (err, book) {
      if (err) {
        res.status(500).send(err);
      } else if (book) {
        book.remove(function (err) {
          if (err) {
            res.status(500).send(err);
          } else {
            res.status(200).send('Removed');
          }
        });
      } else {
        res.status(404).send('Book Not Found.');
      }
    });
  });
```

Have you observed in our above code that whenever we need to get, update or delete the book we first need to find the book object from our mongo collection? Its kind of code repetition we are doing which finds the book and if there's an error returns 500 error or if we don't find the book it returns 404. This is where Express middleware functions come into the picture.

## Middleware Functions

Express Middleware functions are the functions that have access to the request object, response object and the next middleware function in application's request-response cycle. Middleware functions allow you to run the code, modify the request-response object, end the request-response cycle or call the next middleware function in the chain. The next function when called passes the control to the next middleware function in the chain. If the current middleware function does not end the request-response cycle then it must call the `next()` otherwise the request will be left hanging.

There are different types of middleware function that an Express App can have:

- Application-level middleware-Router-level middleware
- Error-level middleware
- Built-in middleware
- Third-party middleware

The `body-parser` which we used in our application is a type of third-party middleware. If you want to log all the request-response of an application you can write your own application-level middleware.

Let's write an application-level middleware that will handle our code repetition.

```javascript
app.use('/book/:id', function (req, res, next) {
  Book.findById(req.params.id, function (err, book) {
    if (err) {
      res.status(500).send(err);
    } else if (book) {
      req.book = book;
      next();
    } else {
      res.status(404).send('Book Not Found');
    }
  });
});
```

This middleware is an application level easiest way to identify is to look for `app.use(...)` it indicates the middleware is registered at the app level. We no longer have to find the book in every method of our routes, we should change our code as below.

```javascript
app
  .route('/books/:id')
  .get(function (req, res) {
    res.json(book);
  })
  .put(function (req, res) {
    req.book.title = req.body.title;
    req.book.genre = req.body.genre;
    req.book.author = req.body.author;
    req.book.read = req.body.read;

    book.save(function (err) {
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        res.json(book);
      }
    });
  })
  .delete(function (req, res) {
    book.remove(function (err) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send('Removed');
      }
    });
  });
```

## Code Cleanup

All the functionality we have written up till now is within one file. For a small application like this it would be no issue but as we add more and more functionality to our application it becomes a bit cumbersome to manage everything in one file.

We need to modularize our code by separating things into different files and packages. We have done it for model's but our routing logic and everything else is still contained within our `app.js` file. In this section will try to divide our code into two parts all the database related functionality which is needed for the routes will go into controller's and all the routing logic like creating get, post, put request routes will go into routers.

### Controllers

We will put all our DB related code into a new javascript file into controller package. Create a new folder in your project and name it `controllers` also create a new file `bookController.js` and use the below code.

```javascript
var bookController = function (Book) {
  var filterBook = function (req, res, next) {
    Book.findById(req.params.id, function (err, book) {
      if (err) {
        res.status(500).send(err);
      } else if (book) {
        req.book = book;
        next();
      } else {
        res.status(404).send('No Book Found.');
      }
    });
  };
  var bookById = function (req, res) {
    res.json(req.book);
  };

  var post = function (req, res) {
    var book = new Book(req.body);
    if (!book.title) {
      res.status(400).send('Title is Required.');
    } else {
      book.save();
      res.status(201).json(book);
    }
  };

  var get = function (req, res) {
    Book.find({}, function (err, books) {
      if (err) {
        res.status(500).send(err);
      } else if (books) {
        res.status(200).json(books);
      } else {
        res.status(200).send('No Books Found.');
      }
    });
  };

  var update = function (req, res) {
    req.book.title = res.body.title;
    req.book.genre = res.body.genre;
    req.book.author = res.body.author;
    req.book.read = res.body.read;

    req.book.save(function (err) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json(req.book);
      }
    });
  };

  var remove = function (req, res) {
    req.book.remove(function (err) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send('Book deleted.');
      }
    });
  };

  return {
    post: post,
    get: get,
    bookById: bookById,
    remove: remove,
    update: update,
    filterBook: filterBook,
  };
};

module.exports = bookController;
```

Our controller is basically an object that exposes methods like get, post, update. It takes `Book` schema as an argument which is passed from the router.

### Routers

Routing in Express refers to the endpoint of the application and how they respond to requests. For making our app.js connect to our controller we extract all the routing logic from the app.js to our new file bookRouter.js in routes folder.

```javascript
var express = require('express');
var mongoose = require('mongoose');

var router = function (Book) {
  var bookRouter = express.Router();
  var bookController = require('../controllers/bookController.js')(Book);

  bookRouter.route('/').get(bookController.get).post(bookController.post);

  bookRouter.use('/:id', bookController.filterBook);

  bookRouter
    .route('/:id')
    .get(bookController.bookById)
    .put(bookController.update)
    .delete(bookController.remove);

  return bookRouter;
};
module.exports = router;
```

It's  pretty straightforward, we create a new router using `express.Router` also we need our controller to bind to so we import it using require passing the same Book schema which we receive as an argument to the router. The reason behind injecting the Book schema is that it makes the module more easy to test, we can inject a mock Book schema from unit test case and test the router. We bind the get all books and post functionality to the `/` root of our route and any additional request for an individual book like the update, delete, view on `/:id` route. If you see `router.use()` in above that means this is a router-level middleware it's the same middleware which was previously application level but now route-level.

### Final app.js

The only final changes that are remaning for our application to work is the app.js file. We need to import our route and register.

```javascript
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var db;

var db = mongoose.connect('mongodb://localhost:27017/libraryApp', {
  useMongoClient: true,
});

var app = new express();
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

var Book = require('./models/bookModel');
var bookRouter = require('./routes/bookRoutes')(Book);

app.use('/api/books', bookRouter);

app.get('/', function (req, res) {
  res.send('Hello, Welcome to library rest API.');
});

app.listen(process.env.PORT || 3000, function () {
  console.log('App listening on port 3000!');
});
```

## Explore more:

Looking for developing Express API using Typescript? You could read more about on <a href="https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-1" target="_blank">Toptal's Blog</a> By <a href="https://www.toptal.com/resume/marcos-henrique-da-silva" target="_blank">Marcos Henrique da Silva</a></p>

<!--kg-card-end: html-->
