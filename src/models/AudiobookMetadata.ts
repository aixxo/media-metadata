/**
 * Central interface for media metadata
 * Supports data from multiple providers (Audible, Google Books, Open Library, iTunes)
 */
export interface AudiobookMetadata {
	// Core identifiers
	id: string;                    // Provider-specific ID (ASIN, ISBN, etc.)
	provider: string;               // Source provider (audible, googlebooks, etc.)
	
	// Basic information
	title: string;
	subtitle?: string;
	author: string[];               // Can have multiple authors
	narrator?: string[];            // Audiobook-specific
	
	// Publication details
	publisher?: string;
	publishedDate?: string;         // ISO format YYYY-MM-DD
	language?: string;              // ISO language code
	
	// Content information
	description?: string;
	duration?: string;              // Runtime (e.g., "5h 23min")
	
	// Classification
	genre?: string[];               // Categories/genres
	series?: string;                // Series name
	seriesPosition?: string;        // Position in series
	
	// Ratings & reviews
	rating?: number;                // Average rating (0-5)
	ratingCount?: number;           // Number of ratings
	
	// Cover image
	coverUrl?: string;              // URL to cover image
	coverLocalPath?: string;        // Local path if downloaded
	
	// Additional identifiers
	isbn?: string;
	isbn13?: string;
	asin?: string;
	
	// Metadata
	retrievedAt?: string;           // ISO timestamp when data was fetched
	url?: string;                   // URL to the audiobook on the provider's site
}

/**
 * Result type for search operations
 */
export interface AudiobookSearchResult {
	metadata: AudiobookMetadata;
	relevanceScore?: number;        // Optional relevance ranking
}
