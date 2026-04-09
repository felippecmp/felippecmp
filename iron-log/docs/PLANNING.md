# FELIPPE'S LOG — Fitness Journal

## Ultra Planning Document for Claude Code Implementation

-----

## 0. DESIGN PRINCIPLES — "É um caderno, não um app comercial"

O app cresceu de tracker de strength puro pra log de fitness geral (strength + cardio + peso corporal + anotações). A metáfora guia é **caderno pessoal**: chronológico, denso, sem pretensão de vender nada a quem escreve.

As 11 regras duras, usadas como critério de design sempre que tiver dúvida:

1. **Hoje é a página, não o dashboard.** Ações e fatos do presente. Fatos passados aparecem por scroll, não por clique em abas.
2. **Cronologia antes de categoria.** Em dúvida, ordena por data, não por tipo.
3. **Adicionar qualquer coisa deve custar ≤ 2 taps.** Peso: 1 tap + digita. Cardio: 1 tap + upload. Sessão: 1 tap.
4. **Densidade > whitespace.** Linhas compactas de texto tabular, não cards gigantes de 200px de padding. Exceção autorizada: seções hero de Progresso.
5. **Sem métricas vazias.** Se o número não ajuda a decidir algo, corta.
6. **Sem nudge que puxa de fora.** Sem push, sem e-mail, sem pop-up ao abrir. A Progresso pode ter streaks, comparações e destaques motivacionais — mas só quem visita ela vê.
7. **Edit e delete em qualquer coisa, sem cerimônia.** Abriu a entrada → editou → salvou. Sem "tem certeza?" duplo exceto pra deletar sessão inteira ou dados em cascata.
8. **Zero emoji na UI.** Tipografia faz o trabalho. Ícones Lucide permitidos (são iconografia, não emoji).
9. **Sem tom de coach vendedor.** Permite celebrar marcos de forma direta ("PR: 82.5 × 8 reps"). Sem exclamações forçadas, "você consegue!", "parabéns!".
10. **Nada acontece no server que tu não pediu.** Sem job semanal de resumo, sem e-mail, sem webhook saindo. Server só responde a requests.
11. **Progresso é o espaço autorizado pra ambição visual.** Streak, números grandes, charts ricos, comparações entre períodos, highlights de PRs. Densidade visual alta aqui é bem-vinda — é o momento de reflexão, não de ação.

**Corolário de arquitetura**:
- **Hoje** = diário. Streak discreto + próximo treino + entradas de hoje + scroll reverso.
- **Treinar** = modo de escrita focada pro strength. Tela dedicada com rest timer, sets, nada mais.
- **Progresso** = índice e reflexão. Gráficos, comparações, streaks, PRs.
- **Exercícios** = dicionário. Catálogo + seção "Usados" no topo com ordem por uso.
- **Settings** = config + catálogo secundário (peso, cardio history). Acesso via gear icon na Hoje, não pelo BottomNav.

-----

## 1. VISÃO DO PRODUTO

App de tracking pessoal focado em **Upper/Lower split com double progression 4-8 reps**, baseado nos princípios de liftrunbang1/Bret Contreras — volume baixo (5-6 sets diretos/semana), intensidade alta (RIR 1-2), descansos longos (2-5 min). Expandido em Sprints 5d-5f pra também registrar peso corporal e cardio/caminhadas.

**Stack:** Next.js 16 (App Router) → Vercel | Supabase (Postgres + RLS; auth por senha HMAC cookie, não Supabase Auth) | Tailwind CSS v4

**Usuário:** Single-user (Felippe). `auth.uid() = NULL` em tudo, proteção por middleware cookie.

-----

## 2. MODELO DE TREINO

### 2.1 Split Structure

```
Ciclo rolling de 3 dias (NÃO é baseado em semana fixa):

Dia 1 → Upper
Dia 2 → Lower
Dia 3 → OFF
Dia 4 → Upper
Dia 5 → Lower
Dia 6 → OFF
... (repete infinitamente)

Resultado em 7 dias rolantes: ~3x Upper, ~3x Lower
O app NÃO deve pensar em "semanas" — deve pensar em CICLOS de 3 dias.
```

O app sugere o próximo treino baseado no último registrado:

- Último foi Upper → próximo é Lower
- Último foi Lower → próximo é OFF (ou Upper se já descansou 1 dia)
- Lógica: olha `workout_sessions.started_at` do último treino e o tipo (upper/lower)

Templates rodam em rotação: Upper A → Lower A → OFF → Upper B → Lower B → OFF → Upper C → Lower C → OFF → volta pro A.

### 2.2 Estrutura de Sessão

Cada sessão é composta por **slots de padrão de movimento**:

**Upper:**

|Slot|Padrão             |Sets|Target           |
|----|-------------------|----|-----------------|
|1   |Empurrar Horizontal|2-3 |Peito            |
|2   |Puxar Horizontal   |2-3 |Dorsais          |
|3   |Empurrar Vertical  |2-3 |Deltóide Anterior|
|4   |Puxar Vertical     |2-3 |Dorsais          |
|5   |Bíceps Direto      |2   |Bíceps           |
|6   |Tríceps Direto     |2   |Tríceps          |
|7   |Deltóide Lateral   |2   |Side Delts       |

**Lower:**

|Slot|Padrão          |Sets|Target         |
|----|----------------|----|---------------|
|1   |Quad Dominante  |2-3 |Quadríceps     |
|2   |Hip Hinge       |2-3 |Posterior Chain|
|3   |Quad Acessório  |2   |Quadríceps     |
|4   |Hamstring Direto|2   |Hamstrings     |
|5   |Glúteo Direto   |2   |Glúteos        |
|6   |Panturrilha     |2   |Calves         |

### 2.3 Double Progression Engine (CORE FEATURE)

O coração do app. Para cada exercício, o sistema tracked:

```
Rep Range: 4-8 (configurável)
Regra de progressão:
  - Se completou todas as sets no topo do range (8 reps) com RIR ≥ 1
  → SINALIZA: "Aumentar carga na próxima sessão"
  - Sugestão de incremento: +2.5kg compostos, +1-2kg isolados (configurável)
  - Nova carga → reps caem para ~4-5 → ciclo recomeça

Estado de cada exercício:
  - BUILDING: Trabalhando dentro do range, ainda não chegou no topo
  - READY_TO_PROGRESS: Todas as sets no topo do range, sinalizar aumento
  - JUST_PROGRESSED: Acabou de aumentar carga, reps devem estar baixas
  - STALLED: 3+ sessões sem conseguir adicionar reps → sinalizar deload ou troca
```

### 2.4 RIR Tracking

Cada set registra:

- Peso (kg)
- Reps completadas
- RIR (0, 1, 2, 3+) — input via botão rápido
- Nota opcional (texto curto: "grip falhou", "dor ombro", etc.)

-----

## 3. DATA MODEL (Supabase PostgreSQL)

### 3.1 Tables

```sql
-- Catálogo de exercícios
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  movement_pattern TEXT NOT NULL,
  session_type TEXT NOT NULL,
  equipment TEXT,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[],
  load_increment NUMERIC(4,2) DEFAULT 2.5,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  session_type TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workout_templates ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises,
  slot_order INT NOT NULL,
  target_sets INT DEFAULT 2,
  rep_range_low INT DEFAULT 4,
  rep_range_high INT DEFAULT 8,
  rest_seconds INT DEFAULT 180,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  template_id UUID REFERENCES workout_templates,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  overall_feeling INT CHECK (overall_feeling BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises,
  set_number INT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  rir INT CHECK (rir BETWEEN 0 AND 4),
  is_warmup BOOLEAN DEFAULT false,
  notes TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE progression_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  exercise_id UUID REFERENCES exercises,
  current_weight_kg NUMERIC(6,2),
  current_status TEXT DEFAULT 'building',
  sessions_at_current_weight INT DEFAULT 0,
  last_top_set_reps INT,
  last_session_date DATE,
  streak_at_top_range INT DEFAULT 0,
  stall_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE VIEW rolling_7day_volume AS
SELECT
  ws.user_id,
  e.primary_muscle,
  COUNT(wset.id) FILTER (WHERE NOT wset.is_warmup) AS total_sets,
  AVG(wset.weight_kg) AS avg_weight,
  AVG(wset.reps) AS avg_reps,
  AVG(wset.rir) AS avg_rir
FROM workout_sets wset
JOIN workout_sessions ws ON wset.session_id = ws.id
JOIN exercises e ON wset.exercise_id = e.id
WHERE NOT wset.is_warmup
  AND wset.performed_at >= NOW() - INTERVAL '7 days'
GROUP BY ws.user_id, e.primary_muscle;
```

### 3.2 RLS

```sql
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id);
-- Repetir para todas as tabelas com user_id
```

### 3.3 Indexes

```sql
CREATE INDEX idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_progression_state_user_exercise ON progression_state(user_id, exercise_id);
```

-----

## 4. DOUBLE PROGRESSION ALGORITHM

```typescript
interface ProgressionInput {
  exercise: Exercise;
  templateExercise: TemplateExercise;
  recentSets: WorkoutSet[];
  currentState: ProgressionState;
}

interface ProgressionOutput {
  suggestedWeight: number;
  status: 'building' | 'ready_to_progress' | 'just_progressed' | 'stalled';
  message: string;
  confidence: 'high' | 'medium' | 'low';
}

function evaluateProgression(input: ProgressionInput): ProgressionOutput {
  const { exercise, templateExercise, recentSets, currentState } = input;
  const { rep_range_low, rep_range_high, target_sets } = templateExercise;

  const sessionGroups = groupSetsBySession(recentSets);
  const lastSession = sessionGroups[0];

  if (!lastSession) {
    return {
      suggestedWeight: currentState.current_weight_kg || 0,
      status: 'building',
      message: 'Primeiro treino — escolha um peso que permita 6-8 reps com RIR 2',
      confidence: 'low'
    };
  }

  const workingSets = lastSession.filter(s => !s.is_warmup);
  const allAtTopRange = workingSets.every(s => s.reps >= rep_range_high);
  const allWithGoodRIR = workingSets.every(s => s.rir >= 1);
  const avgReps = workingSets.reduce((sum, s) => sum + s.reps, 0) / workingSets.length;
  const maxWeight = Math.max(...workingSets.map(s => s.weight_kg));

  if (allAtTopRange && allWithGoodRIR) {
    const newWeight = maxWeight + exercise.load_increment;
    return {
      suggestedWeight: newWeight,
      status: 'ready_to_progress',
      message: `Todas as sets em ${rep_range_high} reps. Subir para ${newWeight}kg.`,
      confidence: 'high'
    };
  }

  if (currentState.stall_count >= 3) {
    return {
      suggestedWeight: maxWeight,
      status: 'stalled',
      message: `Estagnado há ${currentState.stall_count} sessões. Considerar: deload 10%, trocar exercício, ou checar recuperação.`,
      confidence: 'high'
    };
  }

  if (currentState.current_status === 'ready_to_progress' && avgReps <= rep_range_low + 1) {
    return {
      suggestedWeight: maxWeight,
      status: 'just_progressed',
      message: `Peso novo consolidando. Meta: adicionar 1 rep por sessão.`,
      confidence: 'medium'
    };
  }

  return {
    suggestedWeight: maxWeight,
    status: 'building',
    message: `${avgReps.toFixed(0)}/${rep_range_high} reps. Continue construindo.`,
    confidence: 'medium'
  };
}
```

-----

## 5. FEATURE MAP & SCREENS

### 5.1 Telas Principais

```
📱 NAVEGAÇÃO (bottom tabs mobile-first):
├── 🏋️ TREINAR (home/default)
├── 📊 PROGRESSO
├── 📋 TEMPLATES
└── ⚙️ SETTINGS
```

### 5.2 Tela: TREINAR (/)

**Sem treino ativo:**
- Próximo treino sugerido (ex: "Próximo: Upper B")
- Preview dos exercícios + último peso
- Botão grande "Iniciar Upper B"
- Resumo últimos 7 dias: sets por grupo muscular vs target

**Treino ativo (/workout/[id]):**
- Lista de exercícios na ordem
- Por exercício: nome + último peso/reps, status badge, sugestão de peso, input rápido por set (peso, reps, RIR), timer de descanso
- Finalizar → overall_feeling (1-5)

```
┌─────────────────────────────────┐
│ Supino Reto com Barra           │
│ Último: 80kg × 7,7,6 (RIR 1)   │
│ Status: 🔨 Building → meta 8×3  │
│ Sugestão hoje: 80kg             │
├─────────────────────────────────┤
│ Set 1: [80.0]kg × [7] reps     │
│         RIR: (0) (●1) (2) (3)  │
│                                 │
│ Set 2: [80.0]kg × [_] reps     │
│         RIR: (0) (1) (2) (3)   │
│                                 │
│ ⏱️ Descanso: 2:47 / 3:00       │
├─────────────────────────────────┤
│       [ + Set extra ]           │
└─────────────────────────────────┘
```

### 5.3 Tela: PROGRESSO (/progress)

1. Volume 7 dias rolantes — bar chart
2. Progression Log — peso × reps ao longo do tempo
3. Força — estimated 1RM (Epley)
4. Consistência — calendar heatmap 90 dias

### 5.4 Tela: TEMPLATES (/templates)
CRUD de templates + catálogo. Drag-and-drop para reordenar.

### 5.5 Tela: SETTINGS (/settings)
Split config, rep range default, rest timer, incrementos, unidade, theme, export JSON.

-----

## 6. DESIGN SYSTEM

**Direção: "Gym Brutalist"** — dark theme, tipografia pesada, acentos em cores vivas.

```css
:root {
  --bg-primary: #0A0A0A;
  --bg-secondary: #141414;
  --bg-elevated: #1E1E1E;
  --border: #2A2A2A;
  --text-primary: #F5F5F5;
  --text-secondary: #888888;
  --text-muted: #555555;
  --status-building: #F59E0B;
  --status-ready: #10B981;
  --status-progressed: #3B82F6;
  --status-stalled: #EF4444;
  --accent: #F5F5F5;
  --accent-hover: #D4D4D4;
}
```

Fonts: Bebas Neue (display), JetBrains Mono (números), Outfit (body).

-----

## 7. API ROUTES (Next.js App Router)

```
/api/
├── exercises/           (GET, POST, PATCH, DELETE)
├── templates/           (GET, POST, PATCH, exercises sub-routes)
├── workouts/            (GET, POST, PATCH, sets sub-routes)
├── progression/         (GET estado + histórico)
└── stats/
    ├── rolling-volume/
    ├── exercise-history/[id]/
    └── consistency/
```

-----

## 8. IMPLEMENTAÇÃO — FASES

### FASE 1: Foundation
- Setup Next.js + Tailwind + shadcn/ui
- Supabase project, tables, RLS
- Auth (magic link)
- Layout base + seed exercícios

### FASE 2: Core Workout Flow
- CRUD templates
- Iniciar sessão + input de sets
- Rest timer
- Finalizar treino

### FASE 3: Double Progression Engine
- Algoritmo
- progression_state após sessão
- Sugestões e badges

### FASE 4: Analytics
- Volume chart, progression log, 1RM, heatmap

### FASE 5: Polish & PWA
- Offline, haptics, onboarding, export

-----

## 9. SEED DATA — EXERCÍCIOS INICIAIS

```typescript
const seedExercises = [
  // UPPER — Empurrar Horizontal
  { name: "Supino Reto com Barra", movement_pattern: "horizontal_push", session_type: "upper", equipment: "barbell", primary_muscle: "chest", secondary_muscles: ["triceps", "front_delts"], load_increment: 2.5 },
  { name: "Supino Inclinado com Halteres", movement_pattern: "horizontal_push", session_type: "upper", equipment: "dumbbell", primary_muscle: "chest", secondary_muscles: ["triceps", "front_delts"], load_increment: 2.0 },
  // UPPER — Puxar Horizontal
  { name: "Remada Curvada com Barra", movement_pattern: "horizontal_pull", session_type: "upper", equipment: "barbell", primary_muscle: "lats", secondary_muscles: ["biceps", "rear_delts", "traps"], load_increment: 2.5 },
  { name: "Remada Cavalinho (T-Bar)", movement_pattern: "horizontal_pull", session_type: "upper", equipment: "machine", primary_muscle: "lats", secondary_muscles: ["biceps", "traps"], load_increment: 2.5 },
  // UPPER — Empurrar Vertical
  { name: "Desenvolvimento Militar com Barra", movement_pattern: "vertical_push", session_type: "upper", equipment: "barbell", primary_muscle: "front_delts", secondary_muscles: ["triceps", "traps"], load_increment: 2.5 },
  { name: "Desenvolvimento com Halteres", movement_pattern: "vertical_push", session_type: "upper", equipment: "dumbbell", primary_muscle: "front_delts", secondary_muscles: ["triceps"], load_increment: 2.0 },
  // UPPER — Puxar Vertical
  { name: "Puxada Pronada", movement_pattern: "vertical_pull", session_type: "upper", equipment: "cable", primary_muscle: "lats", secondary_muscles: ["biceps", "traps"], load_increment: 2.5 },
  { name: "Puxada Neutra", movement_pattern: "vertical_pull", session_type: "upper", equipment: "cable", primary_muscle: "lats", secondary_muscles: ["biceps"], load_increment: 2.5 },
  // UPPER — Isolados
  { name: "Rosca Direta com Barra", movement_pattern: "biceps_isolation", session_type: "upper", equipment: "barbell", primary_muscle: "biceps", secondary_muscles: [], load_increment: 1.25 },
  { name: "Rosca Scott com Haltere", movement_pattern: "biceps_isolation", session_type: "upper", equipment: "dumbbell", primary_muscle: "biceps", secondary_muscles: [], load_increment: 1.0 },
  { name: "Tríceps Corda", movement_pattern: "triceps_isolation", session_type: "upper", equipment: "cable", primary_muscle: "triceps", secondary_muscles: [], load_increment: 2.5 },
  { name: "Tríceps Francês com Barra", movement_pattern: "triceps_isolation", session_type: "upper", equipment: "barbell", primary_muscle: "triceps", secondary_muscles: [], load_increment: 1.25 },
  { name: "Elevação Lateral com Halteres", movement_pattern: "side_delt_isolation", session_type: "upper", equipment: "dumbbell", primary_muscle: "side_delts", secondary_muscles: [], load_increment: 1.0 },
  { name: "Elevação Lateral no Cabo", movement_pattern: "side_delt_isolation", session_type: "upper", equipment: "cable", primary_muscle: "side_delts", secondary_muscles: [], load_increment: 1.25 },
  // LOWER — Quad Dominante
  { name: "Agachamento Livre", movement_pattern: "quad_dominant", session_type: "lower", equipment: "barbell", primary_muscle: "quads", secondary_muscles: ["glutes", "hamstrings"], load_increment: 2.5 },
  { name: "Agachamento Hack", movement_pattern: "quad_dominant", session_type: "lower", equipment: "machine", primary_muscle: "quads", secondary_muscles: ["glutes"], load_increment: 5.0 },
  // LOWER — Hip Hinge
  { name: "Stiff com Barra", movement_pattern: "hip_hinge", session_type: "lower", equipment: "barbell", primary_muscle: "hamstrings", secondary_muscles: ["glutes", "lower_back"], load_increment: 2.5 },
  { name: "Levantamento Terra Romeno", movement_pattern: "hip_hinge", session_type: "lower", equipment: "barbell", primary_muscle: "hamstrings", secondary_muscles: ["glutes", "lower_back"], load_increment: 2.5 },
  // LOWER — Acessórios
  { name: "Leg Press", movement_pattern: "quad_accessory", session_type: "lower", equipment: "machine", primary_muscle: "quads", secondary_muscles: ["glutes"], load_increment: 5.0 },
  { name: "Cadeira Extensora", movement_pattern: "quad_accessory", session_type: "lower", equipment: "machine", primary_muscle: "quads", secondary_muscles: [], load_increment: 2.5 },
  { name: "Mesa Flexora", movement_pattern: "hamstring_isolation", session_type: "lower", equipment: "machine", primary_muscle: "hamstrings", secondary_muscles: [], load_increment: 2.5 },
  { name: "Hip Thrust com Barra", movement_pattern: "glute_isolation", session_type: "lower", equipment: "barbell", primary_muscle: "glutes", secondary_muscles: ["hamstrings"], load_increment: 5.0 },
  { name: "Panturrilha no Smith", movement_pattern: "calf", session_type: "lower", equipment: "machine", primary_muscle: "calves", secondary_muscles: [], load_increment: 2.5 },
  { name: "Panturrilha Sentado", movement_pattern: "calf", session_type: "lower", equipment: "machine", primary_muscle: "calves", secondary_muscles: [], load_increment: 2.5 },
];
```

-----

## 10. REGRAS DE NEGÓCIO CRÍTICAS

1. **Auto-suggest next workout** baseado no último registrado. Rotação Upper A → Lower A → OFF → Upper B → Lower B → OFF → Upper C → Lower C → OFF.
2. **Volume guardrails**: >10 sets/semana = warning amarelo; >15 = vermelho.
3. **Rest timer intelligence**: auto-start ao registrar set. Default 180s isolados, 240s compostos.
4. **Deload protocol** quando stalled: -10%, reconstruir 2 semanas.
5. **Session history as reference**: sempre mostrar último treino durante a sessão ativa.
6. **Progressive overload é rei**: o app gira em torno de "o peso subiu desde o mês passado?"

-----

## 11. TECH NOTES

- **Supabase Realtime**: não necessário para single-user.
- **Offline**: service worker + localStorage durante treino.
- **Performance**: stats em server components; input client-side.
- **Edge Functions**: calcular progression_state server-side após finalizar.
- **Deployment**: Vercel auto-deploy; Supabase migrations via CLI.

-----

## 12. SUCCESS METRICS

- [ ] Registrar set em < 5 segundos
- [ ] Double progression correta 90%+
- [ ] Sessão trackada em tempo real sem atrito
- [ ] Gráfico mensal de força
- [ ] Volume semanal por músculo visível
- [ ] Funciona offline durante o treino
