import { api } from "./lib/api"; 
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Save, Upload, Download, Trash2, Edit3, Droplets, Fish, Wrench, FlaskConical, Leaf, CalendarClock, Gauge, Sun, Moon } from "lucide-react";

// --- Tipos ---
type ParameterRecord = {
  id: string;
  date: string; // ISO (yyyy-mm-dd)
  temp?: number; // °C
  salinity?: number; // ppt
  ph?: number;
  alk?: number; // dKH
  ca?: number; // ppm
  mg?: number; // ppm
  no3?: number; // ppm
  po4?: number; // ppm
  ammonia?: number; // ppm
  nitrite?: number; // ppm
};

type DoseRecord = {
  id: string;
  date: string;
  product: "All-For-Reef" | "Alcalinidad" | "Calcio" | "Magnesio" | "Otro";
  amount: number;
  unit: "mL" | "g" | "drops";
  notes?: string;
};

type MaintenanceTask = {
  id: string;
  date: string;
  task: string;
  area: string; // Display/skimmer/return/refugio/etc
  done: boolean;
  notes?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  type: "SPS" | "LPS" | "Soft" | "Fish" | "Invertebrate" | "Equipment" | "Other";
  qty: number;
  notes?: string;
};

type FeedingRecord = {
  id: string;
  date: string;
  food: string;
  qty: string;
  notes?: string;
};

type EventRecord = {
  id: string;
  date: string;
  title: string;
  type: "Añadido" | "Baja" | "Ajuste" | "Medición" | "Mantenimiento" | "Otro";
  description?: string;
};

type LightChannel = {
  name: string; // e.g., UV, Violeta, Royal, Azul, Blanco, Verde, Rojo
  intensity: number; // 0-100
};

// --- Utils ---
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));
const today = () => new Date().toISOString().slice(0, 10);

const useLocalState = <T,>(key: string, initial: T) => {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
};

const SectionCard: React.FC<{ title: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  icon,
  actions,
  className = "",
  children,
}) => (
  <div className={`rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}>
    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
    {children}
  </span>
);
const Tiny: React.FC<{children: React.ReactNode}> = ({children}) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{children}</span>;

// --- Componente principal ---
export default function App() {
  // Tema
  const [dark, setDark] = useLocalState<boolean>("reef_dark", true);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark"); else root.classList.remove("dark");
  }, [dark]);

  // Estado principal
  const [params, setParams] = useLocalState<ParameterRecord[]>("reef_params", []);
  const [doses, setDoses] = useLocalState<DoseRecord[]>("reef_doses", []);
  const [tasks, setTasks] = useLocalState<MaintenanceTask[]>("reef_tasks", []);
  const [inventory, setInventory] = useLocalState<InventoryItem[]>("reef_inventory", []);
  const [feed, setFeed] = useLocalState<FeedingRecord[]>("reef_feed", []);
  const [events, setEvents] = useLocalState<EventRecord[]>("reef_events", []);
  const [lights, setLights] = useLocalState<LightChannel[]>("reef_lights", [
    { name: "UV", intensity: 20 },
    { name: "Violeta", intensity: 20 },
    { name: "Royal", intensity: 50 },
    { name: "Azul", intensity: 60 },
    { name: "Blanco", intensity: 10 },
    { name: "Verde", intensity: 5 },
    { name: "Rojo", intensity: 5 },
  ]);

  // Tab
  type TabKey =
    | "dashboard"
    | "parametros"
    | "dosificacion"
    | "correccion"
    | "inventario"
    | "mantenimiento"
    | "alimentacion"
    | "eventos"
    | "luz"
    | "importexport";
  const [tab, setTab] = useLocalState<TabKey>("reef_tab", "dashboard");

  // Formularios mínimos
  const [pForm, setPForm] = useState<ParameterRecord>({
    id: "",
    date: today(),
    temp: 25,
    salinity: 35,
    ph: 8.1,
    alk: 8,
    ca: 420,
    mg: 1350,
    no3: 10,
    po4: 0.08,
    ammonia: 0,
    nitrite: 0,
  });
  const [dForm, setDForm] = useState<DoseRecord>({ id: "", date: today(), product: "All-For-Reef", amount: 5, unit: "mL", notes: "" });
  const [tForm, setTForm] = useState<MaintenanceTask>({ id: "", date: today(), task: "Cambio de agua 10%", area: "Sistema", done: false, notes: "" });
  const [iForm, setIForm] = useState<InventoryItem>({ id: "", name: "", type: "Equipment", qty: 1, notes: "" });
  const [fForm, setFForm] = useState<FeedingRecord>({ id: "", date: today(), food: "Nori", qty: "1 tira", notes: "" });
  const [eForm, setEForm] = useState<EventRecord>({ id: "", date: today(), title: "Inicio de ciclado", type: "Medición", description: "" });

  // --- Dashboard ---
  const latest = useMemo(() => {
    if (!params.length) return null;
    const sorted = [...params].sort((a, b) => (a.date > b.date ? -1 : 1));
    return sorted[0];
  }, [params]);

  const chartData = useMemo(() => {
    const sorted = [...params].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((p) => ({
      date: p.date,
      Temp: p.temp,
      Sal: p.salinity,
      pH: p.ph,
      dKH: p.alk,
      Ca: p.ca,
      Mg: p.mg,
      NO3: p.no3,
      PO4: p.po4,
      NH3: p.ammonia,
      NO2: p.nitrite,
    }));
  }, [params]);

  // --- Helpers UI ---
  const Label = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor} className="text-sm text-zinc-700 dark:text-zinc-300">
      {children}
    </label>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${props.className ?? ""}`}
    />
  );

  const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${props.className ?? ""}`}
    >
      {props.children}
    </select>
  );

  const Button: React.FC<{ onClick?: () => void; variant?: "solid" | "ghost" | "danger"; title?: string; type?: "button" | "submit"; children: React.ReactNode }> = ({
    onClick,
    variant = "solid",
    title,
    children,
    type = "button",
  }) => (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium shadow-sm transition border
      ${variant === "solid"
          ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700"
          : variant === "danger"
          ? "bg-red-600 hover:bg-red-700 text-white border-red-700"
          : "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {children}
    </button>
  );

  // --- Selección de métrica para el dashboard ---
  const METRICS = ["Temp", "Sal", "pH", "dKH", "Ca", "Mg", "NO3", "PO4", "NH3", "NO2"] as const;
  type MetricKey = (typeof METRICS)[number];
  const [metric, setMetric] = useLocalState<MetricKey>("reef_metric", "dKH");

  // --- Acciones CRUD ---
  const addParam = () => setParams((prev) => [...prev, { ...pForm, id: uid() }]);
  const delParam = (id: string) => setParams((prev) => prev.filter((p) => p.id != id));

  const addDose = () => setDoses((prev) => [...prev, { ...dForm, id: uid() }]);
  const delDose = (id: string) => setDoses((prev) => prev.filter((r) => r.id !== id));

  const addTask = () => setTasks((prev) => [...prev, { ...tForm, id: uid() }]);
  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const delTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const addInv = () => setInventory((prev) => [...prev, { ...iForm, id: uid() }]);
  const delInv = (id: string) => setInventory((prev) => prev.filter((i) => i.id !== id));

  const addFeed = () => setFeed((prev) => [...prev, { ...fForm, id: uid() }]);
  const delFeed = (id: string) => setFeed((prev) => prev.filter((f) => f.id !== id));

  const addEvent = () => setEvents((prev) => [...prev, { ...eForm, id: uid() }]);
  const delEvent = (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id));

  const setLight = (idx: number, val: number) => setLights((prev) => prev.map((c, i) => (i === idx ? { ...c, intensity: val } : c)));

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ params, doses, tasks, inventory, feed, events, lights }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reefLogger_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || "{}"));
        if (obj.params) setParams(obj.params);
        if (obj.doses) setDoses(obj.doses);
        if (obj.tasks) setTasks(obj.tasks);
        if (obj.inventory) setInventory(obj.inventory);
        if (obj.feed) setFeed(obj.feed);
        if (obj.events) setEvents(obj.events);
        if (obj.lights) setLights(obj.lights);
      } catch (err) { alert("Archivo inválido"); }
    };
    reader.readAsText(file);
  };

  // --- INICIO DE MODIFICACIÓN (Agregado por Gemini) ---
  // Funciones de Sincronización (Corregidas)

  async function syncUp() {
    try {
      // NOTA: Tu código usaba 'entries', lo cambié a 'params' que es tu variable de estado.
      // Esta función solo subirá los PARÁMETROS.
      // ADVERTENCIA: Esto puede crear duplicados si los datos ya existen en la nube.
      for (const e of params) {
        await api.addParam({
          date: e.date,
          temp: e.temp,
          salinity: e.salinity,
          ph: e.ph,
          alk: e.alk, // CORREGIDO: Tu app usa 'alk', no 'kh'
          ca: e.ca,
          mg: e.mg,
          no3: e.no3,
          po4: e.po4,
          ammonia: e.ammonia ?? 0,
          nitrite: e.nitrite ?? 0,
        });
      }
      alert("Datos (Parámetros) subidos correctamente ✅");
    } catch (err) {
      alert("Error al subir: " + (err as Error).message);
    }
  }

  async function syncDown() {
    try {
      // NOTA: Esto REEMPLAZARÁ tus parámetros locales con los de la nube.
      const data = await api.listParams();
      
      // Tu código usaba 'setEntries' y mapeaba a 'kh'.
      // Lo corregí a 'setParams' y 'alk' para que coincida con tu app.
      setParams(
        data.map((d: any) => ({ // Asumimos 'any' para la respuesta del API
          id: d.id, // El API debe proveer el ID
          date: d.date,
          temp: Number(d.temp),
          salinity: Number(d.salinity),
          ph: Number(d.ph),
          alk: Number(d.alk), // CORREGIDO: Tu app usa 'alk'
          ca: Number(d.ca),
          mg: Number(d.mg),
          no3: Number(d.no3),
          po4: Number(d.po4),
          ammonia: Number(d.ammonia ?? 0),
          nitrite: Number(d.nitrite ?? 0),
        }))
      );
      alert("Datos (Parámetros) descargados desde la nube ☁️✅");
    } catch (err) {
      alert("Error al bajar: " + (err as Error).message);
    }
  }
  // --- FIN DE MODIFICACIÓN ---

  const stat = {
    registros: params.length,
    dosisHoy: doses.filter((d) => d.date === today()).length,
    tareasPend: tasks.filter((t) => !t.done).length,
    animales: inventory.filter((i) => ["SPS", "LPS", "Soft", "Fish", "Invertebrate"].includes(i.type)).length,
  };

  // --- Utilidades descarga / CSV ---
  const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Configuración de Corrección ---
  type JebaoPlan = { days: number; dosesPerDay: number; startHour: number };
  const [volumeL, setVolumeL] = useLocalState<number>("reef_volume_l", 100);
  const [currentAlk, setCurrentAlk] = useState<number>(8);
  const [targetAlk, setTargetAlk] = useState<number>(8.5);
  const [currentCa, setCurrentCa] = useState<number>(420);
  const [targetCa, setTargetCa] = useState<number>(440);
  const [currentMg, setCurrentMg] = useState<number>(1350);
  const [targetMg, setTargetMg] = useState<number>(1400);
  const [plan, setPlan] = useLocalState<JebaoPlan>("reef_jebao_plan", { days: 3, dosesPerDay: 2, startHour: 8 });

  // Factores (líquidos Red Sea): A=Ca 1ml->+2ppm/100L, B=KH 1ml->+0.1 dKH/100L, C=Mg 1ml->+1ppm/100L
  const calcMlCa = (delta: number) => Math.max(0, (delta / 2) * (volumeL / 100));
  const calcMlAlk = (delta: number) => Math.max(0, (delta / 0.1) * (volumeL / 100));
  const calcMlMg = (delta: number) => Math.max(0, (delta / 1) * (volumeL / 100));

  const safeClamp = (delta: number, perDay: number, days: number) => Math.sign(delta) * Math.min(Math.abs(delta), perDay * days);

  const makeSchedule = (total: number) => {
    const slots = plan.days * plan.dosesPerDay;
    if (slots <= 0) return { perDose: 0, times: [] as string[] };
    const perDose = total / slots;
    const times: string[] = [];
    for (let d = 0; d < plan.days; d++) {
      for (let i = 0; i < plan.dosesPerDay; i++) {
        const hour = (plan.startHour + Math.floor(i * (24 / plan.dosesPerDay))) % 24;
        const day = new Date();
        day.setDate(day.getDate() + d);
        day.setHours(hour, 0, 0, 0);
        const fecha = day.toISOString().slice(0,10);
        const hh = String(hour).padStart(2,"0");
        times.push(`${fecha} ${hh}:00`);
      }
    }
    return { perDose, times };
  };

  const scheduleToCSV = (name: string, perDose: number, times: string[]) => {
    const header = "Canal,Fecha,Hora,Producto,mL";
    const rows = times.map((t) => {
      const [fecha, hora] = t.split(" ");
      return [name, fecha, hora, name, perDose.toFixed(2)].join(",");
    });
    return [header, ...rows].join("\\n");
  };

  const appendDoseRecords = (label: "Alcalinidad" | "Calcio" | "Magnesio", perDose: number, times: string[]) => {
    const newOnes: DoseRecord[] = times.map((t) => {
      const [fecha, hora] = t.split(" ");
      return { id: uid(), date: fecha, product: label, amount: Number(perDose.toFixed(2)), unit: "mL", notes: `Plan Jebao ${label} @ ${hora}` } as DoseRecord;
    });
    setDoses((prev) => [...newOnes, ...prev]);
  };

  const clearAll = () => {
    if (!confirm("¿Borrar todos los datos locales?")) return;
    setParams([]);
    setDoses([]);
    setTasks([]);
    setInventory([]);
    setFeed([]);
    setEvents([]);
    setLights([
      { name: "UV", intensity: 20 },
      { name: "Violeta", intensity: 20 },
      { name: "Royal", intensity: 50 },
      { name: "Azul", intensity: 60 },
      { name: "Blanco", intensity: 10 },
      { name: "Verde", intensity: 5 },
      { name: "Rojo", intensity: 5 },
    ]);
  };

  // --- Helpers Luz ---
  const channelHue: Record<string, number> = {
    UV: 260,
    Violeta: 270,
    Royal: 220,
    Azul: 210,
    Blanco: 0,
    Verde: 120,
    Rojo: 0,
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-cyan-600 grid place-items-center text-white shadow-md">
              <Droplets size={18} />
            </div>
            <div>
              <h1 className="font-bold leading-tight">ReefLogger Pro</h1>
              <Tiny>Control y registro para acuario marino</Tiny>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setDark(!dark)} title="Alternar tema">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              <span>{dark ? "Claro" : "Oscuro"}</span>
            </Button>
            
            {/* --- INICIO DE MODIFICACIÓN (Agregado por Gemini) --- */}
            <button
              type="button"
              onClick={syncUp}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
            >
              Subir a la nube ☁️
            </button>
            <button
              type="button"
              onClick={syncDown}
              className="px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
            >
              Bajar desde la nube 🔽
            </button>
            {/* --- FIN DE MODIFICACIÓN --- */}

            <label className="inline-flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importAll(f);
                }}
              />
              <Button variant="ghost">
                <Upload size={16} />
                Importar
              </Button>
            </label>
            <Button onClick={exportAll}>
              <Download size={16} />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 mb-6">
          {(
            [
              { k: "dashboard", label: "Dashboard", icon: <Gauge size={16} /> },
              { k: "parametros", label: "Parámetros", icon: <FlaskConical size={16} /> },
              { k: "dosificacion", label: "Dosificación", icon: <Droplets size={16} /> },
              { k: "correccion", label: "Corrección (Red Sea)", icon: <FlaskConical size={16} /> },
              { k: "inventario", label: "Inventario", icon: <Fish size={16} /> },
              { k: "mantenimiento", label: "Mantenimiento", icon: <Wrench size={16} /> },
              { k: "alimentacion", label: "Alimentación", icon: <Leaf size={16} /> },
              { k: "eventos", label: "Eventos", icon: <CalendarClock size={16} /> },
              { k: "luz", label: "Luz (LED)", icon: <Sun size={16} /> },
              { k: "importexport", label: "Import/Export", icon: <Download size={16} /> },
            ] as { k: TabKey; label: string; icon: React.ReactNode }[]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as TabKey)}
              className={`px-3.5 py-2 rounded-xl border text-sm inline-flex items-center gap-2 transition ${
                tab === t.k
                  ? "bg-cyan-600 text-white border-cyan-700"
                  : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SectionCard title="Resumen" icon={<Gauge />}>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs text-zinc-500">Registros</div>
                  <div className="text-2xl font-semibold">{stat.registros}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs text-zinc-500">Dosis hoy</div>
                  <div className="text-2xl font-semibold">{stat.dosisHoy}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs text-zinc-500">Tareas pendientes</div>
                  <div className="text-2xl font-semibold">{stat.tareasPend}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs text-zinc-500">Animales</div>
                  <div className="text-2xl font-semibold">{stat.animales}</div>
                </div>
              </div>
              {latest ? (
                <div className="mt-4 space-y-2">
                  <div className="font-medium">
                    Última medición: <Pill>{latest.date}</Pill>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Temp: <b>{latest.temp} °C</b></div>
                    <div>Salinidad: <b>{latest.salinity} ppt</b></div>
                    <div>pH: <b>{latest.ph}</b></div>
                    <div>dKH: <b>{latest.alk}</b></div>
                    <div>Ca: <b>{latest.ca} ppm</b></div>
                    <div>Mg: <b>{latest.mg} ppm</b></div>
                    <div>NO₃: <b>{latest.no3} ppm</b></div>
                    <div>PO₄: <b>{latest.po4} ppm</b></div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-zinc-500">Aún no hay mediciones. Agrega en la pestaña "Parámetros".</div>
              )}
            </SectionCard>

            <SectionCard title="Tendencias (Parámetros)" icon={<FlaskConical />} className="md:col-span-2">
              {chartData.length ? (
                <>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {METRICS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetric(m as MetricKey)}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${
                          metric === m
                            ? "bg-cyan-600 text-white border-cyan-700"
                            : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ left: 12, right: 20, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={metric} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-sm text-zinc-500">Registra al menos 2 mediciones para graficar.</div>
              )}
            </SectionCard>
          </div>
        )}

        {tab === "parametros" && (
          <SectionCard title="Registro de parámetros" icon={<FlaskConical />} actions={<Button onClick={addParam}><Plus size={16} />Guardar</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="p_date">Fecha</Label>
                <Input id="p_date" type="date" value={pForm.date} onChange={(e) => setPForm({ ...pForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Temp (°C)</Label>
                <Input type="number" step="0.1" value={pForm.temp} onChange={(e) => setPForm({ ...pForm, temp: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Salinidad (ppt)</Label>
                <Input type="number" step="0.1" value={pForm.salinity} onChange={(e) => setPForm({ ...pForm, salinity: Number(e.target.value) })} />
              </div>
              <div>
                <Label>pH</Label>
                <Input type="number" step="0.01" value={pForm.ph} onChange={(e) => setPForm({ ...pForm, ph: Number(e.target.value) })} />
              </div>
              <div>
                <Label>dKH</Label>
                <Input type="number" step="0.1" value={pForm.alk} onChange={(e) => setPForm({ ...pForm, alk: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Calcio (ppm)</Label>
                <Input type="number" step="1" value={pForm.ca} onChange={(e) => setPForm({ ...pForm, ca: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Magnesio (ppm)</Label>
                <Input type="number" step="1" value={pForm.mg} onChange={(e) => setPForm({ ...pForm, mg: Number(e.target.value) })} />
              </div>
              <div>
                <Label>NO₃ (ppm)</Label>
                <Input type="number" step="0.1" value={pForm.no3} onChange={(e) => setPForm({ ...pForm, no3: Number(e.target.value) })} />
              </div>
              <div>
                <Label>PO₄ (ppm)</Label>
                <Input type="number" step="0.01" value={pForm.po4} onChange={(e) => setPForm({ ...pForm, po4: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Amoniaco (ppm)</Label>
                <Input type="number" step="0.01" value={pForm.ammonia} onChange={(e) => setPForm({ ...pForm, ammonia: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Nitrito (ppm)</Label>
                <Input type="number" step="0.01" value={pForm.nitrite} onChange={(e) => setPForm({ ...pForm, nitrite: Number(e.target.value) })} />
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left">
                    {"Fecha Temp Sal pH dKH Ca Mg NO3 PO4 NH3 NO2".split(" ").map((h) => (
                      <th key={h} className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300">{h}</th>
                    ))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {params.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2">{r.temp}</td>
                      <td className="px-3 py-2">{r.salinity}</td>
                      <td className="px-3 py-2">{r.ph}</td>
                      <td className="px-3 py-2">{r.alk}</td>
                      <td className="px-3 py-2">{r.ca}</td>
                      <td className="px-3 py-2">{r.mg}</td>
                      <td className="px-3 py-2">{r.no3}</td>
                      <td className="px-3 py-2">{r.po4}</td>
                      <td className="px-3 py-2">{r.ammonia}</td>
                      <td className="px-3 py-2">{r.nitrite}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => delParam(r.id)} title="Eliminar"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "dosificacion" && (
          <SectionCard title="Dosificación" icon={<Droplets />} actions={<Button onClick={addDose}><Plus size={16} />Agregar</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={dForm.date} onChange={(e) => setDForm({ ...dForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Producto</Label>
                <Select value={dForm.product} onChange={(e) => setDForm({ ...dForm, product: e.target.value as DoseRecord["product"] })}>
                  {["All-For-Reef", "Alcalinidad", "Calcio", "Magnesio", "Otro"].map((p) => (<option key={p} value={p}>{p}</option>))}
                </Select>
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" step="0.1" value={dForm.amount} onChange={(e) => setDForm({ ...dForm, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Unidad</Label>
                <Select value={dForm.unit} onChange={(e) => setDForm({ ...dForm, unit: e.target.value as DoseRecord["unit"] })}>
                  {["mL", "g", "drops"].map((u) => (<option key={u} value={u}>{u}</option>))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Notas</Label>
                <Input value={dForm.notes} onChange={(e) => setDForm({ ...dForm, notes: e.target.value })} placeholder="Motivo del ajuste, lote, etc." />
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left">
                    {"Fecha Producto Cantidad Unidad Notas".split(" ").map((h) => (<th key={h} className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300">{h}</th>))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {doses.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2">{r.product}</td>
                      <td className="px-3 py-2">{r.amount}</td>
                      <td className="px-3 py-2">{r.unit}</td>
                      <td className="px-3 py-2">{r.notes}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => delDose(r.id)} title="Eliminar"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "correccion" && (
          <SectionCard title="Calculadora de Corrección (Red Sea + Jebao)" icon={<FlaskConical />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Volumen neto (L)</Label>
                  <Input type="number" value={volumeL} onChange={(e) => setVolumeL(Number(e.target.value) || 0)} />
                  <Tiny>Puedes estimar restando roca/sustrato del volumen bruto.</Tiny>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Alk actual (dKH)</Label>
                    <Input type="number" step="0.1" value={currentAlk} onChange={(e) => setCurrentAlk(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Meta (dKH)</Label>
                    <Input type="number" step="0.1" value={targetAlk} onChange={(e) => setTargetAlk(Number(e.target.value))} />
                  </div>
                  <div><Tiny>Fund. B: 1 ml /100 L → +0.1 dKH</Tiny></div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Ca actual (ppm)</Label>
                    <Input type="number" value={currentCa} onChange={(e) => setCurrentCa(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Meta (ppm)</Label>
                    <Input type="number" value={targetCa} onChange={(e) => setTargetCa(Number(e.target.value))} />
                  </div>
                  <div><Tiny>Fund. A: 1 ml /100 L → +2 ppm</Tiny></div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Mg actual (ppm)</Label>
                    <Input type="number" value={currentMg} onChange={(e) => setCurrentMg(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Meta (ppm)</Label>
                    <Input type="number" value={targetMg} onChange={(e) => setTargetMg(Number(e.target.value))} />
                  </div>
                  <div><Tiny>Fund. C: 1 ml /100 L → +1 ppm</Tiny></div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Días del plan</Label>
                    <Input type="number" value={plan.days} onChange={(e) => setPlan({ ...plan, days: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                  <div>
                    <Label>Dosificaciones por día</Label>
                    <Input type="number" value={plan.dosesPerDay} onChange={(e) => setPlan({ ...plan, dosesPerDay: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                  <div>
                    <Label>Hora inicial (0–23)</Label>
                    <Input type="number" value={plan.startHour} onChange={(e) => setPlan({ ...plan, startHour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })} />
                  </div>
                </div>
              </div>

              {/* Resultados */}
              <div className="md:col-span-2 space-y-5">
                {(() => {
                  const dAlk = targetAlk - currentAlk;
                  const dCa = targetCa - currentCa;
                  const dMg = targetMg - currentMg;

                  // límites diarios recomendados
                  const maxPerDay = { alk: 1.0, ca: 20, mg: 50 };
                  const safeAlk = safeClamp(dAlk, maxPerDay.alk, plan.days);
                  const safeCa = safeClamp(dCa, maxPerDay.ca, plan.days);
                  const safeMg = safeClamp(dMg, maxPerDay.mg, plan.days);

                  const mlAlk = calcMlAlk(Math.max(0, safeAlk));
                  const mlCa = calcMlCa(Math.max(0, safeCa));
                  const mlMg = calcMlMg(Math.max(0, safeMg));

                  const schAlk = makeSchedule(mlAlk);
                  const schCa = makeSchedule(mlCa);
                  const schMg = makeSchedule(mlMg);

                  return (
                    <>
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="font-medium mb-2">Dosis totales sugeridas (líquidos Red Sea)</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div>KH (Foundation B)</div>
                            <div>{mlAlk.toFixed(1)} mL</div>
                            <Tiny>{`Objetivo: +${Math.max(0, safeAlk).toFixed(2)} dKH`}</Tiny>
                          </div>
                          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div>Ca (Foundation A)</div>
                            <div>{mlCa.toFixed(1)} mL</div>
                            <Tiny>{`Objetivo: +${Math.max(0, safeCa).toFixed(0)} ppm`}</Tiny>
                          </div>
                          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                            <div>Mg (Foundation C)</div>
                            <div>{mlMg.toFixed(1)} mL</div>
                            <Tiny>{`Objetivo: +${Math.max(0, safeMg).toFixed(0)} ppm`}</Tiny>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-medium">Plan para programar en Jebao Doser 3.4</div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              title="Exportar plan CSV"
                              onClick={() => {
                                const csv = [
                                  scheduleToCSV("KH (B)", schAlk.perDose, schAlk.times),
                                  scheduleToCSV("Ca (A)", schCa.perDose, schCa.times),
                                  scheduleToCSV("Mg (C)", schMg.perDose, schMg.times),
                                ].join("\\n");
                                downloadText(`plan_jebao_${new Date().toISOString().slice(0, 10)}.csv`, csv);
                              }}
                            >
                              <Download size={16} />
                              Exportar CSV
                            </Button>
                            <Button
                              title="Agregar al historial de Dosificación"
                              onClick={() => {
                                appendDoseRecords("Alcalinidad", schAlk.perDose, schAlk.times);
                                appendDoseRecords("Calcio", schCa.perDose, schCa.times);
                                appendDoseRecords("Magnesio", schMg.perDose, schMg.times);
                              }}
                            >
                              <Plus size={16} />
                              Añadir a Dosificación
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
                          Asigna canales: CH1=KH, CH2=Ca, CH3=Mg (sugerido). Divide la corrección en {plan.days} días × {plan.dosesPerDay} dosis/día.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[{ name: "KH (B)", data: schAlk }, { name: "Ca (A)", data: schCa }, { name: "Mg (C)", data: schMg }].map((box) => (
                            <div key={box.name} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                              <div className="font-medium mb-1">{box.name}</div>
                              <div>{box.data.perDose ? box.data.perDose.toFixed(1) : 0} mL por dosis</div>
                              <div className="max-h-40 overflow-auto text-xs">
                                <ul className="list-disc pl-5 space-y-1">
                                  {box.data.times?.map((t, i) => (<li key={i}>{t}</li>))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Tiny>Reglas de seguridad aplicadas: máx. +1 dKH/día, +20 ppm Ca/día, +50 ppm Mg/día. Si tu meta excede estos límites para {plan.days} días, el plan recorta automáticamente el ajuste. Vuelve a medir y repite.</Tiny>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </SectionCard>
        )}

        {tab === "inventario" && (
          <SectionCard title="Inventario / Habitantes" icon={<Fish />} actions={<Button onClick={addInv}><Plus size={16} />Agregar</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Label>Nombre</Label>
                <Input value={iForm.name} onChange={(e) => setIForm({ ...iForm, name: e.target.value })} placeholder="Ej. Acanthastrea, Ocellaris, Trochus" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={iForm.type} onChange={(e) => setIForm({ ...iForm, type: e.target.value as InventoryItem["type"] })}>
                  {["SPS", "LPS", "Soft", "Fish", "Invertebrate", "Equipment", "Other"].map((t) => (<option key={t} value={t}>{t}</option>))}
                </Select>
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" value={iForm.qty} onChange={(e) => setIForm({ ...iForm, qty: Number(e.target.value) })} />
              </div>
              <div className="md:col-span-3">
                <Label>Notas</Label>
                <Input value={iForm.notes} onChange={(e) => setIForm({ ...iForm, notes: e.target.value })} placeholder="Ubicación, fecha de adquisición, lote, etc." />
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left">
                    {"Nombre Tipo Cantidad Notas".split(" ").map((h) => (<th key={h} className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300">{h}</th>))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 whitespace-nowrap">{r.name}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.qty}</td>
                      <td className="px-3 py-2">{r.notes}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => delInv(r.id)} title="Eliminar"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "mantenimiento" && (
          <SectionCard title="Mantenimiento" icon={<Wrench />} actions={<Button onClick={addTask}><Plus size={16} />Agregar</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={tForm.date} onChange={(e) => setTForm({ ...tForm, date: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Tarea</Label>
                <Input value={tForm.task} onChange={(e) => setTForm({ ...tForm, task: e.target.value })} placeholder="Ej. Cambiar calcetines, limpiar skimmer" />
              </div>
              <div>
                <Label>Área</Label>
                <Input value={tForm.area} onChange={(e) => setTForm({ ...tForm, area: e.target.value })} placeholder="Display/Skimmer/Retorno/Refugio" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <input id="done" type="checkbox" checked={tForm.done} onChange={(e) => setTForm({ ...tForm, done: e.target.checked })} className="h-5 w-5 rounded border-zinc-300 dark:border-zinc-700" />
                  <Label htmlFor="done">Hecho</Label>
                </div>
              </div>
              <div className="md:col-span-5">
                <Label>Notas</Label>
                <Input value={tForm.notes} onChange={(e) => setTForm({ ...tForm, notes: e.target.value })} placeholder="Observaciones, repuestos, etc." />
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left">
                    {"Fecha Tarea Área Estado Notas".split(" ").map((h) => (<th key={h} className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300">{h}</th>))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2">{r.task}</td>
                      <td className="px-3 py-2">{r.area}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => toggleTask(r.id)} className={`px-2 py-1 rounded-lg text-xs border ${r.done ? "bg-green-600 text-white border-green-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"}`}>
                          {r.done ? "Hecha" : "Pendiente"}
                        </button>
                      </td>
                      <td className="px-3 py-2">{r.notes}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => delTask(r.id)} title="Eliminar"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "alimentacion" && (
          <SectionCard title="Alimentación" icon={<Leaf />} actions={<Button onClick={addFeed}><Plus size={16} />Agregar</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fForm.date} onChange={(e) => setFForm({ ...fForm, date: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Alimento</Label>
                <Input value={fForm.food} onChange={(e) => setFForm({ ...fForm, food: e.target.value })} placeholder="Mysis, Nori, Pellets..." />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input value={fForm.qty} onChange={(e) => setFForm({ ...fForm, qty: e.target.value })} placeholder="Ej. 1 tira / 1 cubo" />
              </div>
              <div className="md:col-span-2">
                <Label>Notas</Label>
                <Input value={fForm.notes} onChange={(e) => setFForm({ ...fForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left">
                    {"Fecha Alimento Cantidad Notas".split(" ").map((h) => (<th key={h} className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300">{h}</th>))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {feed.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2">{r.food}</td>
                      <td className="px-3 py-2">{r.qty}</td>
                      <td className="px-3 py-2">{r.notes}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => delFeed(r.id)} title="Eliminar"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "eventos" && (
          <SectionCard title="Eventos / Bitácora" icon={<CalendarClock />} actions={<Button onClick={addEvent}><Plus size={16} />Agregar</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={eForm.date} onChange={(e) => setEForm({ ...eForm, date: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Título</Label>
                <Input value={eForm.title} onChange={(e) => setEForm({ ...eForm, title: e.target.value })} placeholder="Ej. Añadido Ocellaris" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={eForm.type} onChange={(e) => setEForm({ ...eForm, type: e.target.value as EventRecord["type"] })}>
                  {["Añadido", "Baja", "Ajuste", "Medición", "Mantenimiento", "Otro"].map((t) => (<option key={t} value={t}>{t}</option>))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input value={eForm.description} onChange={(e) => setEForm({ ...eForm, description: e.target.value })} placeholder="Detalles, lotes, etc." />
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="min-w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr className="text-left">
                    {"Fecha Título Tipo Descripción".split(" ").map((h) => (<th key={h} className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300">{h}</th>))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2">{r.title}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.description}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => delEvent(r.id)} title="Eliminar"><Trash2 size={16} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {tab === "luz" && (
          <SectionCard title="Configuración de luz (LED)" icon={<Sun />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {lights.map((ch, idx) => (
                  <div key={ch.name} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{ch.name}</div>
                      <Pill>{ch.intensity}%</Pill>
                    </div>
                    <input type="range" min={0} max={100} value={ch.intensity} onChange={(e) => setLight(idx, Number(e.target.value))} className="w-full accent-cyan-600" />
                  </div>
                ))}
              </div>

              {/* Mapa de LEDs */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                <div className="font-medium mb-3">Vista de distribución</div>
                <div className="grid grid-cols-7 gap-4 place-items-center">
                  {lights.map((ch) => {
                    const hue = channelHue[ch.name] ?? 200;
                    const alpha = Math.max(0.15, ch.intensity / 100);
                    return (
                      <div key={ch.name} className="flex flex-col items-center gap-2">
                        <div className="h-16 w-16 rounded-full shadow-inner" style={{ background: ch.name === "Blanco" ? `rgba(255,255,255,${alpha})` : `hsla(${hue}, 85%, 55%, ${alpha})`, border: "1px solid rgba(0,0,0,0.15)" }} title={`${ch.name}: ${ch.intensity}%`} />
                        <Tiny>{ch.name}</Tiny>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {tab === "importexport" && (
          <SectionCard title="Importar / Exportar / Respaldo" icon={<Download />}
            actions={<><Button onClick={exportAll}><Download size={16} />Exportar JSON</Button><Button variant="danger" onClick={clearAll} title="Borrar todo"><Trash2 size={16} />Borrar todo</Button></>}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="font-medium mb-2">Resumen de datos</div>
                <ul className="text-sm space-y-1">
                  <li>Parámetros: <b>{params.length}</b></li>
                  <li>Dosificaciones: <b>{doses.length}</b></li>
                  <li>Tareas: <b>{tasks.length}</b></li>
                  <li>Inventario: <b>{inventory.length}</b></li>
                  <li>Alimentación: <b>{feed.length}</b></li>
                  <li>Eventos: <b>{events.length}</b></li>
                </ul>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="font-medium mb-2">Importar</div>
                <label className="inline-flex items-center gap-2">
                  <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importAll(f); }} />
                  <Button variant="ghost"><Upload size={16} />Seleccionar archivo</Button>
                </label>
                <Tiny>El formato esperado es el exportado por esta app.</Tiny>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="font-medium mb-2">Demo / Plantilla</div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => {
                    const demo: ParameterRecord = { id: uid(), date: today(), temp: 25.2, salinity: 35, ph: 8.15, alk: 8.2, ca: 430, mg: 1370, no3: 12, po4: 0.09, ammonia: 0, nitrite: 0 };
                    setParams((p) => [...p, demo]);
                  }}>
                    <Plus size={16} />Agregar ejemplo
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    downloadText("plantilla_reefLogger.json", JSON.stringify({ params: [], doses: [], tasks: [], inventory: [], feed: [], events: [], lights }, null, 2));
                  }}>
                    <Download size={16} />Bajar plantilla
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </main>
    </div>
  );
}
