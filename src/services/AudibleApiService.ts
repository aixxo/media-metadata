import {IMetadataProvider} from "./IMetadataProvider";
import {MediaMetadata, MediaSearchResult} from "../models/AudiobookMetadata";
import {requestUrl} from "obsidian";

/**
 * Audible API Response Interfaces
 */
interface AudibleSearchResponse {
	products?: AudibleSearchProduct[];
}

interface AudibleSearchProduct {
	asin: string;
	title?: string;
	subtitle?: string;
	authors?: AudiblePerson[];
	narrators?: AudiblePerson[];
	publisher_name?: string;
	release_date?: string;
	runtime_length_min?: number;
	product_images?: { [key: string]: string };
	series?: AudibleSeries[];
	rating?: { overall_distribution?: { display_average_rating?: number; num_ratings?: number } };
}

interface AudiblePerson {
	name: string;
}

interface AudibleSeries {
	name: string;
	position?: string;
}

interface AudibleGenre {
	type: string;
	name: string;
}

interface AudibleBookDetail {
	asin: string;
	title: string;
	subtitle?: string;
	authors?: AudiblePerson[];
	narrators?: AudiblePerson[];
	publisherName?: string;
	releaseDate?: string;
	language?: string;
	summary?: string;
	runtimeLengthMin?: number;
	seriesPrimary?: AudibleSeries;
	seriesSecondary?: AudibleSeries;
	genres?: AudibleGenre[];
	rating?: number;
	ratings?: unknown[];
	image?: string;
	isbn?: string;
}

/**
 * Audible API Provider
 * Uses Audnex API (https://api.audnex.us) and official Audible API
 * Based on audiobookshelf implementation
 */
export class AudibleApiService implements IMetadataProvider {
	private country: 'de' | 'uk' | 'us';
	private readonly responseTimeout = 10000;
	
	private readonly regionMap: Record<string, string> = {
		us: '.com',
		uk: '.co.uk',
		de: '.de'
	};

	constructor(country: 'de' | 'uk' | 'us') {
		this.country = country;
	}

	getProviderId(): string {
		return 'audible';
	}

	supportsUrl(url: string): boolean {
		return url.includes('audible.de') || 
		       url.includes('audible.co.uk') || 
		       url.includes('audible.com');
	}

	async fetchByUrl(url: string): Promise<MediaMetadata | null> {
		// Extract ASIN from URL
		// Format: https://www.audible.de/pd/{title}/B08XYZ123
		const asinMatch = url.match(/\/([A-Z0-9]{10})(?:\/|\?|$)/);
		if (!asinMatch || !asinMatch[1]) {
			console.error('[Audible] Could not extract ASIN from URL:', url);
			return null;
		}

		return this.fetchById(asinMatch[1]);
	}

	async fetchById(id: string): Promise<MediaMetadata | null> {
		return this.asinSearch(id, this.country);
	}

	async search(query: string): Promise<MediaSearchResult[]> {
		try {
			// First try ASIN search if query looks like ASIN
			if (this.isValidASIN(query.toUpperCase())) {
				const item = await this.asinSearch(query, this.country);
				if (item) {
					return [{
						metadata: item,
						relevanceScore: 1.0
					}];
				}
			}

			// Otherwise use Audible search API
			const queryParams = new URLSearchParams({
				num_results: '10',
				products_sort_by: 'Relevance',
				title: query,
				response_groups: 'contributors,product_attrs,series,media,rating'
			});

			const tld = this.regionMap[this.country] || '.com';
			const url = `https://api.audible${tld}/1.0/catalog/products?${queryParams.toString()}`;
			
			console.debug('[Audible] Search URL:', url);

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'Obsidian/1.0'
				}
			});

			const searchResponse = response.json as AudibleSearchResponse;
			if (!searchResponse?.products) {
				return [];
			}

			// Fetch full details for each result via Audnex.
			// If Audnex doesn't know the title yet (pre-release), fall back to
			// the catalog data returned directly by the search API.
			const results: MediaSearchResult[] = [];
			for (const product of searchResponse.products.slice(0, 10)) {
				const metadata = (await this.asinSearch(product.asin, this.country))
					?? this.mapCatalogProductToMetadata(product);
				if (metadata.title) {
					results.push({
						metadata,
						relevanceScore: undefined
					});
				}
			}

			return results;
		} catch (error) {
			console.error('[Audible] Search error:', error);
			return [];
		}
	}

	/**
	 * Map a catalog search product to MediaMetadata.
	 * Used as fallback when Audnex does not yet have the title (pre-release).
	 */
	private mapCatalogProductToMetadata(product: AudibleSearchProduct): MediaMetadata {
		const series: string[] = [];
		let seriesPosition: string | undefined;
		if (product.series && product.series.length > 0) {
			const primary = product.series[0];
			if (primary) {
				series.push(primary.name);
				if (primary.position) {
					seriesPosition = this.cleanSeriesSequence(primary.name, primary.position);
				}
			}
			const secondary = product.series[1];
			if (secondary) {
				series.push(secondary.name);
			}
		}

		const duration = product.runtime_length_min
			? this.formatDuration(Number(product.runtime_length_min))
			: undefined;

		const coverUrl = product.product_images
			? (product.product_images['500'] ?? product.product_images['200'] ?? Object.values(product.product_images)[0])
			: undefined;

		return {
			id: product.asin,
			provider: 'audible',
			title: product.title ?? '',
			subtitle: product.subtitle,
			author: product.authors ? product.authors.map((a: AudiblePerson) => a.name) : [],
			narrator: product.narrators ? product.narrators.map((n: AudiblePerson) => n.name) : undefined,
			publisher: product.publisher_name,
			publishedDate: product.release_date,
			duration,
			series: series.length > 0 ? series.join(', ') : undefined,
			seriesPosition,
			rating: product.rating?.overall_distribution?.display_average_rating,
			ratingCount: product.rating?.overall_distribution?.num_ratings,
			coverUrl,
			asin: product.asin,
			retrievedAt: new Date().toISOString(),
			url: this.buildAudibleUrl(product.asin, this.country)
		};
	}

	/**
	 * Search by ASIN using Audnex API
	 */
	private async asinSearch(asin: string, region: string): Promise<MediaMetadata | null> {
		try {
			if (!asin) return null;

			asin = encodeURIComponent(asin.toUpperCase());
			const url = `https://api.audnex.us/books/${asin}?region=${region}`;
			
			console.debug('[Audible] ASIN URL:', url);

			const response = await requestUrl({
				url,
				method: 'GET',
				headers: {
					'User-Agent': 'Obsidian/1.0'
				}
			});

			const bookDetail = response.json as AudibleBookDetail;
			if (!bookDetail?.asin) {
				return null;
			}

			return this.mapToMediaMetadata(bookDetail);
		} catch (error) {
			console.error('[Audible] ASIN search error:', error);
			return null;
		}
	}

	/**
	 * Map Audible API response to MediaMetadata
	 */
	private mapToMediaMetadata(data: AudibleBookDetail): MediaMetadata {
		const series: string[] = [];
		let seriesPosition: string | undefined;

		// Handle primary series
		if (data.seriesPrimary) {
			const position = this.cleanSeriesSequence(
				data.seriesPrimary.name,
				data.seriesPrimary.position || ''
			);
			series.push(data.seriesPrimary.name);
			seriesPosition = position;
		}

		// Handle secondary series
		if (data.seriesSecondary) {
			const position = this.cleanSeriesSequence(
				data.seriesSecondary.name,
				data.seriesSecondary.position || ''
			);
			if (!seriesPosition) seriesPosition = position;
			series.push(data.seriesSecondary.name);
		}

		// Extract genres (filter type=genre)
		const genres: string[] = [];
		if (data.genres && Array.isArray(data.genres)) {
			data.genres
				.filter((g: AudibleGenre) => g.type === 'genre')
				.forEach((g: AudibleGenre) => {
					if (g.name && !genres.includes(g.name)) {
						genres.push(g.name);
					}
				});
		}

		// Convert runtime from minutes to readable format
		const duration = data.runtimeLengthMin 
			? this.formatDuration(Number(data.runtimeLengthMin))
			: undefined;

		return {
			id: data.asin,
			provider: 'audible',
			title: data.title,
			subtitle: data.subtitle || undefined,
		author: data.authors ? data.authors.map((a: AudiblePerson) => a.name) : [],
			narrator: data.narrators ? data.narrators.map((n: AudiblePerson) => n.name) : undefined,
			publisher: data.publisherName || undefined,
			publishedDate: data.releaseDate || undefined,
			language: data.language ? this.capitalizeFirst(data.language) : undefined,
			description: data.summary || undefined,
			duration,
			genre: genres.length > 0 ? genres : undefined,
			series: series.length > 0 ? series.join(', ') : undefined,
			seriesPosition,
			rating: data.rating || undefined,
			ratingCount: data.ratings?.length || undefined,
			coverUrl: data.image || undefined,
			isbn: data.isbn || undefined,
			asin: data.asin,
			retrievedAt: new Date().toISOString(),
			url: this.buildAudibleUrl(data.asin, this.country)
		};
	}

	/**
	 * Clean series sequence (remove text, keep numbers)
	 * E.g., "Book 1" -> "1", "2, Dramatized" -> "2"
	 */
	private cleanSeriesSequence(seriesName: string, sequence: string): string {
		if (!sequence) return '';
		
		// Match any number with optional decimal (e.g, 1 or 1.5 or .5)
		const numberFound = sequence.match(/\.\d+|\d+(?:\.\d+)?/);
		const updatedSequence = numberFound ? numberFound[0] : sequence;
		
		if (sequence !== updatedSequence) {
			console.debug(`[Audible] Series "${seriesName}" sequence cleaned: "${sequence}" -> "${updatedSequence}"`);
		}
		
		return updatedSequence;
	}

	/**
	 * Format duration from minutes to hours and minutes
	 */
	private formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = Math.floor(minutes % 60);
		
		if (hours === 0) {
			return `${mins}m`;
		} else if (mins === 0) {
			return `${hours}h`;
		} else {
			return `${hours}h ${mins}m`;
		}
	}

	/**
	 * Capitalize first letter
	 */
	private capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Build Audible URL from ASIN
	 */
	private buildAudibleUrl(asin: string, region: string): string {
		const tld = this.regionMap[region] || '.com';
		return `https://www.audible${tld}/pd/${asin}`;
	}

	/**
	 * Validate ASIN format (10 alphanumeric characters)
	 */
	private isValidASIN(asin: string): boolean {
		return /^[A-Z0-9]{10}$/.test(asin);
	}
}
