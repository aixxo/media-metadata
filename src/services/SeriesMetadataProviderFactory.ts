import {ISeriesMetadataProvider} from "./ISeriesMetadataProvider";
import {TVSeriesMetadata} from "../models/SeriesMetadata";
import {SeriesPluginSettings} from "../settings";
import {RateLimiter} from "../utils/RateLimiter";
import {CacheService} from "./cache/CacheService";
import {TVMazeApiService} from "./TVMazeApiService";
import {TMDBApiService} from "./TMDBApiService";

/**
 * Factory for creating and wrapping series metadata providers
 * Handles provider selection, rate limiting, and caching
 */
export class SeriesMetadataProviderFactory {
	private rateLimiters: Map<string, RateLimiter> = new Map();

	constructor(
		private settings: SeriesPluginSettings,
		private cacheService: CacheService | null
	) {}

	/**
	 * Get the appropriate provider based on settings
	 * Wraps provider with rate limiting and caching
	 */
	getProvider(): ISeriesMetadataProvider {
		if (this.settings.seriesOfflineMode) {
			throw new Error('Offline mode is enabled for series. API access is disabled.');
		}

		const baseProvider = this.createBaseProvider();

		const rateLimitedProvider = this.settings.seriesRateLimitEnabled
			? this.wrapWithRateLimiter(baseProvider)
			: baseProvider;

		const cachedProvider = this.settings.seriesCacheEnabled && this.cacheService
			? this.wrapWithCache(rateLimitedProvider)
			: rateLimitedProvider;

		return cachedProvider;
	}

	/**
	 * Create base provider based on settings
	 */
	private createBaseProvider(): ISeriesMetadataProvider {
		switch (this.settings.seriesApiProvider) {
			case 'tvmaze':
				return new TVMazeApiService();
			case 'tmdb':
				if (!this.settings.tmdbApiKey) {
					throw new Error('TMDB API key is not configured. Please add it in the plugin settings under "TV series".');
				}
				return new TMDBApiService(this.settings.tmdbApiKey, this.settings.tmdbLanguage || 'en-US');
			default:
				console.warn(`[SeriesProviderFactory] Unknown provider: ${this.settings.seriesApiProvider as string}, falling back to TVMaze`);
				return new TVMazeApiService();
		}
	}

	/**
	 * Wrap provider with rate limiting
	 */
	private wrapWithRateLimiter(provider: ISeriesMetadataProvider): ISeriesMetadataProvider {
		const providerId = provider.getProviderId();

		if (!this.rateLimiters.has(providerId)) {
			this.rateLimiters.set(
				providerId,
				new RateLimiter(this.settings.seriesRateLimitRequestsPerMinute)
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
	private wrapWithCache(provider: ISeriesMetadataProvider): ISeriesMetadataProvider {
		const cache = this.cacheService!;
		const providerId = provider.getProviderId();

		return {
			getProviderId: () => provider.getProviderId(),
			supportsUrl: (url: string) => provider.supportsUrl(url),
			fetchByUrl: async (url: string) => provider.fetchByUrl(url),
			search: async (query: string) => provider.search(query),
			fetchById: async (id: string) => {
				const cacheKey = `series:${id}`;
				const cached = cache.get(providerId, cacheKey) as TVSeriesMetadata | null;
				if (cached) return cached;

				const result = await provider.fetchById(id);
				if (result) {
					await cache.set(providerId, cacheKey, result);
				}
				return result;
			}
		};
	}

	/**
	 * Update settings reference
	 */
	updateSettings(settings: SeriesPluginSettings): void {
		this.settings = settings;

		if (settings.seriesRateLimitEnabled) {
			for (const limiter of this.rateLimiters.values()) {
				limiter.reset();
			}
		}
	}
}
