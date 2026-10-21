/**
 * Backend de "Eventos de Trade" para Google Apps Script.
 *
 * Guarda las inscripciones en la hoja "Inscripciones" de la planilla a la que está
 * vinculado este script, y las fotos en una carpeta de Google Drive.
 * Instrucciones de instalación en README.md.
 *
 * Lo que el sitio puede leer en público: nombres y preferencia de comida de los
 * anotados, y las fotos. Las cédulas solo quedan en la planilla.
 */

const RSVP_SHEET = 'Inscripciones';
const RSVP_HEADERS = ['Fecha de registro', 'Evento', 'Nombre', 'Cédula', 'Preferencia de comida', 'Estado', 'Fecha de baja', 'Opción elegida'];
const PHOTO_SHEET = 'Fotos';
const PHOTO_HEADERS = ['Fecha de subida', 'Evento', 'Subida por', 'ID de archivo', 'Enlace'];
const PHOTO_FOLDER_NAME = 'Eventos de Trade - Fotos';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const FOOD_OPTIONS = ['Sin preferencia', 'Vegetariano', 'Vegano', 'Celíaco', 'Otra'];

const COL = { at: 1, event: 2, name: 3, cedula: 4, food: 5, status: 6, cancelledAt: 7, choice: 8 };
const ACTIVE = 'Confirmado';
const CANCELLED = 'Cancelado';

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'list') return json(listAttendees(p.event));
    if (p.action === 'photos') return json(listPhotos(p.event));
    return json({ ok: true, service: 'eventos-trade' });
  } catch (err) {
    return json({ ok: false, error: 'server_error', message: String(err) });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'register') return json(register(body));
    if (body.action === 'cancel') return json(cancel(body));
    if (body.action === 'uploadPhoto') return json(uploadPhoto(body));
    return json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json({ ok: false, error: 'server_error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Inscripciones ----------

function listAttendees(event) {
  if (!isValidEventId(event)) return { ok: false, error: 'invalid_event' };
  const attendees = activeRows(event).map(r => ({
    name: r.values[COL.name - 1],
    food: r.values[COL.food - 1],
    choice: r.values[COL.choice - 1],
  }));
  return { ok: true, count: attendees.length, attendees };
}

function register(body) {
  const event = body.event;
  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  const cedula = normalizeCedula(body.cedula);
  // Los eventos que no preguntan comida mandan food vacío.
  const food = FOOD_OPTIONS.indexOf(body.food) >= 0 ? body.food : '';
  const choice = String(body.choice || '').trim().slice(0, 60);

  if (!isValidEventId(event)) return { ok: false, error: 'invalid_event' };
  if (name.length < 3 || name.length > 80) return { ok: false, error: 'invalid_name' };
  if (!isValidCedula(cedula)) return { ok: false, error: 'invalid_cedula' };
  if (activeRows(event).some(r => r.cedula === cedula)) return { ok: false, error: 'duplicate' };

  const sheet = getSheet(RSVP_SHEET, RSVP_HEADERS);
  // La comilla inicial hace que la cédula quede como texto.
  ensureHeaders(sheet, RSVP_HEADERS);
  sheet.appendRow([new Date(), event, name, "'" + cedula, food, ACTIVE, '', choice]);
  return { ok: true };
}

function cancel(body) {
  const event = body.event;
  const cedula = normalizeCedula(body.cedula);
  if (!isValidEventId(event)) return { ok: false, error: 'invalid_event' };
  if (!isValidCedula(cedula)) return { ok: false, error: 'invalid_cedula' };

  const match = activeRows(event).filter(r => r.cedula === cedula)[0];
  if (!match) return { ok: false, error: 'not_found' };

  const sheet = getSheet(RSVP_SHEET, RSVP_HEADERS);
  sheet.getRange(match.row, COL.status, 1, 2).setValues([[CANCELLED, new Date()]]);
  return { ok: true };
}

function activeRows(event) {
  const sheet = getSheet(RSVP_SHEET, RSVP_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, RSVP_HEADERS.length).getValues()
    .map((values, i) => ({ row: i + 2, values, cedula: normalizeCedula(values[COL.cedula - 1]) }))
    .filter(r => r.values[COL.event - 1] === event && r.values[COL.status - 1] === ACTIVE);
}

// ---------- Fotos ----------

function listPhotos(event) {
  if (!isValidEventId(event)) return { ok: false, error: 'invalid_event' };
  const sheet = getSheet(PHOTO_SHEET, PHOTO_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return { ok: true, photos: [] };
  const photos = sheet.getRange(2, 1, last - 1, PHOTO_HEADERS.length).getValues()
    .filter(v => v[1] === event)
    .map(v => ({
      id: v[3],
      by: v[2],
      at: v[0] instanceof Date ? v[0].toISOString() : String(v[0]),
      thumb: 'https://drive.google.com/thumbnail?id=' + v[3] + '&sz=w800',
      full: 'https://drive.google.com/thumbnail?id=' + v[3] + '&sz=w2000',
    }));
  return { ok: true, photos };
}

function uploadPhoto(body) {
  const event = body.event;
  const by = String(body.by || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const mimeType = String(body.mimeType || '');
  if (!isValidEventId(event)) return { ok: false, error: 'invalid_event' };
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) return { ok: false, error: 'invalid_type' };

  const bytes = Utilities.base64Decode(String(body.data || ''));
  if (!bytes.length) return { ok: false, error: 'invalid_type' };
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: 'too_large' };

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const blob = Utilities.newBlob(bytes, mimeType, event + '-' + stamp + '.' + ext);
  const file = eventFolder(event).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  getSheet(PHOTO_SHEET, PHOTO_HEADERS).appendRow([new Date(), event, by, file.getId(), file.getUrl()]);
  return { ok: true };
}

function eventFolder(event) {
  const root = rootFolder();
  const existing = root.getFoldersByName(event);
  return existing.hasNext() ? existing.next() : root.createFolder(event);
}

function rootFolder() {
  const props = PropertiesService.getScriptProperties();
  let rootId = props.getProperty('PHOTO_FOLDER_ID');
  let root;
  try {
    root = rootId && DriveApp.getFolderById(rootId);
  } catch (err) {
    root = null;
  }
  if (!root) {
    root = DriveApp.createFolder(PHOTO_FOLDER_NAME);
    props.setProperty('PHOTO_FOLDER_ID', root.getId());
  }
  return root;
}

// ---------- Utilidades ----------

function getSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// Agrega a una hoja existente las columnas nuevas del encabezado (por ejemplo "Opción elegida").
function ensureHeaders(sheet, headers) {
  const current = sheet.getLastColumn();
  if (current < headers.length) {
    sheet.getRange(1, current + 1, 1, headers.length - current)
      .setValues([headers.slice(current)])
      .setFontWeight('bold');
  }
}

function isValidEventId(id) {
  return typeof id === 'string' && /^[a-z0-9-]{1,60}$/.test(id);
}

function normalizeCedula(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

// Cédula uruguaya: 7 u 8 dígitos, el último es el dígito verificador.
function isValidCedula(value) {
  const n = normalizeCedula(value);
  if (!/^\d{7,8}$/.test(n)) return false;
  const base = n.slice(0, -1).padStart(7, '0');
  const weights = [2, 9, 8, 7, 6, 3, 4];
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(base[i]) * weights[i];
  return (10 - (sum % 10)) % 10 === Number(n.slice(-1));
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Ejecutalo una vez desde el editor para crear las hojas y autorizar Drive.
function setup() {
  getSheet(RSVP_SHEET, RSVP_HEADERS);
  getSheet(PHOTO_SHEET, PHOTO_HEADERS);
  rootFolder();
}
