-- Atualizar o enum de roles para incluir o perfil de funcionário
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';