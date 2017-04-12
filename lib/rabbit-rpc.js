const amqp = require('amqplib'),
    uuid = require('node-uuid'),
    bson = require('buffalo');

const Promise = require('bluebird');

function fromBuffer(buf) {
    return bson.parse(buf).val;
}

function toBuffer(value) {
    return bson.serialize({val: value});
}

module.exports = function (options) {

    options = options || {};

    if (typeof options === 'string') {
        options = {
            url: options
        }
    }

    const callbacks = [];

    const getChannel = amqp.connect(options.url).then(function (con) {
        process.once('SIGINT', con.close.bind(con));
        return con.createChannel();
    });

    const getReplyQueue = getChannel.then(function (ch) {
        return ch.assertQueue('', {exclusive: true, autoDelete: true}).then(function (res) {
            callbackConsumer(ch, res.queue);
            return res.queue;
        });
    });

    function callbackConsumer(channel, replyQueue) {
        channel.consume(replyQueue, function (msg) {
            const corrId = msg.properties.correlationId;
            if (callbacks[corrId]) {
                callbacks[corrId].apply(null, fromBuffer(msg.content));
                delete callbacks[corrId];
            } else {
                console.warn('Missing callback for', corrId);
            }
        }, {noAck: true});
    }

    const rpc = {
        handle: function (service, handler, parameters = {}) {
            getChannel.then(function (ch) {
                if(parameters.prefetch)ch.prefetch(parameters.prefetch);
                ch.assertQueue(service, {
                    durable: options.durable,
                    autoDelete: options.autoDelete
                }).then(function () {
                    ch.consume(service, function (msg) {
                        const args = fromBuffer(msg.content).concat(function () {
                            ch.sendToQueue(msg.properties.replyTo, toBuffer([].slice.call(arguments, 0)), {
                                correlationId: msg.properties.correlationId
                            });
                            ch.ack(msg);
                        });
                        handler.apply(null, args);
                    });
                });
            });
        },

        call: function () {
            const service = arguments[0],
                callback = arguments[arguments.length - 1],
                args = [].slice.call(arguments, 1, arguments.length - 1);
            getChannel.then(function (ch) {
                getReplyQueue.then(function (replyQueue) {
                    const corrId = uuid();
                    callbacks[corrId] = callback;
                    let parameters={
                        correlationId: corrId,
                        replyTo: replyQueue
                    };
                    if(options.expiration)parameters.expiration=options.expiration;
                    ch.sendToQueue(service, toBuffer(args), parameters);
                });
            });
        },

        promise: function () {
            const args = [].slice.call(arguments);
            return new Promise(function (resolve, reject) {
                rpc.call.apply(null, args.concat(function (err) {
                    if (err) reject(err);
                    else {
                        const args = [].slice.call(arguments, 1);
                        resolve(...args);
                    }
                }));
            })
        }
    };

    return rpc;

};