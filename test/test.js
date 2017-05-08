const rpc = require('../index.js')('amqp://yroncwgv:bQm23UIjEmgKf7Chs5oNji2rFpKDF4sB@puma.rmq.cloudamqp.com/yroncwgv');
const assert = require('chai').assert;

describe('rabbit-promise-rpc', function() {

    describe('Create remote action', function() {
        it('Should just create remote action "sum"', function() {
            rpc.handle('sum', function (a, b, callback) {
                callback(null, a+b);
            })
        });
    });

    describe('call remote action', function() {
        it('Call remote action "sum" with 2+3 and return 5 with callback', function() {
            return new Promise(function (resolve, reject) {
                rpc.call('sum', 2, 3, function (err, result) {
                    if(err) return reject(err);
                    assert.equal(result, 2+3);
                    resolve()
                })
            });
        });
        it('Call remote action "sum" with 2+3 and return 5 with promise', function() {
            return new Promise( (resolve, reject) => {
                rpc.promise('sum', 2, 3).then( function (result) {
                    assert.equal(result, 2+3);
                    resolve();
                })
                    .catch(reject)
            })
        });
    });
});