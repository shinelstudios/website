/**
 * Cloudflare Workers KV Storage for YouTube View Counts
 * 
 * Usage:
 * import { CloudflareViewStorage } from './cloudflare-storage';
 * 
 * const storage = new CloudflareViewStorage('https://your-worker.workers.dev');
 */

export class CloudflareViewStorage {
  constructor(workerUrl) {
    if (!workerUrl) {
      throw new Error('Worker URL is required');
    }
    this.workerUrl = workerUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get view count for a video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object|null>} View data or null if not found
   */
  async get(videoId) {
    try {
      const response = await fetch(`${this.workerUrl}/views/${videoId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error getting views for ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Save view count for a video (only updates if views are higher)
   * @param {string} videoId - YouTube video ID
   * @param {number} views - View count
   * @returns {Promise<Object>} Result object
   */
  async set(videoId, views) {
    try {
      // Get existing data first
      const existing = await this.get(videoId);
      
      // Only update if new views are higher (to handle deleted videos)
      if (!existing || views > existing.views) {
        const response = await fetch(`${this.workerUrl}/views/${videoId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            views: views,
            status: 'active'
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        return { success: true, data: result.data || result };
      }
      
      // Return existing data if not updating
      return { success: true, data: existing };
    } catch (error) {
      console.error(`Error setting views for ${videoId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark a video as deleted (preserves last known view count)
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Result object
   */
  async markDeleted(videoId) {
    try {
      const response = await fetch(`${this.workerUrl}/views/${videoId}/delete`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error marking ${videoId} as deleted:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all stored video data
   * @returns {Promise<Object>} Object with videoId as keys
   */
  async getAll() {
    try {
      const response = await fetch(`${this.workerUrl}/export`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting all data:', error);
      return {};
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Stats object with total, active, deleted, totalViews
   */
  async getStats() {
    try {
      const response = await fetch(`${this.workerUrl}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting stats:', error);
      return { 
        total: 0, 
        active: 0, 
        deleted: 0, 
        totalViews: 0 
      };
    }
  }

  /**
   * Export all data as JSON string (for backup)
   * @returns {Promise<string>} JSON string
   */
  async export() {
    try {
      const data = await this.getAll();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return '{}';
    }
  }

  /**
   * Import data from JSON string (for migration/restore)
   * @param {string} jsonString - JSON string with video data
   * @returns {Promise<boolean>} Success status
   */
  async import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      let successCount = 0;
      let errorCount = 0;
      
      for (const [videoId, viewData] of Object.entries(data)) {
        try {
          // Set view count
          await this.set(videoId, viewData.views);
          
          // Mark as deleted if needed
          if (viewData.status === 'deleted') {
            await this.markDeleted(videoId);
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error importing ${videoId}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Import complete: ${successCount} success, ${errorCount} errors`);
      return errorCount === 0;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Clear all data (WARNING: Use with caution!)
   * Note: For Cloudflare KV, it's safer to delete the namespace in dashboard
   */
  clear() {
    console.warn(
      'Clear operation not implemented for Cloudflare KV for safety.\n' +
      'To clear all data, delete the KV namespace in Cloudflare dashboard and create a new one.'
    );
  }

  /**
   * Check if video needs update based on last update time
   * @param {string} videoId - YouTube video ID
   * @param {number} maxAge - Max age in milliseconds (default: 24 hours)
   * @returns {Promise<boolean>} True if needs update
   */
  async needsUpdate(videoId, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const data = await this.get(videoId);
      
      if (!data) return true; // No data, needs update
      
      const age = Date.now() - (data.lastUpdated || 0);
      return age > maxAge;
    } catch (error) {
      console.error(`Error checking if ${videoId} needs update:`, error);
      return true; // On error, assume needs update
    }
  }

  /**
   * Batch get multiple videos (optimized)
   * @param {string[]} videoIds - Array of video IDs
   * @returns {Promise<Object>} Object with videoId as keys
   */
  async batchGet(videoIds) {
    try {
      const results = {};
      
      // Fetch all in parallel
      const promises = videoIds.map(id => 
        this.get(id).then(data => ({ id, data }))
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(({ id, data }) => {
        if (data) results[id] = data;
      });
      
      return results;
    } catch (error) {
      console.error('Error in batch get:', error);
      return {};
    }
  }

  /**
   * Batch set multiple videos (optimized)
   * @param {Object} videos - Object with videoId as keys, views as values
   * @returns {Promise<Object>} Results
   */
  async batchSet(videos) {
    try {
      const results = { success: 0, failed: 0, skipped: 0 };
      
      // Set all in parallel
      const promises = Object.entries(videos).map(async ([id, views]) => {
        const result = await this.set(id, views);
        return { id, result };
      });
      
      const responses = await Promise.all(promises);
      
      responses.forEach(({ result }) => {
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error in batch set:', error);
      return { success: 0, failed: Object.keys(videos).length, skipped: 0 };
    }
  }

  /**
   * Test connection to worker
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.workerUrl}/stats`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get detailed health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      const stats = await this.getStats();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: responseTime,
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Helper function to create CloudflareViewStorage with validation
 * @param {string} workerUrl - Cloudflare Worker URL
 * @returns {CloudflareViewStorage} Storage instance
 */
export function createCloudflareStorage(workerUrl) {
  if (!workerUrl || typeof workerUrl !== 'string') {
    throw new Error('Invalid worker URL provided');
  }
  
  if (!workerUrl.startsWith('http://') && !workerUrl.startsWith('https://')) {
    throw new Error('Worker URL must start with http:// or https://');
  }
  
  if (!workerUrl.includes('workers.dev') && !workerUrl.includes('workers.cloudflare.com')) {
    console.warn('URL does not appear to be a Cloudflare Worker URL');
  }
  
  return new CloudflareViewStorage(workerUrl);
}

// Export default for convenience
export default CloudflareViewStorage;