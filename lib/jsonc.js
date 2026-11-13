'use strict';
// =====================================================================
// JSON with comments (JSONC)                    JSON مع كومنتات
// ---------------------------------------------------------------------
// EN: The files in /content are plain JSON that is allowed to contain
//     // line comments and /* block comments */. This tiny helper removes the
//     comments before JSON.parse, so you can leave notes for yourself.
// AR: ملفات مجلد /content هي JSON عادي لكن مسموح فيها كومنتات
//     بالشكل // أو /* */ . الملف ده بيشيل الكومنتات قبل القراءة،
//     عشان تقدر تكتب ملاحظات لنفسك جوه الملفات.
// =====================================================================

// Returns the text with every comment replaced by spaces (so line/column numbers stay the same).
function strip(text) {
  let out = '', i = 0, str = false;
  const n = text.length;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // BOM
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (str) {
      out += c;
      if (c === '\\') { out += d ?? ''; i += 2; continue; }
      if (c === '"') str = false;
      i++; continue;
    }
    if (c === '"') { str = true; out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      out += '  '; i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { out += text[i] === '\n' ? '\n' : ' '; i++; }
      out += '  '; i += 2; continue;
    }
    out += c; i++;
  }
  return out;
}

function parse(text, name) {
  try { return JSON.parse(strip(text)); }
  catch (x) { x.message = (name ? name + ': ' : '') + x.message; throw x; }
}

// Index of the first `ch` that is outside strings and comments (used to insert a new project without losing comments).
function firstIndexOf(text, ch) {
  const s = strip(text); return s.indexOf(ch);
}

module.exports = { strip, parse, firstIndexOf };
