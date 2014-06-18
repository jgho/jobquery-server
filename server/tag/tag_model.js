/* jshint node: true */

'use strict';

var mongoose = require('mongoose');
var User = require('../user/user_model.js');

var mongoOID = mongoose.Schema.Types.ObjectId;

var tagSchema = new mongoose.Schema({
  name:             {type: String, required: true, unique: true, index: true},
  label:            {type: String, required: true},
  scaleDescription: {type: mongoose.Schema.Types.Mixed},
  isPublic:         {type: Boolean, required: true, default: true},
  category:         {type: mongoOID, ref: 'Category'},
  createdAt:        {type: Date, required: true, default: Date.now},
  updatedAt:        {type: Date, required: true, default: Date.now}
});

tagSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

tagSchema.post('save', function (doc) {
  // add this new tag to each user
  User.find(function (err, users) {
    users.forEach(function (user) {
      user.tags.push({tag: doc._id, score: 0});
      user.save();
    });
  });
});

module.exports = exports = mongoose.model('Tag', tagSchema);
