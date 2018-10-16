var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var UserSchema = new Schema({
    email: {type: String, required: true},
    password: {type: String, required: true},
    firstname: {type: String, required: true},
    lastname: {type: String, required: true},
    goals: [{type: ObjectId, ref: 'Goal', required: true}],
    friends: [{ type: ObjectId, ref: 'User', required: true}],
    requests: [{
        user: { type: ObjectId, ref: 'User', required: true },
        goal: { type: ObjectId, ref: 'Goal', required: false },
        type: { type: String, required: true}    
    }],
    createdAt: {type: Date, required: false},
    updatedAt: {type: Date, required: false},
    addable: {type: Boolean, required: false},          // very dumb code structure, this feild doesn't serve anything
    sentRequest: { type: Boolean, required: false }        // ^^^
});

UserSchema.pre('save', function(next){
    let currentDate = new Date().getTime();
    this.updatedAt = currentDate;
    if (!this.createdAt)
        this.createdAt = currentDate;
    this.firstname = this.firstname[0].toUpperCase() + this.firstname.substring(1).toLowerCase();
    this.lastname = this.lastname[0].toUpperCase() + this.lastname.substring(1).toLowerCase();
    this.email = this.email.toUpperCase();
    next();
});

module.exports = mongoose.model('User', UserSchema);