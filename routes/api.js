
var express = require('express');
var router = express.Router();

var Goal = require('../models/goal');
var User = require('../models/user');

/* if no user, redirect to dashboard */
router.use(function (req, res, next) {
    if (!req.session.user)
        res.redirect('/')
    else
        next();
});

///////////////
//  GOAL ROUTES //
//////////////

/* ADD A NEW GOAL */
router.post('/goal/add-new', function(req, res, next){

    console.log(req.body);

    let title = req.body.title;
    let info = req.body.info;
    let private = req.body.private ? true : false;
    let entry_fee = (req.body.entry_fee == '') ? 0 : ( Number(req.body.entry_fee) ) ? Number(req.body.entry_fee) : 0;

    req.checkBody("title", "You need a title for your goal!").notEmpty();
    req.checkBody("info", "Your goal needs a description!").notEmpty();
    let errors = req.validationErrors();
    if (errors){
        res.render("nado/new-goal", {errors: errors});
    }
    else{
        let subgoals = [];        
        if (req.body.subgoals){
            for (var i = 0; i < req.body.subgoals.length; i += 2) {
                let s = {};
                s.title = req.body.subgoals[i];
                s.consequence = req.body.subgoals[i + 1];
                s.usersCompleted = [];
                subgoals.push(s);
            }
            console.log(subgoals);
        }

        let goal = new Goal({
            title: title,
            info: info,
            users: [req.session.user._id],
            private: private,
            archived: false,
            complete: false,
            entry_fee: entry_fee,
            subgoals: subgoals
        });
        goal.save(function(err, g){
            if (err){
                res.status(500).json({
                    title: "error while saving the goal",
                    err: err
                });
            }
            else {
                User.findById(req.session.user._id, function(err, user){
                    if (err){
                        res.status(500).json({
                            title: "error while finding user",
                            err: err
                        });
                    }
                    user.goals.push(g._id);
                    user.save(function(err){
                        if (err){
                            res.status(500).json({
                                title: "error while adding goal to user",
                                err: err
                            });
                        }
                        else{
                            req.session.user = user
                            console.log("Goal saved successfully");
                            res.redirect('/nado/dashboard');
                        }
                    });
                });
            }
        });
    }
});

/* edit the goal in the db */
router.post('/goal/edit/:GID', function(req, res, next){

    let title = req.body.title;
    let info = req.body.info;
    let private = req.body.private ? true : false;
    let entry_fee = (req.body.entry_fee == '') ? 0 : (Number(req.body.entry_fee)) ? Number(req.body.entry_fee) : 0;

    req.checkBody("title", "You need a title for your goal!").notEmpty();
    req.checkBody("info", "Your goal needs a description!").notEmpty();
    let errors = req.validationErrors();
    if (errors) {
        res.render("nado/new-goal", { errors: errors });
    }
    else {
        let subgoals = [];
        if (req.body.subgoals) {
            for (var i = 0; i < req.body.subgoals.length; i += 2) {
                let s = {};
                s.title = req.body.subgoals[i];
                s.consequence = req.body.subgoals[i + 1];
                subgoals.push(s);
            }
        }

        Goal.findById(req.params.GID, function(err, goal){
            if (err){
                res.status(500).json({
                    title: "error while finding goal",
                    err: err
                });
            }

            goal.title = title;
            goal.info = info;
            goal.private = private;
            goal.entry_fee = entry_fee;
            goal.subgoals = subgoals;

            goal.save(function (err, g) {
                if (err) {
                    res.status(500).json({
                        title: "error while saving the goal",
                        err: err
                    });
                }
                res.redirect("/nado/dashboard");
            });

        });


        
    }

});

/* toggle subgoal completion for current user */
router.post('/goal/subgoal/toggleCompletion', function(req, res, next){
    Goal.findById(req.body.goal, function(err, goal){
        if (err){
            res.status(500).json({
                title: "error while finding the goal",
                err: err
            });
        }
        if (!goal){
            res.status(404).json({
                title: "can't find goal"
            });
        }
        console.log(req.body);
        var subgoalIndex = null;
        for (var i = 0; i < goal.subgoals.length; i++){
            if (goal.subgoals[i]._id == req.body.subgoal){
                subgoalIndex = i;
                break;
            }
        }
        if (subgoalIndex == null){
            res.status(500).json({
                title: "error while finding subgoal"
            });
        }


        if (req.body.complete == 'true'){
            goal.subgoals[subgoalIndex].usersCompleted.push(req.session.user._id);
        }
        else {
            let index = goal.subgoals[subgoalIndex].usersCompleted.indexOf(req.session.user._id);
            if (index != -1){
                goal.subgoals[subgoalIndex].usersCompleted.splice(index, 1);
            }
        }

        goal.save(function (err) {
            if (err) {
                res.status(500).json({
                    title: "error while saving goal",
                    err: err
                });
            }
            res.redirect("/nado/goal/" + goal._id);
        });

    })
});

///////////////
//  USER ROUTES //
//////////////

/* remove goal from user's list */
router.post('/user/remove-goal:UID', function(req, res, next){

    User.findOne({_id: req.session.user._id})
        .populate('goals')
        .exec(function (err, user) {
            if (err) {
                return res.status(500).json({
                    title: "error while populating user goals",
                    err: err
                });
            }
            var foundGoal = false;
            for (var i = 0; i < user.goals.length; i++) {
                if (user.goals[i]._id == req.params.UID) {
                    foundGoal = true;
                    let goal = user.goals[i];
                    user.goals.splice(i, 1);
                    user.goals = user.goals.map(function(a){return a._id});
                    user.save(function (err) {
                        if (err) {
                            return res.status(500).json({
                                title: "error while saving user (deleting goal)",
                                err: err
                            });
                        }

                        if (goal.users.length == 1){
                            Goal.remove({_id: goal._id}, function(err){
                                console.log("removing..");
                                if (err){
                                    return res.status(500).json({
                                        title: "error while finding goal",
                                        err: err
                                    });
                                }
                            });
                        }

                        return res.redirect("/nado/dashboard");

                    });
                }
            }
            if (!foundGoal)
                return res.send('error, user has no element');
        });

});

/** send a friend request to session user */
router.post('/user/send-friend-request', function(req, res, next){
    if (req.session.user.friends.indexOf(req.body.friendId) != -1){
        return res.send("Error: User already added!");
    }
    User.findById(req.body.friendId, function(err, friend){
        if (err){
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!friend){
            return res.status(404).json({
                title: "user not found"
            });
        }
        friend.requests.forEach(function(request){
            if (request.user == req.session.user._id){
                return res.status(500).json({
                    title: "friend request already sent!"
                });
            }
        });
        var newRequest = {
            user: req.session.user._id,
            type: "friend"
        }
        friend.requests.push(newRequest);
        friend.save(function(err){
            if (err){
                return res.status(500).json({
                    title: "error while saving user",
                    err: err
                });
            }
            res.redirect('nado/dashboard/?sentRequest=true');
        });
    });
});

/** undo a friend request previously sent */
router.post('/user/undo-friend-request', function(req, res, next){
    User.findById(req.body.friendId, function(err, friend){
        if (err){
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!friend){
            return res.status(500).json({
                title: "Can't find user"
            });
        }
        let index = 0;
        let userFound = false;
        friend.requests.forEach(function (request) {
            if (request.user == req.session.user._id) {
                userFound = true;
                return;
            }
            index++;
        });
        if (!userFound){
            return randomBytes.status(500).json({
                title: "No friend request was previously sent!"
            });
        }
        friend.requests.splice(index, 1);
        friend.save(function(err){
            if (err){
                res.status(500).json({
                    title: "error while saving user",
                    err: err
                });
            }
            res.redirect("back")
        });
    });
});

/** accept a current friend request */
router.post('/user/accept-friend-request', function(req, res, next){
    console.log(req.body.friendId);
    User.findById(req.body.friendId, function(err, friend){
        console.log(friend);
        if (err){
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!friend){
            return res.status(404).json({
                title: "no user found"
            });
        }
        if (friend.friends.indexOf(req.session.user._id) != -1){
            return res.status(500).json({
                title: "Cannot befriend a user twice!"
            });
        }
        User.findById(req.session.user._id, function(err, user){
            if (err){
                return res.status(500).json({
                    title: "error while updating session user",
                    err: err
                });
            }
            user.friends.push(friend._id);
            for (var i = 0; i < user.requests.length; i++){
                if (user.requests[i].user == req.session.user._id){
                    user.requests.splice(i);
                    break;
                }
            }
            user.save(function(err){
                if (err){
                    return res.status(500).json({
                        title: "error while saving user",
                        err: err
                    });
                }
                friend.friends.push(req.session.user._id);                
                friend.save(function(err){
                    if (err){
                        return res.status(500).json({
                            title: "error while saving friend user",
                            err: err
                        });
                    }
                    res.redirect("back")
                });
            });
        });

    });
});

/** decline a friend request */
router.post('/user/decline-friend-request', function(req, res, next){
    User.findById(req.session.user._id, function (err, user) {
        if (err) {
            return res.status(500).json({
                title: "error while updating session user",
                err: err
            });
        }
        for (var i = 0; i < user.requests.length(); i++) {
            if (user.requests[i].user == req.session.user._id) {
                user.requests.splice(i);
                break;
            }
        }
        user.save(function (err) {
            if (err) {
                return res.status(500).json({
                    title: "error while saving user",
                    err: err
                });
            }
        });
    });
});

module.exports = router;
