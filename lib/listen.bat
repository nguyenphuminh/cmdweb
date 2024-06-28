set limit=%~5
if "%~5" == "" set limit=8100

echo.%~1 %~2 %~3 %~4 %limit% >>temp/routes.txt
