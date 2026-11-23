import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import type { Cliente, Usuario } from "@sima/cliente";
import { Boton, Campo, Entrada, Seccion, mensajeDe } from "./ui";

interface Props {
  cliente: Cliente;
  usuario: Usuario;
  /** Se llama con el token nuevo que entrega el servidor al cambiar la clave o activar el segundo factor. */
  alNuevoToken: (token: string) => void;
  alTerminar?: () => void;
}

function Aviso({ tono, children }: { tono: "ok" | "error"; children: ReactNode }) {
  return <p role={tono === "error" ? "alert" : "status"} className={tono === "error" ? "border-l-[3px] border-rojo bg-rojo-claro px-3 py-2 text-[14px] text-rojo-hondo" : "border-l-[3px] border-verde bg-verde-claro px-3 py-2 text-[14px]"}>{children}</p>;
}

/** Elegir una clave propia y activar el segundo factor (aplicación de autenticación). Sirve para el paso obligatorio y para el uso voluntario. */
export function PanelSeguridad({ cliente, usuario, alNuevoToken, alTerminar }: Props) {
  const falta = usuario.restringido;
  const [clave, setClave] = useState({ actual: "", nueva: "", repetir: "" });
  const [msgClave, setMsgClave] = useState<{ tono: "ok" | "error"; t: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [dosFa, setDosFa] = useState<{ secreto: string; uri: string; qr: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [msg2fa, setMsg2fa] = useState<{ tono: "ok" | "error"; t: string } | null>(null);
  const [activo, setActivo] = useState(!!usuario.totpActivo);
  const [clave2, setClave2] = useState("");

  useEffect(() => { setActivo(!!usuario.totpActivo); }, [usuario.totpActivo]);

  async function cambiar(e: FormEvent) {
    e.preventDefault(); setMsgClave(null);
    if (clave.nueva.length < 8) return setMsgClave({ tono: "error", t: "La clave nueva debe tener al menos 8 caracteres." });
    if (clave.nueva !== clave.repetir) return setMsgClave({ tono: "error", t: "Las dos claves nuevas no coinciden." });
    setTrabajando(true);
    try {
      const r = await cliente.post<{ token: string }>("/api/auth/cambiar-clave", { actual: clave.actual, nueva: clave.nueva });
      setClave({ actual: "", nueva: "", repetir: "" }); setMsgClave({ tono: "ok", t: "Clave cambiada." }); alNuevoToken(r.token);
    } catch (x) { setMsgClave({ tono: "error", t: mensajeDe(x) }); } finally { setTrabajando(false); }
  }

  async function preparar() {
    setMsg2fa(null); setTrabajando(true);
    try {
      const r = await cliente.post<{ secreto: string; uri: string }>("/api/auth/2fa/preparar");
      setDosFa({ ...r, qr: await QRCode.toDataURL(r.uri, { margin: 1, width: 192 }) });
    } catch (x) { setMsg2fa({ tono: "error", t: mensajeDe(x) }); } finally { setTrabajando(false); }
  }
  async function activar(e: FormEvent) {
    e.preventDefault(); setMsg2fa(null); setTrabajando(true);
    try {
      const r = await cliente.post<{ token: string }>("/api/auth/2fa/activar", { codigo });
      setDosFa(null); setCodigo(""); setActivo(true); setMsg2fa({ tono: "ok", t: "Segundo factor activado. Desde ahora, al ingresar se le pedirá el código de la aplicación." }); alNuevoToken(r.token);
    } catch (x) { setMsg2fa({ tono: "error", t: mensajeDe(x) }); } finally { setTrabajando(false); }
  }
  async function desactivar(e: FormEvent) {
    e.preventDefault(); setMsg2fa(null); setTrabajando(true);
    try { await cliente.post("/api/auth/2fa/desactivar", { clave: clave2, codigo }); setActivo(false); setCodigo(""); setClave2(""); setMsg2fa({ tono: "ok", t: "Segundo factor desactivado." }); alNuevoToken(""); }
    catch (x) { setMsg2fa({ tono: "error", t: mensajeDe(x) }); } finally { setTrabajando(false); }
  }

  return (
    <div className="grid gap-5">
      {falta === "clave" && <Aviso tono="error">Su clave fue entregada por Personas. Elija una propia antes de continuar.</Aviso>}
      {falta === "2fa" && <Aviso tono="error">Su perfil exige el segundo factor. Actívelo con una aplicación de autenticación antes de continuar.</Aviso>}

      <Seccion titulo="Clave">
        <form onSubmit={cambiar} className="grid gap-3 p-5 pt-3">
          <Campo etiqueta="Clave actual"><Entrada type="password" autoComplete="current-password" required value={clave.actual} onChange={(e) => setClave({ ...clave, actual: e.target.value })} /></Campo>
          <Campo etiqueta="Clave nueva" ayuda="Al menos 8 caracteres. Distinta de la actual."><Entrada type="password" autoComplete="new-password" required value={clave.nueva} onChange={(e) => setClave({ ...clave, nueva: e.target.value })} /></Campo>
          <Campo etiqueta="Repita la clave nueva"><Entrada type="password" autoComplete="new-password" required value={clave.repetir} onChange={(e) => setClave({ ...clave, repetir: e.target.value })} /></Campo>
          {msgClave && <Aviso tono={msgClave.tono}>{msgClave.t}</Aviso>}
          <div><Boton type="submit" variante="negro" cargando={trabajando}>Cambiar clave</Boton></div>
        </form>
      </Seccion>

      <Seccion titulo="Segundo factor">
        <div className="grid gap-3 p-5 pt-3">
          {activo ? (
            <form onSubmit={desactivar} className="grid gap-3">
              <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-5 text-verde" />Activo: al ingresar se pide el código de su aplicación.</p>
              {falta !== "2fa" && (
                <>
                  <p className="text-[14px] text-gris">Para desactivarlo, confirme con su clave y un código vigente.</p>
                  <div className="grid gap-3 sm:grid-cols-2"><Campo etiqueta="Clave"><Entrada type="password" value={clave2} onChange={(e) => setClave2(e.target.value)} /></Campo><Campo etiqueta="Código de 6 dígitos"><Entrada inputMode="numeric" maxLength={7} value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Campo></div>
                  <div><Boton type="submit" variante="contorno" cargando={trabajando} disabled={!clave2 || codigo.length < 6}>Desactivar</Boton></div>
                </>
              )}
            </form>
          ) : dosFa ? (
            <form onSubmit={activar} className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <img src={dosFa.qr} alt="Código QR para la aplicación de autenticación" width={192} height={192} className="border border-linea" />
              <div className="grid content-start gap-3">
                <ol className="list-decimal space-y-1 pl-5 text-[14px] text-gris">
                  <li>Abra Google Authenticator, Microsoft Authenticator o Authy.</li>
                  <li>Escanee el código QR, o escriba esta clave: <b className="num select-all break-all text-negro">{dosFa.secreto}</b></li>
                  <li>Escriba el código de 6 dígitos que muestra la aplicación.</li>
                </ol>
                <Campo etiqueta="Código de 6 dígitos"><Entrada inputMode="numeric" autoComplete="one-time-code" maxLength={7} required value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Campo>
                <div><Boton type="submit" variante="rojo" cargando={trabajando} disabled={codigo.replace(/\s/g, "").length !== 6}>Activar segundo factor</Boton></div>
              </div>
            </form>
          ) : (
            <>
              <p className="text-gris">Agrega un código de un solo uso, que cambia cada 30 segundos, además de la clave. Protege la cuenta aunque alguien conozca su clave.</p>
              <div><Boton variante="rojo" cargando={trabajando} onClick={() => void preparar()}>Activar segundo factor</Boton></div>
            </>
          )}
          {msg2fa && <Aviso tono={msg2fa.tono}>{msg2fa.t}</Aviso>}
        </div>
      </Seccion>
      {alTerminar && !falta && <div><Boton variante="contorno" onClick={alTerminar}>Cerrar</Boton></div>}
    </div>
  );
}

/** Pantalla completa para quien debe cumplir un paso de seguridad antes de usar el sistema. */
export function PantallaSeguridad(props: Props & { alSalir: () => void }) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[640px] content-center gap-5 px-5 py-10">
      <div><h1 className="display text-[40px] font-bold leading-none">Antes de continuar</h1><p className="mt-2 text-gris">{props.usuario.nombre}, por seguridad hay un paso pendiente en su cuenta.</p></div>
      <PanelSeguridad {...props} />
      <button onClick={props.alSalir} className="cursor-pointer justify-self-start text-[14px] text-gris underline decoration-linea underline-offset-2 hover:text-negro">Salir</button>
    </div>
  );
}
