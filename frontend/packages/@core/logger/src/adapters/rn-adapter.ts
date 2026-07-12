import { RN_LOG_INDEX_KEY, RN_LOG_KEY_PREFIX } from '../constants';
import type { LogRecord } from '../types';
import { BaseStorageAdapter } from './base-adapter';

/** 日志索引结构 */
interface LogIndex {
  /** 日志 ID 列表（按时间排序） */
  ids: string[];
  /** ID 到时间戳的映射 */
  timestamps: Record<string, number>;
}

/** React Native 存储适配器 使用 AsyncStorage 存储日志 */
export class RNStorageAdapter extends BaseStorageAdapter {
  /** AsyncStorage 模块 */
  private AsyncStorage: any = null;

  /** 日志索引 */
  private logIndex: LogIndex = { ids: [], timestamps: {} };

  /** 初始化适配器 */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 动态导入 AsyncStorage
      const module = await import('@react-native-async-storage/async-storage');
      this.AsyncStorage = module.default;

      // 加载日志索引
      const indexStr = await this.AsyncStorage.getItem(RN_LOG_INDEX_KEY);
      if (indexStr) {
        this.logIndex = JSON.parse(indexStr);
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize RN storage adapter: ${(error as Error).message}`);
    }
  }

  /** 保存日志索引 */
  private async saveIndex(): Promise<void> {
    await this.AsyncStorage.setItem(RN_LOG_INDEX_KEY, JSON.stringify(this.logIndex));
  }

  /** 写入日志 */
  async write(record: LogRecord): Promise<void> {
    await this.ensureInitialized();

    const key = `${RN_LOG_KEY_PREFIX}${record.id}`;
    await this.AsyncStorage.setItem(key, JSON.stringify(record));

    // 更新索引
    this.logIndex.ids.push(record.id);
    this.logIndex.timestamps[record.id] = record.timestamp;
    await this.saveIndex();
  }

  /** 批量写入日志 */
  async writeBatch(records: LogRecord[]): Promise<void> {
    await this.ensureInitialized();

    const keyValuePairs: [string, string][] = records.map(record => [
      `${RN_LOG_KEY_PREFIX}${record.id}`,
      JSON.stringify(record)
    ]);

    await this.AsyncStorage.multiSet(keyValuePairs);

    // 更新索引
    for (const record of records) {
      this.logIndex.ids.push(record.id);
      this.logIndex.timestamps[record.id] = record.timestamp;
    }
    await this.saveIndex();
  }

  /** 读取指定时间范围的日志 */
  async read(startTime?: number, endTime?: number): Promise<LogRecord[]> {
    await this.ensureInitialized();

    // 过滤符合时间范围的 ID
    const filteredIds = this.logIndex.ids.filter(id => {
      const timestamp = this.logIndex.timestamps[id];
      if (startTime !== undefined && timestamp < startTime) return false;
      if (endTime !== undefined && timestamp > endTime) return false;
      return true;
    });

    if (filteredIds.length === 0) {
      return [];
    }

    const keys = filteredIds.map(id => `${RN_LOG_KEY_PREFIX}${id}`);
    const pairs: [string, string | null][] = await this.AsyncStorage.multiGet(keys);

    const records: LogRecord[] = [];
    for (const [, value] of pairs) {
      if (value) {
        records.push(JSON.parse(value));
      }
    }

    // 按时间戳排序
    records.sort((a, b) => a.timestamp - b.timestamp);
    return records;
  }

  /** 删除指定时间之前的日志 */
  async deleteBeforeTime(time: number): Promise<number> {
    await this.ensureInitialized();

    const idsToDelete = this.logIndex.ids.filter(id => this.logIndex.timestamps[id] < time);

    if (idsToDelete.length === 0) {
      return 0;
    }

    const keysToDelete = idsToDelete.map(id => `${RN_LOG_KEY_PREFIX}${id}`);
    await this.AsyncStorage.multiRemove(keysToDelete);

    // 更新索引
    this.logIndex.ids = this.logIndex.ids.filter(id => !idsToDelete.includes(id));
    for (const id of idsToDelete) {
      delete this.logIndex.timestamps[id];
    }
    await this.saveIndex();

    return idsToDelete.length;
  }

  /** 获取日志总数 */
  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.logIndex.ids.length;
  }

  /** 清空所有日志 */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    const keys = this.logIndex.ids.map(id => `${RN_LOG_KEY_PREFIX}${id}`);
    if (keys.length > 0) {
      await this.AsyncStorage.multiRemove(keys);
    }

    this.logIndex = { ids: [], timestamps: {} };
    await this.saveIndex();
  }
}
