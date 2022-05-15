require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const saltRounds = Number(process.env.SALT_ROUNDS);
const session = require('express-session');
const passport = require("passport");
const passportLocal = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
// app.set('trust proxy', 1);

app.use(session({
   secret: "somerandomeSecret",
   resave: false,
   saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

///////////////// connect mongoose to mongodb ///////////////
// Database Name
const databaseName = "userDB";
mongoose.connect("mongodb://localhost:27017/"+databaseName, {useNewUrlParser: true});

//user table schema created with mongoose
const userSchema = new mongoose.Schema({
	email: String,
	password: String
});

userSchema.plugin(passportLocalMongoose);

//model for user schema
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
	res.render("home");
});

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
});

app.get("/secrets", function(req, res){
    // console.log(req.isAuthenticated());
	if(req.isAuthenticated()){
		res.render("secrets");
	} else {
		res.redirect("/login");
	}
});

app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/"); 
});

// register post route - New User Registration
app.post("/register",(req,res)=>{

    const userEmail = req.body.username;
    const userPassword = req.body.password;
    User.register({username: userEmail},userPassword,(err,user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets");
            });
        }
    });
});

//login
app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


app.listen(process.env.PORT || 3000,()=>{
    console.log("Server is Up and Running.");
});
