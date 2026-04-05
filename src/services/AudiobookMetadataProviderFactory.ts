import {IMetadataProvider} from "./IMetadataProvider";
import {AudiobookMetadata} from "../models/AudiobookMetadata";
import {MediaPluginSettings} from "../settings";
import {RateLimiter} from "../utils/RateLimiter";
import {CacheService} from "./cache/CacheService";
import {GoogleBooksApiService} from "./GoogleBooksApiService";
import {AudibleApiService} from "./AudibleApiService";
import {OpenLibraryApiService} from "./OpenLibraryApiService";
import {ITunesApiService} from "./ITunesApiService";

/**
 * Factory for creating and wrapping metadata providers
 * Handles provider selection, rate limiting, and caching
 */
export class AudiobookMetadataProviderFactory {
	private settings: MediaPluginSettings;
	private cacheService: CacheService | null;
	private rateLimiters: Map<string, RateLimiter> = new Map();

	constructor(settings: MediaPluginSettings, cacheService: CacheService | null) {
		this.settings = settings;
		this.cacheService = cacheService;
	}

	/**
	 * Get the appropriate provider based on settings
	 * Wraps provider with rate limiting and caching
	 */
	getProvider(): IMetadataProvider {
		if (this.settings.offlineMode) {
			throw new Error('Offline mode is enabled. API access is disabled.');
		}

		// Create base provider
		const baseProvider = this.createBaseProvider();

		// Wrap with rate limiter (if enabled)
		const rateLimitedProvider = this.settings.rateLimitEnabled
			? this.wrapWithRateLimiter(baseProvider)
			: baseProvider;

		// Wrap with cache (if enabled)
		const cachedProvider = this.settings.cacheEnabled && this.cacheService
			? this.wrapWithCache(rateLimitedProvider)
			: rateLimitedProvider;

		return cachedProvider;
	}

	/**
	 * Create base provider based on settings
	 */
	private createBaseProvider(): IMetadataProvider {
		switch (this.settings.apiProvider) {
			case 'audible':
				return new AudibleApiService(this.settings.audibleCountry);
			case 'googlebooks':
				return new GoogleBooksApiService();
			case 'openlibrary':
				return new OpenLibraryApiService();
			case 'itunes':
				return new ITunesApiService();
			default:
				console.warn(`[ProviderFactory] Unknown provider: ${this.settings.apiProvider as string}, falling back to Google Books`);
				return new GoogleBooksApiService();
		}
	}

	/**
	 * Wrap provider with rate limiting
	 */
	private wrapWithRateLimiter(provider: IMetadataProvider): IMetadataProvider {
		const providerId = provider.getProviderId();
		
		// Reuse existing rate limiter or create new one
		if (!this.rateLimiters.has(providerId)) {
			this.rateLimiters.set(
				providerId,
				new RateLimiter(this.settings.rateLimitRequestsPerMinute)
			);
		}

		const rateLimiter = this.rateLimiters.get(providerId)!;

		return {
			getProviderId: () => provider.getProviderId(),
			supportsUrl: (url: string) => provider.supportsUrl(url),
			fetchByUrl: async (url: string) => {
				await rateLimiter.acquire();
				return provider.fetchByUrl(url);
			},
			fetchById: async (id: string) => {
				await rateLimiter.acquire();
				return provider.fetchById(id);
			},
			search: async (query: string) => {
				await rateLimiter.acquire();
				return provider.search(query);
			}
		};
	}

	/**
	 * Wrap provider with caching
	 */
	private wrapWithCache(provider: IMetadataProvider): IMetadataProvider {
		const cache = this.cacheService!;
		const providerId = provider.getProviderId();

		return {
			getProviderId: () => provider.getProviderId(),
			supportsUrl: (url: string) => provider.supportsUrl(url),
			fetchByUrl: async (url: string) => provider.fetchByUrl(url),
			search: async (query: string) => provider.search(query),
			fetchById: async (id: string) => {
				// Check cache first
				const cached = cache.get(providerId, id) as AudiobookMetadata | null;
				if (cached) {
					return cached;
				}

				// Fetch from API
				const result = await provider.fetchById(id);
				
				// Cache successful result
				if (result) {
					await cache.set(providerId, id, result);
				}

				return result;
			}
			// Note: fetchByUrl and search are not cached to avoid complexity
			// They will be routed through fetchById internally where caching applies
		};
	}

	/**
	 * Update settings (e.g., when user changes settings)
	 */
	updateSettings(settings: MediaPluginSettings): void {
		this.settings = settings;
		
		// Reset rate limiters if settings changed
		if (settings.rateLimitEnabled) {
			for (const limiter of this.rateLimiters.values()) {
				limiter.reset();
			}
		}
	}
}
