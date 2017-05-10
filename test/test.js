const rpc = require('../index.js')('amqp://yroncwgv:bQm23UIjEmgKf7Chs5oNji2rFpKDF4sB@puma.rmq.cloudamqp.com/yroncwgv');
const assert = require('chai').assert;

describe('Create remote action', function() {
    it('Should create remote action "sum" and return promise with answer', function() {
        rpc.handle('square', function (a) {
            if(isNaN(+a)) return Promise.reject(new Error('Argument is NaN'));
            return Promise.resolve(a*a);
        })
    });
});

describe('call remote action', function() {
    it('Call remote action "square" with 2 and expect 4 with callback', function() {
        return new Promise(function (resolve, reject) {
            rpc.call('square', 2, function (err, result) {
                if(err) return reject(err);
                assert.equal(result, 2*2);
                resolve()
            })
        });
    });
    it('Call remote action "square" with 2 and expect 4 with promise', function() {
        return new Promise( (resolve, reject) => {
            rpc.promise('square', 2).then( function (result) {
                assert.equal(result, 2*2);
                resolve();
            })
                .catch(reject)
        })
    });
    it('Call remote action "square" with "string" and expect rejection', function() {
        return new Promise( (resolve, reject) => {
            rpc.promise('square', 'string')
                .then(reject)
                .catch(resolve)
        })
    });
});