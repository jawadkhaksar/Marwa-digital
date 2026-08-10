// PHP date()-style token formatter — the subset needed for the tokens Admin
// → Settings → General's Date/Time Format radios actually offer ("F j, Y",
// "Y-m-d", "m/d/Y", "d/m/Y", "d.m.Y", "g:i a", "g:i A", "H:i") plus a free-
// text Custom option using the same tokens. Not a full PHP date() port —
// just the letters WordPress's own General Settings screen (which this UI
// is modeled on) exposes there.
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatWithTokens(date: Date, format: string): string {
  let out = "";
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    // A backslash escapes the next character as a literal — lets a custom
    // format include letters (e.g. "\a\t") without them being read as tokens.
    if (ch === "\\" && i + 1 < format.length) {
      out += format[++i];
      continue;
    }
    switch (ch) {
      case "Y":
        out += String(date.getFullYear());
        break;
      case "y":
        out += String(date.getFullYear()).slice(-2);
        break;
      case "F":
        out += MONTHS_FULL[date.getMonth()];
        break;
      case "M":
        out += MONTHS_SHORT[date.getMonth()];
        break;
      case "m":
        out += pad2(date.getMonth() + 1);
        break;
      case "n":
        out += String(date.getMonth() + 1);
        break;
      case "d":
        out += pad2(date.getDate());
        break;
      case "j":
        out += String(date.getDate());
        break;
      case "l":
        out += DAYS_FULL[date.getDay()];
        break;
      case "D":
        out += DAYS_SHORT[date.getDay()];
        break;
      case "H":
        out += pad2(date.getHours());
        break;
      case "G":
        out += String(date.getHours());
        break;
      case "h":
        out += pad2(((date.getHours() + 11) % 12) + 1);
        break;
      case "g":
        out += String(((date.getHours() + 11) % 12) + 1);
        break;
      case "i":
        out += pad2(date.getMinutes());
        break;
      case "s":
        out += pad2(date.getSeconds());
        break;
      case "a":
        out += date.getHours() < 12 ? "am" : "pm";
        break;
      case "A":
        out += date.getHours() < 12 ? "AM" : "PM";
        break;
      default:
        out += ch;
    }
  }
  return out;
}
