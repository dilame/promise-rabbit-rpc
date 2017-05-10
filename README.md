# rabbit-rpc
Bluebird-based promise [RabbitMQ](https://www.rabbitmq.com/) RPC using [amqp.node](https://github.com/squaremo/amqp.node)

## Install
```sh
> npm install promise-rabbit-rpc
```

## example

### Establish connection

```js
const rpc = require('promise-rabbit-rpc')('amqp://localhost');
```

## Promises

### handler.js
Lets write a handler, that will return the square of the number.
Note that handler can accept any number of arguments. You can use ES6 spread feature.
Function `handler` is fully-fledged element of promise chain. This means that you can throw an error, or return Promise.reject(), and caller instance will recieve it.
Althoug you can return pure value or return Promise.resolve() with value - same result.
```js
rpc.process('sum', function handler(...numbers) {
    if(numbers.length === 0) return Promise.reject(new Error('No numbers'));
    return Promise.resolve(numbers.reduce((a, sum) => sum + a));
})
```
Now we can call this handler from any instance. You can `catch` errors like if caller and handler are executed on one nodejs process. But actually they can be located in different parts of the globe.
```js
rpc.promise('sum', 1, 2, 3)
    .then( res => console.log('The sum is ', res) )
    .catch( reason => console.error(reason) )
```


### caller.js
If you don't want to use promise.
```js
rpc.call('sum', 1, 2, 3, function (err, res) {
    console.log('The square of 99 is', res);
});

```

## Multiple types
Send strings, numbers, arrays, objects or buffers. Arguments are serialized to [BSON](http://bsonspec.org/) using [node-buffalo](https://github.com/marcello3d/node-buffalo).

```js
rpc.call('getFile', __dirname, 'getfile.js', function (err, stats, data) {
    if (err) {
        return console.error('Got error', err);
    } else {
        console.log('Got file', stats.size, data.length);
    }
});

rpc.handle('getFile', function (dir, filename, callback) {
    let path = dir + '/' + filename;
    fs.stat(path, function (err, stats) {
        if (err) return callback(err);
        fs.readFile(path, function (err, data) {
            if (err) return callback(err);
            callback(null, stats, data)
        });
    });
});
```
