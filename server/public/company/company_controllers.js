"use strict";

var Company = require('../../company/company_model.js');

module.exports = exports = {

  getById: function (req, res) {
    Company.findById(req.params.id)
    .populate('opportunities')
    .exec(function (err, company) {
      if (err) {
        res.json(500, err);
        return;
      }
      res.json(200, company);
    });
  },

  get: function (req, res) {
    Company.find()
    .populate('opportunities')
    .exec(function (err, companies) {
      if (err) {
        res.json(500, err);
        return;
      }
      // filter opportunities that are not yet approved
      for (var i = 0; i < companies.length; i += 1) {
        for (var j = 0; j < companies[i].opportunities.length; j += 1) {
          if (!companies[i].opportunities[j].approved) {
            companies[i].opportunities.splice(j, 1);
            j -= 1;
          }
        }
      }
      res.json(200, companies);
    });
  }
};
