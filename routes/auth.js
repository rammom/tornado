var express = require('express');
var router = express.Router();

var expressValidator = require('express-validator');
const bcrypt = require('bcryptjs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

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

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.redirect('/');
});

router.get('/login', function(req, res, next) {
	res.render('auth/login');
});

router.get('/register', function (req, res, next) {
	res.render('auth/register', {errors: null});
});

router.get('/register-confirm', function(res, res, next){
	res.render('auth/register-confirm');
});

/* Receive POST data */
router.post('/login', function (req, res, next) {

	let email = req.body.email;
	let password = req.body.password;

	User.findOne({ email: { $regex: new RegExp("^" + email, "i") }}, function(err, user){
		if (err){
			res.status(500).json({
				title: "error finding user",
				error: err
			});
		}
		if (!user){
			res.status(500).json({
				title: "no user found"
			});
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
			req.session.user.expires = new Date(
				Date.now() + 365 * 24 * 3600 * 1000 // 1 year
			);
			res.status(200).redirect("/nado/dashboard");
		}
		else {
			res.status(401).send("invalid username/password");
		}
	});

});

router.post('/register', function(req, res, next) {

	let firstname = req.body.firstname;
	let lastname = req.body.lastname;
	let email = req.body.email;
	let password = req.body.password;
	let password_verify = req.body.password_verify;

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
		res.render("auth/register", {errors: errors});
	}
	else {
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