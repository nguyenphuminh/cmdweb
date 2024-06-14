## Introduction

Cmdweb is a framework/runtime that allows backend web development in Batch. While there are much better languages, I sometimes give myself a little challenge to go back and write Batch scripts. A big problem that Batch has is the inability to do server-side work by itself, so I made this as a plugin for Batch to do so.

While Batch is kind of tedious, I still try to make Cmdweb as easy to use as possible. You might notice there are parts of the code that can be made in a more optimized way, but I may intentionally do so to keep a clean coding experience.

Disclaimer: Project is heavily in-dev and there are vulnerabilities listed below, do not use for anything serious! (And why are you using Batch for something serious anyway?).

## Getting started

1. Install Node.js.
2. Git clone this repo.
3. Create a Batch file for your server, a Cmdweb project will look like this:
```bat
:: Get the necessary resources
call lib/init

:: Main code goes here

:: Start the js runtime
node lib/engine <port> "<hostname>"
```

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

You can get the request body like this:
```bat
:: This variable contains the request body
echo %req.body%
:: URL
echo %req.url%
:: Remote address
echo %req.address%
:: Headers are stored in a dictionary-like format, example:
echo %req.headers["content-type"]%
```

### Response body

And you can modify the response like this:
```bat
:: Response body
set res.body=Hello, World!
:: Status code, default is 200
set res.statusCode=200
:: Header JSON string
set res.headers={"content-type":"text/html"}
```

### URL params

Suppose you have a route like this:
```bat
call lib/listen "get" "/account/:name" get_account
```

In the handler, you can get the `name` parameter like this:
```bat
echo %req.params.name%
```

## Examples

You can move all files in `./examples` to the current directory, then type `app` in your console to start the server.

## Todos

* Fix: Current way to pass information to requests is vulnerable to code injection attacks.
* Plugins to parse JSON message bodies.

## Copyrights and License

Copyrights © 2024 Nguyen Phu Minh.

This project is licensed under the GPL 3.0 License.
