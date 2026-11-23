"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fecha, hace } from "@sima/cliente";
import { Globe, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AreaTexto, Boton, Cajon, Campo, Chip, Dialogo, Encabezado, Entrada, ErrorCarga, Esqueleto, Estado, Interruptor, Seccion, Seleccion, Tabla, mensajeDe, useAviso, type Columna } from "@/components/ui";

interface Cuenta { id: string; nombre: string; login: string; cargo: string; perfil: string; canal: string; estadoLaboral: string; estadoContrato: string; estadoCuenta: string; accesoWeb: boolean; accesoApp: boolean; ultimoAcceso?: string | null; bloqueada: boolean }

export default function Cuentas() {
  const router = useRouter();
  const { puede, tiene } = useAuth();
  const [plataformas, setPlataformas] = useState<Cuenta | null>(null);
  const qc = useQueryClient();
  const aviso = useAviso();
  const [estado, setEstado] = useState("");
  const [canal, setCanal] = useState("");
  const [q, setQ] = useState("");
  const [clave, setClave] = useState<{ nombre: string; clave: string } | null>(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["cuentas"], queryFn: () => api.get<Cuenta[]>("/api/cuentas") });
  const lista = useMemo(() => data.filter((c) => (!estado || c.estadoCuenta === estado) && (!canal || c.canal === canal) && (!q || `${c.nombre} ${c.login} ${c.cargo}`.toLowerCase().includes(q.toLowerCase()))), [data, estado, canal, q]);
  const restablecer = useMutation({
    mutationFn: (c: Cuenta) => api.post<{ claveTemporal: string }>(`/api/cuentas/${c.id}/restablecer-clave`).then((r) => ({ nombre: c.nombre, clave: r.claveTemporal })),
    onSuccess: (r) => { setClave(r); void qc.invalidateQueries({ queryKey: ["cuentas"] }); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });

  const columnas: Columna<Cuenta>[] = [
    { clave: "nombre", titulo: "Persona", valor: (c) => c.nombre, render: (c) => <div><p className="font-medium">{c.nombre}</p><p className="max-w-[260px] truncate text-[13px] text-gris">{c.cargo}</p></div> },
    { clave: "login", titulo: "Usuario", valor: (c) => c.login, render: (c) => <span className="text-[14px]">{c.login}</span> },
    { clave: "canal", titulo: "Plataforma del cargo", valor: (c) => c.canal, render: (c) => <div><p>{c.canal === "web" ? "SIMA Web" : "SIMA Desktop"}</p><p className="text-[12.5px] text-gris">{c.perfil}</p></div> },
    { clave: "acc", titulo: "Acceso vigente", render: (c) => (
      <button onClick={(e) => { e.stopPropagation(); setPlataformas(c); }} className="flex cursor-pointer gap-1.5" title="Ver y cambiar la autorización por plataforma">
        <Chip punto={false} tono={c.accesoWeb ? "ok" : "neutro"}>Web</Chip><Chip punto={false} tono={c.accesoApp ? "ok" : "neutro"}>Desktop</Chip>
      </button>
    ) },
    { clave: "ultimo", titulo: "Último ingreso", valor: (c) => c.ultimoAcceso ?? "", render: (c) => <span className="text-gris">{hace(c.ultimoAcceso)}</span> },
    { clave: "cuenta", titulo: "Estado", valor: (c) => c.estadoCuenta, render: (c) => <div className="flex items-center gap-2"><Estado v={c.estadoCuenta} />{c.bloqueada && <Chip tono="aviso" punto={false}>Bloqueada</Chip>}</div> },
    { clave: "acc2", titulo: "", render: (c) => (
      <div className="flex justify-end gap-1.5">
        {(tiene("cuentas.plataformas") || puede("cuentas", "editar")) && <Boton tam="s" variante="texto" onClick={(e) => { e.stopPropagation(); setPlataformas(c); }}>Plataformas</Boton>}
        {puede("cuentas", "editar") && c.estadoCuenta === "ACTIVA" && <Boton tam="s" variante="contorno" onClick={(e) => { e.stopPropagation(); restablecer.mutate(c); }}>Nueva clave</Boton>}
      </div>
    ) },
  ];

  return (
    <>
      <Encabezado titulo="Cuentas de acceso" descripcion="Quién puede entrar hoy y por dónde. El estado sale del contrato de cada persona; el acceso a una segunda plataforma lo autoriza Personas, con motivo, y se puede revocar por separado." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
            <Entrada className="max-w-[320px]" placeholder="Buscar persona, usuario o cargo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
            <Seleccion className="w-[160px]" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado"><option value="">Todo estado</option><option value="ACTIVA">Activa</option><option value="SUSPENDIDA">Suspendida</option><option value="CERRADA">Cerrada</option></Seleccion>
            <Seleccion className="w-[200px]" value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Plataforma del cargo"><option value="">Web y Desktop</option><option value="web">Cargos de SIMA Web</option><option value="app">Cargos de SIMA Desktop</option></Seleccion>
            <Chip punto={false} className="ml-auto">{lista.length} cuentas</Chip>
          </div>
          <Tabla columnas={columnas} filas={lista} clave={(c) => c.id} cargando={isLoading} alHacerClic={(c) => router.push(`/trabajadores/ficha?id=${c.id}`)} maxAlto="calc(100dvh - 330px)" />
        </Seccion>
      )}
      <Cajon abierto={plataformas != null} onCerrar={() => setPlataformas(null)} titulo={plataformas ? `Plataformas · ${plataformas.nombre}` : ""} ancho={560}>
        {plataformas && <PlataformasCuenta cuenta={plataformas} />}
      </Cajon>
      <Dialogo abierto={clave != null} onCerrar={() => setClave(null)} titulo="Clave temporal" ancho={460} pie={<Boton onClick={() => setClave(null)}>Listo</Boton>}>
        <p className="text-gris">Entregue esta clave a {clave?.nombre}. Se muestra una sola vez y sus sesiones abiertas se cerraron.</p>
        <p className="num mt-3 select-all bg-chapa px-4 py-3 text-center font-display text-[32px] font-bold tracking-wider">{clave?.clave}</p>
      </Dialogo>
    </>
  );
}

interface Plataforma { plataforma: "web" | "app"; nombre: string; porCargo: boolean; habilitada: boolean; autorizacion: null | { habilitado: boolean; motivo: string; porNombre: string; fecha: string }; ultimoIngreso?: string | null }

/**
 * Autorización por plataforma: cada cargo trae la suya (SIMA Web o SIMA Desktop) y Personas puede autorizar la otra o
 * revocar cualquiera, siempre con motivo. Revocar cierra las sesiones abiertas en esa plataforma; la otra sigue igual.
 * El servidor valida quién puede hacerlo (soporte TI no autoriza plataformas) y deja auditoría.
 */
function PlataformasCuenta({ cuenta }: { cuenta: Cuenta }) {
  const { tiene, puede } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const { data, isLoading, error } = useQuery({ queryKey: ["cuentas", cuenta.id, "plataformas"], queryFn: () => api.get<Plataforma[]>(`/api/cuentas/${cuenta.id}/plataformas`) });
  const [cambio, setCambio] = useState<{ p: Plataforma; habilitar: boolean } | null>(null);
  const [motivo, setMotivo] = useState("");
  const guardar = useMutation({
    mutationFn: () => api.put(`/api/cuentas/${cuenta.id}/plataformas/${cambio!.p.plataforma}`, { habilitado: cambio!.habilitar, motivo: motivo.trim() }),
    onSuccess: () => { aviso(cambio!.habilitar ? `${cambio!.p.nombre} autorizada para ${cuenta.nombre}.` : `${cambio!.p.nombre} revocada: se cerraron sus sesiones en esa plataforma.`); setCambio(null); setMotivo(""); void qc.invalidateQueries({ queryKey: ["cuentas"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const puedeAutorizar = tiene("cuentas.plataformas");
  const puedeRevocar = tiene("cuentas.plataformas") || puede("cuentas", "editar");
  if (error) return <ErrorCarga error={error} />;
  if (isLoading || !data) return <Esqueleto className="h-40" />;
  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-gris">{cuenta.cargo}. Su cargo trabaja en {cuenta.canal === "web" ? "SIMA Web" : "SIMA Desktop"}.</p>
      {data.map((p) => {
        const Icono = p.plataforma === "web" ? Globe : Monitor;
        const permitido = p.habilitada ? puedeRevocar : puedeAutorizar;
        return (
          <section key={p.plataforma} className="rounded-md border border-linea-suave bg-papel p-4">
            <div className="flex items-center gap-3">
              <Icono className="size-4 text-gris" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{p.nombre}</p><p className="text-[12px] text-gris">{p.porCargo ? "Plataforma de su cargo" : "No es la plataforma de su cargo"}{p.ultimoIngreso ? ` · último ingreso ${hace(p.ultimoIngreso)}` : " · sin ingresos"}</p></div>
              <Chip tono={p.habilitada ? "ok" : "neutro"}>{p.habilitada ? "Autorizada" : "Sin acceso"}</Chip>
              <Interruptor activo={p.habilitada} etiqueta={`${p.habilitada ? "Revocar" : "Autorizar"} ${p.nombre}`} deshabilitado={!permitido || cuenta.estadoCuenta !== "ACTIVA"} onCambio={(v) => { setCambio({ p, habilitar: v }); setMotivo(""); }} />
            </div>
            {p.autorizacion && <p className="mt-2 border-t border-linea-suave pt-2 text-[12px] text-gris">{p.autorizacion.habilitado ? "Autorizada" : "Revocada"} por <b className="font-medium text-carbon">{p.autorizacion.porNombre}</b> el {fecha(p.autorizacion.fecha)} · «{p.autorizacion.motivo}»</p>}
            {!permitido && <p className="mt-2 text-[11.5px] text-apagado">{p.habilitada ? "Revocar requiere administrar cuentas." : "Autorizar una segunda plataforma lo hace Personas (Recursos Humanos)."}</p>}
          </section>
        );
      })}
      {cuenta.estadoCuenta !== "ACTIVA" && <p className="text-[12.5px] text-ambar">La cuenta no está activa: no tiene acceso a ninguna plataforma, sin importar la autorización.</p>}
      <Dialogo abierto={cambio != null} onCerrar={() => setCambio(null)} titulo={cambio ? `${cambio.habilitar ? "Autorizar" : "Revocar"} ${cambio.p.nombre}` : ""} ancho={480}
        pie={<><Boton variante="contorno" onClick={() => setCambio(null)}>Cancelar</Boton><Boton variante={cambio?.habilitar ? "acento" : "peligro"} cargando={guardar.isPending} disabled={motivo.trim().length < 4} onClick={() => guardar.mutate()}>{cambio?.habilitar ? "Autorizar" : "Revocar acceso"}</Boton></>}>
        <div className="grid gap-3 text-[13.5px]">
          <p className="text-carbon">{cambio?.habilitar ? `${cuenta.nombre} podrá ingresar a ${cambio?.p.nombre} con las capacidades de su cargo que correspondan a esa plataforma.` : `${cuenta.nombre} no podrá ingresar a ${cambio?.p.nombre} y se cerrarán sus sesiones abiertas allí. La otra plataforma no cambia.`}</p>
          <Campo etiqueta="Motivo" obligatorio><AreaTexto value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus placeholder="Queda en la auditoría" /></Campo>
        </div>
      </Dialogo>
    </div>
  );
}
