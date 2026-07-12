/** 事件映射表：事件名 → 参数元组 */
export type EventMap = Record<string, unknown[]>;

/** 事件回调函数 */
export type EventFn<T extends unknown[] = unknown[]> = (...args: T) => void;

/**
 * 轻量级事件总线
 *
 * 支持基本的发布/订阅模式，额外支持：
 * - 泛型事件映射，编译期类型检查
 * - 通配符 `*` 监听所有事件
 * - 粘性事件：晚注册的监听器会收到之前已触发但未被消费的事件
 * - 键控事件（Map 模式）：同一事件名下按 key 隔离监听器
 *
 * @example 类型安全
 * ```ts
 * type Events = {
 *   login: [user: string];
 *   logout: [];
 * };
 * const bus = new Emitter<Events>();
 * bus.on('login', (user) => {}); // user: string
 * bus.emit('login', 'alice');    // ✅
 * bus.emit('login', 123);        // ❌ 类型错误
 * ```
 *
 * @example 无泛型（向后兼容）
 * ```ts
 * const bus = new Emitter();
 * bus.on('login', (user) => console.log(user));
 * bus.emit('login', { name: 'Alice' });
 * ```
 */
export class Emitter<T extends EventMap = EventMap> {
  private _events = new Map<string, EventFn[]>();
  private _mapEvents = new Map<string, Map<string, EventFn[]>>();
  private _prevEvents = new Map<string, unknown[][]>();

  /** 触发事件，通知所有监听器 */
  emit<K extends keyof T & string>(event: K, ...args: T[K]): void {
    const fns = this._events.get(event);
    const wildcardFns = this._events.get('*');

    // 通配符监听器
    if (wildcardFns) {
      wildcardFns.forEach(fn => fn(event, ...args));
    }

    if (fns) {
      fns.forEach(fn => fn(...args));
    } else if (!wildcardFns) {
      // 无监听器时存储为粘性事件
      if (!this._prevEvents.has(event)) {
        this._prevEvents.set(event, []);
      }
      this._prevEvents.get(event)!.push(args);
    }
  }

  /** 触发键控事件 */
  emitMap<K extends keyof T & string>(event: K, key: string, ...args: T[K]): void {
    this._mapEvents
      .get(event)
      ?.get(key)
      ?.forEach(fn => fn(...args));
  }

  /** 注册通配符监听器，接收所有事件，返回取消订阅函数 */
  on(event: '*', fn: (event: string, ...args: unknown[]) => void): () => void;
  /** 注册事件监听器，返回取消订阅函数。注册时会消费该事件的粘性事件 */
  on<K extends keyof T & string>(event: K, fn: EventFn<T[K]>): () => void;
  on(event: string, fn: EventFn<any>): () => void {
    const fns = this._events.get(event);
    if (fns) {
      fns.push(fn);
    } else {
      this._events.set(event, [fn]);
    }

    // 消费粘性事件
    const pending = this._prevEvents.get(event);
    if (pending) {
      pending.forEach(args => fn(...args));
      this._prevEvents.delete(event);
    }

    return () => this.off(event, fn);
  }

  /** 注册键控事件监听器 */
  onMap<K extends keyof T & string>(event: K, key: string, fn: EventFn<T[K]>): void;
  onMap(event: string, key: string, fn: EventFn<any>): void {
    const eventMap = this._mapEvents.get(event);

    if (eventMap) {
      const fns = eventMap.get(key);
      if (fns) {
        fns.push(fn);
      } else {
        eventMap.set(key, [fn]);
      }
    } else {
      this._mapEvents.set(event, new Map([[key, [fn]]]));
    }
  }

  /** 移除通配符监听器 */
  off(event: '*', fn?: EventFn): void;
  /** 移除事件监听器，不传 fn 则移除该事件的所有监听器 */
  off<K extends keyof T & string>(event: K, fn?: EventFn<T[K]>): void;
  off(event: string, fn?: EventFn<any>): void {
    const fns = this._events.get(event);
    if (!fns) return;

    if (!fn || fns.length === 1) {
      this._events.delete(event);
    } else {
      this._events.set(
        event,
        fns.filter(f => f !== fn)
      );
    }
  }

  /** 移除键控事件监听器 */
  offMap<K extends keyof T & string>(event: K, key: string, fn: EventFn<T[K]>): void;
  offMap(event: string, key: string, fn: EventFn<any>): void {
    const eventMap = this._mapEvents.get(event);
    if (!eventMap) return;

    const fns = eventMap.get(key);
    if (!fns) return;

    if (fns.length === 1) {
      eventMap.delete(key);
      if (eventMap.size === 0) {
        this._mapEvents.delete(event);
      }
    } else {
      eventMap.set(
        key,
        fns.filter(f => f !== fn)
      );
    }
  }

  /** 清除所有事件监听器和粘性事件 */
  offAll(): void {
    this._events.clear();
    this._prevEvents.clear();
    this._mapEvents.clear();
  }
}
