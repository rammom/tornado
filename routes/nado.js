var express = require('express');
var router = express.Router();

var User = require('../models/user');
var Goal = require('../models/goal');

/* This is user verification, uncomment for production */
router.use(function(req, res, next){
    if (!req.session.user)
        res.redirect("/");
    else
        next();
});

router.get('/', function(req, res, next){
    next();
});

router.get('/dashboard', function(req, res, next){

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
            if (req.query.sentRequest)
                data.ping = "Friend Request Sent!"
            if (req.query.acceptedRequest)
                data.ping = "Friend added!"

            res.render("nado/dashboard", data);
        });

});

router.get('/new-goal', function(req, res, next) {
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
router.get('/edit-goal/:GID', function(req, res, next){
    
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
    if (req.session.user.goals.indexOf(req.params.GID) == -1)
        res.send("This isn't your goal! smh");
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
        /* personalize the goal object for current user */
        goal.subgoals.forEach(function(subgoal){
            if (subgoal.usersCompleted.indexOf(req.session.user._id) != -1)
                subgoal.completed = true;
            else
                subgoal.completed = false;
        });
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
    let query = { firstname: { $regex: new RegExp("^" + firstname, "i") }}
    if (lastname){
        console.log('no last name');
        query.lastname = { $regex: new RegExp("^" + lastname, "i") } 
    }
    User.find(query, function (err, users) {
        if (err) {
            return res.status(500).json({
                title: "error while finding users",
                err: err
            });
        }
        let count = 0;
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

router.get('/share-goal/:GID', function(req, res, next){
    if (req.session.user.goals.indexOf(req.params.GID) == -1)
        res.send("This isn't your goal! smh");

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
                res.render('nado/share-goal', { user: user, goal: goal, errors: null });                
            });

    });
});

module.exports = router;






















