//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require("path");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Ini rahasia banget",
    resave: false, 
    saveUninitialized: false
})); 

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ facebookId: profile.id }, (err, user) => {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

//google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }
));
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect secrets
    res.redirect('/secrets');
});

//facebook
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

//cookies
app.get('/secrets', (req, res) => {
    if(req.isAuthenticated()) {
        res.render('secrets');
    } else {
        res.redirect('/login');
    }
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})

app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post((req, res) => {
        // register {username: <username yg di input>}, <password yg diinput>
        User.register({username: req.body.username}, req.body.password, (err, user) => {
            if(err) {
                // Kalau gagal, log errornya dan redirect ke halaman yg sama
                console.log(err);
                // res.redirect('/register');
            } else {
                // Generates a function that is used in Passport's LocalStrategy
                // Setelah berhasil mendaftar, redirect ke secrets.
                passport.authenticate("local")(req, res, () => {
                    res.redirect('/secrets');
                });
            };
        });
        
    });

       


app.route("/login")    
    .get((req, res) => {
        res.render("login");
    })

    .post((req, res) => {
        const user = new User ({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, (err) => {
            if (err) { 
                return console.log(err); 
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets")
                })
            }
            
        })
    });



app.listen(3000, () => {
    console.log("Menghubungkan ke localhost:3000")
})