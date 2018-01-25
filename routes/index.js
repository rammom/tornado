var express = require('express');
var router = express.Router();

/* if user is logged in, redirect to dashboard */
router.use(function(req, res, next){
	if (req.session.user)
		res.redirect('/nado/dashboard')
	else
		next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('landing');
});

module.exports = router;
