/*
 * SimpleObjectStore
 * https://github.com/djheru/simple-object-store
 *
 * Copyright (c) 2014 djheru
 * Licensed under the MIT license.
 */

(function () {
    'use strict';

    var store = {};

    if (typeof require !== 'undefined') {//node
        var fs = require('fs');

        store.exists = fs.existsSync.bind(fs);
        store.remove = fs.unlinkSync.bind(fs);
        store.get = fs.readFileSync.bind(fs);
        store.set = fs.writeFile.bind(fs);
    } else {//in the browswer
        store.exists = function (key) {
            return localStorage.getItem(key) !== null;
        };
        store.remove = localStorage.removeItem.bind(localStorage);
        store.get = localStorage.getItem.bind(localStorage);
        store.set = function (key, value, callback) {
            localStorage.setItem(key, value);
            callback && callback();
        };
    }

    var operators = {
        $lt: function (key, value, record) {
            return record[key] < value;
        },
        $gt: function (key, value, record) {
            return record[key] > value;
        },
        $lte: function (key, value, record) {
            return record[key] <= value;
        },
        $gte: function (key, value, record) {
            return record[key] >= value;
        }
    };

    function createFilter(query, defaultReturn) {
        return function (record) {
            for (var key in query) {
                if (query.hasOwnProperty(key)) {
                    if (typeof query[key] !== 'object') {
                        if (!record[key] || record[key] !== query[key]) {
                            return defaultReturn;
                        }
                    } else {//query operators
                        for (var op in query[key]) {
                            if (query[key].hasOwnProperty(op)) {
                                if (!operators[op](key, query[key][op], record)) {
                                    return defaultReturn;
                                }
                            }
                        }
                    }
                }
            }
            return !defaultReturn;
        }
    }

    var SimpleObjectStore = function (name, options) {
        options = options || {};
        this.name = name;
        this.data = [];
        this._id = 1;

        this.store = options.store || store;

        if (this.store.exists(this.name)) {
            if (options.reset) {
                this.store.remove(name);
            } else {
                this.data = JSON.parse(this.store.get(name) || []);
                this._id = Math.max.apply(Math, this.data.map(function (r) {
                    return r.id;
                }));
            }
        } else {
            this.store.set(this.name, JSON.stringify(this.data), function(){
              return;
            });
        }
    };

    SimpleObjectStore.operator = function (name, fn) {
        if (operators[name]) {
            throw 'operator "' + name + '" already exists';
        }
        operators[name] = fn;
    }

    SimpleObjectStore.prototype.insert = function (record, callback) {
        record.id = this._id++;
        this.data.push(record);
        this.store.set(this.name, JSON.stringify(this.data), function () {
            callback && callback(null, record);
        });
    };

    SimpleObjectStore.prototype.find = function (query, callback) {
        if (typeof callback === 'undefined') {
            callback = query;
            query = {};
        }
        var data = this.data.filter(createFilter(query, false));
        callback(null, data);
    };

    SimpleObjectStore.prototype.findOne = function (query, callback) {
        this.find(query, function (err, records) {
            callback(err, records[0]);
        });
    };

    SimpleObjectStore.prototype.update = function (query, update, callback) {
        this.find(query, function (err, records) {
            records.forEach(function (record) {
                for (var prop in update) {
                    if (update.hasOwnProperty(prop)) {
                        record[prop] = update[prop];
                    }
                }
            });
            this.store.set(this.name, JSON.stringify(this.data), function () {
                callback && callback(null, records);
            });
        }.bind(this));
    };

    SimpleObjectStore.prototype.delete = function (query, callback) {
        this.data = this.data.filter(createFilter(query, true));
        this.store.set(this.name, JSON.stringify(this.data), function () {
            callback && callback(null);
        });
    };

    SimpleObjectStore.prototype.destroy = function () {
        if (this.store.exists(this.name)) {
            this.store.remove(this.name);
        }
        this.name = this._id = this.data = null;
    }

    if (typeof exports !== 'undefined') {
        module.exports = SimpleObjectStore;
    } else {
        window.SimpleObjectStore = SimpleObjectStore;
    }
}.call(this));

