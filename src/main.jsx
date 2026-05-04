
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays, Check, Clock, Dumbbell, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import "./styles.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "timfit2026";

const supabase =
  SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes("supabase.co")
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { weekday:"short", day:"numeric", month:"long" });
const todayISO = () => new Date().toISOString().slice(0,10);
const addDaysISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
};
const timeToMin = (t) => {
  const [h,m] = String(t || "00:00").split(":").map(Number);
  return h*60 + (m || 0);
};
const minToTime = (min) => {
  const h = Math.floor(min/60);
  const m = min%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
};

async function getSlots() {
  if (!supabase) return demoSlots();

  const { data, error } = await withTimeout(
    supabase
      .from("available_booking_slots")
      .select("id,date,start_time,end_time,capacity,booked,available")
      .gte("date", todayISO())
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(80),
    7000
  );

  if (error) throw error;

  return data || [];
}

function demoSlots() {
  return [
    { id:"demo-1", date:addDaysISO(1), start_time:"10:00", end_time:"11:00", capacity:1, available:1 },
    { id:"demo-2", date:addDaysISO(1), start_time:"12:00", end_time:"13:00", capacity:1, available:1 },
    { id:"demo-3", date:addDaysISO(2), start_time:"18:00", end_time:"19:00", capacity:1, available:1 },
  ];
}

function Input(props){ return <input {...props} /> }
function Select(props){ return <select {...props} /> }
function Textarea(props){ return <textarea {...props} /> }
function Button({children, className="", ...props}){ return <button className={"btn "+className} {...props}>{children}</button> }

function PublicPage(){
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name:"", contact:"", goal:"Похудеть / подтянуть форму", format:"Очно в HITFitness", comment:"" });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const s = await getSlots();
      setSlots(s);
      if (!selectedDate && s[0]) setSelectedDate(s[0].date);
    } catch(e) {
      setError(e.message || "Не удалось загрузить календарь");
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); }, []);

  const dates = [...new Set(slots.map(s=>s.date))];
  const visibleSlots = slots.filter(s => s.date === selectedDate);

  const submit = async () => {
    if (!form.name.trim() || !form.contact.trim() || !selectedSlot) {
      setError("Заполните имя, контакт и выберите время.");
      return;
    }
    setError("");
    const payload = {
      slot_id: selectedSlot.id,
      client_name: form.name.trim(),
      contact: form.contact.trim(),
      goal: form.goal,
      format: form.format,
      comment: form.comment || "",
      status: "new"
    };
    try {
      if (supabase && !String(selectedSlot.id).startsWith("demo")) {
        const { error } = await supabase.from("booking_requests").insert(payload);
        if (error) throw error;
      } else {
        const old = JSON.parse(localStorage.getItem("demo_requests") || "[]");
        localStorage.setItem("demo_requests", JSON.stringify([payload, ...old]));
      }
      setSent(true);
      await load();
    } catch(e) {
      setError(e.message || "Не удалось отправить заявку");
    }
  };

  return <div className="page">
    <div className="wrap">
      <div className="top">
        <div className="brand">
          <div className="logo">T</div>
          <div><b>Тим • HITFitness</b><span>ТРК «Лео Молл», м. Комендантский проспект</span></div>
        </div>
        <a className="admin-link" href="/admin">Для тренера</a>
      </div>

      <div className="hero">
        <section className="dark">
          <span className="badge">Бесплатный фитнес-разбор</span>
          <h1>Начните тренировки без хаоса и ошибок</h1>
          <p className="lead">Я персональный тренер в HITFitness. Помогаю начать с нуля, похудеть, набрать мышечную массу, поставить технику и собрать понятный план тренировок.</p>
          <div className="grid2">
            <div className="feature"><MapPin/><b>Очно</b><span>HITFitness, Лео Молл</span></div>
            <div className="feature"><MessageCircle/><b>Онлайн</b><span>переписка или созвон</span></div>
            <div className="feature"><Clock/><b>Слоты</b><span>выберите удобное время</span></div>
            <div className="feature"><ShieldCheck/><b>Без навязывания</b><span>спокойно и по делу</span></div>
          </div>
        </section>

        <section className="card">
          {sent ? <div className="success">
            <div className="check"><Check size={42}/></div>
            <h2>Заявка отправлена</h2>
            <p className="muted">Я напишу вам, чтобы подтвердить запись и уточнить детали.</p>
            <Button onClick={()=>setSent(false)}>Отправить ещё одну</Button>
          </div> : <>
            <h2>Записаться на разбор</h2>
            <p className="muted">Выберите дату, время и оставьте контакт.</p>
            <div className="info"><b>Важно:</b> гостевой визит в клуб стоит 1500 ₽. Если потом оформляете абонемент, эта сумма идёт в счёт абонемента. Сам разбор от меня — бесплатно.</div>

            <b>1. Выберите дату</b>
            {loading ? <p className="muted">Загрузка...</p> : <div className="days">
              {dates.length === 0 && <p className="muted">Пока нет свободных дат.</p>}
              {dates.map(d => <button key={d} className={"day "+(selectedDate===d?"active":"")} onClick={()=>{setSelectedDate(d);setSelectedSlot(null)}}>{fmtDate(d)}</button>)}
            </div>}

            <b>2. Выберите промежуток времени</b>
            <div className="slots">
              {visibleSlots.map(s => <button key={s.id} className={"slot "+(selectedSlot?.id===s.id?"active":"")} onClick={()=>setSelectedSlot(s)}>
                <b>{s.start_time?.slice(0,5)}–{String(s.end_time || "").slice(0,5)}</b>
                <small>свободно: {s.available}</small>
              </button>)}
            </div>

            <div className="form">
              <Input placeholder="Ваше имя" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              <Input placeholder="Telegram / WhatsApp / телефон" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/>
              <Select value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}>
                <option>Похудеть / подтянуть форму</option>
                <option>Набрать мышечную массу</option>
                <option>Начать тренироваться с нуля</option>
                <option>Поставить технику упражнений</option>
                <option>Понять, почему нет результата</option>
              </Select>
              <Select value={form.format} onChange={e=>setForm({...form,format:e.target.value})}>
                <option>Очно в HITFitness</option>
                <option>Онлайн-разбор</option>
                <option>Пока не знаю</option>
              </Select>
              <Textarea placeholder="Комментарий: опыт, ограничения, что сейчас не получается" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/>
              <Button onClick={submit}>Отправить заявку</Button>
            </div>
            {error && <div className="error">{error}</div>}
          </>}
        </section>
      </div>
    </div>
  </div>
}

function Login({onLogin}){
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const login=()=>{
    if(pass===ADMIN_PASSWORD){ localStorage.setItem("timfit_admin_auth","1"); onLogin(); }
    else setErr("Неверный пароль");
  };
  return <div className="login"><div className="card">
    <h2>Вход в админку</h2>
    <p className="muted">Введите пароль тренера.</p>
    <div className="form">
      <Input type="password" placeholder="Пароль" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")login()}}/>
      <Button onClick={login}>Войти</Button>
    </div>
    {err && <div className="error">{err}</div>}
    <p className="muted" style={{fontSize:13}}>Пароль по умолчанию: timfit2026. Лучше поменять через Vercel переменную VITE_ADMIN_PASSWORD.</p>
  </div></div>
}

function Admin(){
  const [authed,setAuthed]=useState(localStorage.getItem("timfit_admin_auth")==="1");
  const [tab,setTab]=useState("slots");
  const [slots,setSlots]=useState([]);
  const [requests,setRequests]=useState([]);
  const [error,setError]=useState("");
  const [form,setForm]=useState({date:todayISO(),start:"10:00",end:"20:00",duration:"60",capacity:"1"});

  if(!authed) return <Login onLogin={()=>setAuthed(true)}/>;

  const load = async () => {
    setError("");
    try {
      if (!supabase) { setError("Supabase не подключён. Проверьте Vercel variables."); return; }
      const {data: s, error: se} = await supabase.from("booking_slots").select("*").order("date",{ascending:true}).order("start_time",{ascending:true});
      if(se) throw se;
      setSlots(s || []);
      const {data: r, error: re} = await supabase.from("booking_requests").select("*, booking_slots(date,start_time,end_time)").order("created_at",{ascending:false});
      if(re) throw re;
      setRequests(r || []);
    } catch(e) { setError(e.message || "Ошибка загрузки"); }
  };

  useEffect(()=>{ load(); }, []);

  const addRange = async () => {
    setError("");
    try {
      if(!supabase) throw new Error("Supabase не подключён");
      const start = timeToMin(form.start);
      const end = timeToMin(form.end);
      const duration = Number(form.duration || 60);
      const capacity = Number(form.capacity || 1);
      if(end <= start) throw new Error("Время окончания должно быть позже начала");
      const rows = [];
      for(let t=start; t+duration<=end; t+=duration){
        rows.push({
          date: form.date,
          start_time: minToTime(t),
          end_time: minToTime(t+duration),
          capacity,
          is_active: true
        });
      }
      const {error} = await supabase.from("booking_slots").insert(rows);
      if(error) throw error;
      await load();
    } catch(e) { setError(e.message || "Не удалось добавить слоты"); }
  };

  const closeSlot = async (id) => {
    if(!confirm("Закрыть слот? Он пропадёт у клиента, но останется в базе.")) return;
    const {error} = await supabase.from("booking_slots").update({is_active:false}).eq("id", id);
    if(error) setError(error.message); else load();
  };

  const deleteSlot = async (id) => {
    if(!confirm("Удалить слот полностью?")) return;
    const {error} = await supabase.from("booking_slots").delete().eq("id", id);
    if(error) setError(error.message); else load();
  };

  const logout = () => { localStorage.removeItem("timfit_admin_auth"); setAuthed(false); };

  return <div className="admin">
    <aside className="sidebar">
      <div className="sidebrand"><div className="logo">T</div><div><b>TimFit CRM</b><br/><span>тренер + клиенты</span></div></div>
      <div className="nav">
        <button className={tab==="slots"?"active":""} onClick={()=>setTab("slots")}>Слоты</button>
        <button className={tab==="requests"?"active":""} onClick={()=>setTab("requests")}>Заявки</button>
        <button onClick={logout}>Выйти</button>
      </div>
    </aside>
    <main className="main">
      <div className="admin-head">
        <div>
          <h1 style={{fontSize:36,margin:0}}>Админка TimFit</h1>
          <p className="muted">Управление календарём и заявками.</p>
        </div>
        <a className="admin-link" href="/" target="_blank">Открыть клиентскую страницу</a>
      </div>

      <div className="stats">
        <div className="stat"><span className="muted">Всего слотов</span><b>{slots.length}</b></div>
        <div className="stat"><span className="muted">Активных</span><b>{slots.filter(s=>s.is_active).length}</b></div>
        <div className="stat"><span className="muted">Заявок</span><b>{requests.length}</b></div>
      </div>

      {tab==="slots" && <div className="cards">
        <section className="card">
          <h2>Добавить диапазон</h2>
          <p className="muted">Например: с 10:00 до 20:00, по 60 минут — клиент увидит отдельные слоты.</p>
          <div className="form">
            <label><b>Дата</b><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
            <label><b>С какого времени</b><Input type="time" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
            <label><b>До какого времени</b><Input type="time" value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label>
            <label><b>Длительность слота, минут</b><Input type="number" min="15" step="15" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/></label>
            <label><b>Количество мест на каждый слот</b><Input type="number" min="1" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label>
            <Button onClick={addRange}>Добавить промежуток</Button>
          </div>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="card">
          <h2>Свободные места в базе</h2>
          <p className="muted">Закрыть — скрыть от клиента. Удалить — убрать полностью.</p>
          <div className="slot-list">
            {slots.map(s=><div className="slot-row" key={s.id}>
              <div>
                <b>{fmtDate(s.date)}</b>
                <p className="muted">{s.start_time?.slice(0,5)}–{String(s.end_time || "").slice(0,5)} • мест: {s.capacity} • {s.is_active ? "активен" : "закрыт"}</p>
              </div>
              <div className="actions">
                {s.is_active && <button className="btn small soft" onClick={()=>closeSlot(s.id)}>Закрыть</button>}
                <button className="btn small red" onClick={()=>deleteSlot(s.id)}>Удалить</button>
              </div>
            </div>)}
          </div>
        </section>
      </div>}

      {tab==="requests" && <section className="card">
        <h2>Заявки клиентов</h2>
        <div className="request-list">
          {requests.map(r=><div className="request-row" key={r.id}>
            <div>
              <b>{r.client_name}</b>
              <p className="muted">{r.contact}</p>
              <p><b>Цель:</b> {r.goal}</p>
              <p><b>Формат:</b> {r.format}</p>
              <p><b>Время:</b> {r.booking_slots?.date ? `${fmtDate(r.booking_slots.date)}, ${r.booking_slots.start_time?.slice(0,5)}–${String(r.booking_slots.end_time || "").slice(0,5)}` : "слот удалён"}</p>
              {r.comment && <p><b>Комментарий:</b> {r.comment}</p>}
            </div>
            <span className="day">{r.status}</span>
          </div>)}
        </div>
      </section>}
    </main>
  </div>
}

function App(){
  return window.location.pathname === "/admin" ? <Admin/> : <PublicPage/>;
}

createRoot(document.getElementById("root")).render(<App/>);
