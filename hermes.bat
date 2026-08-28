@echo off
rem ============================================================
rem  Hermes Agent launcher
rem  - Sets HERMES_HOME to THIS script's directory (D:\llm-safe)
rem  - Only affects THIS process; no permanent env var is written
rem  - Passes through any args, e.g.:  hermes.bat gateway
rem                                   hermes.bat --continue
rem ============================================================

rem %~dp0 = drive+path of this .bat file, with trailing backslash.
rem Strip the trailing backslash so JIZHI_HOME is clean.
set "JIZHI_HOME=%~dp0"
if "%JIZHI_HOME:~-1%"=="\" set "JIZHI_HOME=%JIZHI_HOME:~0,-1%"

rem Run Hermes with the bundled embedded Python.
rem %* forwards every argument you pass to this script.
"%~dp0hermes-agent\python_embedded\python.exe" "%~dp0hermes-agent\hermes" %*

rem Keep the window open only if launched by double-click (no args
rem and interactive). When called from a terminal it just returns.
