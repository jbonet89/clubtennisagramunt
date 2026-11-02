export type ImportRow = Record<string, string | number>;
export function parseMemberCsv(raw: string): {
  rows: ImportRow[];
  ignored: string[];
} {
  if (raw.length > 2 * 1024 * 1024) throw Error("csvError");
  raw = raw.replace(/^\uFEFF/, "");
  const firstLine = raw.split(/\r?\n/, 1)[0];
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const matrix: string[][] = [];
  let line: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || !cell) quoted = !quoted;
      else throw Error("csvError");
    } else if (!quoted && c === delimiter) {
      line.push(cell.trim());
      cell = "";
    } else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      line.push(cell.trim());
      if (line.some(Boolean)) matrix.push(line);
      line = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("csvError");
  line.push(cell.trim());
  if (line.some(Boolean)) matrix.push(line);
  if (matrix.length < 2 || matrix.length > 501) throw Error("csvError");
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    fullname: "full_name",
    nom: "full_name",
    nombre: "full_name",
    nomicognoms: "full_name",
    nombreyapellidos: "full_name",
    name: "full_name",
    cognoms: "last_name",
    apellidos: "last_name",
    surname: "last_name",
    email: "email",
    correu: "email",
    correuelectronic: "email",
    correo: "email",
    correoelectronico: "email",
    telefon: "phone",
    telefono: "phone",
    phone: "phone",
    movil: "phone",
    legacyreference: "legacy_reference",
    referenciasoci: "legacy_reference",
    numerosocio: "legacy_reference",
    numerosoci: "legacy_reference",
    numsoci: "legacy_reference",
    referencia: "legacy_reference",
    status: "status",
    estat: "status",
    estado: "status",
    category: "category",
    categoria: "category",
    modalidad: "category",
    annualfeecents: "annual_fee_cents",
    annualfee: "fee_euros",
    quota: "fee_euros",
    cuota: "fee_euros",
    season: "season",
    temporada: "season",
    notes: "notes",
    notas: "notes",
    observacions: "notes",
    observaciones: "notes",
    duesstatus: "dues_status",
    quotastatus: "dues_status",
    estatquota: "dues_status",
    estadocuota: "dues_status",
  };
  const headers = matrix.shift()!;
  const keys = headers.map((h) => aliases[normalize(h)] ?? "");
  if (
    !keys.includes("full_name") ||
    new Set(keys.filter(Boolean)).size !== keys.filter(Boolean).length
  )
    throw Error("csvError");
  const seenEmails = new Set<string>(),
    seenRefs = new Set<string>();
  const rows = matrix.map((cells, index) => {
    if (cells.length !== headers.length) throw Error(`csvRow:${index + 2}`);
    const row: ImportRow = {};
    keys.forEach((key, i) => {
      if (key && cells[i]) row[key] = cells[i];
    });
    if (row.last_name) {
      row.full_name = `${row.full_name ?? ""} ${row.last_name}`.trim();
      delete row.last_name;
    }
    if (
      !String(row.full_name ?? "").trim() ||
      (!row.email && !row.legacy_reference)
    )
      throw Error(`csvRow:${index + 2}`);
    if (row.email) {
      row.email = String(row.email).toLowerCase();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
        seenEmails.has(row.email)
      )
        throw Error(`csvRow:${index + 2}`);
      seenEmails.add(row.email);
    }
    if (row.legacy_reference) {
      const key = String(row.legacy_reference).toLowerCase();
      if (seenRefs.has(key)) throw Error(`csvRow:${index + 2}`);
      seenRefs.add(key);
    }
    const status: Record<string, string> = {
      actiu: "active",
      activo: "active",
      active: "active",
      pendent: "pending",
      pendiente: "pending",
      pending: "pending",
      baixa: "inactive",
      baja: "inactive",
      inactiu: "inactive",
      inactivo: "inactive",
      inactive: "inactive",
    };
    if (row.status) {
      const value = status[normalize(String(row.status))];
      if (!value) throw Error(`csvRow:${index + 2}`);
      row.status = value;
    }
    if (row.category) {
      const value = {
        adult: "adult",
        adulto: "adult",
        infantil: "junior",
        junior: "junior",
      }[normalize(String(row.category))];
      if (!value) throw Error(`csvRow:${index + 2}`);
      row.category = value;
    }
    if (row.fee_euros) {
      const value = Number(
        String(row.fee_euros).replace(/\s|€/g, "").replace(",", "."),
      );
      if (!Number.isFinite(value)) throw Error(`csvRow:${index + 2}`);
      row.annual_fee_cents = Math.round(value * 100);
      delete row.fee_euros;
    }
    if (row.annual_fee_cents != null) {
      const value = Number(row.annual_fee_cents);
      if (!Number.isInteger(value) || value < 0 || value > 1000000)
        throw Error(`csvRow:${index + 2}`);
      row.annual_fee_cents = value;
    }
    if (row.dues_status) {
      const value = {
        pagada: "paid",
        pagat: "paid",
        paid: "paid",
        cobrada: "paid",
        cobrat: "paid",
        pendent: "pending",
        pendiente: "pending",
        pending: "pending",
        retornada: "returned",
        retornat: "returned",
        devuelta: "returned",
        returned: "returned",
      }[normalize(String(row.dues_status))];
      if (!value || !row.season || !row.annual_fee_cents)
        throw Error(`csvRow:${index + 2}`);
      row.dues_status = value;
    }
    return row;
  });
  return { rows, ignored: headers.filter((_, i) => !keys[i]) };
}
