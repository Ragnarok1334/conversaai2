@echo off
setlocal EnableDelayedExpansion
for /f "tokens=1,* delims==" %%A in (.env.local) do (
    if "%%A"=="NEXT_PUBLIC_SUPABASE_URL" set SUPA_URL=%%B
    if "%%A"=="SUPABASE_SERVICE_ROLE_KEY" set SUPA_KEY=%%B
)

:: Columnas de conversations (handoff)
curl -s "%SUPA_URL%/rest/v1/conversations?select=handoff_status,handoff_reason,ai_paused,human_requested_at,assigned_to,assigned_at&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-conv-cols.json

:: Columnas de messages (sender_type, provider_message_id)
curl -s "%SUPA_URL%/rest/v1/messages?select=sender_type,provider_message_id&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-msg-cols.json

:: Columnas de user_settings (sonido)
curl -s "%SUPA_URL%/rest/v1/user_settings?select=chat_sound_enabled,notification_sound_enabled&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-usersettings-cols.json

:: notifications.metadata
curl -s "%SUPA_URL%/rest/v1/notifications?select=metadata&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-notif-meta.json

:: whatsapp_webhook_events
curl -s "%SUPA_URL%/rest/v1/whatsapp_webhook_events?select=id,event_type,status&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-wha-events.json

:: facebook_webhook_events
curl -s "%SUPA_URL%/rest/v1/facebook_webhook_events?select=id,event_type,status&limit=1" ^
  -H "apikey: %SUPA_KEY%" -H "Authorization: Bearer %SUPA_KEY%" ^
  > ..\supa-fb-events.json

:: schema_migrations via Management API would need access_token, skip
echo COLS_DONE > ..\supa-cols-done.txt
