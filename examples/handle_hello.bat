@echo off

call lib/get_request %~1

set res.body=Hello, World!
set res.statusCode=200

call lib/respond %~1
