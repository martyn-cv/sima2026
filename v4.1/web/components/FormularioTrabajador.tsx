"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AFPS, BANCOS, ESTADOS_CIVILES, NACIONALIDADES, SALUD, TIPOS_CONTRATO, TIPOS_CUENTA, TURNOS } from "@/lib/listas";
import { Boton, Campo, Entrada, Seleccion } from "./ui";

export interface ValoresTrabajador {
  rut: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; sexo: string; fechaNacimiento: string; estadoCivil: string; nacionalidad: string;
  telefono: string; correoCorporativo: string; correoPersonal: string; domicilio: string; comuna: string; region: string; contactoEmergencia: string; telefonoEmergencia: string;
  afp: string; sistemaSalud: string; banco: string; tipoCuenta: string; numeroCuenta: string; cargoId: string; turno: string; jefeDirectoId: string; fechaIngreso: string;
  tipoContrato: string; contratoInicio: string; contratoTermino: string; sueldoBase: string; colacion: string; movilizacion: string; claveInicial: string;
}
export const VACIO: ValoresTrabajador = {
  rut: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", sexo: "F", fechaNacimiento: "", estadoCivil: "Soltero/a", nacionalidad: "Chilena", telefono: "", correoCorporativo: "", correoPersonal: "",
  domicilio: "", comuna: "", region: "Metropolitana de Santiago", contactoEmergencia: "", telefonoEmergencia: "", afp: "Modelo", sistemaSalud: "Fonasa", banco: "BancoEstado", tipoCuenta: "CuentaRUT", numeroCuenta: "",
  cargoId: "", turno: "D", jefeDirectoId: "", fechaIngreso: "", tipoContrato: "Indefinido", contratoInicio: new Date().toISOString().slice(0, 10), contratoTermino: "", sueldoBase: "", colacion: "0", movilizacion: "0", claveInicial: "",
};

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-linea pt-4">
      <legend className="display -mt-[1.85rem] bg-papel pr-3 text-[20px] font-semibold">{titulo}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function FormularioTrabajador({ inicial, modo, alEnviar, alCancelar, enviando }: { inicial: ValoresTrabajador; modo: "crear" | "editar"; alEnviar: (v: ValoresTrabajador) => void; alCancelar?: () => void; enviando?: boolean }) {
  const [v, setV] = useState(inicial);
  const cargos = useQuery({ queryKey: ["cargos"], queryFn: () => api.get<{ id: number; nombre: string; familia: string; sueldoMin: number; sueldoMax: number }[]>("/api/cargos") });
  const directorio = useQuery({ queryKey: ["directorio"], queryFn: () => api.get<{ id: string; nombre: string; cargo: string }[]>("/api/directorio") });
  const set = (k: keyof ValoresTrabajador) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const cargo = cargos.data?.find((c) => String(c.id) === v.cargoId);
  const enviar = (e: FormEvent) => { e.preventDefault(); alEnviar(v); };
  const textoSelect = (k: keyof ValoresTrabajador, lista: readonly string[]) => <Seleccion value={v[k]} onChange={set(k)}>{lista.map((x) => <option key={x}>{x}</option>)}</Seleccion>;

  return (
    <form onSubmit={enviar} className="grid gap-9 pt-4">
      <Grupo titulo="Datos personales">
        <Campo etiqueta="RUT" ayuda="Con puntos y guion, por ejemplo 12.345.678-5"><Entrada required value={v.rut} onChange={set("rut")} disabled={modo === "editar"} /></Campo>
        <Campo etiqueta="Nombres"><Entrada required value={v.nombres} onChange={set("nombres")} /></Campo>
        <Campo etiqueta="Apellido paterno"><Entrada required value={v.apellidoPaterno} onChange={set("apellidoPaterno")} /></Campo>
        <Campo etiqueta="Apellido materno"><Entrada value={v.apellidoMaterno} onChange={set("apellidoMaterno")} /></Campo>
        <Campo etiqueta="Fecha de nacimiento"><Entrada required type="date" value={v.fechaNacimiento} onChange={set("fechaNacimiento")} /></Campo>
        <Campo etiqueta="Sexo"><Seleccion value={v.sexo} onChange={set("sexo")}><option value="F">Femenino</option><option value="M">Masculino</option></Seleccion></Campo>
        <Campo etiqueta="Estado civil">{textoSelect("estadoCivil", ESTADOS_CIVILES)}</Campo>
        <Campo etiqueta="Nacionalidad">{textoSelect("nacionalidad", NACIONALIDADES)}</Campo>
      </Grupo>
      <Grupo titulo="Contacto y domicilio">
        <Campo etiqueta="Domicilio"><Entrada value={v.domicilio} onChange={set("domicilio")} /></Campo>
        <Campo etiqueta="Comuna"><Entrada value={v.comuna} onChange={set("comuna")} /></Campo>
        <Campo etiqueta="Región"><Entrada value={v.region} onChange={set("region")} /></Campo>
        <Campo etiqueta="Teléfono"><Entrada value={v.telefono} onChange={set("telefono")} placeholder="+56 9 1234 5678" /></Campo>
        <Campo etiqueta="Correo personal"><Entrada type="email" value={v.correoPersonal} onChange={set("correoPersonal")} /></Campo>
        <span className="hidden lg:block" />
        <Campo etiqueta="Contacto de emergencia"><Entrada value={v.contactoEmergencia} onChange={set("contactoEmergencia")} /></Campo>
        <Campo etiqueta="Teléfono de emergencia"><Entrada value={v.telefonoEmergencia} onChange={set("telefonoEmergencia")} /></Campo>
      </Grupo>
      <Grupo titulo="Previsión y pago">
        <Campo etiqueta="AFP">{textoSelect("afp", AFPS)}</Campo>
        <Campo etiqueta="Sistema de salud">{textoSelect("sistemaSalud", SALUD)}</Campo>
        <span className="hidden lg:block" />
        <Campo etiqueta="Banco">{textoSelect("banco", BANCOS)}</Campo>
        <Campo etiqueta="Tipo de cuenta">{textoSelect("tipoCuenta", TIPOS_CUENTA)}</Campo>
        <Campo etiqueta="Número de cuenta"><Entrada value={v.numeroCuenta} onChange={set("numeroCuenta")} inputMode="numeric" /></Campo>
      </Grupo>
      <Grupo titulo="Cargo y organización">
        <Campo etiqueta="Cargo" ayuda={cargo ? `Banda de sueldo: ${cargo.sueldoMin.toLocaleString("es-CL")} a ${cargo.sueldoMax.toLocaleString("es-CL")} pesos` : "El cargo decide el perfil de acceso a SIMA."} className="sm:col-span-2">
          <Seleccion required value={v.cargoId} onChange={set("cargoId")}>
            <option value="">Elegir cargo…</option>
            {Object.entries(Object.groupBy(cargos.data ?? [], (c) => c.familia)).map(([f, lista]) => <optgroup key={f} label={f}>{lista!.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>)}
          </Seleccion>
        </Campo>
        <Campo etiqueta="Turno"><Seleccion value={v.turno} onChange={set("turno")}>{TURNOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</Seleccion></Campo>
        <Campo etiqueta="Jefe directo" className="sm:col-span-2">
          <Seleccion value={v.jefeDirectoId} onChange={set("jefeDirectoId")}><option value="">Sin jefe directo</option>{directorio.data?.map((d) => <option key={d.id} value={d.id}>{d.nombre} — {d.cargo}</option>)}</Seleccion>
        </Campo>
        {modo === "crear" && <Campo etiqueta="Correo corporativo (usuario)" ayuda="Si lo deja vacío se arma con nombre y apellido."><Entrada type="email" value={v.correoCorporativo} onChange={set("correoCorporativo")} /></Campo>}
      </Grupo>
      {modo === "crear" && (
        <Grupo titulo="Contrato inicial">
          <Campo etiqueta="Tipo de contrato"><Seleccion value={v.tipoContrato} onChange={set("tipoContrato")}>{TIPOS_CONTRATO.map((t) => <option key={t}>{t}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Inicio"><Entrada required type="date" value={v.contratoInicio} onChange={set("contratoInicio")} /></Campo>
          <Campo etiqueta="Término" ayuda={v.tipoContrato === "Indefinido" ? "Déjelo vacío en un contrato indefinido." : undefined}><Entrada type="date" required={v.tipoContrato === "Plazo fijo"} value={v.contratoTermino} onChange={set("contratoTermino")} /></Campo>
          <Campo etiqueta="Sueldo base (CLP)"><Entrada required type="number" min={1} value={v.sueldoBase} onChange={set("sueldoBase")} /></Campo>
          <Campo etiqueta="Colación (CLP)"><Entrada type="number" min={0} value={v.colacion} onChange={set("colacion")} disabled={v.tipoContrato === "Honorarios"} /></Campo>
          <Campo etiqueta="Movilización (CLP)"><Entrada type="number" min={0} value={v.movilizacion} onChange={set("movilizacion")} disabled={v.tipoContrato === "Honorarios"} /></Campo>
          <Campo etiqueta="Clave inicial" ayuda="Si la deja vacía se usa la clave inicial del sistema."><Entrada type="text" autoComplete="off" value={v.claveInicial} onChange={set("claveInicial")} /></Campo>
        </Grupo>
      )}
      <div className="flex justify-end gap-2 border-t border-linea pt-4">
        {alCancelar && <Boton type="button" variante="contorno" onClick={alCancelar}>Cancelar</Boton>}
        <Boton type="submit" variante="rojo" cargando={enviando}>{modo === "crear" ? "Crear trabajador y cuenta" : "Guardar cambios"}</Boton>
      </div>
    </form>
  );
}

/** Arma el cuerpo que espera la API a partir de los valores del formulario. */
export function aCuerpo(v: ValoresTrabajador, incluirContrato: boolean) {
  return {
    rut: v.rut, nombres: v.nombres, apellidoPaterno: v.apellidoPaterno, apellidoMaterno: v.apellidoMaterno, sexo: v.sexo, fechaNacimiento: v.fechaNacimiento, estadoCivil: v.estadoCivil, nacionalidad: v.nacionalidad,
    telefono: v.telefono, correoCorporativo: v.correoCorporativo || null, correoPersonal: v.correoPersonal, domicilio: v.domicilio, comuna: v.comuna, region: v.region, contactoEmergencia: v.contactoEmergencia,
    telefonoEmergencia: v.telefonoEmergencia, afp: v.afp, sistemaSalud: v.sistemaSalud, banco: v.banco, tipoCuenta: v.tipoCuenta, numeroCuenta: v.numeroCuenta, cargoId: Number(v.cargoId), turno: v.turno,
    jefeDirectoId: v.jefeDirectoId || null, fechaIngreso: v.fechaIngreso || null, claveInicial: v.claveInicial || null,
    contrato: incluirContrato ? { tipo: v.tipoContrato, fechaInicio: v.contratoInicio, fechaTermino: v.contratoTermino || null, sueldoBase: Number(v.sueldoBase), colacion: Number(v.colacion || 0), movilizacion: Number(v.movilizacion || 0), jornadaHoras: v.tipoContrato === "Honorarios" ? null : 42 } : null,
  };
}
