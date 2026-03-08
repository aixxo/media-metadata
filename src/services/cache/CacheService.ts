import {AudiobookMetadata} from "../../models/AudiobookMetadata";

/**
 * Cache entry with TTL (Time To Live)
 */
interface CacheEntry {
	data: AudiobookMetadata;
	timestamp: number;
	ttl: number; // in milliseconds
}

/**
 * Cache data structure for persistence
 */
export interface CacheData {
	entries: Record<string, CacheEntry>;
}

/**
 * Service for caching audiobook metadata
 * Reduces API calls and improves performance
 */
export class CacheService {
	private cache: Map<string, CacheEntry> = new Map();
	private defaultTtlHours: number;
	private loadData: () => Promise<CacheData | null>;
	private saveData: (data: CacheData) => Promise<void>;

	constructor(
		defaultTtlHours: number,
		loadData: () => Promise<CacheData | null>,
		saveData: (data: CacheData) => Promise<void>
	) {
		this.defaultTtlHours = defaultTtlHours;
		this.loadData = loadData;
		this.saveData = saveData;
	}

	/**
	 * Initialize cache from persistent storage
	 */
	async initialize(): Promise<void> {
		try {
			const data = await this.loadData();
			if (data && data.entries) {
				for (const [key, entry] of Object.entries(data.entries)) {
					// Only restore entries that haven't expired
					if (!this.isExpired(entry)) {
						this.cache.set(key, entry);
					}
				}
				console.debug(`[CacheService] Loaded ${this.cache.size} valid cache entries`);
			}
		} catch (error) {
			console.error('[CacheService] Error loading cache:', error);
		}
	}

	/**
	 * Generate cache key from provider and ID
	 */
	private generateKey(provider: string, id: string): string {
		return `${provider}:${id}`;
	}

	/**
	 * Check if a cache entry has expired
	 */
	private isExpired(entry: CacheEntry): boolean {
		return Date.now() > entry.timestamp + entry.ttl;
	}

	/**
	 * Get cached metadata
	 * @param provider Provider ID (e.g., "audible")
	 * @param id Resource ID (e.g., ASIN)
	 * @returns Cached metadata or null if not found/expired
	 */
	get(provider: string, id: string): AudiobookMetadata | null {
		const key = this.generateKey(provider, id);
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		if (this.isExpired(entry)) {
			this.cache.delete(key);
			console.debug(`[CacheService] Cache expired for ${key}`);
			return null;
		}

		console.debug(`[CacheService] Cache hit for ${key}`);
		return entry.data;
	}

	/**
	 * Store metadata in cache
	 * @param provider Provider ID
	 * @param id Resource ID
	 * @param data Metadata to cache
	 * @param ttlHours Optional custom TTL in hours (defaults to settings value)
	 */
	async set(
		provider: string,
		id: string,
		data: AudiobookMetadata,
		ttlHours?: number
	): Promise<void> {
		const key = this.generateKey(provider, id);
		const ttl = (ttlHours || this.defaultTtlHours) * 60 * 60 * 1000;

		const entry: CacheEntry = {
			data,
			timestamp: Date.now(),
			ttl
		};

		this.cache.set(key, entry);
		console.debug(`[CacheService] Cached ${key} with TTL ${ttlHours || this.defaultTtlHours}h`);

		await this.persist();
	}

	/**
	 * Clear all cache entries
	 */
	async clear(): Promise<void> {
		this.cache.clear();
		await this.persist();
		console.debug('[CacheService] Cache cleared');
	}

	/**
	 * Remove expired entries
	 * @returns Number of entries removed
	 */
	async cleanup(): Promise<number> {
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (this.isExpired(entry)) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.cache.delete(key);
		}

		if (keysToDelete.length > 0) {
			await this.persist();
			console.debug(`[CacheService] Cleaned up ${keysToDelete.length} expired entries`);
		}

		return keysToDelete.length;
	}

	/**
	 * Persist cache to storage
	 */
	private async persist(): Promise<void> {
		try {
			const entries: Record<string, CacheEntry> = {};
			for (const [key, entry] of this.cache.entries()) {
				entries[key] = entry;
			}

			await this.saveData({ entries });
		} catch (error) {
			console.error('[CacheService] Error persisting cache:', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}
}
