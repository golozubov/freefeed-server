"use strict";

var Promise = require('bluebird')
  , uuid = require('uuid')
  , inherits = require("util").inherits
  , models = require('../models')
  , AbstractModel = models.AbstractModel
  , User = models.User
  , mkKey = require("../support/models").mkKey

exports.addModel = function(database) {
  var Group = function(params) {
    this.id = params.id
    this.username = params.username
    this.screenName = params.screenName
    this.createdAt = params.createdAt
    this.updatedAt = params.updatedAt
    this.type = "group"
  }

  inherits(Group, User)

  Group.className = Group
  Group.namespace = "user"
  Group.findById = Group.super_.findById
  Group.findByUsername = Group.super_.findByUsername

  Object.defineProperty(Group.prototype, 'username', {
    get: function() { return this.username_ },
    set: function(newValue) {
      if (newValue)
        this.username_ = newValue.trim().toLowerCase()
    }
  })

  Object.defineProperty(Group.prototype, 'screenName', {
    get: function() { return this.screenName_ },
    set: function(newValue) {
      if (newValue)
        this.screenName_ = newValue.trim()
    }
  })

  Group.prototype.validate = function() {
    return new Promise(function(resolve, reject) {
      var valid
        , stopList = ['anonymous', 'public']

      valid = this.username.length > 1
        && this.screenName.length > 1
        && stopList.indexOf(this.username) == -1

      valid ? resolve(valid) : reject(new Error("Invalid"))
    }.bind(this))
  }

  Group.prototype.create = function() {
    return new Promise(function(resolve, reject) {
      this.createdAt = new Date().getTime()
      this.updatedAt = new Date().getTime()
      this.screenName = this.screenName || this.username
      this.username = this.username
      this.id = uuid.v4()

      this.validateOnCreate()
        .then(function(group) {
          Promise.all([
            database.setAsync(mkKey(['username', group.username, 'uid']), group.id),
            database.hmsetAsync(mkKey(['user', group.id]),
                                { 'username': group.username,
                                  'screenName': group.screenName,
                                  'type': group.type,
                                  'createdAt': group.createdAt.toString(),
                                  'updatedAt': group.updatedAt.toString()
                                })
          ])
            .then(function(res) { resolve(group) })
        })
        .catch(function(e) { reject(e) })
    }.bind(this))
  }

  Group.prototype.update = function(params) {
    var that = this

    return new Promise(function(resolve, reject) {
      that.updatedAt = new Date().getTime()
      if (params.hasOwnProperty('screenName'))
        that.screenName = params.screenName

      that.validate()
        .then(function(user) {
          database.hmsetAsync(mkKey(['user', that.id]),
                              { 'screenName': that.screenName,
                                'updatedAt': that.updatedAt.toString()
                              })
        })
        .then(function() { resolve(that) })
        .catch(function(e) { reject(e) })
    })
  }

  return Group
}
