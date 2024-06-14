@echo off

:: Get the necessary resources
call lib/init

:: Routing
call lib/listen "get" "/" handle_main
call lib/listen "get" "/hello" handle_hello
call lib/listen "post" "/add/:name" handle_add

:: Start the js runtime
node lib/engine 5000 "127.0.0.1"
