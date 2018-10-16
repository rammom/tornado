var express = require('express');
var router = express.Router();

var User = require('../models/user');
var Goal = require('../models/goal');

// verify that a user is signed in
router.use(function(req, res, next){
    if (!req.session.user)
        res.redirect("/");
    else
        next();
});

router.get('/', function(req, res, next){
    next();
});

// Load dashboard with user goals and friends
router.get('/dashboard', function(req, res, next){

    // find all current user data
    User.findOne({_id: req.session.user._id})
        .populate('goals')
        .populate('requests.user')
        .populate('friends')
        .exec(function(err, user){
            if (err){
                res.status(500).json({
                    title: "error while populating goals",
                    err: err
                });
            }
            if (!user){
                res.status(404).json({
                    title: "error finding user"
                });
            }

            // Calculate goal completion for all user goals (Why is this happening in the backend!?!?!)
            user.goals.forEach(function(goal){
                goal.subgoalCount = goal.subgoals.length;
                goal.completedSubgoals = 0;
                goal.subgoals.forEach(function(subgoal){
                    if (subgoal.usersCompleted.indexOf(req.session.user._id.toString()) != -1)
                        goal.completedSubgoals++;
                });
            });

            console.log(req.query);
            let data = {user: user}
            // if (req.query.sentRequest)
            //     data.ping = "Friend Request Sent!"
            // if (req.query.acceptedRequest)
            //     data.ping = "Friend added!"

            res.render("nado/dashboard", data);
        });

});

/** create a new goal */
router.get('/new-goal', function(req, res, next) {
    // find user and get requests
    User.findOne({ _id: req.session.user._id })
        .populate('requests.user')
        .exec(function(err, user){
            if (err){
                res.status(500).json({
                    title: "Error while finding authenticated user",
                    err: err
                });
            }
            if (!user){
                res.status(500).json({
                    title: "Can't find authenticated user",
                    err: err
                });
            }
            res.render("nado/new-goal", { user: user, errors: null });            
        });
});
/** render edit goal page */
router.get('/edit-goal/:GID', function(req, res, next){
    
    // find goal by id
    Goal.findById(req.params.GID, function(err, goal){
        if (err) {
            res.status(500).json({
                title: "Error while finding goal",
                err: err
            });
        }
        if (!goal){
            res.status(404).json({
                title: "Can't find specified user"
            });
        }
        // find current user (for nav element) (inefficient.. code needs to be refactored)
        User.findOne({ _id: req.session.user._id })
            .populate('requests.user')
            .exec(function (err, user) {
                if (err) {
                    res.status(500).json({
                        title: "Error while finding authenticated user",
                        err: err
                    });
                }
                if (!user) {
                    res.status(500).json({
                        title: "Can't find authenticated user",
                        err: err
                    });
                }
                res.render('nado/edit-goal', { user: user, goal: goal, errors: null });
            });
    });

});
/* View the goal in more detail, including subgoals */
router.get('/goal/:GID', function(req, res, next){
    // verify current user owns goal
    if (req.session.user.goals.indexOf(req.params.GID) == -1)
        res.send("This isn't your goal! smh");
    // get goal info
    Goal.findById(req.params.GID, function(err, goal){
        if (err){
            res.status(500).json({
                title: "error while finding goal",
                err: err
            });
        }
        if (!goal){
            res.status(401).json({
                title: "no goal found"
            });
        }
        /* Calculate completion for current user */
        goal.subgoals.forEach(function(subgoal){
            if (subgoal.usersCompleted.indexOf(req.session.user._id) != -1)
                subgoal.completed = true;
            else
                subgoal.completed = false;
        });
        // get user data and render page
        User.findOne({ _id: req.session.user._id })
            .populate('requests.user')
            .populate('friends')
            .exec(function (err, user) {
                if (err) {
                    res.status(500).json({
                        title: "Error while finding authenticated user",
                        err: err
                    });
                }
                if (!user) {
                    res.status(500).json({
                        title: "Can't find authenticated user",
                        err: err
                    });
                }
                res.render('nado/view-goal', { user: user, goal: goal });                
            });
    });
});

router.post('/find-friend', function (req, res, next) {
    let firstname = req.body.name.split(' ')[0];
    let lastname = req.body.name.split(' ')[1];
    console.log(firstname);
    console.log(lastname);
    // build query, will find all users with similar firstname(lastname) beginnings
    let query = { firstname: { $regex: new RegExp("^" + firstname, "i") }}
    if (lastname){
        console.log('no last name');
        query.lastname = { $regex: new RegExp("^" + lastname, "i") } 
    }
    // find all users that match
    User.find(query, function (err, users) {
        if (err) {
            return res.status(500).json({
                title: "error while finding users",
                err: err
            });
        }
        let count = 0;
        // itterate through each user, set addable and sentRequest variables
        users.forEach(function(user){
            if (user._id == req.session.user._id || req.session.user.friends.indexOf(user._id.toString()) != -1){
                user.addable = false;
                count++;
            }
            else{
                user.addable = true;
                console.log("addable");
            }
            if (user.requests.indexOf(req.session.user._id) != -1)
                user.sentRequest = true
            else
                user.sentRequest = false
            console.log(user);
        });
        let noUsers = false;
        if (count == users.length)
            noUsers = true;
        // find user and render page
        User.findOne({ _id: req.session.user._id })
            .populate('requests.user')
            .exec(function (err, user) {
                if (err) {
                    return res.status(500).json({
                        title: "Error while finding authenticated user",
                        err: err
                    });
                }
                if (!user) {
                    return res.status(500).json({
                        title: "Can't find authenticated user",
                        err: err
                    });
                }
                res.render('nado/find-friends', { users: users, user: user, noUsers: noUsers });                
            });
    });
});

// render share goal page
router.get('/share-goal/:GID', function(req, res, next){
    if (req.session.user.goals.indexOf(req.params.GID) == -1)
        res.send("This isn't your goal! smh");
    // find goal
    Goal.findById(req.params.GID, function(err, goal){
        if (err){
            res.status(404).json({
                title: "error finding goal",
                err: err
            });
        }
        if (!goal){
            res.status(404).json({
                title: "No goal found!",
                err: err
            });
        }
        // find user and render page
        User.findOne({_id: req.session.user._id})
            .populate('friends')
            .populate('requests.user')        
            .exec(function(err, user){
                if (err) {
                    res.status(404).json({
                        title: "error finding authenticated user",
                        err: err
                    });
                }
                if (!user) {
                    res.status(404).json({
                        title: "Can't find authenticated user",
                        err: err
                    });
                }
                console.log(goal);
                res.render('nado/share-goal', { user: user, goal: goal, errors: null });                
            });

    });
});

module.exports = router;






















