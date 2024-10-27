:: Start the engine up, I have uses for this in the future

:: If port is not already configured, use the argument
if "%server.port%" == "" set server.port=%~1
:: If the argument is also empty, use 8000 as default port
if "%server.port%" == "" set server.port=8000

:: If hostname is not already configured, use the argument
if "%server.hostname%" == "" set server.hostname=%~2
:: If the argument is also empty, use 127.0.0.1 as default hostname
if "%server.hostname%" == "" set server.hostname=127.0.0.1

:: If ssl key path is not already configured, use the argument
if "%server.ssl.keypath%" == "" set server.ssl.keypath=%~3
:: If ssl cert path is not already configured, use the argument
if "%server.ssl.crtpath%" == "" set server.ssl.crtpath=%~4
:: If ssl ca path is not already configured, use the argument
if "%server.ssl.capath%" == "" set server.ssl.capath=%~5

node lib/engine "%server.port%" "%server.hostname%" "%server.ssl.keypath%" "%server.ssl.crtpath%" "%server.ssl.capath%"
