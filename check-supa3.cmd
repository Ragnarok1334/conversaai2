@echo off
setlocal EnableDelayedExpansion
for /f "tokens=1,* delims==" %%A in (.env.local) do (
    if "%%A"=="NEXT_PUBLIC_SUPABASE_URL" set SUPA_URL=%%B
    if "%%A"=="SUPABASE_SERVICE_ROLE_KEY" set SUPA_KEY=%%B
)

:: assistant_channels constraint (20260909033500)
curl -s "%SUPA_URL%/rest/v1/assistant_channels?select=channel&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-assistant-channels.json

:: profiles localization cols (20260909052000)
curl -s "%SUPA_URL%/rest/v1/profiles?select=timezone,currency,locale&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-profiles-cols.json

:: leads tags + follow_up (20260909090000)
curl -s "%SUPA_URL%/rest/v1/leads?select=next_follow_up,tags&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-leads-cols.json

echo DONE > ..\supa-pre-done.txt
