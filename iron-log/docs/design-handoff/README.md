# Handoff: Training Log — App de Registro de Treinos

## Overview

Design de um app mobile de log de treinos de musculação, com foco em:
- Iniciar/registrar treinos ao vivo (logger de séries, reps, RIR, carga)
- Painel de progresso (volume, streak, PRs, frequência)
- Navegação principal por 4 tabs (Hoje, Treinar, Progresso, Mais)
- Planejamento semanal (templates de treino, split A/B)

O protótipo apresenta **3 direções de home** ("Safe", "Bold", "Hub") tweakáveis, além de dois fluxos principais de uso (tela de treino ativo e tela de progresso).

## About the Design Files

Os arquivos neste bundle são **referências de design criadas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos, **não código de produção para copiar diretamente**. A tarefa é **recriar esses designs em HTML dentro do ambiente da codebase alvo** (React Native, SwiftUI, Flutter, etc.), usando seus padrões e bibliotecas estabelecidos. Se ainda não houver ambiente, escolher a stack mais apropriada (recomendado: React Native ou SwiftUI para iOS nativo) e implementar lá.

O HTML foi construído em React (UMD) + Babel inline + JSX, com componentes funcionais e tokens inline — serve como **especificação visual e de interação**, não como arquitetura.

## Fidelity

**High-fidelity (hifi).** Cores, tipografia, espaçamento e estados de interação são finais. Reproduzir pixel-perfect usando as libs existentes da codebase, respeitando os tokens declarados abaixo.

## Paleta Final

Após várias iterações, a paleta final é:

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0A0D13` | Preto de fundo absoluto |
| `bg` | `#0E1218` | Background base |
| `surf1` | `#141924` | Cards nível 1 |
| `surf2` | `#1A2030` | Cards nível 2 / inputs |
| `surf3` | `#212838` | Elementos elevados |
| `border` | `rgba(255,255,255,0.06)` | Divisores sutis |
| `borderStrong` | `rgba(255,255,255,0.10)` | Divisores visíveis |
| `tPrim` | `#F4F5F7` | Texto primário |
| `tSec` | `rgba(244,245,247,0.62)` | Texto secundário |
| `tTer` | `rgba(244,245,247,0.38)` | Texto terciário / labels |
| `tQuat` | `rgba(244,245,247,0.22)` | Placeholders / desabilitado |
| **`coral` / primary** | **`#FF3D7F`** | **Rosa/magenta — ação principal, PRs, destaques, CTA, streak flame** |
| `coralDim` | `#C42863` | Hover/pressed do rosa |
| **`mint` / success** | **`#4DD4E8`** | **Cyan/azul — sucesso, "feito", streak bar, séries completas, heatmap** |
| `mintDim` | `#2A8FA3` | Variante escura do cyan |
| `amber` / `gold` | `#4DD4E8` | Aliases pro cyan (não usar amarelo/dourado) |
| `violet` | `#B48CFF` | Acento terciário (gráficos apenas) |
| `rose` | `#FF8FA3` | Estado "abaixo do MV" em gráficos de volume |
| `red` | `#FF3D7F` | Erro (mesmo que primário) |

**Regra:** Apenas DUAS cores de destaque — **rosa `#FF3D7F`** e **cyan `#4DD4E8`**. Sem verdes, amarelos, cremes ou laranjas. Toda a UI vive sobre o preto `#0E1218`.

## Tipografia

- **Famílias**: `Inter` (UI, 400-800) + `JetBrains Mono` (números mono, opcional em displays grandes)
- **Escala**:
  - Display XL: 44px / 800 / letter-spacing -1.5
  - Display L: 32px / 800 / -1
  - H1: 22px / 700 / -0.5
  - H2: 18px / 700 / -0.3
  - Body: 14px / 500
  - Body Small: 12px / 500
  - Label: 11px / 700 / letter-spacing 1 / UPPERCASE
  - Micro: 10px / 700 / letter-spacing 0.8 / UPPERCASE
- **Números**: sempre `font-variant-numeric: tabular-nums`
- **Line-height**: padrão 1.4, displays 1.0

## Spacing & Radius

- Spacing scale: 4, 6, 8, 10, 12, 14, 16, 18, 22, 26, 32
- Padding padrão de card: 14-16px
- Gap entre cards: 12-16px
- **Radius**: 8 (pequeno), 10 (input), 12 (card padrão), 14 (card grande), 999 (pill/círculo)
- Cards usam `border: 1px solid rgba(255,255,255,0.06)` + background `surf1`

## Screens / Views

Screenshots de referência estão em `screenshots/` (numerados por fluxo).

| # | Tela | Arquivo |
|---|---|---|
| 1 | Home — topo (saudação, dayRing, próximo treino) | `screenshots/01-hoje-topo.png` |
| 2 | Home — meio (streak hero, heatmap) | `screenshots/02-hoje-meio.png` |
| 3 | Home — fim (goals, últimos treinos) | `screenshots/03-hoje-fim.png` |
| 4 | Treinar — topo (próximo treino, AI, templates) | `screenshots/04-treinar-topo.png` |
| 5 | Treinar — scroll | `screenshots/05-treinar-scroll.png` |
| 6 | Progresso — topo (volume 30d, KPIs, frequência) | `screenshots/06-progresso-topo.png` |
| 7 | Progresso — scroll (PRs, distribuição) | `screenshots/07-progresso-scroll.png` |
| 8 | Mais (ajustes, templates, configs) | `screenshots/08-mais.png` |
| 9 | Treino Ativo — logger de séries | `screenshots/09-treino-ativo-topo.png` |
| 10 | Treino Ativo — exercício (sem header) | `screenshots/10-treino-ativo-scroll.png` |

### 1. Home — 3 direções (Safe / Bold / Hub)

**Propósito**: Tela de abertura do app. Mostra próximo treino, streak, volume recente, e atalhos.

- **Safe** (variante conservadora): layout em cards estruturado, stats em linha de 3.
- **Bold** (variante agressiva): números grandes estilo editorial, cor rosa dominante, tipografia pesada.
- **Hub** (default, mais rica): combina hero CTA + heatmap de frequência + últimos treinos + goals.

Ver `components/home-variants.jsx` — cada direção é um componente (`HomeSafe`, `HomeBold`, `HomeHub`).

**Componentes principais**:
- `StreakHero`: barra horizontal com dias consecutivos, milestones, flame icon (rosa), gradiente cyan.
- `StatCard`: card compacto com valor grande, label UPPERCASE, sparkline.
- `NextWorkoutCard`: próximo treino com play button rosa circular, nome, duração estimada, grupos musculares em pills.
- `FrequencyHeatmap`: grid 7×4 de quadrados 11×11px, colorido por intensidade (cyan em 4 níveis).
- `GoalsRow`: metas ativas em cards pequenos.

### 2. Treinar (Train)

**Propósito**: Planejamento da semana e acesso a templates.

Mostra split da semana (Upper A, Lower A, Upper B, Lower B, Cardio), templates salvos, histórico recente.

Ver `components/train-screen.jsx`.

### 3. Treino Ativo (Active Workout Logger)

**Propósito**: Tela principal de execução — logger ao vivo de séries/reps/carga com timer de descanso.

**Layout**:
- Header sticky com nome do treino, timer geral, botão "Finalizar" (pill cyan).
- Tab row de exercícios (pills rosa pro ativo, cyan translúcido pros feitos).
- Stats do exercício atual: última vez, e1RM.
- **Grid de séries** (`SET | KG | REPS | RIR | ✓`): cada linha é uma série com steppers `+/-`, botão de check cyan.
- Bottom bar: timer de descanso (círculo animado rosa), botão +15s, skip.
- Finalização: modal com stats, botão "Salvar" cyan.
- Pós-treino: tela de celebração com "finalizado." em rosa.

Ver `components/active-workout.jsx`.

### 4. Progresso

**Propósito**: Analytics de longo prazo — volume, PRs, distribuição muscular, frequência.

**Componentes**:
- Header com volume 30d em display grande rosa, delta cyan.
- KPIs em row de 3 (sessões, streak, tempo).
- Heatmap de frequência 4 semanas (bars força em cyan + cardio em rosa).
- Lista de PRs com e1RM em cyan.
- Mini bar chart de distribuição muscular.

Ver `components/progress-screen.jsx`.

### 5. iOS Frame

Wrapper de device — status bar, home indicator. Ver `components/ios-frame.jsx`.

## Interactions & Behavior

- **Navegação por tabs**: 4 tabs fixas no bottom (Hoje / Treinar / Progresso / Mais). Tab ativa em rosa, inativa em `tSec`.
- **Completar série**: clique no check preenche o círculo (transparente → cyan), aplica background `${cyan}10` na linha, e dispara o timer de descanso.
- **Timer de descanso**: círculo SVG animado preenchendo ao longo do tempo, cor rosa. Botões +15s e skip (x).
- **Tweaks panel** (dev only, removível em prod): painel flutuante bottom-right pra trocar direção/accent/streakPalette/densidade em tempo real. NÃO enviar em produção.
- **Transitions**: `.2s` em hover states, `.3s` em expansões de card.
- **Tap targets**: mínimo 36×36px, ideal 44×44px.

## State Management

Principais estados da tela de treino ativo:
```
currentExerciseIndex: number
exercises: [{ id, name, sets: [{ kg, reps, rir, done }] }]
restTimer: { active: bool, remaining: seconds, total: seconds }
elapsed: seconds (tempo total do treino)
showFinish: bool
```

Home e Progresso consomem dados de `sample-data.jsx` — em produção vir de state global (Redux/Zustand/SwiftData).

## Design Tokens (recap rápido para variáveis)

```ts
export const colors = {
  bg: '#0E1218',
  surface1: '#141924',
  surface2: '#1A2030',
  surface3: '#212838',
  text: { primary: '#F4F5F7', secondary: 'rgba(244,245,247,0.62)', tertiary: 'rgba(244,245,247,0.38)' },
  primary: '#FF3D7F',      // rosa — ação, PRs
  primaryDim: '#C42863',
  success: '#4DD4E8',      // cyan — feito, sucesso
  successDim: '#2A8FA3',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.10)',
};

export const radius = { sm: 8, md: 10, lg: 12, xl: 14, pill: 999 };
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 };
```

## Assets

Nenhuma imagem raster. Todos os ícones são SVG inline, traço 1.75px, em `components/design-system.jsx` → `<Icon name="..." />`. Set usado: home, dumbbell, chart/trend, menu, check, x, flame, chevR, play, calendar, layers, plus, minus, info, swap.

## Files

- `Training Log.html` — entrypoint, monta React root, controla Tweaks e a árvore de telas.
- `components/design-system.jsx` — TOKENS (paleta, tipografia), `<Icon>`, `<Card>`, `<TabBar>`, `<Stepper>`.
- `components/shared-viz.jsx` — `<WeekBars>`, `<VolumeBar>` (MEV/MAV/MRV), `<Heatmap>`.
- `components/sample-data.jsx` — dados fake (streak, PRs, músculos, goals).
- `components/home-variants.jsx` — `HomeSafe`, `HomeBold`, `HomeHub`.
- `components/train-screen.jsx` — tela de planejamento semanal.
- `components/active-workout.jsx` — logger de treino ao vivo + finalização.
- `components/progress-screen.jsx` — analytics/progresso.
- `components/interactions.jsx` — micro-interações (rest timer, celebration confetti).
- `components/ios-frame.jsx` — bezel iPhone.

## Checklist de implementação

- [ ] Setup de tokens (colors, spacing, radius, typography)
- [ ] Componentes atômicos: Card, Icon, Stepper, Pill, Badge, TabBar
- [ ] Viz: Heatmap, VolumeBar (MEV/MAV/MRV), WeekBars, Sparkline
- [ ] Home (escolher Safe/Bold/Hub — recomendação: **Hub**)
- [ ] Tela Treinar + templates
- [ ] Active Workout logger (rest timer é a peça mais crítica)
- [ ] Progresso
- [ ] TabBar + navegação
- [ ] Remover Tweaks panel antes do build de produção
