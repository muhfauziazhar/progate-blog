var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mysql = require("mysql");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("./models/users");
require("dotenv").config();

// Router
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
const blogsRouter = require("./routes/blogs");

var app = express();

// Database
const con = mysql.createPool({
  connectionLimit: 10,
  host: process.env.host_db,
  user: process.env.username_db,
  password: process.env.password_db,
  database: process.env.database_db,
});

con.on("connection", function (connection) {
  console.log("DB Connected");

  connection.on("error", function (err) {
    console.error(new Date(), "MySQL error", err.code);
  });
  connection.on("close", function (err) {
    console.error(new Date(), "MySQL close", err);
  });
});

// store the con inside the req
app.use((req, res, next) => {
  req.con = con;
  next();
});

//Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// passport config
passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne(con, { username: username }, (err, rows) => {
      const user = rows[0];
      if (!user) {
        // Handle if user is not found
        return done(null, false);
      }
      if (user.password === password) {
        return done(null, user);
      } else {
        // Handle if password does not match
        return done(null, false);
      }
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.client_ID,
      clientSecret: process.env.client_Secret,
      callbackURL:
        "https://enigmatic-plains-45184.herokuapp.com/users/facebook-login/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      process.nextTick(function () {
        return done(null, profile);
      });
    }
  )
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/blogs", blogsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
