import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const defaultTrainer = {
  name: 'Тим',
  role: 'Персональный тренер',
  club: 'HITFitness',
  location: 'ТРК «Лео Молл», м. Комендантский проспект',
  formats: 'Очно в зале и онлайн',
  offer: 'Бесплатный фитнес-разбор',
  photo: ''
};

const defaultLeads = [
  {
    id: 1,
    name: 'Анна',
    source: 'Telegram чат ЖК',
    goal: 'Похудеть и подтянуть форму',
    format: 'Очно',
    status: 'Новый лид',
    nextStep: 'Уточнить удобное время',
    followUp: 'Сегодня',
    notes: 'Написала: РАЗБОР'
  },
  {
    id: 2,
    name: 'Игорь',
    source: 'VK районная группа',
    goal: 'Набор мышечной массы',
    format: 'Онлайн',
    status: 'Выбрал формат',
    nextStep: 'Назначить онлайн-разбор',
    followUp: 'Завтра',
    notes: 'Хочет программу тренировок'
  }
];

const defaultPlatforms = [
  { id: 1, name: 'Услуги Приморский / Комендантский', type: 'Telegram', district: 'Приморский район', rules: 'Можно публиковать услуги', status: 'Можно публиковать', lastPost: '—', result: 'Тестируется' },
  { id: 2, name: 'VK районная группа', type: 'VK', district: 'Комендантский проспект', rules: 'Проверить правила перед публикацией', status: 'Нужно согласование', lastPost: '—', result: '—' },
  { id: 3, name: 'Авито Услуги', type: 'Авито', district: 'СПБ', rules: 'Разместить карточку услуги', status: 'Можно публиковать', lastPost: '—', result: '—' }
];

const defaultTemplates = [
  {
    id: 1,
    title: 'Первое сообщение в чат',
    type: 'Публикация',
    text: 'Всем привет! Меня зовут Тим, я тренер в HITFitness в ТРК «Лео Молл», рядом с м. Комендантский проспект. Провожу бесплатный фитнес-разбор: цель, ошибки, программа и план на месяц. Можно очно или онлайн. Кому актуально — напишите в личку: «РАЗБОР».'
  },
  {
    id: 2,
    title: 'Ответ на «РАЗБОР»',
    type: 'Личное сообщение',
    text: 'Привет! Спасибо, что написал(а) 🙌 Меня зовут Тим, я тренер в HITFitness. Подскажи, тебе удобнее сделать разбор очно в зале или онлайн? Очно можем встретиться в HITFitness в ТРК «Лео Молл», онлайн — в переписке или созвоне.'
  },
  {
    id: 3,
    title: 'Follow-up после молчания',
    type: 'Follow-up',
    text: 'Привет! Напомню про фитнес-разбор. Могу коротко подсказать, с чего начать именно в твоей ситуации. Удобнее очно или онлайн?'
  }
];

const defaultOutbox = [
  { id: 1, channel: 'Telegram / чат услуг', title: 'Пост: бесплатный фитнес-разбор', status: 'Ожидает подтверждения', scheduled: 'Сегодня, 18:30' },
  { id: 2, channel: 'Анна / личные сообщения', title: 'Ответ на «РАЗБОР»', status: 'Ожидает подтверждения', scheduled: 'Сейчас' }
];

const defaultBookings = [
  { id: 1, client: 'Анна', type: 'Очный разбор', date: 'Сегодня', time: '19:00', status: 'Ожидает подтверждения' },
  { id: 2, client: 'Игорь', type: 'Онлайн-разбор', date: 'Завтра', time: '12:30', status: 'Слот предложен' }
];

const statuses = ['Новый лид', 'Ответил', 'Выбрал формат', 'Назначен разбор', 'Прошел разбор', 'Записан на тренировку', 'Купил пакет', 'Думает', 'Отказ', 'Написать позже'];
const tabs = [
  ['dashboard', 'Главная'],
  ['leads', 'Лиды'],
  ['messages', 'Сообщения'],
  ['calendar', 'Запись'],
  ['platforms', 'Площадки'],
  ['templates', 'Шаблоны'],
  ['client', 'Анкета'],
  ['analytics', 'Аналитика'],
  ['profile', 'Профиль']
];

function useStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}



const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabaseConfigError = '';
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
  } catch (error) {
    supabaseConfigError = error?.message || 'Ошибка подключения Supabase';
    supabase = null;
  }
}


const TRAINER_PHOTO_BUCKET = 'trainer-photos';
const TRAINER_AVATAR_FILE = 'Main.png';
const TRAINER_SLIDER_PHOTOS = [
  { file: 'Shows.jpg', title: 'Форма начинается с системы', subtitle: 'тренировки без хаоса' },
  { file: 'Shows2.jpg', title: 'Сильнее каждый месяц', subtitle: 'техника, план, прогресс' },
  { file: 'Shows3.jpg', title: 'Твой результат — моя задача', subtitle: 'очно в HITFitness или онлайн' }
];

function getTrainerPhotoUrl(fileName, options = {}) {
  if (!fileName) return '';
  const { width, height, quality = 78, resize = 'cover' } = options;
  if (supabase) {
    const transform = width || height ? { width, height, quality, resize } : undefined;
    const { data } = supabase.storage
      .from(TRAINER_PHOTO_BUCKET)
      .getPublicUrl(fileName, transform ? { transform } : undefined);
    return data?.publicUrl || '';
  }
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${TRAINER_PHOTO_BUCKET}/${encodeURIComponent(fileName)}`;
  }
  return '';
}

function toISODate(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHumanDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function addMinutesToTime(time, minutes) {
  const [hours, mins] = String(time || '00:00').split(':').map(Number);
  const total = (hours * 60) + mins + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isEndAfterStart(start, end) {
  if (!start || !end) return false;
  return String(end) > String(start);
}

function formatSlotTime(slot) {
  if (!slot) return '';
  return slot.end_time ? `${slot.start_time}–${slot.end_time}` : slot.start_time;
}

function demoSlots() {
  const booked = JSON.parse(localStorage.getItem('timfit_demo_booked_slots') || '[]');
  const times = ['10:00', '12:00', '15:00', '18:30', '20:00'];
  const result = [];
  for (let i = 0; i < 21; i += 1) {
    const date = toISODate(addDays(new Date(), i));
    times.forEach((time, idx) => {
      const id = `${date}-${time}`;
      const isBooked = booked.includes(id);
      const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
      if (!weekend || idx < 3) {
        result.push({
          id,
          date,
          start_time: time,
          end_time: addMinutesToTime(time, 60),
          available: isBooked ? 0 : 1,
          capacity: 1,
          isDemo: true
        });
      }
    });
  }
  return result;
}

async function loadAvailableSlots() {
  if (!supabase) return { data: demoSlots(), error: null, isDemo: true };
  const from = toISODate(new Date());
  const to = toISODate(addDays(new Date(), 35));
  const { data, error } = await supabase
    .from('available_slots')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  return { data: data || [], error, isDemo: false };
}

async function bookSlot({ slot, form }) {
  if (!slot) return { error: { message: 'Выберите дату и время.' } };

  if (!supabase || slot.isDemo) {
    const booked = JSON.parse(localStorage.getItem('timfit_demo_booked_slots') || '[]');
    if (booked.includes(slot.id)) return { error: { message: 'Это время уже заняли. Выберите другое.' } };
    localStorage.setItem('timfit_demo_booked_slots', JSON.stringify([...booked, slot.id]));
    return { data: { ok: true, demo: true }, error: null };
  }

  const { data, error } = await supabase.rpc('create_booking', {
    p_slot_id: slot.id,
    p_client_name: form.name,
    p_contact: form.contact,
    p_goal: form.goal,
    p_format: form.format,
    p_comment: form.comment || ''
  });

  return { data, error };
}

function normalizeLeadStatus(status) {
  if (!status || status === 'new') return 'Новый лид';
  if (status === 'cancelled' || status === 'canceled') return 'Отказ';
  return status;
}

function mapCloudLead(row) {
  const slot = row.slot || {};
  const date = row.slot_date || slot.date || '';
  const start = row.start_time || slot.start_time || '';
  const end = row.end_time || slot.end_time || '';
  const timeText = date ? `${formatHumanDate(date)} ${end ? `${start}–${end}` : start}` : 'без выбранного времени';
  const contact = row.contact || '';
  const comment = row.comment || '';

  return {
    id: row.id,
    name: row.name || row.client_name || 'Без имени',
    contact,
    source: row.source || (date ? 'Страница записи' : 'Ручной лид'),
    goal: row.goal || '',
    format: row.format || 'Не выбрал',
    status: normalizeLeadStatus(row.status),
    nextStep: row.next_step || (date ? 'Подтвердить запись и написать клиенту' : 'Связаться с клиентом'),
    followUp: row.follow_up || 'Сегодня',
    notes: [
      contact ? `Контакт: ${contact}` : '',
      `Время: ${timeText}`,
      comment ? `Комментарий: ${comment}` : ''
    ].filter(Boolean).join('. '),
    slotDate: date,
    slotTime: end ? `${start}–${end}` : start,
    createdAt: row.created_at || '',
    isCloud: true
  };
}

async function loadAdminLeads() {
  if (!supabase) return { data: null, error: null };

  const fromView = await supabase
    .from('admin_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (!fromView.error) {
    return { data: (fromView.data || []).map(mapCloudLead), error: null };
  }

  const fallback = await supabase
    .from('booking_requests')
    .select('id, client_name, contact, goal, format, comment, status, created_at, slot:booking_slots(date,start_time,end_time)')
    .order('created_at', { ascending: false });

  if (fallback.error) return { data: [], error: fromView.error || fallback.error };
  return { data: (fallback.data || []).map(mapCloudLead), error: null };
}

function Button({ children, variant = 'dark', ...props }) {
  return <button className={`btn ${variant}`} {...props}>{children}</button>;
}

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function Input(props) {
  return <input className="input" {...props} />;
}

function Select(props) {
  return <select className="input" {...props} />;
}

function Textarea(props) {
  return <textarea className="input textarea" {...props} />;
}

function Sidebar({ tab, setTab }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandIcon">T</div>
        <div>
          <b>TimFit CRM</b>
          <span>тренер + клиенты</span>
        </div>
      </div>
      <nav>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{label}</button>
        ))}
      </nav>
      <div className="safeBox">
        <b>Безопасный режим</b>
        <p>Приложение готовит тексты и напоминания, а отправку подтверждает тренер.</p>
      </div>
    </aside>
  );
}

function Header({ trainer }) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">{trainer.club} • {trainer.location}</p>
        <h1>Приложение для тренера и клиентов</h1>
        <p>CRM, заявки, запись, шаблоны, площадки и почти автоматические follow-up сообщения.</p>
      </div>
    </header>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{sub}</span>
    </Card>
  );
}

function Dashboard({ leads, platforms, outbox, bookings, setTab }) {
  return (
    <div className="page">
      <div className="stats">
        <Stat label="Лиды" value={leads.length} sub="в базе" />
        <Stat label="Записи" value={bookings.length} sub="разборы и тренировки" />
        <Stat label="Очередь" value={outbox.length} sub="на подтверждение" />
        <Stat label="Площадки" value={platforms.length} sub="для продвижения" />
      </div>

      <div className="grid two">
        <Card>
          <div className="sectionHead">
            <div>
              <h2>План на сегодня</h2>
              <p>Минимум действий, которые дают поток заявок.</p>
            </div>
            <Button variant="light" onClick={() => setTab('messages')}>Открыть очередь</Button>
          </div>
          <div className="checkGrid">
            {[
              'Проверить ответы и создать карточки лидов',
              'Подтвердить сообщения в очереди',
              'Опубликовать 1 полезный пост',
              'Назначить время тем, кто написал «РАЗБОР»',
              'Сделать follow-up тем, кто молчит больше 24 часов',
              'Обновить результаты по площадкам'
            ].map((item) => <div className="check" key={item}>✓ {item}</div>)}
          </div>
        </Card>

        <Card className="funnel">
          <h2>Воронка клиента</h2>
          {['Пост / чат', 'Сообщение «РАЗБОР»', 'Консультация', 'Первая тренировка', 'Пакет 8–12 тренировок'].map((s, i) => (
            <div key={s} className="step"><span>{i + 1}</span>{s}</div>
          ))}
        </Card>
      </div>

      <Card>
        <h2>Ближайшие записи</h2>
        <div className="cardsList">
          {bookings.map((b) => (
            <div className="row" key={b.id}>
              <div><b>{b.client}</b><p>{b.type} • {b.date}, {b.time}</p></div>
              <em>{b.status}</em>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Leads({ leads, setLeads, cloudMode = false, loading = false, error = '', refreshLeads }) {
  const [form, setForm] = useState({ name: '', contact: '', source: '', goal: '', format: 'Очно', notes: '' });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const filtered = leads.filter((l) => Object.values(l).join(' ').toLowerCase().includes(q.toLowerCase()));

  async function addLead() {
    if (!form.name.trim()) return;
    setBusy(true);
    setMessage('');

    if (cloudMode && supabase) {
      const { error: insertError } = await supabase.from('booking_requests').insert({
        slot_id: null,
        client_name: form.name.trim(),
        contact: form.contact.trim() || 'не указан',
        source: form.source.trim() || 'Ручной лид',
        goal: form.goal,
        format: form.format,
        comment: form.notes,
        status: 'Новый лид',
        next_step: 'Ответить и уточнить формат',
        follow_up: 'Сегодня'
      });

      if (insertError) {
        setMessage(`Ошибка: ${insertError.message}. Проверь, что ты запустил новый supabase.sql.`);
        setBusy(false);
        return;
      }

      await refreshLeads?.();
    } else {
      setLeads([{ id: Date.now(), ...form, contact: form.contact || '', status: 'Новый лид', nextStep: 'Ответить и уточнить формат', followUp: 'Сегодня' }, ...leads]);
    }

    setForm({ name: '', contact: '', source: '', goal: '', format: 'Очно', notes: '' });
    setBusy(false);
  }

  async function updateLead(id, patch) {
    if (cloudMode && supabase) {
      const dbPatch = {};
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.followUp !== undefined) dbPatch.follow_up = patch.followUp;
      if (patch.nextStep !== undefined) dbPatch.next_step = patch.nextStep;

      const { error: updateError } = await supabase.from('booking_requests').update(dbPatch).eq('id', id);
      if (updateError) {
        setMessage(`Ошибка обновления: ${updateError.message}`);
        return;
      }
      await refreshLeads?.();
      return;
    }

    setLeads(leads.map((l) => l.id === id ? { ...l, ...patch } : l));
  }

  async function deleteLead(id) {
    if (!window.confirm('Удалить этого лида?')) return;

    if (cloudMode && supabase) {
      const { error: deleteError } = await supabase.from('booking_requests').delete().eq('id', id);
      if (deleteError) {
        setMessage(`Ошибка удаления: ${deleteError.message}`);
        return;
      }
      await refreshLeads?.();
      return;
    }

    setLeads(leads.filter((l) => l.id !== id));
  }

  return (
    <div className="grid three">
      <Card>
        <h2>Новый лид</h2>
        <p>{cloudMode ? 'Добавленный вручную лид сохранится в Supabase и будет виден с телефона и компьютера.' : 'Записывай каждого, кто написал «РАЗБОР».'}</p>
        <div className="form">
          <Input placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Контакт: Telegram / WhatsApp / телефон" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Input placeholder="Источник" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <Input placeholder="Цель клиента" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <Select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
            <option>Очно</option><option>Онлайн</option><option>Не выбрал</option>
          </Select>
          <Textarea placeholder="Заметки" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={addLead} disabled={busy}>{busy ? 'Сохраняю...' : 'Добавить'}</Button>
        </div>
        {cloudMode && <div className="hint">Режим базы: заявки берутся из Supabase, поэтому на телефоне и компьютере будет одно и то же.</div>}
        {message && <div className="errorNotice">{message}</div>}
      </Card>
      <Card className="wide">
        <div className="sectionHead">
          <div>
            <h2>База лидов</h2>
            <p>{cloudMode ? 'Это заявки из Supabase: сайт, календарь и ручные лиды.' : 'Локальная база этого браузера.'}</p>
          </div>
          <div className="leadSearchRow">
            <Input placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
            {cloudMode && <Button variant="light" onClick={() => refreshLeads?.()} disabled={loading}>Обновить</Button>}
          </div>
        </div>
        {error && <div className="errorNotice">{error}</div>}
        {loading && <div className="loadingSlots">Загружаю заявки из базы...</div>}
        {!loading && !filtered.length && <div className="emptySlots">Пока заявок нет. Когда клиент заполнит форму на сайте, он появится здесь.</div>}
        <div className="cardsList">
          {filtered.map((lead) => (
            <div className="lead" key={lead.id}>
              <div>
                <div className="leadTitleRow">
                  <h3>{lead.name}</h3>
                  {lead.isCloud && <span className="cloudBadge">Supabase</span>}
                </div>
                <p>{lead.source} • {lead.format}</p>
                {lead.contact && <p><b>Контакт:</b> {lead.contact}</p>}
                <p><b>Цель:</b> {lead.goal || 'не указана'}</p>
                {lead.slotDate && <p><b>Запись:</b> {formatHumanDate(lead.slotDate)} {lead.slotTime}</p>}
                <p><b>Шаг:</b> {lead.nextStep}</p>
                {lead.notes && <p><b>Заметки:</b> {lead.notes}</p>}
              </div>
              <div className="leadControls">
                <Select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</Select>
                <Input value={lead.followUp || ''} onChange={(e) => updateLead(lead.id, { followUp: e.target.value })} />
                <Button variant="danger" onClick={() => deleteLead(lead.id)}>Удалить лида</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Messages({ templates, outbox, setOutbox }) {
  const [templateId, setTemplateId] = useState(2);
  const template = templates.find((t) => t.id === Number(templateId)) || templates[0];
  const [draft, setDraft] = useState(template?.text || '');
  useEffect(() => setDraft(template?.text || ''), [templateId]);

  function addToQueue() {
    setOutbox([{ id: Date.now(), channel: 'Ручная отправка', title: template.title, status: 'Ожидает подтверждения', scheduled: 'Сейчас', text: draft }, ...outbox]);
  }
  function approve(id) {
    setOutbox(outbox.map((m) => m.id === id ? { ...m, status: 'Подтверждено' } : m));
  }

  return (
    <div className="grid two">
      <Card>
        <h2>Помощник переписки</h2>
        <p>Выбери шаблон, поправь и добавь в очередь.</p>
        <div className="form">
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="hint">Подсказка: сначала спроси формат — очно в HITFitness или онлайн.</div>
          <Button onClick={addToQueue}>Добавить в очередь</Button>
        </div>
      </Card>
      <Card>
        <h2>Очередь отправки</h2>
        <p>Приложение готовит, тренер подтверждает.</p>
        <div className="cardsList">
          {outbox.map((m) => (
            <div className="row" key={m.id}>
              <div><b>{m.title}</b><p>{m.channel} • {m.scheduled}</p><em>{m.status}</em></div>
              <Button variant="gold" disabled={m.status === 'Подтверждено'} onClick={() => approve(m.id)}>Подтвердить</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CalendarPage({ bookings, setBookings, leads }) {
  const [form, setForm] = useState({ client: '', type: 'Очный разбор', date: 'Сегодня', time: '19:00' });
  const [cloudSlots, setCloudSlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ date: toISODate(new Date()), start_time: '19:00', end_time: '20:00', capacity: 1 });
  const [cloudMessage, setCloudMessage] = useState('');

  async function refreshCloudSlots() {
    const { data } = await loadAvailableSlots();
    setCloudSlots(data || []);
  }

  useEffect(() => {
    refreshCloudSlots();
  }, []);

  function addBooking() {
    if (!form.client.trim()) return;
    setBookings([{ id: Date.now(), ...form, status: 'Ожидает подтверждения' }, ...bookings]);
    setForm({ client: '', type: 'Очный разбор', date: 'Сегодня', time: '19:00' });
  }

  function deleteBooking(id) {
    if (!window.confirm('Удалить эту ручную запись из CRM?')) return;
    setBookings(bookings.filter((b) => b.id !== id));
  }

  async function addCloudSlot() {
    setCloudMessage('');
    if (!supabase) {
      setCloudMessage('Для общего календаря нужно подключить Supabase. Пока это демо-режим.');
      return;
    }
    if (!isEndAfterStart(slotForm.start_time, slotForm.end_time)) {
      setCloudMessage('Укажи корректный промежуток: время «до» должно быть позже времени «с».');
      return;
    }

    const { error } = await supabase.from('booking_slots').insert({
      date: slotForm.date,
      start_time: slotForm.start_time,
      end_time: slotForm.end_time,
      capacity: Number(slotForm.capacity || 1),
      is_active: true
    });
    if (error) {
      setCloudMessage(`Ошибка: ${error.message}. Проверьте политики Supabase или добавьте слот через таблицу booking_slots.`);
      return;
    }
    setCloudMessage('Слот добавлен. Теперь клиент увидит его на странице записи.');
    await refreshCloudSlots();
  }

  async function hideCloudSlot(slot) {
    if (!slot) return;
    if (slot.isDemo || !supabase) {
      setCloudMessage('Это демо-слот. В настоящей базе скрывать слоты можно после подключения Supabase.');
      return;
    }
    if (!window.confirm(`Скрыть слот ${formatHumanDate(slot.date)} ${formatSlotTime(slot)} с клиентской страницы?`)) return;
    const { error } = await supabase
      .from('booking_slots')
      .update({ is_active: false })
      .eq('id', slot.id);
    if (error) {
      setCloudMessage(`Ошибка: ${error.message}`);
      return;
    }
    setCloudMessage('Слот скрыт с клиентской страницы.');
    await refreshCloudSlots();
  }

  const visibleSlots = (cloudSlots || []).slice(0, 20);

  return (
    <div className="page">
      <div className="grid three">
        <Card>
          <h2>Слоты для клиентской страницы</h2>
          <p>Создай свободное место — клиент сможет выбрать его на главной странице.</p>
          <div className="form">
            <label className="fieldLabel">Дата<Input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} /></label>
            <label className="fieldLabel">С какого времени<Input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value, end_time: isEndAfterStart(e.target.value, slotForm.end_time) ? slotForm.end_time : addMinutesToTime(e.target.value, 60) })} /></label>
            <label className="fieldLabel">До какого времени<Input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} /></label>
            <label className="fieldLabel">Количество мест<Input type="number" min="1" max="5" value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: e.target.value })} /></label>
            <Button onClick={addCloudSlot}>Добавить промежуток</Button>
          </div>
          {cloudMessage && <div className="hint">{cloudMessage}</div>}
          {!supabase && <div className="hint">Supabase не подключен. Клиентская страница показывает демо-слоты, но они не общие для всех.</div>}
        </Card>

        <Card className="wide">
          <h2>Свободные места в базе</h2>
          <div className="tileGrid">
            {visibleSlots.map((slot) => (
              <div className="tile" key={slot.id}>
                <b>{formatHumanDate(slot.date)}</b>
                <p>{formatSlotTime(slot)}</p>
                <strong>{Number(slot.available ?? 0) > 0 ? `Свободно: ${slot.available}` : 'Занято'}</strong>
                <em>{slot.isDemo ? 'демо' : 'база'}</em>
                {!slot.isDemo && <button type="button" className="miniDanger" onClick={() => hideCloudSlot(slot)}>Скрыть слот</button>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid three">
        <Card>
          <h2>Ручная запись в CRM</h2>
          <div className="form">
            <Input list="leadNames" placeholder="Имя клиента" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
            <datalist id="leadNames">{leads.map((l) => <option key={l.id} value={l.name} />)}</datalist>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Очный разбор</option><option>Онлайн-разбор</option><option>Первая тренировка</option><option>Персональная тренировка</option>
            </Select>
            <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            <Button onClick={addBooking}>Записать</Button>
          </div>
        </Card>
        <Card className="wide">
          <h2>Локальное расписание CRM</h2>
          <div className="tileGrid">{bookings.map((b) => <div className="tile" key={b.id}><b>{b.client}</b><p>{b.type}</p><strong>{b.date} • {b.time}</strong><em>{b.status}</em><button type="button" className="miniDanger" onClick={() => deleteBooking(b.id)}>Удалить запись</button></div>)}</div>
        </Card>
      </div>
    </div>
  );
}

function Platforms({ platforms, setPlatforms }) {
  const [form, setForm] = useState({ name: '', type: 'Telegram', district: '', rules: '', status: 'Можно публиковать' });
  function addPlatform() {
    if (!form.name.trim()) return;
    setPlatforms([{ id: Date.now(), ...form, lastPost: '—', result: '—' }, ...platforms]);
    setForm({ name: '', type: 'Telegram', district: '', rules: '', status: 'Можно публиковать' });
  }
  return (
    <div className="grid three">
      <Card>
        <h2>Добавить площадку</h2>
        <div className="form">
          <Input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['Telegram','VK','Instagram','WhatsApp','Авито','Яндекс Услуги','Профи.ру','YouDo','Форум'].map(x => <option key={x}>{x}</option>)}</Select>
          <Input placeholder="Район" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          <Input placeholder="Правила" value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['Можно публиковать','Нужно согласование','Платная реклама','Публикация запрещена','Тестируется'].map(x => <option key={x}>{x}</option>)}</Select>
          <Button onClick={addPlatform}>Добавить</Button>
        </div>
      </Card>
      <Card className="wide"><h2>Площадки продвижения</h2><div className="cardsList">{platforms.map((p) => <div className="row" key={p.id}><div><b>{p.name}</b><p>{p.type} • {p.district}</p><p>{p.rules}</p></div><em>{p.status}</em></div>)}</div></Card>
    </div>
  );
}

function Templates({ templates, setTemplates }) {
  const [form, setForm] = useState({ title: '', type: 'Публикация', text: '' });
  function addTemplate() {
    if (!form.title.trim() || !form.text.trim()) return;
    setTemplates([{ id: Date.now(), ...form }, ...templates]);
    setForm({ title: '', type: 'Публикация', text: '' });
  }
  return (
    <div className="grid three">
      <Card><h2>Новый шаблон</h2><div className="form"><Input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['Публикация','Личное сообщение','Follow-up','Сообщение админу','Ответ на цену'].map(x => <option key={x}>{x}</option>)}</Select><Textarea placeholder="Текст" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /><Button onClick={addTemplate}>Сохранить</Button></div></Card>
      <Card className="wide"><h2>База шаблонов</h2><div className="cardsList">{templates.map((t) => <div className="template" key={t.id}><div><b>{t.title}</b><em>{t.type}</em></div><p>{t.text}</p></div>)}</div></Card>
    </div>
  );
}

function ClientForm({ setLeads }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', goal: '', format: 'Очно', experience: '', limits: '' });
  function submit() {
    if (!form.name.trim()) return;
    setLeads((prev) => [{ id: Date.now(), name: form.name, source: 'Анкета клиента', goal: form.goal, format: form.format, status: 'Новый лид', nextStep: 'Ответить по анкете', followUp: 'Сегодня', notes: `Контакт: ${form.contact}. Опыт: ${form.experience}. Ограничения: ${form.limits}` }, ...prev]);
    setSent(true);
  }
  if (sent) return <Card className="center"><h2>Заявка создана</h2><p>Она появилась в разделе «Лиды».</p><Button onClick={() => setSent(false)}>Создать ещё одну</Button></Card>;
  return <Card className="clientForm"><h2>Анкета клиента</h2><p>Форма для записи на фитнес-разбор.</p><div className="form"><Input placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input placeholder="Телефон / Telegram / WhatsApp" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /><Input placeholder="Цель" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /><Select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}><option>Очно</option><option>Онлайн</option><option>Пока не знаю</option></Select><Input placeholder="Опыт тренировок" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} /><Input placeholder="Травмы / ограничения" value={form.limits} onChange={(e) => setForm({ ...form, limits: e.target.value })} /><Button onClick={submit}>Отправить заявку</Button></div></Card>;
}

function Analytics({ leads, platforms, outbox, bookings }) {
  const data = statuses.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length })).filter((x) => x.count);
  const max = Math.max(...data.map((x) => x.count), 1);
  return <div className="page"><div className="stats"><Stat label="Всего лидов" value={leads.length} /><Stat label="Записи" value={bookings.length} /><Stat label="Очередь" value={outbox.length} /><Stat label="Площадки" value={platforms.length} /></div><Card><h2>Статусы лидов</h2>{data.map((x) => <div className="barRow" key={x.status}><span>{x.status}</span><b>{x.count}</b><div><i style={{ width: `${(x.count / max) * 100}%` }} /></div></div>)}</Card></div>;
}

function Profile({ trainer, setTrainer }) {
  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTrainer({ ...trainer, photo: URL.createObjectURL(file) });
  }
  return <div className="grid three"><Card><h2>Фото тренера</h2><div className="photoBox">{trainer.photo ? <img src={trainer.photo} alt="trainer" /> : <span>Загрузи фото</span>}</div><label className="upload"><input type="file" accept="image/*" onChange={onFile} />Загрузить фото</label></Card><Card className="wide"><h2>Профиль</h2><div className="form twoCols"><Input value={trainer.name} onChange={(e) => setTrainer({ ...trainer, name: e.target.value })} /><Input value={trainer.role} onChange={(e) => setTrainer({ ...trainer, role: e.target.value })} /><Input value={trainer.club} onChange={(e) => setTrainer({ ...trainer, club: e.target.value })} /><Input value={trainer.location} onChange={(e) => setTrainer({ ...trainer, location: e.target.value })} /><Input value={trainer.formats} onChange={(e) => setTrainer({ ...trainer, formats: e.target.value })} /><Input value={trainer.offer} onChange={(e) => setTrainer({ ...trainer, offer: e.target.value })} /></div><div className="hint"><b>Описание:</b> {trainer.name} — {trainer.role.toLowerCase()} в {trainer.club}. Локация: {trainer.location}. Форматы: {trainer.formats}. Оффер: {trainer.offer}.</div></Card></div>;
}



function TrainerPhotoShowcase() {
  const photos = useMemo(() => TRAINER_SLIDER_PHOTOS.map((photo) => ({
    ...photo,
    url: getTrainerPhotoUrl(photo.file, { width: 980, quality: 74 }),
    fullUrl: getTrainerPhotoUrl(photo.file, { width: 1500, quality: 82 })
  })).filter((photo) => photo.url), []);
  const avatarUrl = getTrainerPhotoUrl(TRAINER_AVATAR_FILE, { width: 240, height: 240, quality: 78 });
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (photos.length <= 1 || lightboxOpen) return undefined;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % photos.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [photos.length, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('noScroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('noScroll');
    };
  }, [lightboxOpen, photos.length]);

  function move(direction) {
    if (!photos.length) return;
    setActive((current) => (current + direction + photos.length) % photos.length);
  }

  const activePhoto = photos[active];

  return (
    <div className="trainerShowcase">
      <div className="trainerShowcaseHeader">
        <div className="trainerMiniCard">
          <div className="trainerAvatar">
            {avatarUrl ? <img src={avatarUrl} alt="Тим — тренер HITFitness" loading="eager" decoding="async" /> : <span>T</span>}
          </div>
          <div>
            <b>Тим</b>
            <span>персональный тренер • HITFitness</span>
          </div>
        </div>

        <button className="chibiTip" type="button" onClick={() => setLightboxOpen(true)} aria-label="Нажми на фото">
          <img src="/chibi-trainer.png" alt="Подсказка: нажми на фото" loading="eager" />
          <span>Нажми на фото</span>
        </button>
      </div>

      <div className="photoSlider premium" aria-label="Фото тренера">
        {photos.length ? (
          <>
            <button
              className="photoSliderTapArea"
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Открыть фото крупно"
            >
              <div className="photoSliderTrack" style={{ transform: `translateX(-${active * 100}%)` }}>
                {photos.map((photo, index) => (
                  <div className="photoSlide" key={photo.file}>
                    <img
                      src={photo.url}
                      alt={photo.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                    />
                    <div className="photoSlideOverlay">
                      <span>{photo.subtitle}</span>
                      <strong>{photo.title}</strong>
                      <em>Нажми, чтобы открыть крупно</em>
                    </div>
                  </div>
                ))}
              </div>
            </button>
            <button className="sliderNav prev" type="button" onClick={() => move(-1)} aria-label="Предыдущее фото">‹</button>
            <button className="sliderNav next" type="button" onClick={() => move(1)} aria-label="Следующее фото">›</button>
            <div className="sliderDots">
              {photos.map((photo, index) => (
                <button
                  key={photo.file}
                  type="button"
                  onClick={() => setActive(index)}
                  className={index === active ? 'active' : ''}
                  aria-label={`Фото ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="photoSliderFallback">
            <b>Фото скоро появятся</b>
            <span>Загрузи Main.png, Shows.jpg, Shows2.jpg, Shows3.jpg в Supabase Storage.</span>
          </div>
        )}
      </div>

      {lightboxOpen && activePhoto && (
        <div className="photoLightbox" role="dialog" aria-modal="true" aria-label="Фото тренера">
          <button className="lightboxBackdrop" type="button" onClick={() => setLightboxOpen(false)} aria-label="Закрыть" />
          <div className="lightboxPanel">
            <button className="lightboxClose" type="button" onClick={() => setLightboxOpen(false)} aria-label="Закрыть">×</button>
            <button className="lightboxArrow prev" type="button" onClick={() => move(-1)} aria-label="Предыдущее фото">‹</button>
            <img src={activePhoto.fullUrl || activePhoto.url} alt={activePhoto.title} />
            <button className="lightboxArrow next" type="button" onClick={() => move(1)} aria-label="Следующее фото">›</button>
            <div className="lightboxCaption">
              <span>{activePhoto.subtitle}</span>
              <strong>{activePhoto.title}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function PublicLanding() {
  const [sent, setSent] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact: '',
    goal: 'Похудеть / подтянуть форму',
    format: 'Очно в HITFitness',
    comment: ''
  });

  const heroAvatarUrl = getTrainerPhotoUrl(TRAINER_AVATAR_FILE, { width: 120, height: 120, quality: 82 });

  async function refreshSlots() {
    setSlotsLoading(true);
    setSlotsError('');
    const { data, error, isDemo } = await loadAvailableSlots();
    if (error) {
      setSlotsError('Не удалось загрузить расписание. Попробуйте позже или напишите Тимy напрямую.');
      setSlots([]);
    } else {
      const normalized = (data || []).map((slot) => ({
        ...slot,
        available: Number(slot.available ?? slot.available_count ?? slot.capacity ?? 0),
        isDemo: Boolean(isDemo || slot.isDemo)
      }));
      setSlots(normalized);
      const firstAvailable = normalized.find((slot) => Number(slot.available) > 0);
      if (firstAvailable && !selectedDate) {
        setSelectedDate(firstAvailable.date);
        setSelectedSlotId(firstAvailable.id);
      }
    }
    setSlotsLoading(false);
  }

  useEffect(() => {
    refreshSlots();
  }, []);

  const slotsByDate = useMemo(() => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  }, [slots]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const date = toISODate(addDays(new Date(), i));
      const daySlots = slotsByDate[date] || [];
      const available = daySlots.reduce((sum, slot) => sum + Number(slot.available || 0), 0);
      return { date, available };
    });
  }, [slotsByDate]);

  const selectedSlots = slotsByDate[selectedDate] || [];
  const selectedSlot = slots.find((slot) => String(slot.id) === String(selectedSlotId));

  async function submit() {
    if (!form.name.trim() || !form.contact.trim() || !selectedSlot) return;
    setSubmitting(true);
    setSlotsError('');

    const { error } = await bookSlot({ slot: selectedSlot, form });

    if (error) {
      setSlotsError(error.message || 'Это время уже занято. Выберите другой слот.');
      await refreshSlots();
      setSubmitting(false);
      return;
    }

    const lead = {
      id: Date.now(),
      name: form.name,
      source: 'Страница записи',
      goal: form.goal,
      format: form.format.includes('Очно') ? 'Очно' : form.format.includes('Онлайн') ? 'Онлайн' : 'Не выбрал',
      status: 'Новый лид',
      nextStep: 'Подтвердить запись и написать клиенту',
      followUp: 'Сегодня',
      notes: `Контакт: ${form.contact}. Дата: ${formatHumanDate(selectedSlot.date)}. Время: ${formatSlotTime(selectedSlot)}. Комментарий: ${form.comment || '—'}`,
      createdAt: new Date().toLocaleString('ru-RU')
    };

    try {
      const saved = JSON.parse(localStorage.getItem('timfit_leads') || '[]');
      localStorage.setItem('timfit_leads', JSON.stringify([lead, ...saved]));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    await refreshSlots();
    setSubmitting(false);
    setSent(true);
  }

  return (
    <div className="publicPage">
      <div className="publicWrap">
        <div className="publicTop">
          <div className="publicBrand">
            <div className="brandIcon">T</div>
            <div>
              <b>Тим • HITFitness</b>
              <span>ТРК «Лео Молл», м. Комендантский проспект</span>
            </div>
          </div>
          <a className="adminLink" href="/admin">Для тренера</a>
        </div>

        <div className="publicHero">
          <section className="heroCard">
            <div className="heroBadgeRow">
              <span className="badge badgeWithAvatar">
                {heroAvatarUrl ? <img src={heroAvatarUrl} alt="Тим" /> : <b>T</b>}
                Бесплатный фитнес-разбор
              </span>
              <span className="heroMotto">Начни сегодня — для лучшего завтра.</span>
            </div>
            <h1>Выберите удобную дату и запишитесь на разбор</h1>
            <p>
              Меня зовут Тим. Я персональный тренер в HITFitness. Помогаю начать с нуля,
              похудеть, набрать мышечную массу, поставить технику и собрать понятный план тренировок.
            </p>
            <TrainerPhotoShowcase />
            <div className="heroGrid">
              <div><b>Очно</b><span>HITFitness, Лео Молл</span></div>
              <div><b>Онлайн</b><span>переписка или созвон</span></div>
              <div><b>Календарь</b><span>видны только свободные места</span></div>
              <div><b>Без давления</b><span>спокойно и по делу</span></div>
            </div>
          </section>

          <Card className="publicFormCard">
            {sent ? (
              <div className="successBox">
                <div className="successIcon">✓</div>
                <h2>Заявка отправлена</h2>
                <p>Тим увидит заявку и напишет, чтобы подтвердить выбранные дату и время.</p>
                <Button onClick={() => setSent(false)}>Записаться ещё раз</Button>
              </div>
            ) : (
              <>
                <h2>Записаться на разбор</h2>
                <p>Выберите свободную дату и время. Если слот занят, он будет недоступен.</p>
                <div className="guestNotice">
                  <b>Важно для очного формата:</b> гостевой визит в клуб стоит 1500 ₽. Если потом оформляете абонемент, эта сумма идёт в счёт абонемента. Сам разбор от меня — бесплатно.
                </div>
                {supabaseConfigError && (
                  <div className="errorNotice">
                    Ошибка подключения Supabase: {supabaseConfigError}. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в Vercel.
                  </div>
                )}
                {!supabase && (
                  <div className="demoNotice">
                    Сейчас календарь работает в демо-режиме. После подключения Supabase свободные места будут синхронизироваться между всеми клиентами.
                  </div>
                )}
                {slotsError && <div className="errorNotice">{slotsError}</div>}

                <div className="bookingCalendar">
                  <h3>1. Выберите день</h3>
                  {slotsLoading ? (
                    <div className="loadingSlots">Загружаю свободные места...</div>
                  ) : (
                    <div className="dateGrid">
                      {calendarDays.map((day) => (
                        <button
                          key={day.date}
                          type="button"
                          disabled={!day.available}
                          onClick={() => {
                            setSelectedDate(day.date);
                            const first = (slotsByDate[day.date] || []).find((slot) => Number(slot.available) > 0);
                            setSelectedSlotId(first?.id || '');
                          }}
                          className={selectedDate === day.date ? 'active' : ''}
                        >
                          <b>{formatHumanDate(day.date)}</b>
                          <span>{day.available ? `${day.available} мест` : 'нет мест'}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <h3>2. Выберите промежуток времени</h3>
                  <div className="slotGrid">
                    {selectedSlots.length ? selectedSlots.map((slot) => {
                      const available = Number(slot.available || 0);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={String(selectedSlotId) === String(slot.id) ? 'active' : ''}
                        >
                          <b>{formatSlotTime(slot)}</b>
                          <span>{available ? `свободно: ${available}` : 'занято'}</span>
                        </button>
                      );
                    }) : <p className="emptySlots">Выберите день со свободными местами.</p>}
                  </div>
                </div>

                <div className="form">
                  <Input placeholder="Ваше имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input placeholder="Telegram / WhatsApp / телефон" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                  <Select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                    <option>Похудеть / подтянуть форму</option>
                    <option>Набрать мышечную массу</option>
                    <option>Начать тренироваться с нуля</option>
                    <option>Поставить технику упражнений</option>
                    <option>Понять, почему нет результата</option>
                    <option>Другое</option>
                  </Select>
                  <Select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
                    <option>Очно в HITFitness</option>
                    <option>Онлайн-разбор</option>
                    <option>Пока не знаю</option>
                  </Select>
                  <Textarea placeholder="Комментарий: опыт, ограничения, что сейчас не получается" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                  <Button onClick={submit} disabled={submitting || !selectedSlot || !form.name.trim() || !form.contact.trim()}>
                    {submitting ? 'Отправляю...' : 'Забронировать время'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="publicInfo">
          <Card><h2>Что входит</h2><p>Разберём цель, текущую ситуацию, ошибки и план на ближайший месяц.</p></Card>
          <Card><h2>Кому подойдёт</h2><p>Новичкам, тем, кто давно не тренировался, или тем, кто ходит в зал без результата.</p></Card>
          <Card><h2>Что дальше</h2><p>После заявки я напишу и подтвержу выбранное время.</p></Card>
        </div>
      </div>
    </div>
  );
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="publicPage">
          <div className="publicWrap">
            <div className="errorNotice">
              <b>Ошибка загрузки страницы.</b><br />
              {String(this.state.error?.message || this.state.error)}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [tab, setTab] = useState('dashboard');
  const [trainer, setTrainer] = useStorage('timfit_trainer', defaultTrainer);
  const [localLeads, setLocalLeads] = useStorage('timfit_leads', defaultLeads);
  const [cloudLeads, setCloudLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState('');
  const [platforms, setPlatforms] = useStorage('timfit_platforms', defaultPlatforms);
  const [templates, setTemplates] = useStorage('timfit_templates', defaultTemplates);
  const [outbox, setOutbox] = useStorage('timfit_outbox', defaultOutbox);
  const [bookings, setBookings] = useStorage('timfit_bookings', defaultBookings);

  const isAdmin = window.location.pathname.startsWith('/admin');
  const cloudMode = Boolean(supabase);
  const adminLeads = cloudMode ? cloudLeads : localLeads;

  async function refreshAdminLeads() {
    if (!cloudMode) return;
    setLeadsLoading(true);
    setLeadsError('');
    const { data, error } = await loadAdminLeads();
    if (error) {
      setLeadsError(`Не удалось загрузить заявки из Supabase: ${error.message}. Запусти обновлённый supabase.sql в SQL Editor.`);
      setCloudLeads([]);
    } else {
      setCloudLeads(data || []);
    }
    setLeadsLoading(false);
  }

  useEffect(() => {
    if (isAdmin && cloudMode) refreshAdminLeads();
  }, [isAdmin, cloudMode]);

  if (!isAdmin) {
    return <PublicLanding />;
  }

  const view = useMemo(() => {
    switch (tab) {
      case 'leads': return <Leads leads={adminLeads} setLeads={setLocalLeads} cloudMode={cloudMode} loading={leadsLoading} error={leadsError} refreshLeads={refreshAdminLeads} />;
      case 'messages': return <Messages templates={templates} outbox={outbox} setOutbox={setOutbox} />;
      case 'calendar': return <CalendarPage bookings={bookings} setBookings={setBookings} leads={adminLeads} />;
      case 'platforms': return <Platforms platforms={platforms} setPlatforms={setPlatforms} />;
      case 'templates': return <Templates templates={templates} setTemplates={setTemplates} />;
      case 'client': return <ClientForm setLeads={setLocalLeads} />;
      case 'analytics': return <Analytics leads={adminLeads} platforms={platforms} outbox={outbox} bookings={bookings} />;
      case 'profile': return <Profile trainer={trainer} setTrainer={setTrainer} />;
      default: return <Dashboard leads={adminLeads} platforms={platforms} outbox={outbox} bookings={bookings} setTab={setTab} />;
    }
  }, [tab, trainer, adminLeads, localLeads, platforms, templates, outbox, bookings, cloudMode, leadsLoading, leadsError]);

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} />
      <main>
        <div className="mobileTabs">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}>{label}</button>)}</div>
        <div className="content">
          <Header trainer={trainer} />
          <div className="notice"><b>База заявок:</b> {cloudMode ? 'админка читает заявки из Supabase, поэтому телефон и компьютер показывают одно и то же.' : 'Supabase не подключен — сейчас лиды сохраняются только в этом браузере.'} <a href="/" target="_blank">Открыть страницу клиента</a></div>
          {view}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
