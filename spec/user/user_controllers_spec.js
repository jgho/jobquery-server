var request = require('supertest');
var express = require('express');
var app = require('../../server/main/app.js');

var userCtrl = require('../../server/user/user_controllers.js');
var mongoose = require('mongoose');
var conn = mongoose.connection;

conn.on('error', function (err) {
  console.log('connection error:', err);
});

var User = require('../../server/user/user_model.js');
var Tag = require('../../server/tag/tag_model.js');
var userMockData = require('./user_model_MockData.js');
var tagMockData = require('../tag/tag_model_MockData.js');

var removeCollections = function (done) {
  var numCollections = Object.keys(conn.collections).length;
  var collectionsRemoved = 0;
  for (var i in conn.collections) {
    (function (i) {
      conn.collections[i].remove(function (err, results){
        collectionsRemoved += 1;
        if (numCollections === collectionsRemoved) {
          done();
        }
      });
    })(i);
  }
};

var reconnect = function (done) {
  mongoose.connect('mongodb://localhost/myApp', function (err) {
    if (err) {
      console.log('reconnect error');
      throw err;
    }
    return removeCollections(done);
  });
};

var checkState = function (done) {
  switch (conn.readyState) {
  case 0:
    reconnect(done);
    break;
  case 1:
    removeCollections(done);
    break;
  default:
    setTimeout(checkState.bind(this, done), 100);
  }
};

describe('User Controller', function () {

  it('should have a get method', function () {
    expect(userCtrl.get).toEqual(jasmine.any(Function));
  });

  it('should have a post method', function () {
    expect(userCtrl.post).toEqual(jasmine.any(Function));
  });

  it('should have a getById method', function () {
    expect(userCtrl.getById).toEqual(jasmine.any(Function));
  });

  it('should have a putById method', function () {
    expect(userCtrl.putById).toEqual(jasmine.any(Function));
  });

});

describe('User Controller', function () {

  beforeEach(function (done) {
    checkState(done);
  });

  it('should be able to POST', function (done) {
    request(app)
    .post('/api/users')
    .send(userMockData.valid)
    .end(function (err, res) {
      if (err) return done(err);
      expect(res.statusCode).toEqual(201);
      done();
    });
  });

  it('should be able to GET', function (done) {
    // post user1
    request(app)
    .post('/api/users')
    .send(userMockData.valid)
    .end(function (err, res) {
      expect(res.statusCode).toEqual(201);

      // post user2
      request(app)
      .post('/api/users')
      .send(userMockData.minimum2)
      .end(function (err, res) {
        expect(res.statusCode).toEqual(201);

        // retrieve both users
        request(app)
        .get('/api/users')
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body.length).toEqual(2);
          expect(res.statusCode).toEqual(200);
          done();
        });
      });
    });
  });

  it('should be able to GET a specific user', function (done) {
    // post user1
    var user;
    request(app)
    .post('/api/users')
    .send(userMockData.valid)
    .end(function (err, res) {
      user = res.body;
      expect(res.statusCode).toEqual(201);

      // post user2
      request(app)
      .post('/api/users')
      .send(userMockData.minimum2)
      .end(function (err, res) {
      expect(res.statusCode).toEqual(201);

        // retrieve only user1
        request(app)
        .get('/api/users/' + user)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body._id).toEqual(user);
          expect(res.statusCode).toEqual(200);
          done();
        });
      });
    });
  });

  it('should FAIL to GET with an invalid user', function (done) {
    var user = '/api/users/' + '123456789';
    request(app)
    .post('/api/users')
    .send(userMockData.valid)
    .end(function (err, res) {
      expect(res.statusCode).toEqual(201);

      request(app)
      .get(user)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.statusCode).toEqual(500);
        done();
      });
    });
  });

  it('should POST and GET tag', function (done) {
    // create tag
    request(app)
    .post('/api/tags')
    .send(tagMockData.valid3)
    .end(function (err, res) {
      if (err) return done(err);
      expect(res.statusCode).toEqual(201);

      // retrieve tag
      request(app)
      .get('/api/tags/' + res.body)
      .end(function (err, res) {
      if (err) return done(err);
        expect(res.statusCode).toEqual(200);
        done();
      });
    });
  });

  it('should update (via PUT) and populate tag an existing user', function (done) {
    // create a user
    var user;
    request(app)
    .post('/api/users')
    .send(userMockData.minimum2)
    .end(function (err, res) {

      if (err) return done(err);
      user = res.body;
      expect(res.statusCode).toEqual(201);

      // create tag
      var tag;
      request(app)
      .post('/api/tags')
      .send(tagMockData.valid4)
      .end(function (err, res4) {
        if (err) return done(err);
        expect(res4.statusCode).toEqual(201);
        tag = res4.body;

        // update user
        request(app)
        .put('/api/users/' + user)
        .send({
          name: 'another random',
          isAdmin: true,
          tags: [{tag: tag, score: 3}] // directly assign tag ID
        })
        .end(function (err, res2) {
          if (err) return done(err);
          expect(res2.statusCode).toEqual(201);

          // get user
          request(app)
          .get('/api/users/' + user)
          .end(function (err, res3) {
            if (err) return done(err);
            expect(res3.statusCode).toEqual(200);
            done();
          });
        });
      });
    });
  });

  it('should create a user with tag, get the user, update user info + tag', function (done) {
    // create tag
    var tag;
    request(app)
    .post('/api/tags')
    .send(tagMockData.valid4)
    .end(function (err, newTag) {
      if (err) return done(err);
      expect(newTag.statusCode).toEqual(201);
      tag = newTag.body;

      // create a user
      userMockData.minimum2.tags = [{tag: tag, score: 2}];
      var user;
      request(app)
      .post('/api/users')
      .send(userMockData.minimum2)
      .end(function (err, newUser) {

        if (err) return done(err);
        userId = newUser.body;
        expect(newUser.statusCode).toEqual(201);

        //get user
        request(app)
        .get('/api/users/' + userId)
        .end(function (err, user) {

          // update user's tag
          user.body.tags[0].score = 4; // tag has been populated!
          user.body.name = 'another random';
          user.body.isAdmin = true;

          // update user
          request(app)
          .put('/api/users/' + userId)
          .send(user.body)
          .end(function (err, res2) {
            if (err) return done(err);
            expect(res2.statusCode).toEqual(201);

            // get user
            request(app)
            .get('/api/users/' + userId)
            .end(function (err, res3) {
              if (err) return done(err);
              expect(res3.statusCode).toEqual(200);
              delete userMockData.minimum2.tags;
              done();
            });
          });
        });
      });
    });
  });

  it('should have new tags automatically added to existing users', function (done) {
    // create two new users
    request(app)
    .post('/api/users')
    .send(userMockData.valid)
    .end(function (err, user1) {
      if (err) return done(err);
      expect(user1.statusCode).toEqual(201);

      request(app)
      .post('/api/users')
      .send(userMockData.minimum2)
      .end(function (err, user2) {
        if (err) return done(err);
        expect(user2.statusCode).toEqual(201);

        // check get of two users
        request(app)
        .get('/api/users')
        .end(function (err, users) {
          if (err) return done(err);
          expect(users.statusCode).toEqual(200);

          // create a tag
          request(app)
          .post('/api/tags')
          .send(tagMockData.valid3)
          .end(function (err, tag) {
            if (err) return done(err);
            expect(tag.statusCode).toEqual(201);

            // check both users have the created tag
            var delay = function () {
              request(app)
              .get('/api/users')
              .end(function (err, usersWithTags) {
                if (err) return done(err);
                expect(usersWithTags.statusCode).toEqual(200);
                expect(usersWithTags.body[0].tags[0].tag.name)
                  .toEqual(tagMockData.valid3.name);
                expect(usersWithTags.body[1].tags[0].tag.name)
                  .toEqual(tagMockData.valid3.name);

                done();
              });
            };
            setTimeout(delay, 200); // post save middleware needs time to save!
          });
        });
      });
    });
  });
});
