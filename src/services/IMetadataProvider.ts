import {MediaMetadata, MediaSearchResult} from "../models/AudiobookMetadata";

/**
 * Base interface for metadata providers
 * Allows modular integration of different APIs (Audible, Google Books, etc.)
 */
export interface IMetadataProvider {
	/**
	 * Fetch metadata from a URL
	 * @param url Full URL to the audiobook
	 * @returns Metadata or null if not found
	 */
	fetchByUrl(url: string): Promise<MediaMetadata | null>;
	
	/**
	 * Fetch metadata by provider-specific ID (ASIN, ISBN, etc.)
	 * @param id Provider-specific identifier
	 * @returns Metadata or null if not found
	 */
	fetchById(id: string): Promise<MediaMetadata | null>;
	
	/**
	 * Search for audiobooks by query string
	 * @param query Search terms (title, author, etc.)
	 * @returns Array of search results
	 */
	search(query: string): Promise<MediaSearchResult[]>;
	
	/**
	 * Check if this provider supports a given URL
	 * @param url URL to check
	 * @returns true if the provider can handle this URL
	 */
	supportsUrl(url: string): boolean;
	
	/**
	 * Get the provider identifier for caching
	 * @returns Provider ID string (e.g., "audible", "googlebooks")
	 */
	getProviderId(): string;
}
