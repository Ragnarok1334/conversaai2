-- ════════════════════════════════════════════════════════════════════════════
-- Completar políticas RLS multi-tenant (authenticated) faltantes
-- ════════════════════════════════════════════════════════════════════════════
-- PROPÓSITO: Las tablas profiles, user_settings, conversations, messages y
--            leads ya tienen RLS habilitado y política SELECT propietario
--            (auth.uid() = id / user_id), pero carecían de políticas
--            explícitas de INSERT y/o UPDATE a nivel de base de datos. Hasta
--            ahora el aislamiento de escritura dependía únicamente de que las
--            rutas API filtraran por user_id, sin una barrera adicional en
--            RLS. Esta migración agrega esa barrera multi-tenant.
--
-- ALCANCE (solo políticas, nada de DDL de esquema):
--   1. profiles       — INSERT propietario (auth.uid() = id)
--   2. user_settings  — INSERT y UPDATE propietario (auth.uid() = user_id)
--   3. conversations  — UPDATE propietario (auth.uid() = user_id)
--   4. messages       — INSERT propietario (auth.uid() = user_id)
--   5. leads          — INSERT y UPDATE propietario (auth.uid() = user_id)
--
-- DELIBERADAMENTE NO INCLUIDAS (por diseño del flujo de datos, no por
-- omisión):
--   - conversations INSERT: las conversaciones solo se crean desde el
--     widget público y webhooks de canal (WhatsApp/Facebook/Telegram), que
--     operan con service_role y por lo tanto no pasan por RLS de
--     authenticated. Agregar esta política daría una vía de escritura
--     directa que no es parte del flujo real.
--   - messages UPDATE: los mensajes son append-only una vez insertados por
--     operadores humanos o el sistema; no existe caso de uso de edición y
--     permitirlo abriría una vía de manipulación de historial de chat.
--
-- NO ALCANCE (explícito):
--   - NO se modifican rutas API (src/app/api/**).
--   - NO se eliminan ni reemplazan políticas SELECT existentes.
--   - NO se modifican tablas, columnas ni constraints.
--   - NO se toca RLS de otras tablas (assistants, subscriptions,
--     whatsapp_channels, facebook_channels, billing_payments, etc.), que
--     quedan fuera de este alcance y no fueron mencionadas en el pedido.
--
-- IDEMPOTENCIA: PostgreSQL no soporta "CREATE POLICY IF NOT EXISTS" de forma
-- nativa. Se replica el mismo patrón ya usado en este repo para constraints
-- (ver 20260909090000_add_lead_follow_up_and_tags.sql y
-- 20260910215918_human_handoff.sql): un bloque DO $$ ... END $$ que consulta
-- pg_policies antes de crear la política, evitando duplicados si la
-- migración se vuelve a ejecutar.
--
-- FECHA: 2026-09-24
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. profiles: INSERT propietario ───────────────────────────────────────
-- Multi-tenant authenticated: permite crear únicamente la propia fila de
-- perfil (id debe coincidir con el usuario autenticado).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.profiles for insert to authenticated
      with check ((select auth.uid()) = id);
  end if;
end $$;

-- ─── 2. user_settings: INSERT y UPDATE propietario ─────────────────────────
-- Multi-tenant authenticated: cada usuario solo puede crear y modificar su
-- propia fila de configuración (user_id = auth.uid()).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_settings'
      and policyname = 'Users can insert own settings'
  ) then
    create policy "Users can insert own settings"
      on public.user_settings for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_settings'
      and policyname = 'Users can update own settings'
  ) then
    create policy "Users can update own settings"
      on public.user_settings for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- ─── 3. conversations: UPDATE propietario ──────────────────────────────────
-- Multi-tenant authenticated: cada usuario solo puede modificar
-- conversaciones que le pertenecen (user_id = auth.uid()). No se agrega
-- INSERT: las conversaciones se crean únicamente desde el widget/webhooks
-- vía service_role, fuera del alcance de RLS de authenticated.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'Users can update own conversations'
  ) then
    create policy "Users can update own conversations"
      on public.conversations for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- ─── 4. messages: INSERT propietario ───────────────────────────────────────
-- Multi-tenant authenticated: cada usuario solo puede crear mensajes que le
-- pertenecen (user_id = auth.uid()). No se agrega UPDATE: los mensajes son
-- append-only, insertados por operadores humanos; no deben poder editarse
-- una vez creados.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Users can insert own messages'
  ) then
    create policy "Users can insert own messages"
      on public.messages for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- ─── 5. leads: INSERT y UPDATE propietario ─────────────────────────────────
-- Multi-tenant authenticated: cada usuario solo puede crear y modificar
-- leads que le pertenecen (user_id = auth.uid()).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'Users can insert own leads'
  ) then
    create policy "Users can insert own leads"
      on public.leads for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'Users can update own leads'
  ) then
    create policy "Users can update own leads"
      on public.leads for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

comment on policy "Users can insert own profile" on public.profiles is
  'Multi-tenant authenticated: permite insertar únicamente la propia fila de perfil.';
comment on policy "Users can insert own settings" on public.user_settings is
  'Multi-tenant authenticated: permite insertar únicamente la propia configuración.';
comment on policy "Users can update own settings" on public.user_settings is
  'Multi-tenant authenticated: permite actualizar únicamente la propia configuración.';
comment on policy "Users can update own conversations" on public.conversations is
  'Multi-tenant authenticated: permite actualizar únicamente conversaciones propias.';
comment on policy "Users can insert own messages" on public.messages is
  'Multi-tenant authenticated: permite insertar únicamente mensajes propios.';
comment on policy "Users can insert own leads" on public.leads is
  'Multi-tenant authenticated: permite insertar únicamente leads propios.';
comment on policy "Users can update own leads" on public.leads is
  'Multi-tenant authenticated: permite actualizar únicamente leads propios.';

-- ─── VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente) ────────────────────
--
-- SELECT schemaname, tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles','user_settings','conversations','messages','leads')
-- ORDER BY tablename, cmd;
-- Esperado: cada tabla mantiene su política SELECT previa intacta, más:
--   profiles       -> +INSERT
--   user_settings  -> +INSERT, +UPDATE
--   conversations  -> +UPDATE (sin INSERT nuevo)
--   messages       -> +INSERT (sin UPDATE nuevo)
--   leads          -> +INSERT, +UPDATE
--
-- ROLLBACK (solo emergencia):
-- DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
-- DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
-- DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
-- DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
-- DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
-- DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;

