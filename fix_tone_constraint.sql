BEGIN;

-- 1. Eliminar el constraint restrictivo antiguo
ALTER TABLE public.assistants
DROP CONSTRAINT IF EXISTS assistants_tone_check;

-- 2. Añadir el nuevo constraint con todos los tonos soportados en el UI
ALTER TABLE public.assistants
ADD CONSTRAINT assistants_tone_check
CHECK (tone IN ('amigable', 'profesional', 'vendedor', 'cercano', 'directo'));

COMMIT;
