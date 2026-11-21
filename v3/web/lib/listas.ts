export const AFPS = ["Capital", "Cuprum", "Habitat", "Modelo", "PlanVital", "ProVida", "Uno"];
export const SALUD = ["Fonasa", "Isapre Banmédica", "Isapre Colmena", "Isapre Consalud", "Isapre Cruz Blanca", "Isapre Vida Tres"];
export const BANCOS = ["BancoEstado", "Banco de Chile", "Santander", "BCI", "Scotiabank"];
export const TIPOS_CUENTA = ["CuentaRUT", "Cuenta vista", "Cuenta corriente"];
export const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Conviviente civil", "Divorciado/a", "Viudo/a"];
export const NACIONALIDADES = ["Chilena", "Venezolana", "Peruana", "Haitiana", "Colombiana", "Otra"];
export const TIPOS_CONTRATO = ["Indefinido", "Plazo fijo", "Honorarios"];
export const TURNOS = [["A", "Turno A"], ["B", "Turno B"], ["N", "Turno de noche"], ["D", "Diurno"]] as const;
export const CAUSALES = [
  "Renuncia voluntaria (art. 159 N°2)", "Mutuo acuerdo (art. 159 N°1)", "Vencimiento del plazo (art. 159 N°4)", "Conclusión del trabajo o servicio (art. 159 N°5)",
  "Necesidades de la empresa (art. 161)", "Conductas indebidas graves (art. 160)", "Fallecimiento (art. 159 N°3)",
];
export const TURNO_NOMBRE: Record<string, string> = { A: "Turno A", B: "Turno B", N: "Turno de noche", D: "Diurno" };
