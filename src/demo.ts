import { Note } from './types';
export const demo: Note = {
  id: 'demo-biology', title: 'Fotosynteza — od światła do energii', subject: 'Biologia', createdAt: '2026-10-08T10:00:00Z', sources: [], uncertainties: [], reviews: {},
  lines: [
    'Fotosynteza to proces przekształcania energii świetlnej w energię chemiczną.',
    'Zachodzi w chloroplastach. Chlorofil pochłania światło.',
    'Substraty fotosyntezy: dwutlenek węgla i woda. Produkty: glukoza i tlen.',
    'Faza jasna zachodzi w błonach tylakoidów. Powstają ATP i NADPH oraz uwalniany jest tlen.',
    'Cykl Calvina zachodzi w stromie chloroplastu. Wykorzystuje ATP i NADPH do wiązania CO₂.',
    'Intensywność fotosyntezy zależy od światła, stężenia CO₂ i temperatury.',
  ],
  materials: {
    summary: 'Rośliny wykorzystują światło, aby z wody i dwutlenku węgla wytwarzać glukozę. Proces zachodzi w chloroplastach i obejmuje fazę jasną oraz cykl Calvina.',
    sections: [
      { heading: 'Mała fabryka energii', body: 'Fotosynteza zamienia energię światła w energię chemiczną. Zachodzi w chloroplastach dzięki chlorofilowi, który pochłania światło.', sourceLines: [1, 2] },
      { heading: 'Dwa etapy, jeden proces', body: 'Faza jasna w błonach tylakoidów wytwarza ATP i NADPH oraz uwalnia tlen. Cykl Calvina w stromie wykorzystuje ATP i NADPH do wiązania CO₂.', sourceLines: [4, 5] },
      { heading: 'Co wpływa na tempo?', body: 'Intensywność procesu zależy od światła, stężenia CO₂ i temperatury.', sourceLines: [6] },
    ],
    flashcards: [
      { question: 'Czym jest fotosynteza?', answer: 'Przekształcaniem energii świetlnej w energię chemiczną.', sourceLines: [1] },
      { question: 'Gdzie zachodzi fotosynteza?', answer: 'W chloroplastach.', sourceLines: [2] },
      { question: 'Jakie są substraty fotosyntezy?', answer: 'Dwutlenek węgla i woda.', sourceLines: [3] },
      { question: 'Co powstaje w fazie jasnej?', answer: 'ATP i NADPH; uwalniany jest także tlen.', sourceLines: [4] },
      { question: 'Gdzie zachodzi cykl Calvina?', answer: 'W stromie chloroplastu.', sourceLines: [5] },
      { question: 'Od czego zależy intensywność fotosyntezy?', answer: 'Od światła, stężenia CO₂ i temperatury.', sourceLines: [6] },
    ],
    quiz: [
      { question: 'Który barwnik pochłania światło?', options: ['Chlorofil', 'Glukoza', 'ATP', 'Dwutlenek węgla'], correctIndex: 0, explanation: 'W notatkach chlorofil jest wskazany jako barwnik pochłaniający światło.', sourceLines: [2] },
      { question: 'Gdzie zachodzi faza jasna?', options: ['W stromie', 'W błonach tylakoidów', 'W jądrze', 'W cytoplazmie'], correctIndex: 1, explanation: 'Faza jasna zachodzi w błonach tylakoidów.', sourceLines: [4] },
      { question: 'Która para to produkty fotosyntezy?', options: ['Woda i CO₂', 'ATP i woda', 'Glukoza i tlen', 'Chlorofil i NADPH'], correctIndex: 2, explanation: 'Produkty wymienione w notatkach to glukoza i tlen.', sourceLines: [3] },
    ],
    mindMap: { center: 'Fotosynteza', branches: [
      { label: 'Miejsce', children: ['Chloroplasty', 'Chlorofil pochłania światło'], sourceLines: [2] },
      { label: 'Substraty → produkty', children: ['CO₂ + woda', 'Glukoza + tlen'], sourceLines: [3] },
      { label: 'Faza jasna', children: ['Błony tylakoidów', 'ATP, NADPH i tlen'], sourceLines: [4] },
      { label: 'Cykl Calvina', children: ['Stroma', 'Wiązanie CO₂'], sourceLines: [5] },
      { label: 'Intensywność', children: ['Światło', 'Stężenie CO₂', 'Temperatura'], sourceLines: [6] },
    ] },
  },
};
