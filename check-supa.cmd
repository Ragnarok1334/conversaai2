@echo off
setlocal EnableDelayedExpansion

:: Lee las vars de .env.local
for /f "tokens=1,* delims==" %%A in (.env.local) do (
    if "%%A"=="NEXT_PUBLIC_SUPABASE_URL" set SUPA_URL=%%B
    if "%%A"=="SUPABASE_SERVICE_ROLE_KEY" set SUPA_KEY=%%B
)

:: Query migrations aplicadas
curl -s -X POST "%SUPA_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SUPA_KEY%" ^
  -H "Authorization: Bearer %SUPA_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version\"}" ^
  > ..\supa-migrations.json 2>&1

:: Query existencia de tablas nuevas
curl -s -X GET "%SUPA_URL%/rest/v1/whatsapp_channels?select=id&limit=0" ^
  -H "apikey: %SUPA_KEY%" ^
  -H "Authorization: Bearer %SUPA_KEY%" ^
  -o ..\supa-wha-check.json -w "WHA_STATUS:%%{http_code}" >> ..\supa-checks.log 2>&1

curl -s -X GET "%SUPA_URL%/rest/v1/facebook_channels?select=id&limit=0" ^
  -H "apikey: %SUPA_KEY%" ^
  -H "Authorization: Bearer %SUPA_KEY%" ^
  -o ..\supa-fb-check.json -w "FB_STATUS:%%{http_code}" >> ..\supa-checks.log 2>&1

curl -s -X GET "%SUPA_URL%/rest/v1/conversations?select=handoff_status&limit=0" ^
  -H "apikey: %SUPA_KEY%" ^
  -H "Authorization: Bearer %SUPA_KEY%" ^
  -o ..\supa-handoff-check.json -w "HANDOFF_STATUS:%%{http_code}" >> ..\supa-checks.log 2>&1

curl -s -X GET "%SUPA_URL%/rest/v1/user_settings?select=chat_sound_enabled&limit=0" ^
  -H "apikey: %SUPA_KEY%" ^
  -H "Authorization: Bearer %SUPA_KEY%" ^
  -o ..\supa-notif-check.json -w "NOTIF_STATUS:%%{http_code}" >> ..\supa-checks.log 2>&1

echo DONE >> ..\supa-checks.log
