// sample-data.jsx — realistic fake data used across screens

const SAMPLE = {
  user: { name: 'Lucas', greeting: 'Boa noite' },
  date: { label: 'sexta, 17 de abril', iso: '2026-04-17' },
  streak: { days: 12, best: 21, history: (() => {
    // 84 days of training intensity: 0=rest, 1=light, 2=medium, 3=heavy, 4=PR day
    // pattern: 4-5 days training per week, with rests, building up current streak of 12
    const h = [];
    for (let i = 0; i < 84; i++) {
      const daysAgo = 83 - i;
      const dow = (daysAgo + 3) % 7; // Sun=0..Sat=6, tweak so sundays are often off
      // current streak: last 12 days consecutive
      if (daysAgo < 12) {
        const intensities = [2,3,2,0,3,2,2,4,3,2,3,2]; // day -12..-1 but built with offset
        h.push(intensities[11 - daysAgo]);
        continue;
      }
      // before current streak: one rest gap at day -13
      if (daysAgo === 12) { h.push(0); continue; }
      // best streak was 21 days ago
      // most weeks: train Mon/Tue/Thu/Fri/Sat
      const trainDow = [1,2,4,5,6];
      if (!trainDow.includes(dow)) { h.push(0); continue; }
      // random intensity
      const r = (i * 37 + 11) % 20;
      h.push(r < 4 ? 1 : r < 12 ? 2 : r < 18 ? 3 : 4);
    }
    return h;
  })() },
  milestones: [
    { days: 7,   label: 'Semana', achieved: true },
    { days: 14,  label: '2 semanas', achieved: false, current: true },
    { days: 30,  label: 'Mês', achieved: false },
    { days: 60,  label: 'Bimestre', achieved: false },
    { days: 100, label: 'Centena', achieved: false },
  ],
  next: { template: 'Lower A', group: 'LOWER', exercises: 6, estMin: 55 },

  // week-in-review
  weekly: { treinos: 4, cardio: 2, sets: 58, volumeTon: 27.8, volumeDelta: '+241%' },
  weight: { current: 78.3, delta: -0.4, sparks: [79.1, 79.0, 78.9, 78.6, 78.5, 78.4, 78.3] },

  frequency: [
    { label: 'S-3', forca: 0, cardio: 0 },
    { label: 'S-2', forca: 0, cardio: 0 },
    { label: 'S-1', forca: 2, cardio: 1 },
    { label: 'ATUAL', forca: 4, cardio: 1 },
  ],

  goals: [
    { id: 'peso', label: 'PESO', icon: 'scale', color: 'coral', done: false },
    { id: 'forca', label: 'FORÇA', icon: 'dumbbell', color: 'mint', done: false },
    { id: 'cardio', label: 'CARDIO', icon: 'heart', color: 'coral', done: false },
    { id: 'passos', label: 'PASSOS', icon: 'steps', color: 'gold', done: false },
  ],

  // templates
  templates: [
    { id: 't1', group: 'LOWER', name: 'Lower A', exercises: 6, next: true, estMin: 55, lastDone: 'há 3 dias' },
    { id: 't2', group: 'LOWER', name: 'Lower B', exercises: 5, estMin: 50, lastDone: 'há 5 dias' },
    { id: 't3', group: 'UPPER', name: 'Upper A', exercises: 7, estMin: 60, lastDone: 'há 2 dias' },
    { id: 't4', group: 'UPPER', name: 'Upper B', exercises: 6, estMin: 55, lastDone: 'há 4 dias' },
    { id: 't5', group: 'PULL', name: 'Puxar Pesado', exercises: 5, estMin: 45, lastDone: 'há 6 dias' },
  ],

  // lower A exercise list (used in active workout)
  lowerA: [
    { id: 'e1', name: 'Agachamento Livre', muscle: 'Quadríceps', sets: [
      { reps: 8, weight: 100, rir: 2, done: true }, { reps: 8, weight: 100, rir: 2, done: true },
      { reps: 7, weight: 100, rir: 1, done: false }, { reps: 7, weight: 100, rir: 1, done: false },
    ], lastTime: '100kg × 8 @RIR 2', e1rm: 125 },
    { id: 'e2', name: 'RDL', muscle: 'Posterior de coxa', sets: [
      { reps: 10, weight: 85, rir: 2, done: false }, { reps: 10, weight: 85, rir: 2, done: false },
      { reps: 10, weight: 85, rir: 1, done: false },
    ], lastTime: '85kg × 10 @RIR 2', e1rm: 110 },
    { id: 'e3', name: 'Leg Press 45°', muscle: 'Quadríceps', sets: [
      { reps: 12, weight: 180, rir: 2, done: false }, { reps: 12, weight: 180, rir: 2, done: false },
      { reps: 12, weight: 180, rir: 1, done: false },
    ], lastTime: '180kg × 12 @RIR 2', e1rm: 230 },
    { id: 'e4', name: 'Cadeira Flexora', muscle: 'Posterior de coxa', sets: [
      { reps: 12, weight: 55, rir: 2, done: false }, { reps: 12, weight: 55, rir: 1, done: false },
      { reps: 10, weight: 55, rir: 0, done: false },
    ], lastTime: '55kg × 12 @RIR 2', e1rm: 70 },
    { id: 'e5', name: 'Panturrilha em Pé', muscle: 'Panturrilha', sets: [
      { reps: 15, weight: 70, rir: 2, done: false }, { reps: 15, weight: 70, rir: 2, done: false },
      { reps: 15, weight: 70, rir: 1, done: false },
    ], lastTime: '70kg × 15', e1rm: 90 },
    { id: 'e6', name: 'Abdominal na Polia', muscle: 'Abdômen', sets: [
      { reps: 15, weight: 40, rir: 2, done: false }, { reps: 15, weight: 40, rir: 2, done: false },
      { reps: 15, weight: 40, rir: 1, done: false },
    ], lastTime: '40kg × 15', e1rm: 55 },
  ],

  // volume by muscle
  muscles: [
    { name: 'Quadríceps', current: 10, target: 10, mev: 8, mav: 14, mrv: 18, status: 'PRODUTIVO', color: TOKENS.mint },
    { name: 'Costas (Dorsais)', current: 9, target: 8, mev: 10, mav: 16, mrv: 22, status: 'MANUTENÇÃO', color: '#E8C547' },
    { name: 'Peito', current: 8, target: 8, mev: 8, mav: 14, mrv: 22, status: 'MANUTENÇÃO', color: TOKENS.coral },
    { name: 'Posterior de coxa', current: 7, target: 8, mev: 6, mav: 12, mrv: 18, status: 'PRODUTIVO', color: TOKENS.amber },
    { name: 'Tríceps', current: 6, target: 5, mev: 4, mav: 10, mrv: 16, status: 'PRODUTIVO', color: TOKENS.violet },
    { name: 'Ombro Lateral', current: 6, target: 8, mev: 8, mav: 16, mrv: 22, status: 'ABAIXO DO MV', color: TOKENS.rose },
    { name: 'Panturrilha', current: 6, target: 8, mev: 8, mav: 14, mrv: 18, status: 'MANUTENÇÃO', color: TOKENS.mintDim },
    { name: 'Bíceps', current: 5, target: 8, mev: 4, mav: 10, mrv: 16, status: 'MANUTENÇÃO', color: '#F5D976' },
    { name: 'Abdômen', current: 1, target: 6, mev: 4, mav: 8, mrv: 12, status: 'ABAIXO DO MV', color: TOKENS.amber },
  ],

  distribution: [
    { label: 'Quadríceps', value: 10, color: TOKENS.mint },
    { label: 'Costas', value: 9, color: '#E8C547' },
    { label: 'Peito', value: 8, color: TOKENS.coral },
    { label: 'Posterior', value: 7, color: '#2BB69F' },
    { label: 'Tríceps', value: 6, color: TOKENS.violet },
    { label: 'Ombro Lat.', value: 6, color: TOKENS.rose },
    { label: 'Panturrilha', value: 6, color: TOKENS.amber },
    { label: 'Bíceps', value: 5, color: '#F5D976' },
    { label: 'Abdômen', value: 1, color: '#FFB86B' },
  ],

  // 90-day heatmap: -1 rest, 0 missed, 1..4 intensity, -2 near-complete
  heatmap: (() => {
    const arr = Array(91).fill(0);
    // mostly rest for first 70 days
    for (let i = 0; i < 70; i++) arr[i] = Math.random() < 0.2 ? 0 : -1;
    // last 21 days: active pattern
    const pattern = [-1, 4, 3, -1, 2, 3, -1, 4, -1, 3, 4, -1, 2, -2, -2, 3, -1, 4, 3, 0, 4];
    for (let i = 0; i < pattern.length; i++) arr[70 + i] = pattern[i];
    return arr.slice(0, 91);
  })(),

  recentExercises: [
    { name: 'Remada Polia', muscle: 'Costas (Dorsais)', weight: 70, reps: 6, e1rm: 84 },
    { name: 'Tríceps Corda', muscle: 'Tríceps', weight: 50, reps: 6, e1rm: 63 },
    { name: 'Rosca Bayesiana', muscle: 'Bíceps', weight: 30, reps: 4, e1rm: 34 },
    { name: 'Elevação Lateral no Cabo', muscle: 'Ombro Lateral', weight: 12, reps: 12, e1rm: 16 },
    { name: 'Supino Inclinado', muscle: 'Peito', weight: 75, reps: 8, e1rm: 92 },
  ],

  // notifications / AI insights
  insights: [
    { kind: 'warn', text: 'Ombro lateral abaixo do MV. Adicionar 2 séries no próximo Upper?', cta: 'Adicionar' },
    { kind: 'good', text: 'Quadríceps está produtivo há 3 semanas. Tudo em dia.', cta: null },
    { kind: 'info', text: 'Seu sono médio caiu 0.6h — considere reduzir carga em 5%.', cta: 'Aplicar' },
  ],
};

window.SAMPLE = SAMPLE;
