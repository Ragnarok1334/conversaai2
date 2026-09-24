BEGIN;

-- 1. Crear únicamente los perfiles faltantes.
INSERT INTO public.profiles (
  id,
  full_name,
  avatar_url
)
SELECT
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Usuario sin nombre'
  ),
  nullif(u.raw_user_meta_data ->> 'avatar_url', '')
FROM auth.users u
LEFT JOIN public.profiles p
  ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Crear únicamente las configuraciones faltantes.
INSERT INTO public.user_settings (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.user_settings us
  ON us.user_id = u.id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Crear automáticamente ambos registros para usuarios futuros.
CREATE OR REPLACE FUNCTION public.handle_new_user_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    coalesce(
      nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
      nullif(NEW.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(NEW.email, '@', 1), ''),
      'Usuario sin nombre'
    ),
    nullif(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.handle_new_user_records()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.handle_new_user_records()
TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created_records
ON auth.users;

CREATE TRIGGER on_auth_user_created_records
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_records();

COMMIT;
