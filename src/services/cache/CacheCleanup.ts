import {CacheService} from "./CacheService";

/**
 * Manages automatic cleanup of expired cache entries
 */
export class CacheCleanup {
	private cacheService: CacheService;
	private cleanupIntervalId: number | null = null;
	private readonly cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

	constructor(cacheService: CacheService) {
		this.cacheService = cacheService;
	}

	/**
	 * Start automatic cleanup process
	 * @param registerInterval Function to register the interval with Obsidian
	 */
	start(registerInterval: (intervalId: number) => void): void {
		// Perform initial cleanup
		this.performCleanup().catch(error => {
			console.error('[CacheCleanup] Error during initial cleanup:', error);
		});

		// Schedule periodic cleanup
		this.cleanupIntervalId = window.setInterval(
			() => {
				void this.performCleanup();
			},
			this.cleanupInterval
		);

		// Register with Obsidian for automatic cleanup on unload
		registerInterval(this.cleanupIntervalId);

		console.debug('[CacheCleanup] Automatic cleanup started (runs every 24 hours)');
	}

	/**
	 * Perform cleanup operation
	 */
	private async performCleanup(): Promise<void> {
		console.debug('[CacheCleanup] Running scheduled cleanup...');
		const removedCount = await this.cacheService.cleanup();
		
		if (removedCount > 0) {
			console.debug(`[CacheCleanup] Removed ${removedCount} expired cache entries`);
		} else {
			console.debug('[CacheCleanup] No expired entries found');
		}
	}

	/**
	 * Stop automatic cleanup
	 */
	stop(): void {
		if (this.cleanupIntervalId !== null) {
			window.clearInterval(this.cleanupIntervalId);
			this.cleanupIntervalId = null;
			console.debug('[CacheCleanup] Automatic cleanup stopped');
		}
	}

	/**
	 * Manually trigger cleanup (e.g., from settings or command)
	 */
	async manualCleanup(): Promise<number> {
		console.debug('[CacheCleanup] Manual cleanup triggered');
		return await this.cacheService.cleanup();
	}
}
