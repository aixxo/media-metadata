import {IMetadataProvider} from "./IMetadataProvider";
import {MediaMetadata, MediaSearchResult} from "../models/AudiobookMetadata";

/**
 * iTunes API Provider (Placeholder)
 * Uses iTunes Search API (https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI)
 * TODO: Implement full functionality
 */
export class ITunesApiService implements IMetadataProvider {
	private readonly apiBaseUrl = 'https://itunes.apple.com/search';

	getProviderId(): string {
		return 'itunes';
	}

	supportsUrl(url: string): boolean {
		return url.includes('itunes.apple.com') || url.includes('books.apple.com');
	}

	async fetchByUrl(url: string): Promise<MediaMetadata | null> {
		// TODO: Extract iTunes ID and call fetchById
		throw new Error('iTunes/Apple Books API is not yet implemented. Please use Google Books or switch to offline mode.');
	}

	async fetchById(id: string): Promise<MediaMetadata | null> {
		// TODO: Implement iTunes lookup API call
		throw new Error('iTunes/Apple Books API is not yet implemented. Please use Google Books or switch to offline mode.');
	}

	async search(query: string): Promise<MediaSearchResult[]> {
		// TODO: Implement iTunes search with media=audiobook filter
		throw new Error('iTunes/Apple Books API is not yet implemented. Please use Google Books or switch to offline mode.');
	}
}
