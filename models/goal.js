var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;

var GoalSchema = new Schema({
    title: {type: String, required: true},
    info: { type: String, required: true }, 
    subgoals: [{ 
        title: {type: String, required: true},
        usersCompleted: [{type: ObjectId, ref:'User', required: true}]
     }],
    users: [{ type: ObjectId, ref:'User', required: true }],
    private: { type: Boolean, required: true },
    archived: { type: Boolean, required: true },
    complete: { type: Boolean, required: true },       
    entry_fee: { type: Number, required: true },
    createdAt: { type: Date, requried: false},
    updatedAt: { type: Date, required: false}
});

GoalSchema.pre('save', function(next){
    let currentDate = new Date().getTime();
    this.updatedAt = currentDate;
    if (!this.createdAt)
        this.createdAt = currentDate;
    next();
});

module.exports = mongoose.model('Goal', GoalSchema);