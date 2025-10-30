/**
 * Cloudflare Thumbnail Storage Helper
 * 
 * Usage:
 * import { CloudflareThumbnailStorage } from './cloudflare-thumbnail-storage';
 * 
 * const storage = new CloudflareThumbnailStorage('https://your-worker.workers.dev');
 */

export class CloudflareThumbnailStorage {
  constructor(workerUrl) {
    if (!workerUrl) {
      throw new Error('Worker URL is required');
    }
    this.workerUrl = workerUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get all thumbnails
   * @returns {Promise<Array>} Array of thumbnail objects
   */
  async getAll() {
    try {
      const response = await fetch(`${this.workerUrl}/thumbnails`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.thumbnails || [];
    } catch (error) {
      console.error('Error getting thumbnails:', error);
      return [];
    }
  }

  /**
   * Add a new thumbnail
   * @param {Object} thumbnail - Thumbnail data
   * @returns {Promise<Object>} Result object
   */
  async add(thumbnail) {
    try {
      const response = await fetch(`${this.workerUrl}/thumbnails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thumbnail)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      return { success: true, data: result.thumbnail };
    } catch (error) {
      console.error('Error adding thumbnail:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a thumbnail
   * @param {string} id - Thumbnail ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Result object
   */
  async update(id, updates) {
    try {
      const response = await fetch(`${this.workerUrl}/thumbnails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      return { success: true, data: result.thumbnail };
    } catch (error) {
      console.error(`Error updating thumbnail ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a thumbnail
   * @param {string} id - Thumbnail ID
   * @returns {Promise<Object>} Result object
   */
  async delete(id) {
    try {
      const response = await fetch(`${this.workerUrl}/thumbnails/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting thumbnail ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Stats object
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
        withYouTube: 0,
        byCategory: {},
        byVariant: {}
      };
    }
  }

  /**
   * Fetch YouTube video details
   * @param {string} youtubeUrl - YouTube video URL
   * @param {string} apiKey - Optional YouTube API key
   * @returns {Promise<Object>} Video details
   */
  async fetchYouTubeDetails(youtubeUrl, apiKey = '') {
    try {
      const response = await fetch(`${this.workerUrl}/thumbnails/fetch-youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, apiKey })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching YouTube details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk import thumbnails
   * @param {Array} thumbnails - Array of thumbnail objects
   * @param {boolean} replace - Whether to replace existing data
   * @returns {Promise<Object>} Result object
   */
  async bulkImport(thumbnails, replace = false) {
    try {
      const response = await fetch(`${this.workerUrl}/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnails, replace })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error bulk importing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export all thumbnails as JSON
   * @returns {Promise<string>} JSON string
   */
  async export() {
    try {
      const thumbnails = await this.getAll();
      return JSON.stringify(thumbnails, null, 2);
    } catch (error) {
      console.error('Error exporting thumbnails:', error);
      return '[]';
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
 * Helper function to create CloudflareThumbnailStorage with validation
 * @param {string} workerUrl - Cloudflare Worker URL
 * @returns {CloudflareThumbnailStorage} Storage instance
 */
export function createThumbnailStorage(workerUrl) {
  if (!workerUrl || typeof workerUrl !== 'string') {
    throw new Error('Invalid worker URL provided');
  }
  
  if (!workerUrl.startsWith('http://') && !workerUrl.startsWith('https://')) {
    throw new Error('Worker URL must start with http:// or https://');
  }
  
  if (!workerUrl.includes('workers.dev') && !workerUrl.includes('workers.cloudflare.com')) {
    console.warn('URL does not appear to be a Cloudflare Worker URL');
  }
  
  return new CloudflareThumbnailStorage(workerUrl);
}

// Export default for convenience
export default CloudflareThumbnailStorage;
