import {IMetadataProvider} from "./IMetadataProvider";
import {MediaMetadata, MediaSearchResult} from "../models/AudiobookMetadata";

/**
 * Open Library API Provider (Placeholder)
 * Uses Open Library API (https://openlibrary.org/developers/api)
 * TODO: Implement full functionality
 */
export class OpenLibraryApiService implements IMetadataProvider {
	private readonly apiBaseUrl = 'https://openlibrary.org/api';

	getProviderId(): string {
		return 'openlibrary';
	}

	supportsUrl(url: string): boolean {
		return url.includes('openlibrary.org');
	}

	async fetchByUrl(url: string): Promise<MediaMetadata | null> {
		// TODO: Extract work/book ID and call fetchById
		throw new Error('Open Library API is not yet implemented. Please use Google Books or switch to offline mode.');
	}

	async fetchById(id: string): Promise<MediaMetadata | null> {
		// TODO: Implement Open Library API call
		throw new Error('Open Library API is not yet implemented. Please use Google Books or switch to offline mode.');
	}

	async search(query: string): Promise<MediaSearchResult[]> {
		// TODO: Implement Open Library search
		throw new Error('Open Library API is not yet implemented. Please use Google Books or switch to offline mode.');
	}
}
