const rpc = require('../index.js')('amqp://yroncwgv:bQm23UIjEmgKf7Chs5oNji2rFpKDF4sB@puma.rmq.cloudamqp.com/yroncwgv');
const assert = require('chai').assert;

describe('Create remote action', function() {
    it('Should create remote action "sum" and return promise with answer', function() {
        rpc.process('sum', function (...numbers) {
            if(numbers.length === 0) return Promise.reject(new Error('No numbers'));
            return Promise.resolve(numbers.reduce((a, sum) => sum + a));
        })
    });
});

describe('call remote action', function() {
    it('Call remote action "sum" with 1,2,3 and expect 6 with callback', function() {
        return new Promise(function (resolve, reject) {
            rpc.call('sum', 1, 2, 3, function (err, result) {
                if(err) return reject(err);
                assert.equal(result, 6);
                resolve()
            })
        });
    });
    it('Call remote action "sum" with 1,2,3 and expect 6 with promise', function() {
        return new Promise( (resolve, reject) => {
            rpc.promise('sum', 1, 2, 3).then( function (result) {
                assert.equal(result, 6);
                resolve();
            })
                .catch(reject)
        })
    });
    it('Call remote action "sum" with no parameters and expect rejection', function() {
        return new Promise( (resolve, reject) => {
            rpc.promise('sum')
                .then(reject)
                .catch(resolve)
        })
    });
});