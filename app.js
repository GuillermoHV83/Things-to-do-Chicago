const STORAGE_KEY = 'plan-actividades-items';
const CONFIG_KEY = 'plan-actividades-config';

const sampleActivities = [
  {
    title: 'Ir por café y caminar en un parque',
    category: 'Relajado',
    budget: 'Bajo',
    duration: '1-2 horas',
    status: 'Pendiente',
    energy: 'Baja',
    notes: 'Ideal para una tarde sin mucha planeación.'
  },
  {
    title: 'Noche de película con cena casera temática',
    category: 'Casa',
    budget: 'Bajo',
    duration: '1-2 horas',
    status: 'Favorita',
    energy: 'Baja',
    notes: 'Escoger una película y cocinar algo relacionado.'
  },
  {
    title: 'Visitar un museo o exposición temporal',
    category: 'Cultural',
    budget: 'Medio',
    duration: 'Medio día',
    status: 'Pendiente',
    energy: 'Media',
    notes: 'Revisar horarios y comprar boletos antes.'
  }
];

const state = {
  items: [],
  mode: 'local',
  supabase: null
};

const els = {
  form: document.getElementById('activityForm'),
  list: document.getElementById('activityList'),
  template: document.getElementById('activityTemplate'),
  search: document.getElementById('searchInput'),
  filterCategory: document.getElementById('filterCategory'),
  filterBudget: document.getElementById('filterBudget'),
  filterStatus: document.getElementById('filterStatus'),
  stats: document.getElementById('stats'),
  randomBtn: document.getElementById('randomBtn'),
  randomResult: document.getElementById('randomResult'),
  seedBtn: document.getElementById('seedBtn'),
  modeBadge: document.getElementById('modeBadge'),
  supabaseUrl: document.getElementById('supabaseUrl'),
  supabaseKey: document.getElementById('supabaseKey'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  clearConfigBtn: document.getElementById('clearConfigBtn')
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function getLocalItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function initSupabaseIfConfigured() {
  const config = loadConfig();
  if (!config?.url || !config?.key) return false;

  els.supabaseUrl.value = config.url;
  els.supabaseKey.value = config.key;

  try {
    state.supabase = window.supabase.createClient(config.url, config.key);
    const { error } = await state.supabase.from('activities').select('id', { count: 'exact', head: true });
    if (error) throw error;
    state.mode = 'compartido';
    return true;
  } catch (err) {
    console.error(err);
    state.supabase = null;
    state.mode = 'local';
    return false;
  }
}

async function loadItems() {
  if (state.supabase) {
    const { data, error } = await state.supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      state.items = getLocalItems();
      state.mode = 'local';
      state.supabase = null;
    } else {
      state.items = data || [];
      state.mode = 'compartido';
    }
  } else {
    state.items = getLocalItems();
    state.mode = 'local';
  }
  render();
}

function currentFilters() {
  return {
    search: els.search.value.trim().toLowerCase(),
    category: els.filterCategory.value,
    budget: els.filterBudget.value,
    status: els.filterStatus.value
  };
}

function filteredItems() {
  const filters = currentFilters();
  return state.items.filter(item => {
    const haystack = `${item.title} ${item.notes || ''}`.toLowerCase();
    const okSearch = !filters.search || haystack.includes(filters.search);
    const okCategory = !filters.category || item.category === filters.category;
    const okBudget = !filters.budget || item.budget === filters.budget;
    const okStatus = !filters.status || item.status === filters.status;
    return okSearch && okCategory && okBudget && okStatus;
  });
}

function statChip(label, value) {
  const span = document.createElement('span');
  span.className = 'chip';
  span.textContent = `${label}: ${value}`;
  return span;
}

function renderStats(items) {
  els.stats.innerHTML = '';
  const favoritas = items.filter(i => i.status === 'Favorita').length;
  const pendientes = items.filter(i => i.status === 'Pendiente').length;
  const hechas = items.filter(i => i.status === 'Hecha').length;
  els.stats.append(
    statChip('Total', items.length),
    statChip('Favoritas', favoritas),
    statChip('Pendientes', pendientes),
    statChip('Hechas', hechas)
  );
}

function render() {
  els.modeBadge.textContent = state.mode === 'compartido' ? 'Modo compartido' : 'Modo local';
  const items = filteredItems();
  renderStats(items);
  els.list.innerHTML = '';

  if (!items.length) {
    els.list.innerHTML = '<div class="empty-state">No hay actividades que coincidan con los filtros.</div>';
    return;
  }

  for (const item of items) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector('.activity-title').textContent = item.title;
    node.querySelector('.activity-notes').textContent = item.notes || 'Sin notas';
    const chips = node.querySelector('.chips');
    [item.category, item.budget, item.duration, item.energy, item.status].forEach(value => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = value;
      chips.appendChild(chip);
    });

    node.querySelector('.favoriteBtn').addEventListener('click', () => updateItem(item.id, { status: 'Favorita' }));
    node.querySelector('.doneBtn').addEventListener('click', () => updateItem(item.id, { status: 'Hecha' }));
    node.querySelector('.deleteBtn').addEventListener('click', () => deleteItem(item.id));
    els.list.appendChild(node);
  }
}

async function addItem(item) {
  const fullItem = { id: uid(), created_at: new Date().toISOString(), ...item };
  if (state.supabase) {
    const { error } = await state.supabase.from('activities').insert(fullItem);
    if (error) return alert('No se pudo guardar en modo compartido.');
  } else {
    const items = getLocalItems();
    items.unshift(fullItem);
    setLocalItems(items);
  }
  await loadItems();
}

async function updateItem(id, patch) {
  if (state.supabase) {
    const { error } = await state.supabase.from('activities').update(patch).eq('id', id);
    if (error) return alert('No se pudo actualizar la actividad.');
  } else {
    const items = getLocalItems().map(item => item.id === id ? { ...item, ...patch } : item);
    setLocalItems(items);
  }
  await loadItems();
}

async function deleteItem(id) {
  if (state.supabase) {
    const { error } = await state.supabase.from('activities').delete().eq('id', id);
    if (error) return alert('No se pudo eliminar la actividad.');
  } else {
    const items = getLocalItems().filter(item => item.id !== id);
    setLocalItems(items);
  }
  await loadItems();
}

function showRandom() {
  const items = filteredItems().filter(item => item.status !== 'Hecha');
  if (!items.length) {
    els.randomResult.classList.remove('hidden');
    els.randomResult.innerHTML = '<h2 class="random-card-title">No hay opciones disponibles</h2><p>Agrega actividades o cambia los filtros.</p>';
    return;
  }
  const selected = items[Math.floor(Math.random() * items.length)];
  els.randomResult.classList.remove('hidden');
  els.randomResult.innerHTML = `
    <h2 class="random-card-title">Actividad sugerida</h2>
    <h3>${selected.title}</h3>
    <p>${selected.notes || 'Sin notas adicionales.'}</p>
    <div class="chips">
      <span class="chip">${selected.category}</span>
      <span class="chip">${selected.budget}</span>
      <span class="chip">${selected.duration}</span>
      <span class="chip">${selected.energy}</span>
    </div>
  `;
}

function formToObject(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function attachEvents() {
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = formToObject(els.form);
    await addItem(item);
    els.form.reset();
  });

  [els.search, els.filterCategory, els.filterBudget, els.filterStatus].forEach(el => {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  els.randomBtn.addEventListener('click', showRandom);

  els.seedBtn.addEventListener('click', async () => {
    for (const activity of sampleActivities) {
      await addItem(activity);
    }
  });

  els.saveConfigBtn.addEventListener('click', async () => {
    const url = els.supabaseUrl.value.trim();
    const key = els.supabaseKey.value.trim();
    if (!url || !key) return alert('Pega la URL y la anon key de Supabase.');
    saveConfig({ url, key });
    const ok = await initSupabaseIfConfigured();
    await loadItems();
    alert(ok ? 'Configuración guardada. Ya pueden compartir la lista.' : 'No se pudo conectar. Revisa la configuración y que la tabla exista.');
  });

  els.clearConfigBtn.addEventListener('click', async () => {
    localStorage.removeItem(CONFIG_KEY);
    state.supabase = null;
    state.mode = 'local';
    await loadItems();
  });
}

function preloadConfigInputs() {
  const config = loadConfig();
  if (!config) return;
  els.supabaseUrl.value = config.url || '';
  els.supabaseKey.value = config.key || '';
}

(async function main() {
  preloadConfigInputs();
  attachEvents();
  await initSupabaseIfConfigured();
  await loadItems();
})();
