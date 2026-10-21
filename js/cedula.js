// Validación de cédula de identidad uruguaya (dígito verificador).
// La misma lógica está copiada en apps-script/Code.gs.
window.Cedula = (() => {
  const WEIGHTS = [2, 9, 8, 7, 6, 3, 4];

  function normalize(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function checkDigit(base) {
    const digits = base.padStart(7, "0");
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += Number(digits[i]) * WEIGHTS[i];
    return (10 - (sum % 10)) % 10;
  }

  function isValid(value) {
    const n = normalize(value);
    if (!/^\d{7,8}$/.test(n)) return false;
    return checkDigit(n.slice(0, -1)) === Number(n.slice(-1));
  }

  // "12345672" -> "1.234.567-2"
  function format(value) {
    const n = normalize(value).slice(0, 8);
    if (n.length < 2) return n;
    const base = n.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${base}-${n.slice(-1)}`;
  }

  return { normalize, isValid, format };
})();
