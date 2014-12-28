'use strict';
if (typeof require !== 'undefined') {
    var SimpleObjectStore = require('../lib/simple-object-store.js');
    var Chance = require('chance');
}

//randomly generate a test name
var c = new Chance();
var testName = (typeof __dirname !== 'undefined') ? __dirname + '/' : '';
testName += 'db/' + c.string({pool: 'abcdefghijklmnopqrstuvwxyz'}) + '.json';

var testRecord1 = {
    firstName: c.first(),
    lastName: c.last(),
    age: c.age(),
    birthday: c.birthday()
}, testRecord2 = {
    firstName: c.first(),
    lastName: c.last(),
    age: c.age(),
    birthday: c.birthday()
}, testRecord3 = {
    firstName: c.first(),
    lastName: c.last(),
    age: c.age(),
    birthday: c.birthday()
};

this.simple_object_store_test = {
    setUp: function (done) {
        var db = this.db = new SimpleObjectStore(testName, {reset: true});
        db.insert(testRecord1, function () {
            db.insert(testRecord2, function () {
                db.insert(testRecord3, done);
            });
        });
    },

    tearDown: function (done) {
        this.db.destroy();
        done();
    },

    'can create SimpleObjectStore instance': function (test) {
        test.expect(1);

        test.doesNotThrow(function () {
            var db = new SimpleObjectStore(testName, {reset: true});
        });
        test.done();
    },

    'can insert record': function (test) {
        test.expect(2);

        var db = new SimpleObjectStore(testName, {reset: true});
        db.insert(testRecord1, function (err, record) {
            test.equal(testRecord1.firstName, record.firstName, 'first names should be equal');
            test.equal(record.id, 1, 'id should be 1');
            test.done();
        });
    },

    'can store record persistently': function (test) {
        test.expect(1);
        var db1 = new SimpleObjectStore(testName, {reset: true});
        db1.insert(testRecord1, function (err, record) {
            var db2 = new SimpleObjectStore(testName);

            console.log('persist', db2.data);
            test.equal(db2.data[0].firstName, record.firstName, 'names should be equal');
            test.done();
        });
    },

    'can find records by one key': function (test) {
        test.expect(3);
        this.db.find({firstName: testRecord1.firstName}, function (err, records) {
            test.equal(records.length, 1, 'should find one record');
            test.equal(records[0].firstName, testRecord1.firstName, 'first name should be equal');
            test.equal(records[0].lastName, testRecord1.lastName, 'last name should be equal');
            test.done();
        });
    },

    'can find records by more than one key': function (test) {
        test.expect(3);
        this.db.find({
            firstName: testRecord1.firstName,
            lastName: testRecord1.lastName
        }, function (err, records) {
            test.equal(records.length, 1, 'should find one record');
            test.equal(records[0].firstName, testRecord1.firstName, 'first name should be equal');
            test.equal(records[0].lastName, testRecord1.lastName, 'last name should be equal');
            test.done();
        });
    },

    'can find multiple records': function (test) {
        test.expect(1);
        var db = this.db;
        var secondRecord = { firstName: testRecord1.firstName, age: c.age() };
        db.insert(secondRecord, function () {
            db.find({firstName: testRecord1.firstName}, function (err, records) {
                test.equal(records.length, 2, 'should find two records');
                test.done();
            });
        });
    },

    'can find all records': function (test) {
        test.expect(1);
        this.db.find(function (err, records) {
            test.equal(records.length, 3, 'should find 3 records');
            test.done();
        });
    },

    'can use query operators': function (test) {
        test.expect(1);
        var r = { firstName: testRecord1.firstName, age: 10 };
        var db = this.db;
        db.insert(r, function () {
            db.find({age: {$lt: 11}}, function (err, records) {
                test.notEqual(records.length, 0, 'should return at least one record');
                test.done();
            });
        });
    },

    'query operators': {
        '$lt': function (test) {
            operatorTest({age: 10}, {age: {$lt: 11}}, function (err, records) {
                test.notEqual(records.length, 0, 'should return at least one record');
                test.done();
            });
        },
        '$gt': function (test) {
            operatorTest({age: 10}, {age: {$gt: 9}}, function (err, records) {
                test.expect(1);
                test.notEqual(records.length, 0, 'should return at least one record');
                test.done();
            });
        },
        '$lte': function (test) {
            operatorTest({age: 10}, {age: {$lte: 11}}, function (err, records) {
                test.expect(1);
                test.notEqual(records.length, 0, 'should return at least one record');
                test.done();
            });
        },
        '$gte': function (test) {
            operatorTest({age: 10}, {age: {$gte: 9}}, function (err, records) {
                test.expect(1);
                test.notEqual(records.length, 0, 'should return at least one record');
                test.done();
            });
        },
        'multiple operators': function (test) {
            operatorTest({age: 10}, {age: {$gt: 9, $lt: 11}}, function (err, records) {
                test.expect(1);
                test.notEqual(records.length, 0, 'should return at least one record');
                test.done();
            });
        }
    },

    'can register custom query operator': function (test) {
        SimpleObjectStore.operator('$in', function (key, values, record) {
            for (var i = 0; i < values.length; i++) {
                if (record[key] === values[i]) {
                    return true;
                }
            }
        });
        this.db.find({firstName: {$in: [testRecord1.firstName, testRecord2.firstName]}}, function (err, records) {
            test.expect(1);
            test.equal(records.length, 2, 'should return two records');
            test.done();
        });
    },

    'can find a single record': function (test) {
        test.expect(2);
        this.db.findOne({firstName: testRecord1.firstName}, function (err, record) {
            test.equal(record.firstName, testRecord1.firstName, 'first name should be equal');
            test.equal(record.lastName, testRecord1.lastName, 'last name should be equal');
            test.done();
        });
    },

    'can update records': function (test) {
        this.db.update({firstName: testRecord1.firstName}, {age: 2000}, function (err, records) {
            test.expect(1);
            test.equal(records[0].age, 2000, 'age should be updated');
            test.done();
        });
    },

    'can delete records': function (test) {
        var db = this.db;
        db.delete({firstName: testRecord1.firstName}, function () {
            db.find({firstName: testRecord1.firstName}, function (err, records) {
                test.expect(1);
                test.equal(records.length, 0, 'no records should be found');
                test.done();
            });
        });
    }
};

function operatorTest(record, query, cb) {
    var db = new SimpleObjectStore(testName, {reset: true});
    db.insert(record, function (err, record) {
        db.find(query, cb);
    });
}