import type { ReactNode } from "react";
import type { EstadoCinta, EstadoLlenado, EstadoMaquinaProd } from "./escenarios";
import { useLab } from "./motor";

/**
 * Escenas 2D del laboratorio. Todo lo que se mueve se calcula desde el estado del motor de simulación
 * (posición de la banda, piezas, válvula, nivel, ángulo del husillo): si la simulación se pausa, la escena se congela;
 * si cambia la velocidad, el movimiento se adapta. Ningún valor es decorativo ni aleatorio.
 */
const C = { fondo: "#060912", linea: "#1b2540", metal: "#2a3550", metal2: "#3a4868", cian: "#22d3ee", violeta: "#8b5cf6", verde: "#34d399", ambar: "#fbbf24", rojo: "#fb7185", texto: "#dbe4ff", tenue: "#7d89ad" };

function Seleccionable({ id, x, y, w, h, children, etiqueta }: { id: string; x: number; y: number; w: number; h: number; children: ReactNode; etiqueta?: string }) {
  const s = useLab();
  const sel = s.seleccion === id;
  return (
    <g onClick={(ev) => { ev.stopPropagation(); s.seleccionar(id); }} style={{ cursor: "pointer" }}>
      {children}
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx={10} fill="transparent" stroke={sel ? C.cian : "transparent"} strokeWidth={1.5} strokeDasharray={sel ? "6 4" : undefined} />
      {sel && etiqueta && <text x={x + w / 2} y={y - 14} textAnchor="middle" fontSize={12} fill={C.cian} fontFamily="var(--font-mono)">{etiqueta}</text>}
    </g>
  );
}

/** Cable de señal entre el PLC y un dispositivo: se ilumina y fluye cuando la señal está activa. */
function Cable({ d, activo, fase }: { d: string; activo: boolean; fase: number }) {
  return (
    <g>
      <path d={d} fill="none" stroke={C.linea} strokeWidth={2.5} />
      {activo && <><path d={d} fill="none" stroke={C.cian} strokeWidth={2.5} opacity={0.35} style={{ filter: "blur(3px)" }} /><path d={d} fill="none" stroke={C.cian} strokeWidth={1.8} strokeDasharray="6 10" strokeDashoffset={-fase * 60} /></>}
    </g>
  );
}

function PlcCaja({ x, y, io, tags, nombre, estado }: { x: number; y: number; io: Record<string, number>; tags: string[]; nombre: string; estado: "run" | "stop" | "error" }) {
  const led = estado === "run" ? C.verde : estado === "error" ? C.rojo : C.ambar;
  return (
    <Seleccionable id="plc" x={x} y={y} w={250} h={104} etiqueta="PLC">
      <rect x={x} y={y} width={250} height={104} rx={10} fill="#0d1426" stroke={C.metal2} />
      <rect x={x} y={y} width={250} height={26} rx={10} fill="url(#marca)" />
      <text x={x + 12} y={y + 18} fontSize={12.5} fontWeight={700} fill="#06101a" fontFamily="var(--font-display)">{nombre}</text>
      <circle cx={x + 232} cy={y + 13} r={5} fill={led} style={{ filter: `drop-shadow(0 0 6px ${led})` }} />
      {tags.map((t, i) => {
        const on = (io[t] ?? 0) > 0;
        const cx = x + 18 + (i % 4) * 58, cy = y + 46 + Math.floor(i / 4) * 30;
        return (
          <g key={t}>
            <circle cx={cx} cy={cy} r={5} fill={on ? (t.includes("LUZ_ROJA") ? C.rojo : C.verde) : "#1c2438"} style={on ? { filter: `drop-shadow(0 0 5px ${C.verde})` } : undefined} />
            <text x={cx + 9} y={cy + 4} fontSize={8.5} fill={on ? C.texto : C.tenue} fontFamily="var(--font-mono)">{t.split("_").slice(1).join("_").slice(0, 8)}</text>
          </g>
        );
      })}
    </Seleccionable>
  );
}

function Baliza({ x, y, verde, ambar, rojo }: { x: number; y: number; verde: boolean; ambar: boolean; rojo: boolean }) {
  const luz = (cy: number, on: boolean, c: string) => <rect x={x} y={cy} width={26} height={22} rx={4} fill={on ? c : "#1a2135"} style={on ? { filter: `drop-shadow(0 0 10px ${c})` } : undefined} />;
  return (
    <Seleccionable id="baliza" x={x} y={y} w={26} h={96} etiqueta="Baliza">
      {luz(y, rojo, C.rojo)}{luz(y + 24, ambar, C.ambar)}{luz(y + 48, verde, C.verde)}
      <rect x={x + 10} y={y + 72} width={6} height={24} fill={C.metal} />
    </Seleccionable>
  );
}

function Display({ x, y, valor, etiqueta }: { x: number; y: number; valor: number; etiqueta: string }) {
  return (
    <Seleccionable id="contador" x={x} y={y} w={120} h={58} etiqueta="Contador">
      <rect x={x} y={y} width={120} height={58} rx={8} fill="#050a14" stroke={C.metal2} />
      <text x={x + 60} y={y + 36} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.cian} fontFamily="var(--font-mono)" style={{ filter: `drop-shadow(0 0 6px ${C.cian})` }}>{String(valor).padStart(4, "0")}</text>
      <text x={x + 60} y={y + 52} textAnchor="middle" fontSize={9} fill={C.tenue}>{etiqueta}</text>
    </Seleccionable>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="marca" x1="0" x2="1"><stop offset="0%" stopColor={C.cian} /><stop offset="100%" stopColor={C.violeta} /></linearGradient>
      <linearGradient id="liquido" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
      <linearGradient id="metalg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3a4868" /><stop offset="100%" stopColor="#1f2940" /></linearGradient>
      <pattern id="rejilla" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#0f1830" strokeWidth="1" /></pattern>
    </defs>
  );
}

// ================================================================================================ A · cinta
function EscenaCinta() {
  const s = useLab();
  const e = s.e as EstadoCinta;
  const io = s.escenario.io(e);
  const X0 = 120, PX = 160, Y = 380;
  const fase = e.pos;
  const angulo = (e.pos * PX / 22) * (180 / Math.PI);
  const estadoPlc = e.cpuFalla ? "error" : s.estado === "corriendo" && e.run ? "run" : "stop";
  const haz = (x: number, activo: boolean, id: string, nombre: string) => (
    <Seleccionable id={id} x={x - 14} y={Y - 92} w={28} h={92} etiqueta={nombre}>
      <rect x={x - 14} y={Y - 92} width={10} height={70} rx={3} fill={C.metal2} /><rect x={x + 4} y={Y - 92} width={10} height={70} rx={3} fill={C.metal2} />
      <line x1={x - 4} y1={Y - 52} x2={x + 4} y2={Y - 52} stroke={activo ? C.rojo : "#ff6b8155"} strokeWidth={3} style={activo ? { filter: `drop-shadow(0 0 6px ${C.rojo})` } : undefined} />
      <circle cx={x - 9} cy={Y - 82} r={3.5} fill={activo ? C.ambar : "#3a3420"} />
      <text x={x} y={Y - 100} textAnchor="middle" fontSize={11} fill={C.texto} fontFamily="var(--font-mono)">{id.toUpperCase()}</text>
    </Seleccionable>
  );
  return (
    <>
      <PlcCaja x={470} y={36} io={io} nombre="PLC-02 · CompactLogix" estado={estadoPlc} tags={["CT01_MARCHA", "CT01_PARO", "CT01_EMERG", "CT01_S1", "CT01_S2", "CT01_CONTACTOR", "CT01_LUZ_VERDE", "CT01_LUZ_ROJA"]} />
      <Cable d={`M520 140 V230 H${X0 + 0.7 * PX - 9} V${Y - 92}`} activo={e.s1} fase={fase} />
      <Cable d={`M640 140 V200 H${X0 + 5.3 * PX + 9} V${Y - 92}`} activo={e.s2} fase={fase} />
      <Cable d={`M700 140 V170 H1120 V${Y + 52}`} activo={io.CT01_CONTACTOR > 0} fase={fase} />
      <Cable d="M470 90 H260 V108" activo={io.CT01_LUZ_VERDE > 0 || io.CT01_LUZ_ROJA > 0} fase={fase} />
      <Baliza x={247} y={110} verde={io.CT01_LUZ_VERDE > 0} ambar={!e.run && !e.falla} rojo={io.CT01_LUZ_ROJA > 0} />
      {/* cinta */}
      <Seleccionable id="cinta" x={X0 - 30} y={Y - 4} w={PX * 6 + 60} h={44} etiqueta="Banda">
        <rect x={X0 - 30} y={Y} width={PX * 6 + 60} height={36} rx={18} fill="url(#metalg)" stroke={C.metal2} />
        <line x1={X0} y1={Y + 2} x2={X0 + PX * 6} y2={Y + 2} stroke="#7d8bb0" strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-((e.pos * PX) % 24)} />
        <line x1={X0} y1={Y + 34} x2={X0 + PX * 6} y2={Y + 34} stroke="#56638a" strokeWidth={2} strokeDasharray="14 10" strokeDashoffset={(e.pos * PX) % 24} />
        {[X0 - 12, X0 + PX * 6 + 12].map((cx) => <g key={cx} transform={`rotate(${angulo} ${cx} ${Y + 18})`}><circle cx={cx} cy={Y + 18} r={16} fill="#1c253c" stroke={C.metal2} /><line x1={cx - 14} y1={Y + 18} x2={cx + 14} y2={Y + 18} stroke={C.tenue} strokeWidth={2} /><line x1={cx} y1={Y + 4} x2={cx} y2={Y + 32} stroke={C.tenue} strokeWidth={2} /></g>)}
        {Array.from({ length: 13 }).map((_, i) => <rect key={i} x={X0 + i * 80 - 3} y={Y + 36} width={6} height={58} fill={C.metal} />)}
      </Seleccionable>
      {/* piezas */}
      {e.piezas.map((p) => (
        <g key={p.id} transform={`translate(${X0 + p.x * PX - 26} ${Y - 40})`}>
          <rect width={52} height={40} rx={4} fill={p.atascada ? "#7f1d1d" : "#c2410c"} stroke={p.atascada ? C.rojo : "#fb923c"} style={p.atascada ? { filter: `drop-shadow(0 0 8px ${C.rojo})` } : undefined} />
          <rect x={6} y={6} width={40} height={6} rx={2} fill="#00000033" />
        </g>
      ))}
      {haz(X0 + 0.7 * PX, e.s1, "s1", "Sensor S1")}
      {haz(X0 + 5.3 * PX, e.s2, "s2", "Sensor S2")}
      {/* motor */}
      <Seleccionable id="motor" x={1080} y={Y + 46} w={90} h={70} etiqueta="Motor M1">
        <rect x={1080} y={Y + 52} width={70} height={56} rx={8} fill="url(#metalg)" stroke={e.falla && e.corriente > 13 ? C.rojo : C.metal2} />
        <g transform={`rotate(${angulo * 3} 1115 ${Y + 80})`}>{[0, 60, 120].map((a) => <line key={a} x1={1115} y1={Y + 66} x2={1115} y2={Y + 94} stroke={e.motor > 0.1 ? C.cian : C.tenue} strokeWidth={3} transform={`rotate(${a} 1115 ${Y + 80})`} />)}</g>
        <circle cx={1115} cy={Y + 80} r={5} fill={C.metal2} />
        <text x={1115} y={Y + 128} textAnchor="middle" fontSize={11} fill={C.texto} fontFamily="var(--font-mono)">{e.corriente.toFixed(1)} A · {Math.round(e.motor * 100)}%</text>
      </Seleccionable>
      <Display x={960} y={200} valor={e.contador} etiqueta="piezas contadas (S2)" />
      {e.falla && <text x={600} y={Y + 150} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.rojo} style={{ filter: `drop-shadow(0 0 6px ${C.rojo})` }}>⚠ {e.falla}</text>}
    </>
  );
}

// ================================================================================================ B · llenado
function EscenaLlenado() {
  const s = useLab();
  const e = s.e as EstadoLlenado;
  const io = s.escenario.io(e);
  const X0 = 100, PX = 166, Y = 450;
  const XV = X0 + 3 * PX;
  const estadoPlc = e.cpuFalla ? "error" : s.estado === "corriendo" && e.run ? "run" : "stop";
  const h = 170, nivel = (e.deposito / 100) * (h - 12);
  const onda = Math.sin(e.t * 3) * 3;
  return (
    <>
      <PlcCaja x={850} y={36} io={io} nombre="PLC-03 · S7-1200" estado={estadoPlc} tags={["EV01_MARCHA", "EV01_PARO", "EV01_PRESENCIA", "EV01_NIVEL_OK", "EV01_CONTACTOR", "EV01_VALVULA", "EV01_BOMBA", "EV01_LUZ_ROJA"]} />
      {/* depósito */}
      <Seleccionable id="deposito" x={XV - 80} y={36} w={160} h={h} etiqueta="Depósito">
        <rect x={XV - 80} y={36} width={160} height={h} rx={14} fill="#0a1222" stroke={C.metal2} strokeWidth={2} />
        <clipPath id="clipDep"><rect x={XV - 76} y={40} width={152} height={h - 8} rx={11} /></clipPath>
        <g clipPath="url(#clipDep)">
          <path d={`M${XV - 80} ${36 + h - 6 - nivel + onda} Q ${XV - 40} ${36 + h - 12 - nivel - onda} ${XV} ${36 + h - 6 - nivel + onda} T ${XV + 80} ${36 + h - 6 - nivel} V ${36 + h} H ${XV - 80} Z`} fill="url(#liquido)" opacity={0.9} />
        </g>
        {[25, 50, 75].map((m) => <line key={m} x1={XV + 64} x2={XV + 76} y1={36 + h - 6 - (m / 100) * (h - 12)} y2={36 + h - 6 - (m / 100) * (h - 12)} stroke={C.tenue} />)}
        <text x={XV} y={36 + h / 2} textAnchor="middle" fontSize={22} fontWeight={700} fill="#fff" fontFamily="var(--font-mono)">{Math.round(e.deposito)}%</text>
      </Seleccionable>
      {/* bomba */}
      <Seleccionable id="bomba" x={XV - 200} y={120} w={70} h={70} etiqueta="Bomba">
        <circle cx={XV - 165} cy={155} r={30} fill="url(#metalg)" stroke={e.bomba ? C.cian : C.metal2} strokeWidth={2} />
        <g transform={`rotate(${e.bomba ? (e.t * 720) % 360 : 0} ${XV - 165} 155)`}>{[0, 90, 180, 270].map((a) => <path key={a} d={`M${XV - 165} 155 q 8 -6 4 -20`} stroke={e.bomba ? C.cian : C.tenue} strokeWidth={3} fill="none" transform={`rotate(${a} ${XV - 165} 155)`} />)}</g>
        <path d={`M${XV - 135} 150 H ${XV - 80}`} stroke={e.bomba ? "#38bdf8" : C.metal} strokeWidth={6} strokeDasharray={e.bomba ? "8 6" : undefined} strokeDashoffset={-e.t * 40} />
      </Seleccionable>
      {/* tubería y válvula */}
      <rect x={XV - 6} y={36 + h} width={12} height={38} fill={C.metal} />
      <Seleccionable id="valvula" x={XV - 28} y={36 + h + 36} w={56} h={40} etiqueta="Válvula V1">
        <path d={`M${XV - 28} ${36 + h + 40} L${XV} ${36 + h + 56} L${XV - 28} ${36 + h + 72} Z M${XV + 28} ${36 + h + 40} L${XV} ${36 + h + 56} L${XV + 28} ${36 + h + 72} Z`} fill={e.valvula > 0.5 ? "#164e63" : "#1c253c"} stroke={e.valvula > 0.5 ? C.cian : C.metal2} strokeWidth={2} />
        <g transform={`rotate(${e.valvula * 90} ${XV} ${36 + h + 56})`}><rect x={XV - 3} y={36 + h + 26} width={6} height={30} rx={3} fill={C.ambar} /></g>
      </Seleccionable>
      <rect x={XV - 4} y={36 + h + 72} width={8} height={18} fill={C.metal} />
      {e.valvula > 0.05 && Array.from({ length: 7 }).map((_, i) => { const yy = 36 + h + 92 + ((e.t * 220 + i * 18) % 110); return <circle key={i} cx={XV + Math.sin(i) * 1.5} cy={yy} r={2.2 + e.valvula} fill="#38bdf8" opacity={0.85} />; })}
      {/* sensor de nivel del envase y de presencia */}
      <Seleccionable id="nivel" x={XV + 40} y={Y - 120} w={22} h={40} etiqueta="Sensor de nivel"><rect x={XV + 40} y={Y - 120} width={18} height={40} rx={4} fill={io.EV01_NIVEL_OK ? "#14532d" : "#1c253c"} stroke={io.EV01_NIVEL_OK ? C.verde : C.metal2} /></Seleccionable>
      <Seleccionable id="presencia" x={XV - 74} y={Y - 64} w={20} h={56} etiqueta="Presencia">
        <rect x={XV - 74} y={Y - 64} width={14} height={56} rx={3} fill={C.metal2} />
        <line x1={XV - 60} y1={Y - 30} x2={XV + 60} y2={Y - 30} stroke={e.presencia ? C.rojo : "#ff6b8133"} strokeWidth={2} style={e.presencia ? { filter: `drop-shadow(0 0 5px ${C.rojo})` } : undefined} />
      </Seleccionable>
      <Cable d={`M880 140 V${Y - 40} H${XV - 60}`} activo={e.presencia} fase={e.t} />
      <Cable d={`M960 140 V${36 + h + 56} H${XV + 28}`} activo={io.EV01_VALVULA > 0} fase={e.t} />
      <Cable d={`M1040 140 V230 H${X0 + PX * 6 + 30} V${Y + 40}`} activo={io.EV01_CONTACTOR > 0} fase={e.t} />
      {/* cinta y envases */}
      <Seleccionable id="cinta" x={X0 - 20} y={Y} w={PX * 6 + 40} h={30} etiqueta="Cinta de envases">
        <rect x={X0 - 20} y={Y} width={PX * 6 + 40} height={28} rx={14} fill="url(#metalg)" stroke={C.metal2} />
        <line x1={X0} y1={Y + 2} x2={X0 + PX * 6} y2={Y + 2} stroke="#7d8bb0" strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-((e.pos * PX) % 24)} />
      </Seleccionable>
      {e.envases.map((v) => {
        const x = X0 + v.x * PX, alto = 74, nivelPx = Math.min(1, v.nivel / 100) * (alto - 8);
        return (
          <g key={v.id} transform={`translate(${x - 18} ${Y - alto})`}>
            <clipPath id={`env${v.id}`}><path d={`M4 ${alto} V22 Q4 14 12 12 V2 H24 V12 Q32 14 32 22 V${alto} Z`} /></clipPath>
            <g clipPath={`url(#env${v.id})`}><rect x={0} y={alto - nivelPx} width={36} height={nivelPx} fill={v.sobrellenado ? "#be123c" : "url(#liquido)"} /></g>
            <path d={`M4 ${alto} V22 Q4 14 12 12 V2 H24 V12 Q32 14 32 22 V${alto} Z`} fill="none" stroke={v.lleno ? C.verde : v.sobrellenado ? C.rojo : "#93c5fd"} strokeWidth={1.8} />
            {v.sobrellenado && <circle cx={30} cy={(e.t * 60) % 60 + 14} r={2.5} fill={C.rojo} />}
          </g>
        );
      })}
      <Display x={X0 + PX * 5 - 40} y={Y - 220} valor={e.contador} etiqueta="envases llenos" />
      {e.falla && <text x={600} y={Y + 80} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.rojo}>⚠ {e.falla}</text>}
    </>
  );
}

// ================================================================================================ C · máquina
const ORDEN_ESTADOS = ["detenida", "inicializando", "funcionando", "espera", "mantencion", "falla"] as const;
const TXT_ESTADO: Record<string, string> = { detenida: "Detenida", inicializando: "Inicializando", funcionando: "En funcionamiento", espera: "En espera", mantencion: "En mantención", falla: "En falla" };
const COLOR_ESTADO: Record<string, string> = { detenida: C.tenue, inicializando: C.cian, funcionando: C.verde, espera: C.ambar, mantencion: C.violeta, falla: C.rojo };

function EscenaMaquina() {
  const s = useLab();
  const e = s.e as EstadoMaquinaProd;
  const io = s.escenario.io(e);
  const estadoPlc = e.cpuFalla ? "error" : s.estado === "corriendo" && e.run ? "run" : "stop";
  const girando = e.husillo > 200;
  const zTool = 640 - e.herramienta * 170;
  return (
    <>
      <PlcCaja x={40} y={36} io={io} nombre="PLC-01 · S7-1500" estado={estadoPlc} tags={["TC01_MARCHA", "TC01_PARO", "TC01_PUERTA", "TC01_MATERIAL", "TC01_CONTACTOR", "TC01_LUZ_VERDE", "TC01_LUZ_ROJA", "TC01_RUN"]} />
      <Cable d="M290 90 H340 V140" activo={io.TC01_CONTACTOR > 0} fase={e.t} />
      <Cable d="M165 140 V330 H240" activo={io.TC01_MATERIAL > 0} fase={e.t} />
      {/* alimentador de barras */}
      <Seleccionable id="alimentador" x={60} y={300} w={180} h={70} etiqueta="Alimentador">
        <rect x={60} y={300} width={180} height={70} rx={8} fill="url(#metalg)" stroke={C.metal2} />
        {Array.from({ length: Math.min(10, e.material) }).map((_, i) => <rect key={i} x={72} y={308 + i * 5.5} width={156} height={4} rx={2} fill="#94a3b8" />)}
        <text x={150} y={392} textAnchor="middle" fontSize={11} fill={C.texto} fontFamily="var(--font-mono)">{e.material} barras</text>
      </Seleccionable>
      {/* máquina */}
      <Seleccionable id="maquina" x={300} y={140} w={600} h={330} etiqueta="Torno CNC TC-01">
        <rect x={300} y={140} width={600} height={330} rx={18} fill="#0d1426" stroke={COLOR_ESTADO[e.estado]} strokeOpacity={0.6} strokeWidth={2} style={{ filter: `drop-shadow(0 0 18px ${COLOR_ESTADO[e.estado]}33)` }} />
        <rect x={330} y={170} width={430} height={230} rx={10} fill="#050913" stroke={C.metal2} />
        {/* husillo y pieza */}
        <Seleccionable id="husillo" x={350} y={230} w={140} h={110} etiqueta="Husillo">
          <rect x={350} y={235} width={70} height={100} rx={8} fill="url(#metalg)" stroke={C.metal2} />
          <g transform={`rotate(${e.angulo} 450 285)`}><circle cx={450} cy={285} r={42} fill="#1c253c" stroke={girando ? C.cian : C.metal2} strokeWidth={2} />{[0, 120, 240].map((a) => <rect key={a} x={444} y={246} width={12} height={22} rx={2} fill={C.metal2} transform={`rotate(${a} 450 285)`} />)}</g>
          <rect x={490} y={274} width={190} height={22} rx={4} fill="#94a3b8" />
          {girando && <rect x={490} y={274} width={190} height={22} rx={4} fill="url(#marca)" opacity={0.12 + ((e.angulo / 360) % 1) * 0.1} />}
        </Seleccionable>
        {/* herramienta */}
        <Seleccionable id="herramienta" x={zTool - 22} y={300} w={44} h={70} etiqueta="Torreta">
          <rect x={zTool - 22} y={318} width={44} height={50} rx={6} fill="url(#metalg)" stroke={C.metal2} />
          <path d={`M${zTool - 6} 318 L${zTool} 298 L${zTool + 6} 318 Z`} fill={C.ambar} />
        </Seleccionable>
        {girando && Array.from({ length: 8 }).map((_, i) => { const k = (e.angulo / 360 + i / 8) % 1; return <circle key={i} cx={zTool + Math.cos(i * 1.7) * 30 * k} cy={296 + k * 70} r={1.8} fill="#fbbf24" opacity={1 - k} />; })}
        {/* puerta */}
        <Seleccionable id="puerta" x={330 + e.puerta * 300} y={170} w={260} h={230} etiqueta="Puerta">
          <rect x={330 + e.puerta * 300} y={170} width={260} height={230} rx={10} fill="#0f1a33" fillOpacity={0.55} stroke={C.metal2} />
          <rect x={350 + e.puerta * 300} y={190} width={220} height={150} rx={6} fill="#22d3ee" fillOpacity={0.05} stroke="#22d3ee33" />
          <rect x={560 + e.puerta * 300} y={270} width={8} height={40} rx={3} fill={C.metal2} />
        </Seleccionable>
        {/* panel del control */}
        <rect x={780} y={170} width={100} height={150} rx={8} fill="#050913" stroke={C.metal2} />
        <text x={830} y={196} textAnchor="middle" fontSize={11} fill={C.tenue} fontFamily="var(--font-mono)">RPM</text>
        <text x={830} y={222} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.cian} fontFamily="var(--font-mono)">{Math.round(e.husillo)}</text>
        <text x={830} y={252} textAnchor="middle" fontSize={11} fill={C.tenue} fontFamily="var(--font-mono)">CICLO</text>
        <rect x={792} y={262} width={76} height={8} rx={4} fill="#1c253c" /><rect x={792} y={262} width={76 * Math.min(1, e.ciclo / 8)} height={8} rx={4} fill={C.verde} />
        <text x={830} y={300} textAnchor="middle" fontSize={11} fill={C.texto} fontFamily="var(--font-mono)">{e.contador} pzs</text>
        <rect x={300} y={470} width={600} height={24} fill={C.metal} />
      </Seleccionable>
      <Baliza x={940} y={150} verde={e.estado === "funcionando"} ambar={e.estado === "espera" || e.estado === "inicializando" || e.estado === "mantencion"} rojo={e.estado === "falla"} />
      {/* diagrama de estados */}
      <g transform="translate(330 56)">
        {ORDEN_ESTADOS.map((st, i) => {
          const activo = e.estado === st; const x = i * 142;
          return (
            <g key={st}>
              {i < ORDEN_ESTADOS.length - 1 && <line x1={x + 126} x2={x + 142} y1={22} y2={22} stroke={C.linea} strokeWidth={2} />}
              <rect x={x} y={0} width={126} height={44} rx={22} fill={activo ? `${COLOR_ESTADO[st]}26` : "#0b1222"} stroke={activo ? COLOR_ESTADO[st] : C.linea} strokeWidth={activo ? 2 : 1} style={activo ? { filter: `drop-shadow(0 0 10px ${COLOR_ESTADO[st]})` } : undefined} />
              <circle cx={x + 18} cy={22} r={5} fill={COLOR_ESTADO[st]} opacity={activo ? 1 : 0.35} />
              <text x={x + 68} y={27} textAnchor="middle" fontSize={11.5} fontWeight={activo ? 700 : 500} fill={activo ? C.texto : C.tenue}>{TXT_ESTADO[st]}</text>
            </g>
          );
        })}
      </g>
      {e.falla && <text x={600} y={520} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.rojo}>⚠ {e.falla}</text>}
    </>
  );
}

export function Escena() {
  const s = useLab();
  return (
    <svg viewBox="0 0 1200 600" className="h-full w-full" onClick={() => s.seleccionar("plc")} role="img" aria-label={`Escena: ${s.escenario.nombre}`}>
      <Defs />
      <rect width={1200} height={600} fill={C.fondo} />
      <rect width={1200} height={600} fill="url(#rejilla)" />
      {s.escenario.id === "cinta" && <EscenaCinta />}
      {s.escenario.id === "llenado" && <EscenaLlenado />}
      {s.escenario.id === "maquina" && <EscenaMaquina />}
    </svg>
  );
}
