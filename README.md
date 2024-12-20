## Introduction

Cmdweb is a framework/runtime that allows backend web development in Batch. While there are much better languages, I sometimes give myself a little challenge to go back and write Batch scripts. A big problem that Batch has is the inability to do server-side work by itself, so I made this as a plugin for Batch to do so.

Disclaimer: Project is heavily in-dev and there might be vulnerabilities, do not use for anything serious!

## Getting started

1. Install Node.js.
2. Git clone this repo.
3. Create a Batch file for your server, a Cmdweb project will look like this:
```bat
:: Get the necessary resources
call lib/init

:: Main code goes here

:: Start the js runtime
call lib/start <port> "<hostname>"
```

If not specified, port will be 8000 and hostname will be `127.0.0.1`.

## Routing

Routing can be done as easily as:
```bat
call lib/listen "method" "/route" handler
```

Here, `"method"` is any valid HTTP/1.1 method, `"/route"` is self-explanatory, and `handler` is the function (batch file) to call when there is a request coming at this route.

## Handle requests

In a `handler.bat` file, you must follow this template:
```bat
@echo off
call lib/get_request %~1

:: Main code goes here

call lib/respond %~1
```

`@echo off` is just there for clean logs, and `%~1` is the ID of the request. Calling `lib/get_request` will get the information of this request, and calling `lib/respond` sends the response to the client.

### Request body

You can get the request body using these variables:
```bat
:: This variable contains the request body
echo %req.body%
:: URL (contains query params)
echo %req.url%
:: Path (does not contain query params)
echo %req.path%
:: Remote address
echo %req.address%
:: Headers are stored in a dictionary-like format, example:
echo %req.headers["content-type"]%
```

### Response body

Here is how to create a response:
```bat
:: Response body
set res.body=Hello, World!
:: Status code, default is 200
set res.statusCode=200
:: Header JSON string
set res.headers={"content-type":"text/html"}
```

Though, note that Batch commands are limited to 8197 characters, so minus the variable length you can have around ~8100 characters in a variable. I will soon add streaming to solve this problem.

### Serving static files

You can respond with a static file by providing a path in this variable:
```bat
set res.file=./path/to/file
```

Note that you must provide the content type yourself in the headers if you need.

### URL params

Suppose you have a route like this:
```bat
call lib/listen "get" "/account/:name" get_account
```

In the handler, you can get the `name` parameter:
```bat
echo %req.params.name%
```

### Query params

With an url like `http://bob.com/docs?page=30`, you can access the `page` parameter like so:
```bat
echo %req.query.params.page%
```

Cmdweb also comes with arrays support: In the case where you have duplicated keys: `http://bob.com/docs?page=30&page=31&page=32`, page will be parsed as an array, and you can access `page` with variables following this format:
```bat
echo %req.query.params.page[0]%
echo %req.query.params.page[1]%
echo %req.query.params.page[2]%
```

## Message formats

Cmdweb supports message parsing based on specific formats and convert them into Batch variables to be used in a convenient way. You can provide a fourth optional argument to enable message parsing for that message format, for example:
```bat
call lib/listen "post" "/account" add_account "json"
```

Currently the only supported message formats are JSON and url encoded form data.

### JSON messages

JSON messages will be parsed and stored into variables in a dictionary-like manner. For example, if we have a message payload like:
```json
{
    "name": "Bob",
    "age": 19,
    "profile": {
        "isForeign": false,
        "isRich": true
    },
    "jobs": [ "Baker", "Coder", "Investor" ]
}
```

You can access each property like this:
```bat
echo %req.body["name"]%
echo %req.body["age"]%
echo %req.body["profile"]["isForeign"]%
echo %req.body["profile"]["isRich"]%
echo %req.body["jobs"][0]%
echo %req.body["jobs"][1]%
echo %req.body["jobs"][2]%
```

The original JSON string is still available in `req.body`. Like mentioned earlier, `req.body` can only store ~8100 characters, but each of these variables can store ~8100 characters as well. Which means although a variable is limited, you can still have your message size be much larger if you design your message schema such that each property does not exceed 8100 characters.

### Url encoded form data

Url encoded form data will also be parsed and stored into variables in a dictionary-like manner. For example, if we have a message payload like:
```
name=Bob+Ross&age=20&city=New+York
```

Here is how you can access each field:
```bat
echo %req.body["name"]%
echo %req.body["age"]%
echo %req.body["city"]%
```

And of course arrays are supported. For example, if the message is `name=Bob+Ross&name=Steve+Jobs&name=Dennis+Ritchie`, you can access each field like so:
```bat
echo %req.body["name"][0]%
echo %req.body["name"][1]%
echo %req.body["name"][2]%
```

### Message size limit

You can configure the maximum message size that each route will receive, default is 8100 bytes. Example:
```bat
:: This will limit the message size to 1048576 bytes, aka 1 megabyte
call lib/listen "post" "/update/account/:name" update_account "json" 1048576
```

### Character escaping

Because characters like `& > < | ^ % \n` might cause troubles in our Batch scripts, they are stored into variables in an escaped format:
* `& > < | ^` are escaped with `^^^`.
* `%` is escaped by duplicating itself.
* `\n` is replaced with `%NL%` - a built in macro of Cmdweb that can act as a new line.

## SSL

You can load your ssl certificate and host a public https server:
```bat
call lib/start 443 "0.0.0.0" "./path/to/key" "./path/to/cert" "./path/to/ca"
```

## Server configurations

Currently there are not many options to configure so you can call `lib/start` and pass arguments directly like above, but there might be in the future. Therefore, you can also configure and start your server this way:

```bat
set server.port=443
set server.hostname=0.0.0.0
set server.ssl.keypath=./key.txt
set server.ssl.crtpath=./crt.txt
set server.ssl.capath=./ca.txt

call lib/start
```

Note that the variables above have higher priority than the arguments, so for example `call lib/start 80` will still result in port 443 following the configuration above.

## Utilities

### New lines

Cmdweb comes with a macro called `NL` which is an equivalent to a new line. For example:
```bat
set req.body=Hello%NL%World
```

is equivalent to:
```
Hello
World
```

## Examples

You can move all files in `./examples` to the current directory, then type `app` in your console to start the server.

## Todos

Note: The list is not in order.
* Serve/handle data through streams.
* Add message parsing for more message formats.
* A better way to configure for each route.
* A better way to respond/write to headers.
* Comfortable ways to deal with CORS.
* DB integration.
* Caching.
* Check for code injection possibilities.

## Copyrights and License

Copyrights © 2024 Nguyen Phu Minh.

This project is licensed under the GPL 3.0 License.
