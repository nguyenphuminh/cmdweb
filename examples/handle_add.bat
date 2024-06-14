@echo off

call lib/get_request %~1

set res.body=%req.params.name%
set res.statusCode=200

call lib/respond %~1
