:: Used to get request info

:: New line macros
set NLM=^


set NL=^^^%NLM%%NLM%^%NLM%%NLM%

:: Load the req info that the engine sent us
call temp/%~1
