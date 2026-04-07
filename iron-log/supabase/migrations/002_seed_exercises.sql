-- Iron Log — Seed Exercises
-- Run after 001_init.sql

INSERT INTO exercises (name, movement_pattern, session_type, equipment, primary_muscle, secondary_muscles, load_increment) VALUES
-- UPPER — Empurrar Horizontal
('Supino Reto com Barra', 'horizontal_push', 'upper', 'barbell', 'chest', ARRAY['triceps','front_delts'], 2.5),
('Supino Inclinado com Halteres', 'horizontal_push', 'upper', 'dumbbell', 'chest', ARRAY['triceps','front_delts'], 2.0),
-- UPPER — Puxar Horizontal
('Remada Curvada com Barra', 'horizontal_pull', 'upper', 'barbell', 'lats', ARRAY['biceps','rear_delts','traps'], 2.5),
('Remada Cavalinho (T-Bar)', 'horizontal_pull', 'upper', 'machine', 'lats', ARRAY['biceps','traps'], 2.5),
-- UPPER — Empurrar Vertical
('Desenvolvimento Militar com Barra', 'vertical_push', 'upper', 'barbell', 'front_delts', ARRAY['triceps','traps'], 2.5),
('Desenvolvimento com Halteres', 'vertical_push', 'upper', 'dumbbell', 'front_delts', ARRAY['triceps'], 2.0),
-- UPPER — Puxar Vertical
('Puxada Pronada', 'vertical_pull', 'upper', 'cable', 'lats', ARRAY['biceps','traps'], 2.5),
('Puxada Neutra', 'vertical_pull', 'upper', 'cable', 'lats', ARRAY['biceps'], 2.5),
-- UPPER — Isolados
('Rosca Direta com Barra', 'biceps_isolation', 'upper', 'barbell', 'biceps', ARRAY[]::TEXT[], 1.25),
('Rosca Scott com Haltere', 'biceps_isolation', 'upper', 'dumbbell', 'biceps', ARRAY[]::TEXT[], 1.0),
('Tríceps Corda', 'triceps_isolation', 'upper', 'cable', 'triceps', ARRAY[]::TEXT[], 2.5),
('Tríceps Francês com Barra', 'triceps_isolation', 'upper', 'barbell', 'triceps', ARRAY[]::TEXT[], 1.25),
('Elevação Lateral com Halteres', 'side_delt_isolation', 'upper', 'dumbbell', 'side_delts', ARRAY[]::TEXT[], 1.0),
('Elevação Lateral no Cabo', 'side_delt_isolation', 'upper', 'cable', 'side_delts', ARRAY[]::TEXT[], 1.25),
-- LOWER — Quad Dominante
('Agachamento Livre', 'quad_dominant', 'lower', 'barbell', 'quads', ARRAY['glutes','hamstrings'], 2.5),
('Agachamento Hack', 'quad_dominant', 'lower', 'machine', 'quads', ARRAY['glutes'], 5.0),
-- LOWER — Hip Hinge
('Stiff com Barra', 'hip_hinge', 'lower', 'barbell', 'hamstrings', ARRAY['glutes','lower_back'], 2.5),
('Levantamento Terra Romeno', 'hip_hinge', 'lower', 'barbell', 'hamstrings', ARRAY['glutes','lower_back'], 2.5),
-- LOWER — Acessórios
('Leg Press', 'quad_accessory', 'lower', 'machine', 'quads', ARRAY['glutes'], 5.0),
('Cadeira Extensora', 'quad_accessory', 'lower', 'machine', 'quads', ARRAY[]::TEXT[], 2.5),
('Mesa Flexora', 'hamstring_isolation', 'lower', 'machine', 'hamstrings', ARRAY[]::TEXT[], 2.5),
('Hip Thrust com Barra', 'glute_isolation', 'lower', 'barbell', 'glutes', ARRAY['hamstrings'], 5.0),
('Panturrilha no Smith', 'calf', 'lower', 'machine', 'calves', ARRAY[]::TEXT[], 2.5),
('Panturrilha Sentado', 'calf', 'lower', 'machine', 'calves', ARRAY[]::TEXT[], 2.5);
