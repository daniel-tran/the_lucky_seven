@echo off

:: This will produce separate versions of selected .js files that can be imported by jest for unit testing.
:: If 'module.exports' is defined directly in the .js file, it shows up as a console error when running the sketch.

call :WRITE_TESTCLASS squadmember.js SquadMember
call :WRITE_TESTCLASS threat.js Threat

@echo on
exit /b

:WRITE_TESTCLASS
set testclassFile=__tests__\%1.testclass
echo Generating %testclassFile% with the following exports: %2
type %1 > %testclassFile%
echo module.exports = { %2 };>> %testclassFile%
