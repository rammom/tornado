/**
 * 
 * 		AUTHORIZATION FUNCTIONS
 * 		- render auth related pages
 * 		- login, register and logout user
 * 
 */


var express = require('express');
var router = express.Router();

var expressValidator = require('express-validator');
const bcrypt = require('bcryptjs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

/** Logout user if currently logged in */
router.get('/logout', function (req, res, next) {
	if (req.session.user) {
		req.session.destroy();
		console.log('logged out.');
		res.render('landing');
	}
	else {
		res.redirect('/');
	}
});

/* redirect to dashboard if already logged in */
router.use(function(req, res, next){
	if (req.session.user)
		res.redirect('/nado/dashboard');
	else
		next();
});

/** redirection to avoid 404 */
router.get('/', function(req, res, next) {
	res.redirect('/');
});

/****************/
/* RENDER PAGES */
/****************/

router.get('/login', function(req, res, next) {
	res.render('auth/login', {errors: null});
});

router.get('/register', function (req, res, next) {
	res.render('auth/register', {errors: null});
});

router.get('/register-confirm', function(res, res, next){
	res.render('auth/register-confirm');
});

/****************/
/*   AUTH API   */
/****************/

/* Attempt to login user */
router.post('/login', function (req, res, next) {

	let email = req.body.email;
	let password = req.body.password;

	// find email in db (ignoring case)
	User.findOne({ email: { $regex: new RegExp("^" + email, "i") }}, function(err, user){
		if (err){
			return res.status(500).json({
				title: "error finding user",
				error: err
			});
		}
		if (!user){
			// no email found
			return res.status(401).render("auth/login", { errors: [{ msg: "Invalid Credentials" }] });			
		}
		// if passwords match
		if (bcrypt.compareSync(password, user.password)){
			// req.session.user = {
			// 	id: user._id,
			// 	email: user.email.toLowerCase(),
			// 	firstname: user.firstname,
			// 	lastname: user.lastname,
			// 	goals: user.goals,
			// 	friends: user.friends,
			// 	requests: user.requests
			// }
			req.session.user = user;

			// keep user logged in for a year while session stored
			req.session.user.expires = new Date(
				Date.now() + 365 * 24 * 3600 * 1000 // 1 year
			);
			res.status(200).redirect("/nado/dashboard");
		}
		else {
			// bad password
			res.status(401).render("auth/login", {errors: [{msg: "Invalid Credentials"}]});
		}
	});

});

/* Register new user */
router.post('/register', function(req, res, next) {

	// get user data from request
	let firstname = req.body.firstname;
	let lastname = req.body.lastname;
	let email = req.body.email;
	let password = req.body.password;
	let password_verify = req.body.password_verify;

	// validate data
	req.checkBody("firstname", "Please tell us your first name").notEmpty();
	req.checkBody("lastname", "Please tell us your first name").notEmpty();
	req.checkBody("email", "Please provide us with an email").notEmpty();
	/** check for valid email address here !!!!*/
	//req.checkBody("email", "Not a valid email");
	req.checkBody("password", "Please enter a password").notEmpty();
	req.checkBody("password_verify", "Please verify your password").notEmpty();
	req.checkBody("password", "Passwords don't match").equals(password_verify);

	let errors = req.validationErrors();
	if (errors) {
		console.log(errors);
		// send validation errors back to client
		res.render("auth/register", {errors: errors});
	}
	else {
		// create and save new user
		var user = new User({
			firstname: firstname,
			lastname: lastname,
			email: email,
			password: bcrypt.hashSync(password, 10),
			goals: [],
			friends: [],
			requests: []
		});
		user.save(function(err){
			console.log("saving...");
			if (err) {
				return res.status(500).json({
					title: "can't save user",
					error: err
				})
			}
			else
				res.redirect("/auth/register-confirm");
		});
	}

});


module.exports = router;