/**
 * 
 *      API
 *      - CRUD goals and subgoals
 *      - User operations (CRUD, add/remove friends)
 *      - Sharing goals with other users
 * 
 */


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
        // send validation errors back to client
        res.render("nado/new-goal", {errors: errors});
    }
    else{
        // collect subgoals from request
        let subgoals = [];        
        if (req.body.subgoals){
            console.log("SUBGOALS:");
            console.log(req.body.subgoals);
            for (var i = 0; i < req.body.subgoals.length; i += 1) {
                let s = {};
                s.title = req.body.subgoals[i];
                s.consequence = req.body.subgoals[i + 1];
                s.usersCompleted = [];
                subgoals.push(s);
            }
            console.log(subgoals);
        }

        // create goal
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
                // add new goal to current user
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
        // send validation errors back to client
        res.render("nado/new-goal", { errors: errors });
    }
    else {
        // collect subgoals from request
        let subgoals = [];
        if (req.body.subgoals) {
            for (var i = 0; i < req.body.subgoals.length; i += 1) {
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

            // replace old goal data with new
            goal.title = title;
            goal.info = info;
            goal.private = private;
            goal.entry_fee = entry_fee;
            goal.subgoals = subgoals;

            goal.save(function (err, g) {
                if (err) {
                    return res.status(500).json({
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
        var subgoal_index = null;

        // find corresponding subgoal
        for (var i = 0; i < goal.subgoals.length; i++){
            if (goal.subgoals[i]._id == req.body.subgoal){
                subgoal_index = i;
                break;
            }
        }
        if (subgoal_index == null){
            res.status(500).json({
                title: "error while finding subgoal"
            });
        }

        // if toggled to completed
        if (req.body.complete == 'true'){
            goal.subgoals[subgoal_index].usersCompleted.push(req.session.user._id);
        }
        // otherwise, remove user from usersCompleted
        else {
            let index = goal.subgoals[subgoal_index].usersCompleted.indexOf(req.session.user._id);
            if (index != -1){
                goal.subgoals[subgoal_index].usersCompleted.splice(index, 1);
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
            var found_goal = false;
            // look for corresponding goal
            for (var i = 0; i < user.goals.length; i++) { 
                if (user.goals[i]._id == req.params.UID) { 
                    found_goal = true;
                    let goal = user.goals[i];
                    // remove goal from list of goals
                    user.goals.splice(i, 1);
                    // map list of goals back to _ids
                    user.goals = user.goals.map(function(a){return a._id});
                    user.save(function (err) {
                        if (err) {
                            return res.status(500).json({
                                title: "error while saving user (deleting goal)",
                                err: err
                            });
                        }

                        // remove goal if no users are linked to it
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
            if (!found_goal)
                return res.send('error, user has no element');
        });

});

/** send a friend request to session user */
router.post('/user/send-friend-request', function(req, res, next){
    // check if already friends (UI should not allow for this)
    if (req.session.user.friends.indexOf(req.body.friendId) != -1){
        return res.send("Error: User already added!");
    }
    // find friend by _id
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
        // check if a request has already been sent (UI should not allow for this)
        friend.requests.forEach(function(request){
            if (request.user == req.session.user._id){
                return res.status(500).json({
                    title: "friend request already sent!"
                });
            }
        });
        var new_request = {
            user: req.session.user._id,
            type: "friend"
        }
        // 'send' the request
        friend.requests.push(new_request);
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
        let user_found = false;
        // find current user's request in friends list of requests
        friend.requests.forEach(function (request) {
            if (request.user == req.session.user._id) {
                user_found = true;
                return;
            }
            index++;
        });
        if (!user_found){
            return randomBytes.status(500).json({
                title: "No friend request was previously sent!"
            });
        }
        // remove current user's request
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
        // already friends (UI should not allow for this)
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
            // add friend you current user's list of friends
            user.friends.push(friend._id);
            // remove request from friend's list of requests
            for (var i = 0; i < user.requests.length; i++){
                if (user.requests[i].user == req.body.friendId) {                
                    user.requests.splice(i);
                    console.log(user);
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
                // add current user to friend's list of friends
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
        // remove request
        for (var i = 0; i < user.requests.length; i++) {
            if (user.requests[i].user == req.body.friendId) {
                user.requests.splice(i);
                console.log(user);                
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
            res.redirect("back")
        });
    });
});

/** send a share request to another user */
router.post('/goal/send-share-request/:GID', function(req, res, next){
    User.findById(req.body.friendId, function (err, friend) {
        if (err) {
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!friend) {
            return res.status(404).json({
                title: "no user found"
            });
        }
        // find share request
        var request_found = false;
        for (var i = 0; i < friend.requests.length; i++){
            let request = friend.requests[i];
            if (request.goal == req.params.GID){
                request_found = true;
                return;
            }
        };
        // can't send share request twice (UI should not allow for this)
        if (request_found){
            return res.status(500).json({
                title: "request already sent!"
            });
        }

        // send new request
        let request = {
            user: req.session.user._id,
            goal: req.params.GID,
            type: "goal-share"
        }
        friend.requests.push(request);

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

/** undo share request */
router.post('/goal/undo-share-request/:GID', function(req, res, next){
    User.findById(req.body.friendId, function(err, friend){
        if (err) {
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!friend) {
            return res.status(404).json({
                title: "no user found"
            });
        }

        // find request and remove
        for (var i = 0; i < friend.requests.length; i++) {
            if (friend.requests[i].type == 'goal-share' && friend.requests[i].goal == req.params.GID) {
                friend.requests.splice(i);
                break;
            }
        }
        friend.save(function (err) {
            if (err) {
                return res.status(500).json({
                    title: "error while saving user",
                    err: err
                });
            }
            res.redirect('back');
        });
    })
});

/** decline a share request */
router.post('/goal/decline-share-request/:GID', function(req, res, next){
    User.findById(req.session.user._id, function(err, user){
        if (err) {
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!user) {
            return res.status(404).json({
                title: "no user found"
            });
        }

        // find request and remove
        for (var i = 0; i < user.requests.length; i++){
            if (user.requests[i].type == 'goal-share' && user.requests[i].goal == req.params.GID){
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
            res.redirect('back');
        });
    });
});

// accept a share request
router.post('/goal/accept-share-request/:GID', function(req, res, next){
    User.findById(req.session.user._id, function(err, user){
        if (err) {
            return res.status(500).json({
                title: "error while finding user",
                err: err
            });
        }
        if (!user) {
            return res.status(404).json({
                title: "no user found"
            });
        }
        // find request and remove
        for (var i = 0; i < user.requests.length; i++) {
            if (user.requests[i].type == 'goal-share' && user.requests[i].goal == req.params.GID) {
                user.requests.splice(i);
                break;
            }
        }
        // add goal to user
        user.goals.push(req.params.GID);
        // save user
        user.save(function(err){
            if (err){
                return res.status(500).json({
                    title: "error while saving user",
                    err: err
                });
            }
            // add user to goal
            Goal.findById(req.params.GID, function (err, goal) {
                if (err) {
                    return res.status(500).json({
                        title: "error while finding goal",
                        err: err
                    });
                }
                if (!user) {
                    return res.status(404).json({
                        title: "no goal found"
                    });
                }
                goal.users.push(req.session.user._id);
                // save goal
                goal.save(function(err){
                    if (err) {
                        return res.status(500).json({
                            title: "error while saving goal",
                            err: err
                        });
                    }
                    req.session.user.goals.push(goal._id);
                    res.redirect('back');
                });
            });
        });
        
    });
});

module.exports = router;
