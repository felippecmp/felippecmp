-- Felippe's Log — Rotação configurável de templates.
--
-- 'auto'   = comportamento atual: alterna upper↔lower, rotaciona dentro do tipo.
-- 'linear' = ignora tipo, pega o próximo template em ordem de sort_order global.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS rotation_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (rotation_mode IN ('auto', 'linear'));
