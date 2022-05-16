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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

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
	password: String,
  googleId: String,
  facebookId: String,
  name: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//model for user schema
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
	done(null, user.id);
});

passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		done(err, user);
	});
});

//setting up OAuth2.0 Strategy for Google login
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
	userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id, username: profile.name.givenName }, function (err, user) {
      return cb(err, user);
    });
  }
));

//setting up OAuth2.0 Strategy for Facebook Login
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    //i added conditional statement for facebook name
    User.findOrCreate({ facebookId: profile.id, name: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
	res.render("home");
});

//for google endpoints login
app.get("/auth/google",
  //now lets initiate authentication with google using passport
  passport.authenticate('google', {scope: ["profile"] })
);
//for google callback login
app.get("/auth/google/secrets",
	passport.authenticate('google', { failureRedirect: "/login" }),
	function(req, res) {
		//Successful authentication, then redirect user to 'app.get(/secrets)' to check again if the user is authenticated or redirect the user back to login page.
		res.redirect("/secrets");
	});

  //for facebook endpoints
  app.get("/auth/facebook",
    //now lets initiate authentication with facebook using passport
    passport.authenticate('facebook')
  );

  //for facebook callback
  app.get("/auth/facebook/secrets",
    passport.authenticate('facebook', { failureRedirect: "/login" }),
    function(req, res) {
      //Successful authentication, then redirect user to 'app.get(/secrets)' to check again if the user is authenticated or redirect the user back to login page.
  		res.redirect('/secrets');
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
