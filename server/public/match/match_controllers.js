var Match = require('../../match/match_model.js');
var Tag = require('../../tag/tag_model.js');
var Category = require('../../category/category_model.js');
var Opportunity = require('../../opportunity/opportunity_model.js');
var User = require('../../user/user_model.js');
var Company = require('../../company/company_model.js');
var Q = require('q');
var mongoose = require('mongoose');

module.exports = exports = {

  getByOppId: function (req, res) {
    var user;
    var match;

    Q.all([
      Match
      .findOne({user: req.user.id, opportunity: req.params.id})
      .select('-createdAt -updatedAt')
      .populate([
        {path: 'opportunity', select: '-createdAt -updatedAt'}
      ])
      .exec()
      .then(function (data) {
        return Tag.populate(data,
          {path: 'opportunity.tags.tag', select: '-createdAt -updatedAt'}
        )
        .then(function (matchesWithTags) {
          return Company.populate(matchesWithTags,
            {path: 'opportunity.company'});
        })
        .then(function (matchesWithTagsCompany) {
          return Category.populate(matchesWithTagsCompany,
            {path: 'opportunity.category'});
        })
        .then(function (results) {
          // filter opportunities that are not yet approved
          for (var k = 0; k < results.length; k += 1) {
            if (!results[k].approved) {
              results.splice(k, 1);
              k -= 1;
            }
          }

          // hide non-public tags from users
          for (var i = 0; i < results.length; i += 1) {
            for (var j = 0; j < results[i].opportunity.tags.length; j += 1) {
              if (results[i].opportunity.tags[j].tag.isPublic === false ||
                results[i].opportunity.tags[j].tag.active === false) {
                results[i].opportunity.tags.splice(j, 1);
                j -= 1;
              }
            }
          }

          match = results;
          return;
        });
      }),

      User
      .findById(req.user.id)
      .select('-createdAt -updatedAt')
      .populate([
        {path: 'category', select: 'name'},
        {path: 'tags.tag', select: '-createdAt -updatedAt'},
      ])
      .exec()
      .then(function (data) {
        return Category.populate(data,
          {path: 'tags.tag.category', select: '-createdAt -updatedAt'}
        ).then(function (usr) {
          // hide non-public and inactive tags from users
          for (var i = 0; i < usr.tags.length; i += 1) {
            if (usr.tags[i].tag.isPublic === false ||
              usr.tags[i].tag.active === false) {
              usr.tags.splice(i, 1);
              i -= 1;
            }
          }
          user = usr;
          return;
        });
      })
    ])
    .then(function () {
      res.json(200, {user: user, match: match});
    })
    .catch(function (err) {
      res.send(500, err);
    });
  },

  getByUserId: function (req, res) {
    var opportunities;
    var matches;
    var user;

    Q.all([
      User
      .findOne({_id: req.user.id})
      .select('-createdAt -updatedAt')
      .exec()
      .then(function (data) {
          user = data;
          return;
      }),

      Match
      .find({user: req.user.id})
      .select('-createdAt -updatedAt')
      .exec()
      .then(function (data) {
          matches = data;
          return;
      }),

      Opportunity
      .find()
      .select('active approved company jobTitle description category questions createdAt updatedAt')
      .populate([
        {path: 'category', select: 'name'},
        {path: 'company', select: 'name'}
      ])
      .exec()
      .then(function (data) {
          // filter opportunities that are not yet approved
          for (var i = 0; i < data.length; i += 1) {
            if (!data[i].approved) {
              data.splice(i, 1);
              i -= 1;
            }
          }
          opportunities = data;
          return;
      })
    ])
    .then(function () {
      res.json(200, {matches: matches, opportunities: opportunities, user: user});
    })
    .catch(function (err) {
      res.send(500, err);
    });
  },

  putByIds: function (req, res) {
    Match.findOne({_id: req.params.id}, function (err, match) {
      if (err) {
        res.json(500, err);
        return;
      }

      Match.schema.eachPath(function (field) {
        if ( (field !== '_id') && (field !== '__v') ) {
          if (req.body[field] !== undefined) {
            // depopulate user
            if (field === 'user') {
              if (req.body.user._id) {
                req.body.user = req.body.user._id;
              }
            }
            // depopulate opportunity
            if (field === 'opportunity') {
              if (req.body.opportunity._id) {
                req.body.opportunity = req.body.opportunity._id;
              }
            }
            match[field] = req.body[field];
          }
        }
      });

      match.save(function (err, item) {
        if (err) {
          res.json(500, err);
          return;
        }
        res.json(200, {_id: item.id});
      });
    });
  }
};
