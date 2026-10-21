// Lista de eventos. Para agregar uno nuevo, copiá un bloque y cambiá los datos.
//
//   id          identificador único, solo minúsculas, números y guiones. No cambiarlo
//               una vez que la gente se anotó: inscripciones y fotos quedan atadas a él.
//   title       nombre del evento
//   date        fecha y hora de inicio, "AAAA-MM-DDTHH:MM" (hora de Uruguay),
//               solo "AAAA-MM-DD" si la hora está a confirmar, o null
//   place       nombre del lugar, o null
//   address     dirección (opcional)
//   highlights  lista corta de lo que hay (opcional)
//   note        aviso destacado, por ejemplo el dress code (opcional)
//   description texto corto (opcional)
//   banner      ruta a la imagen dentro de assets/banners/
//   bannerAlt   descripción de la imagen para lectores de pantalla
//   rsvp        true si se puede confirmar asistencia; false muestra "Próximamente"
//   askFood     false para no preguntar preferencia de comida (por defecto se pregunta)
//   choice      opción a elegir al anotarse, { label, options: [...] } (opcional)
window.EVENTS = [
  {
    id: "halloween-trade-2026",
    title: "Halloween Trade Marketing",
    date: "2026-10-29T21:00",
    place: "Casa Agus",
    address: "Prudencio Vázquez y Vega 893",
    highlights: ["Asado", "Tragos", "Música"],
    note: "Obligatorio ir disfrazado",
    description: "El primer evento de Trade: asado de Halloween con todo el equipo.",
    banner: "assets/banners/halloween-trade-2026.jpg",
    bannerAlt:
      "Afiche de Halloween Trade Marketing: collage de fotos del equipo con cuernos y aureolas, 29 de octubre, 21 hs, Casa Agus, asado, tragos y música, obligatorio ir disfrazado.",
    rsvp: true,
  },
  {
    id: "futbol-mixto-2026",
    title: "Fútbol Mixto",
    date: null,
    place: null,
    highlights: ["Caños", "Exceso de calidad"],
    note: "No llorar tras la goleada",
    description: "¿Estarán a la altura?",
    banner: "assets/banners/futbol-mixto-2026.jpg",
    bannerAlt:
      "Afiche de Fútbol Mixto: dos equipos del grupo de Trade, uno con camisetas naranjas y otro azules, de brazos cruzados en un estadio iluminado, con una pelota embarrada y la palabra Próximamente.",
    rsvp: false,
  },  {
    id: "noche-de-cine-2026",
    title: "Noche de Cine",
    date: "2026-10-24",
    place: null,
    address: "Montevideo Shopping o Punta Carretas",
    description: "Ida al cine con el equipo. Anotate y elegí a qué shopping preferís ir.",
    note: "Sujeto a disponibilidad",
    banner: "assets/banners/noche-de-cine-2026.jpg",
    bannerAlt:
      "Afiche de Noche de Cine: dos compañeras de Trade comiendo semillas de girasol y maní en una sala de cine llena, con la gente de atrás mirándolas enojada. Próximamente, sujeto a disponibilidad.",
    rsvp: true,
    askFood: false,
    choice: {
      label: "¿A qué shopping preferís ir?",
      options: ["Montevideo Shopping", "Punta Carretas"],
    },
  },
];
