@echo off
setlocal EnableDelayedExpansion
for /f "tokens=1,* delims==" %%A in (.env.local) do (
    if "%%A"=="NEXT_PUBLIC_SUPABASE_URL" set SUPA_URL=%%B
    if "%%A"=="SUPABASE_SERVICE_ROLE_KEY" set SUPA_KEY=%%B
)

curl -s "%SUPA_URL%/rest/v1/facebook_webhook_events?status=eq.failed&select=*&order=received_at.desc&limit=1" ^
  -H "apikey: %SUPA_KEY%" ^
  -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-fb-failed.json

echo DONE
