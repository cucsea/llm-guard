@echo off
rem ============================================================
rem  Jizhi Agent launcher
rem  - Sets Jizhi_HOME to THIS script's directory (D:\llm-safe)
rem    (env var name kept as HERMES_HOME for engine compatibility;
rem     the brand rename of internals is a separate step)
rem  - Only affects THIS process; no permanent env var is written
rem  - Passes through any args, e.g.:  jizhi.bat gateway
rem                                   jizhi.bat --continue
rem ============================================================

rem %~dp0 = drive+path of this .bat file, with trailing backslash.
rem Strip the trailing backslash so JIZHI_HOME is clean.
set "JIZHI_HOME=%~dp0"
if "%JIZHI_HOME:~-1%"=="\" set "JIZHI_HOME=%JIZHI_HOME:~0,-1%"

rem Also set HERMES_HOME for engine compatibility (Python back-end reads
rem this via get_hermes_home() with JIZHI_HOME as fallback).
set "HERMES_HOME=%JIZHI_HOME%"

rem For "home" subcommand, inject --host 0.0.0.0 so the web UI is
rem accessible from other devices on the LAN (e.g. 192.168.x.x:8801).
set "EXTRA_ARGS="
if /I "%~1"=="home" set "EXTRA_ARGS=--host 0.0.0.0"

rem Run the agent with the bundled embedded Python.
rem %* forwards every argument you pass to this script.
"%~dp0hermes-agent\python_embedded\python.exe" "%~dp0hermes-agent\hermes" %* %EXTRA_ARGS%
