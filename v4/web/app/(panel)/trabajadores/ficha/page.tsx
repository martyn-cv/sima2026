"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, LogOut, Pencil, Plus, RotateCcw, ShieldOff, Unlock } from "lucide-react";
import { clp, fecha, hace, type Liquidacion } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TURNO_NOMBRE } from "@/lib/listas";
import { DetalleLiquidacion } from "@/components/DetalleLiquidacion";
import { DialogoContrato, type ContratoBase } from "@/components/DialogoContrato";
import { DialogoDesvincular } from "@/components/DialogoDesvincular";
import { FormularioTrabajador, VACIO, aCuerpo, type ValoresTrabajador } from "@/components/FormularioTrabajador";
import { Boton, Cajon, Chip, Dato, Dialogo, Encabezado, ErrorCarga, Esqueleto, Estado, Pestanas, Seccion, Vacio, mensajeDe, useAviso } from "@/components/ui";

interface Detalle {
  resumen: { id: string; nombre: string; cargo: string; familia: string; perfil: string; canal: string; estadoLaboral: string; estadoCuenta: string; estadoContrato: string; edad: number; fechaTermino?: string | null; jefeDirectoId?: string | null; turno: string };
  personal: Record<string, string>;
  cargo: { id: number; nombre: string; paraQueExiste: string; queHace: string };
  jefe?: { id: string; nombre: string } | null;
  equipo: { id: string; nombre: string; cargo: string }[];
  contratos: (ContratoBase & { id: number; codigo: string; esActual: boolean; estado: string; jornadaHoras?: number })[];
  terminos: { id: number; fechaTermino: string; causal: string; finiquitoMonto: number; observaciones: string }[];
  habilitaciones: { id: number; nombre: string; fechaObtencion: string; vigenciaMeses: number; vence: string; estado: string }[];
  cuenta: { login: string; alias?: string | null; totpActivo?: boolean; debeCambiarClave?: boolean; ultimoAcceso?: string | null; estado: string; accesoWeb: boolean; accesoApp: boolean; bloqueada: boolean };
}

export default function Pagina() {
  return <Suspense fallback={<Esqueleto className="h-72" />}><FichaTrabajador /></Suspense>;
}

function FichaTrabajador() {
  const id = useSearchParams().get("id") ?? "";
  const { puede } = useAuth();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [tab, setTab] = useState<"ficha" | "contratos" | "remuneraciones" | "habilitaciones" | "cuenta">("ficha");
  const [dlg, setDlg] = useState<null | "editar" | "contrato" | "desvincular">(null);
  const [contratoEdit, setContratoEdit] = useState<ContratoBase | null>(null);
  const [claveTemp, setClaveTemp] = useState<string | null>(null);
  const [liq, setLiq] = useState<{ l: Liquidacion; conceptos: { concepto: string; tipo?: string; monto: number }[] } | null>(null);

  const { data, error, refetch } = useQuery({ queryKey: ["trabajador", id], queryFn: () => api.get<Detalle>(`/api/trabajadores/${id}`) });
  const verPagos = puede("remuneraciones");
  const rem = useQuery({
    queryKey: ["rem-trabajador", id], enabled: verPagos && tab === "remuneraciones",
    queryFn: async () => {
      const periodos = await api.get<string[]>("/api/remuneraciones/periodos");
      const r = await Promise.all(periodos.map((p) => api.get<{ liquidacion: Liquidacion; conceptos: { concepto: string; tipo?: string; monto: number }[] }>(`/api/remuneraciones/${p}/${id}`).catch(() => null)));
      return r.filter((x) => x != null);
    },
  });

  const refrescar = () => { for (const k of ["trabajador", "trabajadores", "cuentas", "panel", "terminos", "contratos", "directorio", "organigrama", "auditoria"]) void qc.invalidateQueries({ queryKey: [k] }); };
  const accion = (ruta: string, ok: string) => useMutation({ mutationFn: () => api.post<{ claveTemporal?: string }>(ruta), onSuccess: (r) => { refrescar(); if (r?.claveTemporal) setClaveTemp(r.claveTemporal); else aviso(ok); }, onError: (e) => aviso(mensajeDe(e), "error") }); // eslint-disable-line react-hooks/rules-of-hooks
  const restablecer = accion(`/api/cuentas/${id}/restablecer-clave`, "Clave restablecida.");
  const cerrarSesiones = accion(`/api/cuentas/${id}/cerrar-sesiones`, "Se cerraron las sesiones abiertas.");
  const desbloquear = accion(`/api/cuentas/${id}/desbloquear`, "Cuenta desbloqueada.");
  const quitar2fa = accion(`/api/cuentas/${id}/quitar-2fa`, "Segundo factor quitado: la persona puede activarlo de nuevo.");
  const guardar = useMutation({
    mutationFn: (v: ValoresTrabajador) => api.put(`/api/trabajadores/${id}`, aCuerpo(v, false)),
    onSuccess: () => { refrescar(); aviso("Datos guardados."); setDlg(null); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const revertir = useMutation({
    mutationFn: (tid: number) => api.del(`/api/terminos/${tid}`),
    onSuccess: () => { refrescar(); aviso("Desvinculación revertida: la cuenta vuelve a evaluarse con el contrato."); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });

  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  if (!data) return <div className="grid gap-4"><Esqueleto className="h-16 w-1/2" /><Esqueleto className="h-64" /></div>;
  const { resumen: r, personal: p, contratos } = data;
  const activo = r.estadoLaboral === "Activo";
  const editar = puede("personal", "editar");
  const actual = contratos.find((c) => c.esActual);
  const inicialForm: ValoresTrabajador = { ...VACIO, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])), cargoId: String(data.cargo.id), jefeDirectoId: r.jefeDirectoId ?? "", fechaIngreso: p.fechaIngreso } as ValoresTrabajador;

  return (
    <>
      <Encabezado
        atras={<Link href="/trabajadores" className="mb-2 inline-flex items-center gap-1 text-[14px] text-gris hover:text-negro"><ArrowLeft className="size-4" />Trabajadores</Link>}
        titulo={r.nombre}
        descripcion={<span className="flex flex-wrap items-center gap-x-3 gap-y-1.5"><span>{r.cargo}</span><Estado v={r.estadoLaboral} /><Estado v={r.estadoCuenta} /></span>}
        acciones={<>
          {editar && <Boton variante="contorno" onClick={() => setDlg("editar")}><Pencil className="size-4" />Editar datos</Boton>}
          {puede("contratos", "editar") && activo && <Boton variante="contorno" onClick={() => { setContratoEdit(actual ? { ...actual, id: undefined } : null); setDlg("contrato"); }}><Plus className="size-4" />Nuevo contrato</Boton>}
          {puede("terminos", "editar") && activo && <Boton variante="peligro" onClick={() => setDlg("desvincular")}><ShieldOff className="size-4" />Desvincular</Boton>}
          {puede("terminos", "editar") && !activo && data.terminos[0] && <Boton variante="contorno" cargando={revertir.isPending} onClick={() => revertir.mutate(data.terminos[0].id)}><RotateCcw className="size-4" />Revertir desvinculación</Boton>}
        </>} />

      {!activo && (
        <div className="mb-5 border-l-[3px] border-rojo bg-rojo-claro px-4 py-3">
          <p className="font-semibold">Desvinculado el {fecha(r.fechaTermino)}</p>
          <p className="text-[14px]">{data.terminos[0]?.causal}. Su cuenta está cerrada: no puede ingresar a la web ni a la app.</p>
        </div>
      )}

      <Pestanas id="ficha" activa={tab} onCambio={setTab} items={[
        { clave: "ficha", titulo: "Ficha" }, { clave: "contratos", titulo: "Contratos", n: contratos.length },
        ...(verPagos ? [{ clave: "remuneraciones" as const, titulo: "Remuneraciones" }] : []),
        { clave: "habilitaciones", titulo: "Habilitaciones", n: data.habilitaciones.length }, { clave: "cuenta", titulo: "Cuenta de acceso" },
      ]} />

      <div className="mt-5">
        {tab === "ficha" && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Seccion titulo="Datos personales"><dl className="grid grid-cols-2 gap-4 p-5">
              <Dato etiqueta="RUT"><span className="num">{p.rut}</span></Dato><Dato etiqueta="Edad">{r.edad} años</Dato>
              <Dato etiqueta="Nacimiento">{fecha(p.fechaNacimiento)}</Dato><Dato etiqueta="Estado civil">{p.estadoCivil}</Dato>
              <Dato etiqueta="Nacionalidad">{p.nacionalidad}</Dato><Dato etiqueta="Sexo">{p.sexo === "F" ? "Femenino" : "Masculino"}</Dato>
            </dl></Seccion>
            <Seccion titulo="Contacto y domicilio"><dl className="grid grid-cols-2 gap-4 p-5">
              <Dato etiqueta="Domicilio" className="col-span-2">{p.domicilio}, {p.comuna}</Dato>
              <Dato etiqueta="Región" className="col-span-2">{p.region}</Dato>
              <Dato etiqueta="Teléfono">{p.telefono}</Dato><Dato etiqueta="Correo personal">{p.correoPersonal}</Dato>
              <Dato etiqueta="Contacto de emergencia">{p.contactoEmergencia}</Dato><Dato etiqueta="Teléfono de emergencia">{p.telefonoEmergencia}</Dato>
            </dl></Seccion>
            <Seccion titulo="Previsión y pago"><dl className="grid grid-cols-2 gap-4 p-5">
              <Dato etiqueta="AFP">{p.afp}</Dato><Dato etiqueta="Salud">{p.sistemaSalud}</Dato>
              <Dato etiqueta="Banco">{p.banco}</Dato><Dato etiqueta="Tipo de cuenta">{p.tipoCuenta}</Dato>
              <Dato etiqueta="Número de cuenta" className="col-span-2"><span className="num">{p.numeroCuenta}</span></Dato>
            </dl></Seccion>
            <Seccion titulo="En la empresa" className="lg:col-span-2"><dl className="grid gap-4 p-5 sm:grid-cols-3">
              <Dato etiqueta="Cargo" className="sm:col-span-2">{data.cargo.nombre}</Dato><Dato etiqueta="Turno">{TURNO_NOMBRE[r.turno]}</Dato>
              <Dato etiqueta="Ingreso">{fecha(p.fechaIngreso)}</Dato><Dato etiqueta="Área">{r.familia}</Dato>
              <Dato etiqueta="Jefe directo">{data.jefe ? <Link className="underline decoration-linea underline-offset-2 hover:decoration-negro" href={`/trabajadores/ficha?id=${data.jefe.id}`}>{data.jefe.nombre}</Link> : null}</Dato>
              <Dato etiqueta="Para qué existe el cargo" className="sm:col-span-3"><span className="font-normal text-gris">{data.cargo.paraQueExiste}</span></Dato>
            </dl></Seccion>
            <Seccion titulo={`Equipo a cargo (${data.equipo.length})`}>
              {data.equipo.length === 0 ? <p className="p-5 text-gris">No tiene personas a cargo.</p> : (
                <ul className="max-h-[260px] divide-y divide-linea-suave overflow-auto px-5 py-2">{data.equipo.map((e) => <li key={e.id}><Link href={`/trabajadores/ficha?id=${e.id}`} className="block py-2 hover:bg-chapa/60"><p className="font-medium">{e.nombre}</p><p className="text-[13px] text-gris">{e.cargo}</p></Link></li>)}</ul>
              )}
            </Seccion>
          </div>
        )}

        {tab === "contratos" && (
          <ol className="grid gap-3">
            {contratos.map((c) => (
              <li key={c.id}>
                <Seccion sinBorde className={c.esActual ? "border-l-[4px] border-acento" : "border-l-[4px] border-linea"}>
                  <div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <div><div className="flex items-center gap-2"><p className="display text-[24px] font-semibold leading-none">{c.tipo}</p><Estado v={c.estado} /></div><p className="mt-1 text-[13px] text-gris">{c.codigo}{c.jornadaHoras ? ` · ${c.jornadaHoras} horas semanales` : ""}</p></div>
                    <div><p className="text-[13px] text-gris">Vigencia</p><p className="num font-medium">{fecha(c.fechaInicio)} a {c.fechaTermino ? fecha(c.fechaTermino) : "sin término"}</p></div>
                    <div><p className="text-[13px] text-gris">Sueldo base</p><p className="num font-medium">{clp(c.sueldoBase)}</p><p className="num text-[13px] text-gris">+ colación {clp(c.colacion)}, movilización {clp(c.movilizacion)}</p></div>
                    {puede("contratos", "editar") && <div className="self-center"><Boton tam="s" variante="contorno" onClick={() => { setContratoEdit(c); setDlg("contrato"); }}>Corregir</Boton></div>}
                  </div>
                  {c.observaciones && <p className="border-t border-linea-suave px-5 py-2 text-[14px] text-gris">{c.observaciones}</p>}
                </Seccion>
              </li>
            ))}
          </ol>
        )}

        {tab === "remuneraciones" && (
          <Seccion>
            {rem.isLoading ? <div className="p-5"><Esqueleto className="h-24" /></div> : !rem.data?.length ? <Vacio titulo="Sin liquidaciones" texto="Esta persona no tiene asistencia registrada en los períodos cargados." /> : (
              <table className="w-full text-left"><thead><tr className="border-b border-negro text-[13px] text-gris"><th className="px-4 py-2.5">Período</th><th className="px-4 text-right">Haberes</th><th className="px-4 text-right">Descuentos</th><th className="px-4 text-right">Líquido</th><th className="px-4">Pago</th></tr></thead>
                <tbody>{rem.data.map((x) => (
                  <tr key={x.liquidacion.periodo} onClick={() => setLiq({ l: x.liquidacion, conceptos: x.conceptos })} className="cursor-pointer border-b border-linea-suave hover:bg-chapa/70">
                    <td className="num px-4 py-3 font-medium">{x.liquidacion.periodo}</td><td className="num px-4 text-right">{clp(x.liquidacion.totalHaberes)}</td><td className="num px-4 text-right text-rojo-hondo">{clp(x.liquidacion.totalDescuentos)}</td>
                    <td className="num px-4 text-right font-semibold">{clp(x.liquidacion.liquidoAPagar)}</td><td className="px-4"><Chip tono={x.liquidacion.estadoPago === "Pagada" ? "ok" : "aviso"}>{x.liquidacion.estadoPago}</Chip></td>
                  </tr>))}</tbody></table>
            )}
          </Seccion>
        )}

        {tab === "habilitaciones" && (
          <Seccion>
            {data.habilitaciones.length === 0 ? <Vacio titulo="Sin habilitaciones" texto="Este cargo no exige habilitaciones de seguridad registradas." /> : (
              <ul className="divide-y divide-linea-suave px-5 py-2">{data.habilitaciones.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{h.nombre}</p><p className="text-[13px] text-gris">Obtenida el {fecha(h.fechaObtencion)}, dura {h.vigenciaMeses} meses</p></div><div className="text-right"><p className="num">vence {fecha(h.vence)}</p><Estado v={h.estado} /></div></li>
              ))}</ul>
            )}
          </Seccion>
        )}

        {tab === "cuenta" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Seccion titulo="Cuenta de SIMA"><dl className="grid grid-cols-2 gap-4 p-5">
              <Dato etiqueta="Usuario">{data.cuenta.login}</Dato><Dato etiqueta="Estado"><Estado v={data.cuenta.estado} /></Dato>
              <Dato etiqueta="Ingresa por">{r.canal === "web" ? "Web de administración" : "App de terreno"}</Dato><Dato etiqueta="Perfil">{r.perfil}</Dato>
              <Dato etiqueta="Último ingreso">{hace(data.cuenta.ultimoAcceso)}</Dato><Dato etiqueta="Bloqueo por intentos">{data.cuenta.bloqueada ? "Bloqueada" : "No"}</Dato>
              <Dato etiqueta="Segundo factor"><Chip tono={data.cuenta.totpActivo ? "ok" : "neutro"}>{data.cuenta.totpActivo ? "Activo" : "No activo"}</Chip></Dato><Dato etiqueta="Clave"><Chip tono={data.cuenta.debeCambiarClave ? "aviso" : "neutro"}>{data.cuenta.debeCambiarClave ? "Debe elegir una propia" : "Propia"}</Chip></Dato>
              {data.cuenta.alias && <Dato etiqueta="Usuario de demostración" className="col-span-2">{data.cuenta.alias}</Dato>}
              <Dato etiqueta="Acceso web"><Chip tono={data.cuenta.accesoWeb ? "ok" : "neutro"}>{data.cuenta.accesoWeb ? "Permitido" : "Sin acceso"}</Chip></Dato>
              <Dato etiqueta="Acceso app"><Chip tono={data.cuenta.accesoApp ? "ok" : "neutro"}>{data.cuenta.accesoApp ? "Permitido" : "Sin acceso"}</Chip></Dato>
            </dl></Seccion>
            <Seccion titulo="Acciones">
              <div className="grid gap-3 p-5">
                <p className="text-[14px] text-gris">La cuenta se cierra sola al desvincular a la persona o cuando su contrato vigente termina sin renovarse. Estas acciones sirven para casos puntuales.</p>
                {puede("cuentas", "editar") ? (
                  <>
                    <Boton variante="contorno" disabled={!activo} cargando={restablecer.isPending} onClick={() => restablecer.mutate()}><KeyRound className="size-4" />Restablecer clave</Boton>
                    <Boton variante="contorno" disabled={!activo} cargando={cerrarSesiones.isPending} onClick={() => cerrarSesiones.mutate()}><LogOut className="size-4" />Cerrar sesiones abiertas</Boton>
                    <Boton variante="contorno" disabled={!data.cuenta.totpActivo} cargando={quitar2fa.isPending} onClick={() => quitar2fa.mutate()}><ShieldOff className="size-4" />Quitar segundo factor</Boton>
                    <Boton variante="contorno" disabled={!data.cuenta.bloqueada} cargando={desbloquear.isPending} onClick={() => desbloquear.mutate()}><Unlock className="size-4" />Desbloquear cuenta</Boton>
                  </>
                ) : <p className="text-gris">Solo Personas puede modificar cuentas.</p>}
              </div>
            </Seccion>
          </div>
        )}
      </div>

      <DialogoDesvincular persona={{ id, nombre: r.nombre, cargo: r.cargo, estadoCuenta: r.estadoCuenta }} abierto={dlg === "desvincular"} onCerrar={() => setDlg(null)} />
      <DialogoContrato abierto={dlg === "contrato"} onCerrar={() => setDlg(null)} trabajadorId={id} nombre={r.nombre} base={contratoEdit} />
      <Dialogo abierto={dlg === "editar"} onCerrar={() => setDlg(null)} titulo="Editar datos" ancho={980}>
        <FormularioTrabajador inicial={inicialForm} modo="editar" enviando={guardar.isPending} alEnviar={(v) => guardar.mutate(v)} alCancelar={() => setDlg(null)} />
      </Dialogo>
      <Dialogo abierto={claveTemp != null} onCerrar={() => setClaveTemp(null)} titulo="Clave temporal" ancho={460} pie={<Boton onClick={() => setClaveTemp(null)}>Listo</Boton>}>
        <p className="text-gris">Entregue esta clave a {r.nombre}. Se muestra una sola vez y las sesiones abiertas se cerraron.</p>
        <p className="num mt-3 select-all bg-chapa px-4 py-3 text-center font-display text-[32px] font-bold tracking-wider">{claveTemp}</p>
      </Dialogo>
      <Cajon abierto={liq != null} onCerrar={() => setLiq(null)} titulo="Liquidación de sueldo">{liq && <DetalleLiquidacion l={liq.l} conceptos={liq.conceptos} />}</Cajon>
    </>
  );
}
