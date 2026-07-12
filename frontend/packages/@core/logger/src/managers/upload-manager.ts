import { DEFAULT_UPLOAD_BATCH_SIZE } from '../constants';
import type { IStorageAdapter, LogUploadRequest, LogUploadResponse, UploadResult } from '../types';

interface UploadManagerConfig {
  /** 设备 ID */
  deviceId: string;
  /** 日志上传端点 */
  endpoint: string;
  /** 存储适配器 */
  adapter: IStorageAdapter;
  /** 批量上传大小 */
  batchSize?: number;
}

/** 日志上传管理器 负责批量上传历史日志到远程服务器 */
export class UploadManager {
  /** 设备 ID */
  private deviceId: string;

  /** 上传端点 */
  private endpoint: string;

  /** 存储适配器 */
  private adapter: IStorageAdapter;

  /** 批量上传大小 */
  private batchSize: number;

  /** 是否正在上传 */
  private isUploading = false;

  /** 上一次成功上传的时间戳 */
  private lastUploadedTimestamp = 0;

  constructor(config: UploadManagerConfig) {
    this.deviceId = config.deviceId;
    this.endpoint = config.endpoint;
    this.adapter = config.adapter;
    this.batchSize = config.batchSize ?? DEFAULT_UPLOAD_BATCH_SIZE;
  }

  /** 上传所有历史日志 */
  async uploadAll(): Promise<UploadResult> {
    if (this.isUploading) {
      return { success: false, uploadedCount: 0 };
    }

    this.isUploading = true;
    let totalUploaded = 0;

    try {
      // 获取所有日志
      const allLogs = await this.adapter.read(this.lastUploadedTimestamp);

      if (allLogs.length === 0) {
        return { success: true, uploadedCount: 0 };
      }

      // 计算总批次数
      const totalBatches = Math.ceil(allLogs.length / this.batchSize);

      // 分批上传
      for (let i = 0; i < totalBatches; i++) {
        const start = i * this.batchSize;
        const end = Math.min(start + this.batchSize, allLogs.length);
        const batch = allLogs.slice(start, end);

        const request: LogUploadRequest = {
          deviceId: this.deviceId,
          logs: batch,
          batchIndex: i,
          totalBatches
        };

        const success = await this.uploadBatch(request);
        if (success) {
          totalUploaded += batch.length;
          // 更新最后上传的时间戳
          const lastLog = batch[batch.length - 1];
          if (lastLog) {
            this.lastUploadedTimestamp = lastLog.timestamp;
          }
        } else {
          // 上传失败，停止后续批次
          return { success: false, uploadedCount: totalUploaded };
        }
      }

      return { success: true, uploadedCount: totalUploaded };
    } catch (error) {
      console.error('[UploadManager] Failed to upload logs:', error);
      return { success: false, uploadedCount: totalUploaded };
    } finally {
      this.isUploading = false;
    }
  }

  /** 上传单个批次 */
  private async uploadBatch(request: LogUploadRequest): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data: LogUploadResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('[UploadManager] Failed to upload batch:', error);
      return false;
    }
  }

  /** 获取上传状态 */
  getStatus(): { isUploading: boolean; lastUploadedTimestamp: number } {
    return {
      isUploading: this.isUploading,
      lastUploadedTimestamp: this.lastUploadedTimestamp
    };
  }
}
