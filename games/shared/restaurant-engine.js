export const RESTAURANT_ENGINE_VERSION = '1.0.0';

const DIRECTIONS = Object.freeze({
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0]
});

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function multisetKey(values) {
  return [...(values || [])].map(String).sort().join('|');
}

function directionVector(direction) {
  return DIRECTIONS[direction] || DIRECTIONS.east;
}

class EventHub {
  constructor() {
    this.listeners = new Map();
  }
  on(type, listener) {
    if (typeof listener !== 'function') return () => {};
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }
  emit(type, payload) {
    this.listeners.get(type)?.forEach(listener => {
      try { listener(payload); } catch (_) {}
    });
  }
}

export class RecipeBook {
  constructor({ items = [], recipes = [] } = {}) {
    this.items = new Map();
    this.recipes = new Map();
    items.forEach(item => this.addItem(item));
    recipes.forEach(recipe => this.addRecipe(recipe));
  }

  addItem(item) {
    if (!item?.id) throw new Error('RestaurantEngine item requires id');
    const normalized = { ...item, id: String(item.id) };
    this.items.set(normalized.id, normalized);
    return normalized;
  }

  addRecipe(recipe) {
    if (!recipe?.id) throw new Error('RestaurantEngine recipe requires id');
    const ingredients = [...(recipe.ingredients || recipe.need || [])].map(String);
    if (!ingredients.length) throw new Error('RestaurantEngine recipe requires ingredients');
    const normalized = {
      ...recipe,
      id: String(recipe.id),
      ingredients,
      need: [...ingredients],
      price: Math.max(0, Number(recipe.price) || 0)
    };
    normalized._key = multisetKey(ingredients);
    this.recipes.set(normalized.id, normalized);
    return normalized;
  }

  get(id) {
    return this.recipes.get(String(id || '')) || null;
  }

  all() {
    return [...this.recipes.values()];
  }

  item(id) {
    return this.items.get(String(id || '')) || null;
  }

  findExact(ingredients) {
    const key = multisetKey(ingredients);
    return this.all().find(recipe => recipe._key === key) || null;
  }

  compatibleWithPartial(ingredients) {
    const partial = [...(ingredients || [])].map(String);
    return this.all().filter(recipe => {
      const counts = new Map();
      recipe.ingredients.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
      for (const id of partial) {
        const left = counts.get(id) || 0;
        if (left <= 0) return false;
        counts.set(id, left - 1);
      }
      return true;
    });
  }
}

export class OrderSystem {
  constructor(recipeBook, {
    maxOrders = 4,
    basePatience = 100,
    decayPerSecond = 1,
    random = Math.random,
    events = null
  } = {}) {
    this.recipeBook = recipeBook;
    this.maxOrders = Math.max(1, Math.floor(maxOrders));
    this.basePatience = Math.max(1, Number(basePatience) || 100);
    this.decayPerSecond = decayPerSecond;
    this.random = typeof random === 'function' ? random : Math.random;
    this.events = events;
    this.items = [];
    this.nextId = 1;
  }

  reset() {
    this.items.length = 0;
    this.nextId = 1;
  }

  replace(items) {
    this.items.length = 0;
    (Array.isArray(items) ? items : []).forEach(order => this.items.push({ ...order }));
    this.nextId = Math.max(1, ...this.items.map(order => Number(order.id) + 1 || 1));
  }

  get(orderId) {
    return this.items.find(order => order.id === Number(orderId)) || null;
  }

  spawn(recipeId = null, meta = {}) {
    if (this.items.length >= this.maxOrders) return null;
    let recipe = recipeId ? this.recipeBook.get(recipeId) : null;
    if (!recipe) {
      const pool = this.recipeBook.all();
      if (!pool.length) return null;
      recipe = pool[Math.floor(this.random() * pool.length)] || pool[0];
    }

    const usedSlots = new Set(this.items.map(order => order.slot));
    const automaticSlot = Array.from({ length: this.maxOrders }, (_, i) => i).find(i => !usedSlots.has(i));
    const slot = Number.isInteger(meta.slot) ? meta.slot : (automaticSlot ?? 0);
    const order = {
      ...meta,
      id: this.nextId++,
      recipeId: recipe.id,
      patience: clamp(meta.patience ?? this.basePatience, 0, this.basePatience),
      slot
    };
    this.items.push(order);
    this.events?.emit('order:spawn', { order: { ...order }, recipe });
    return order;
  }

  tick(dt, context = {}) {
    const seconds = clamp(dt, 0, 1);
    if (seconds <= 0 || !this.items.length) return [];
    const expired = [];
    this.items.forEach(order => {
      if (order.paused === true) return;
      const rate = typeof this.decayPerSecond === 'function'
        ? Number(this.decayPerSecond({ order, context })) || 0
        : Number(this.decayPerSecond) || 0;
      order.patience = Math.max(0, order.patience - seconds * Math.max(0, rate));
      if (order.patience <= 0) expired.push(order);
    });
    if (expired.length) {
      const expiredIds = new Set(expired.map(order => order.id));
      for (let i = this.items.length - 1; i >= 0; i--) {
        if (expiredIds.has(this.items[i].id)) this.items.splice(i, 1);
      }
      expired.forEach(order => this.events?.emit('order:expired', { order: { ...order } }));
    }
    return expired;
  }

  adjustPatience(orderId, delta) {
    const order = this.get(orderId);
    if (!order) return null;
    order.patience = clamp(order.patience + Number(delta || 0), 0, this.basePatience);
    return order;
  }

  serve(orderId, recipeId) {
    const order = this.get(orderId);
    if (!order) return { ok: false, reason: 'missing-order', order: null };
    if (String(order.recipeId) !== String(recipeId)) {
      return { ok: false, reason: 'wrong-recipe', order };
    }
    const index = this.items.indexOf(order);
    if (index >= 0) this.items.splice(index, 1);
    this.events?.emit('order:served', { order: { ...order } });
    return { ok: true, order };
  }
}

export class EconomySystem {
  constructor({ perfectQuality = 90 } = {}) {
    this.perfectQuality = clamp(perfectQuality, 0, 100);
    this.reset();
  }

  reset() {
    this.revenue = 0;
    this.served = 0;
    this.perfect = 0;
    this.missed = 0;
  }

  set(values = {}) {
    if ('revenue' in values) this.revenue = Math.max(0, Number(values.revenue) || 0);
    if ('served' in values) this.served = Math.max(0, Math.floor(Number(values.served) || 0));
    if ('perfect' in values) this.perfect = Math.max(0, Math.floor(Number(values.perfect) || 0));
    if ('missed' in values) this.missed = Math.max(0, Math.floor(Number(values.missed) || 0));
  }

  recordSale(amount, quality = 100) {
    const earned = Math.max(0, Math.round(Number(amount) || 0));
    this.revenue += earned;
    this.served += 1;
    if (Number(quality) >= this.perfectQuality) this.perfect += 1;
    return earned;
  }

  recordMiss(count = 1) {
    this.missed += Math.max(0, Math.floor(Number(count) || 0));
  }
}

export class ShiftSystem {
  constructor({ duration = 120, targetRevenue = 0 } = {}) {
    this.duration = Math.max(1, Number(duration) || 120);
    this.targetRevenue = Math.max(0, Number(targetRevenue) || 0);
    this.reset();
  }

  reset() {
    this.remaining = this.duration;
    this.running = false;
    this.finished = false;
  }

  start({ duration = this.duration, targetRevenue = this.targetRevenue } = {}) {
    this.duration = Math.max(1, Number(duration) || this.duration);
    this.targetRevenue = Math.max(0, Number(targetRevenue) || 0);
    this.remaining = this.duration;
    this.running = true;
    this.finished = false;
  }

  stop() {
    this.running = false;
  }

  tick(dt) {
    if (!this.running || this.finished) return false;
    this.remaining = Math.max(0, this.remaining - clamp(dt, 0, 1));
    if (this.remaining <= 0) {
      this.finished = true;
      this.running = false;
      return true;
    }
    return false;
  }
}

export class AutomationGrid {
  constructor({
    width = 12,
    height = 8,
    fixedStep = 0.05,
    applianceTypes = [],
    events = null
  } = {}) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.fixedStep = clamp(fixedStep, 0.02, 0.5);
    this.events = events;
    this.types = new Map();
    this.cells = Array.from({ length: this.width * this.height }, () => ({
      appliance: null,
      item: null
    }));
    this.accumulator = 0;
    applianceTypes.forEach(type => this.registerType(type));
  }

  index(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return y * this.width + x;
  }

  coords(index) {
    return { x: index % this.width, y: Math.floor(index / this.width) };
  }

  cell(x, y) {
    const i = this.index(x, y);
    return i < 0 ? null : this.cells[i];
  }

  registerType(type) {
    if (!type?.id) throw new Error('RestaurantEngine appliance type requires id');
    const normalized = {
      capacity: 1,
      transportSeconds: 0.35,
      ...type,
      id: String(type.id)
    };
    this.types.set(normalized.id, normalized);
    return normalized;
  }

  place(typeId, x, y, options = {}) {
    const cell = this.cell(x, y);
    const type = this.types.get(String(typeId || ''));
    if (!cell || !type || cell.appliance) return null;
    const appliance = {
      id: options.id || (type.id + ':' + x + ':' + y),
      typeId: type.id,
      direction: options.direction || type.direction || 'east',
      state: {
        sourceTimer: 0,
        processTimer: 0,
        processItem: null,
        transportTimer: 0,
        ...(options.state || {})
      }
    };
    cell.appliance = appliance;
    this.events?.emit('appliance:placed', { x, y, appliance: { ...appliance } });
    return appliance;
  }

  remove(x, y) {
    const cell = this.cell(x, y);
    if (!cell) return null;
    const appliance = cell.appliance;
    cell.appliance = null;
    return appliance;
  }

  clearItems() {
    this.cells.forEach(cell => { cell.item = null; });
  }

  putItem(x, y, item) {
    const cell = this.cell(x, y);
    if (!cell || cell.item) return false;
    cell.item = typeof item === 'string' ? { id: item } : { ...(item || {}) };
    if (!cell.item.id) {
      cell.item = null;
      return false;
    }
    return true;
  }

  takeItem(x, y) {
    const cell = this.cell(x, y);
    if (!cell) return null;
    const item = cell.item;
    cell.item = null;
    return item;
  }

  accepts(cell, item) {
    if (!cell || !item || cell.item) return false;
    if (!cell.appliance) return true;
    const type = this.types.get(cell.appliance.typeId);
    if (!type?.accepts) return true;
    if (typeof type.accepts === 'function') return !!type.accepts(item, cell.appliance);
    const accepted = Array.isArray(type.accepts) ? type.accepts : [type.accepts];
    return accepted.includes(item.id);
  }

  processCell(cell, step) {
    const appliance = cell.appliance;
    if (!appliance) return;
    const type = this.types.get(appliance.typeId);
    if (!type) return;
    const state = appliance.state;

    if (type.source && !cell.item) {
      state.sourceTimer -= step;
      if (state.sourceTimer <= 0) {
        const produced = typeof type.source.item === 'function'
          ? type.source.item(appliance)
          : type.source.item;
        if (produced) {
          cell.item = typeof produced === 'string' ? { id: produced } : { ...produced };
          state.sourceTimer = Math.max(this.fixedStep, Number(type.source.interval) || 1);
          this.events?.emit('item:produced', { item: { ...cell.item }, appliance });
        }
      }
    }

    if (type.process && cell.item) {
      const rules = Array.isArray(type.process) ? type.process : [type.process];
      const rule = rules.find(candidate => candidate && String(candidate.input) === String(cell.item.id));
      if (!rule) {
        state.processTimer = 0;
        state.processItem = null;
        return;
      }
      if (state.processItem !== cell.item.id) {
        state.processItem = cell.item.id;
        state.processTimer = 0;
      }
      state.processTimer += step;
      if (state.processTimer + 1e-9 >= Math.max(this.fixedStep, Number(rule.seconds) || this.fixedStep)) {
        const before = cell.item;
        cell.item = { ...before, id: String(rule.output) };
        state.processTimer = 0;
        state.processItem = cell.item.id;
        this.events?.emit('item:processed', {
          from: before.id,
          to: cell.item.id,
          appliance
        });
      }
    } else {
      state.processTimer = 0;
      state.processItem = null;
    }
  }

  fixedTick(step) {
    this.cells.forEach(cell => this.processCell(cell, step));

    const intents = [];
    this.cells.forEach((cell, fromIndex) => {
      const appliance = cell.appliance;
      if (!appliance || !cell.item) return;
      const type = this.types.get(appliance.typeId);
      if (!type) return;
      const movesItems = type.transport === true || type.outputDirection || type.transportDirection;
      if (!movesItems) return;

      appliance.state.transportTimer -= step;
      if (appliance.state.transportTimer > 0) return;
      const direction = type.outputDirection || type.transportDirection || appliance.direction;
      const [dx, dy] = directionVector(direction);
      const { x, y } = this.coords(fromIndex);
      const toIndex = this.index(x + dx, y + dy);
      if (toIndex < 0) return;
      const destination = this.cells[toIndex];
      if (!this.accepts(destination, cell.item)) return;
      intents.push({ fromIndex, toIndex, item: cell.item, appliance, type });
    });

    intents.sort((a, b) => a.toIndex - b.toIndex || a.fromIndex - b.fromIndex);
    const claimedDestinations = new Set();
    intents.forEach(intent => {
      if (claimedDestinations.has(intent.toIndex)) return;
      const source = this.cells[intent.fromIndex];
      const destination = this.cells[intent.toIndex];
      if (!source.item || source.item !== intent.item || !this.accepts(destination, source.item)) return;
      destination.item = source.item;
      source.item = null;
      claimedDestinations.add(intent.toIndex);
      intent.appliance.state.transportTimer = Math.max(
        this.fixedStep,
        Number(intent.type.transportSeconds) || 0.35
      );
      this.events?.emit('item:moved', {
        from: this.coords(intent.fromIndex),
        to: this.coords(intent.toIndex),
        item: { ...destination.item }
      });
    });
  }

  tick(dt) {
    this.accumulator += clamp(dt, 0, 1);
    let steps = 0;
    while (this.accumulator + 1e-9 >= this.fixedStep && steps < 12) {
      this.accumulator -= this.fixedStep;
      this.fixedTick(this.fixedStep);
      steps += 1;
    }
    if (steps >= 12) this.accumulator = 0;
    return steps;
  }

  snapshot() {
    return this.cells.map((cell, index) => ({
      ...this.coords(index),
      appliance: cell.appliance ? { ...cell.appliance, state: { ...cell.appliance.state } } : null,
      item: cell.item ? { ...cell.item } : null
    }));
  }
}

export class RestaurantEngine {
  constructor({
    items = [],
    recipes = [],
    order = {},
    economy = {},
    shift = {},
    automation = {},
    pricing = null
  } = {}) {
    this.events = new EventHub();
    this.recipes = new RecipeBook({ items, recipes });
    this.economy = new EconomySystem(economy);
    this.shift = new ShiftSystem(shift);
    this.orders = new OrderSystem(this.recipes, { ...order, events: this.events });
    this.automation = new AutomationGrid({ ...automation, events: this.events });
    this.pricing = typeof pricing === 'function'
      ? pricing
      : ({ recipe, quality }) => Math.round((recipe?.price || 0) * clamp(quality, 0, 100) / 100);
  }

  on(type, listener) {
    return this.events.on(type, listener);
  }

  reset({ keepLayout = true } = {}) {
    this.orders.reset();
    this.economy.reset();
    this.shift.reset();
    this.automation.clearItems();
    this.automation.accumulator = 0;
    if (!keepLayout) {
      this.automation.cells.forEach(cell => { cell.appliance = null; });
    }
  }

  startShift(options = {}) {
    this.shift.start(options);
    this.events.emit('shift:start', {
      duration: this.shift.duration,
      targetRevenue: this.shift.targetRevenue
    });
  }

  stopShift() {
    this.shift.stop();
    this.events.emit('shift:stop', this.snapshot());
  }

  spawnOrder(recipeId = null, meta = {}) {
    return this.orders.spawn(recipeId, meta);
  }

  quote(orderId, recipeId, { quality = 100, extra = {} } = {}) {
    const order = this.orders.get(orderId);
    if (!order) return { ok: false, reason: 'missing-order', earned: 0, order: null, recipe: null };
    if (String(order.recipeId) !== String(recipeId)) {
      return { ok: false, reason: 'wrong-recipe', earned: 0, order, recipe: this.recipes.get(recipeId) };
    }
    const recipe = this.recipes.get(recipeId);
    const earned = Math.max(0, Math.round(Number(this.pricing({
      recipe,
      order,
      quality: clamp(quality, 0, 100),
      economy: this.economy,
      extra
    })) || 0));
    return { ok: true, earned, order, recipe };
  }

  serve(orderId, recipeId, { quality = 100, extra = {} } = {}) {
    const quote = this.quote(orderId, recipeId, { quality, extra });
    if (!quote.ok) return quote;
    const served = this.orders.serve(orderId, recipeId);
    if (!served.ok) return { ...served, earned: 0 };
    this.economy.recordSale(quote.earned, quality);
    const result = { ...quote, ok: true, quality: clamp(quality, 0, 100) };
    this.events.emit('sale', result);
    return result;
  }

  tick(dt, {
    advanceShift = true,
    advanceOrders = true,
    advanceAutomation = true,
    context = {}
  } = {}) {
    const seconds = clamp(dt, 0, 1);
    const expiredOrders = advanceOrders ? this.orders.tick(seconds, context) : [];
    if (expiredOrders.length) this.economy.recordMiss(expiredOrders.length);
    const automationSteps = advanceAutomation ? this.automation.tick(seconds) : 0;
    const shiftEnded = advanceShift ? this.shift.tick(seconds) : false;
    if (shiftEnded) this.events.emit('shift:end', this.snapshot());
    return { expiredOrders, automationSteps, shiftEnded };
  }

  snapshot() {
    return {
      version: RESTAURANT_ENGINE_VERSION,
      shift: {
        duration: this.shift.duration,
        remaining: this.shift.remaining,
        targetRevenue: this.shift.targetRevenue,
        running: this.shift.running,
        finished: this.shift.finished
      },
      economy: {
        revenue: this.economy.revenue,
        served: this.economy.served,
        perfect: this.economy.perfect,
        missed: this.economy.missed
      },
      orders: this.orders.items.map(order => ({ ...order }))
    };
  }
}
