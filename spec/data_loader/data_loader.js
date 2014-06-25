var mongoose = require('mongoose');
var faker    = require('faker');
var Q        = require('q');
var User     = require('../../server/user/user_model.js');
var Tag      = require('../../server/tag/tag_model.js');
var Company  = require('../../server/company/company_model.js');
var Category = require('../../server/category/category_model.js');
var Opportunity = require('../../server/opportunity/opportunity_model.js');
var Message     = require('../../server/message/message_model.js');
var Match       = require('../../server/match/match_model.js');

var categoriesData = require('./categories.js');
var tagsData = require('./tags.js');

// var DB_URL = 'mongodb://jobquery:Team3van@ds061787.mongolab.com:61787/jobquery';
var DB_URL = 'mongodb://localhost/myApp';
var db = mongoose.connect(DB_URL);

// Remove everything
Category.collection.remove(function(){populate();});
Company.collection.remove(function(){});
Tag.collection.remove(function(){});
User.collection.remove(function(){});
Opportunity.collection.remove(function(){});
Message.collection.remove(function(){});
Match.collection.remove(function(){});

var populate = function() {

  var categorySaves = [];
  categoriesData.forEach(function (category) {
    categorySaves.push(Category.create(category));
  });

  console.log('Saving categories..');
  Q.all(categorySaves)
    .then(function(categoryResults){
      console.log('Saved categories: ', categoryResults.length);

      var userCategories = categoryResults.filter(function (category) {
        return category.type === 'User';
      });
      var oppCategories = categoryResults.filter(function (category) {
        return category.type === 'Opportunity';
      });
      var tagCategories = categoryResults.filter(function (category) {
        return category.type === 'Tag';
      });

      var tagSaves = [];
      tagsData.forEach(function (tag) {
        for (var i = 0; i < tagCategories.length; i += 1) {
          if (tagCategories[i].name === tag.category) {
            tag.category = tagCategories[i]._id;
            break;
          }
        }
        tagSaves.push(Tag.create(tag));
      });

      console.log('Saving tags..');
      Q.all(tagSaves)
        .then(function(results) {
          console.log('Saved tags: ', results.length);

          var userSaves = [];
          Tag.find(function(err, tags) {
            var allTags = [];
              allTags = tags.map(function(item){
              var tag;
                if (item.type === 'binary') {
                  tag = {
                    tag : item._id,
                    value : Math.random() > 0.5 ? "yes" : "no",
                  };
                } else if (item.type === 'scale') {
                  tag = {
                    tag : item._id,
                    value : String(Math.floor(Math.random() * 4 + 1))
                  };
                } else if (item.type === 'text') {
                  tag = {
                    tag : item._id,
                    value : faker.Lorem.sentence()
                  };
                }
              return tag;
            });
            // create admin
            var admin = {
              email:          'admin@hack.com',
              password:       '$2a$10$ZMxTxy3shQcCr09GQVSoF.KHWpdwT2BXInNbtUEEOz7iAcnRRhoQS',
              name:           faker.Name.findName(),
              github:         'github.com/' + faker.Name.firstName(),
              linkedin:       'linkedin.com/in/' + faker.Name.firstName(),
              isAdmin:        true,
              isRegistered:   true,
              searchStage:    'Early',
              city:           'San Francisco',
              state:          'CA',
              country:        'USA'
            };
            var testUser = {
              email:          'user@hack.com',
              password:       '$2a$10$ZMxTxy3shQcCr09GQVSoF.KHWpdwT2BXInNbtUEEOz7iAcnRRhoQS',
              name:           faker.Name.findName(),
              github:         'github.com/' + faker.Name.firstName(),
              linkedin:       'linkedin.com/in/' + faker.Name.firstName(),
              isAdmin:        false,
              isRegistered:   true,
              searchStage:    'Early',
              city:           'San Francisco',
              state:          'CA',
              country:        'USA',
              tags:           allTags,
              category:       userCategories[Math.floor(Math.random() * userCategories.length)]._id
            };
            userSaves.push(User.create(admin));
            userSaves.push(User.create(testUser));
            // Populate users
            for(var i = 0; i < 20; i++) {
              var user = {
                email:          faker.Internet.email(),
                password:       '$2a$10$ZMxTxy3shQcCr09GQVSoF.KHWpdwT2BXInNbtUEEOz7iAcnRRhoQS',
                name:           faker.Name.findName(),
                github:         'github.com/' + faker.Name.firstName(),
                linkedin:       'linkedin.com/in/' + faker.Name.firstName(),
                isAdmin:        false,
                isRegistered:   Math.random() > 0.5 ? true : false,
                searchStage:    'Early',
                city:           'San Francisco',
                state:          'CA',
                country:        'USA',
                tags:           allTags,
                category:       userCategories[Math.floor(Math.random() * userCategories.length)]._id
              };
              userSaves.push(User.create(user));
            }
            console.log('Saving users.. ');
            Q.all(userSaves)
              .then(function(userResults) {
                console.log('Saved users: ', userResults.length);
                var companySaves = [];

                // Create companies
                for(var j = 0; j < 10; j++) {
                  var company = {
                    name:        faker.Company.companyName(),
                    tagline:     faker.Company.catchPhrase(),
                    description: faker.Company.bs(),
                    address:     faker.Address.streetAddress(),
                    city:        faker.Address.city(),
                    state:       faker.Address.usState(),
                    country:     faker.Address.ukCountry(),
                    geo:         [faker.random.number(1,100), faker.random.number(1,100)],
                    media:       [{caption : faker.random.catch_phrase_descriptor(), url : faker.Image.imageUrl()}],
                    links:       [{title : faker.random.catch_phrase_descriptor(), url : faker.Image.imageUrl()}]
                  };

                  companySaves.push(Company.create(company));
                }

                console.log('Saving companies.. ');
                Q.all(companySaves)
                  .then(function(companyResults){
                    console.log('Saved companies: ', companyResults.length);
                    var opportunitySaves = [];
                    var stageEnum = [
                      'Offer Accepted',
                      'Offer Received',
                      'On-Site Interview',
                      'Phone Interview'
                    ];

                    var importance = ['must', 'nice', 'unimportant'];
                    allTags = allTags.map(function(tag){
                      tag.importance = importance[Math.floor(Math.random() * 3)];
                      return tag;
                    });

                    for(var i = 0; i < 20; i++) {
                      var index = Math.floor(Math.random() * companyResults.length);
                      var opportunity = {
                        active:         true,
                        company:        companyResults[index]._id,
                        jobTitle:       faker.Company.bs(),
                        description:    faker.Company.catchPhrase(),
                        approved:       Math.random() > 0.2 ? true : false,
                        tags:           allTags,
                        links:          [{title : faker.random.catch_phrase_descriptor(), url : faker.Image.imageUrl()}],
                        notes:          [{date : new Date(), text : faker.Lorem.sentence()}],
                        internalNotes:  [{date : new Date(), text : faker.Lorem.sentence()}],
                        questions:      [{date : new Date(), question : faker.Lorem.sentence()}],
                        survey:         [{  user:   userResults[Math.floor(Math.random() * userResults.length)]._id,
                                            salary: faker.random.number(80000, 160000),
                                            notes:  [faker.Lorem.sentence(),faker.Lorem.sentence()],
                                            stage:  stageEnum[Math.floor(Math.random() * stageEnum.length)]
                                        }],
                        category:       oppCategories[Math.floor(Math.random() * oppCategories.length)]._id
                      };
                      opportunitySaves.push(Opportunity.create(opportunity));
                    }
                    console.log('Saving opportunities.. ');
                    Q.all(opportunitySaves)
                      .then(function(opportunityResults) {
                        console.log('Saved opportunities: ', opportunityResults.length);
                        setTimeout(process.exit, 3000);
                      }, function(error){
                        console.log(error);
                        setTimeout(process.exit.bind(this, 1), 3000);
                      });
                  });
              });
          });
      });
    });
};
