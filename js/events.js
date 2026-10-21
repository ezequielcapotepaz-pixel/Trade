// Lista de eventos. Para agregar uno nuevo, copiá un bloque y cambiá los datos.
//
//   id          identificador único, solo minúsculas, números y guiones. No cambiarlo
//               una vez que la gente se anotó: inscripciones y fotos quedan atadas a él.
//   title       nombre del evento
//   date        fecha y hora de inicio, "AAAA-MM-DDTHH:MM" (hora de Uruguay), o null
//   place       nombre del lugar, o null
//   address     dirección (opcional)
//   highlights  lista corta de lo que hay (opcional)
//   note        aviso destacado, por ejemplo el dress code (opcional)
//   description texto corto (opcional)
//   banner      ruta a la imagen dentro de assets/banners/
//   bannerAlt   descripción de la imagen para lectores de pantalla
//   rsvp        true si se puede confirmar asistencia
window.EVENTS = [
  {
    id: "halloween-trade-2026",
    title: "Halloween Trade Marketing",
    date: "2026-10-29T21:00",
    place: "Casa Agus",
    address: "Prudencio Vázquez y Vega 893",
    highlights: ["Asado", "Tragos", "Música"],
    note: "Obligatorio ir disfrazado",
    description: "El primer evento de Trade. Asado de Halloween con todo el equipo.",
    banner: "assets/banners/halloween-trade-2026.jpg",
    bannerAlt:
      "Afiche de Halloween Trade Marketing: collage de fotos del equipo con cuernos y aureolas, 29 de octubre, 21 hs, Casa Agus, asado, tragos y música, obligatorio ir disfrazado.",
    rsvp: true,
  },
];
