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

module.exports = function (options = {}) {

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
                callbacks[corrId](...fromBuffer(msg.content));
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
                        const args = fromBuffer(msg.content),
                            callback = function (...args) {
                                ch.sendToQueue(msg.properties.replyTo, toBuffer(args), {
                                    correlationId: msg.properties.correlationId
                                });
                                ch.ack(msg);
                            };
                        let possiblePromise = handler(...args, callback);
                        // We can return promise from handler
                        if(typeof possiblePromise === 'object')
                            Promise.resolve(possiblePromise).asCallback(callback)
                    });
                });
            });
        },

        call: function (service, ...args_and_cb) {
            const [callback] = args_and_cb.slice(-1),
                args = args_and_cb.slice(0, args_and_cb.length -1 )
            ;
            getChannel.then(function (ch) {
                return getReplyQueue.then(function (replyQueue) {
                    const corrId = uuid();
                    callbacks[corrId] = callback;
                    let parameters={
                        correlationId: corrId,
                        replyTo: replyQueue
                    };
                    if(options.expiration)parameters.expiration=options.expiration;
                    return ch.sendToQueue(service, toBuffer(args), parameters);
                });
            })
                .catch( reason => console.error('RabbitRPC Error: ',reason))
        },

        promise: function (...args) {
            return new Promise(function (resolve, reject) {
                rpc.call(...args, function (err, ...result) {
                    if (err) reject(err);
                    else resolve(...result);
                });
            })
        }
    };

    return rpc;

};