import {App, Notice} from "obsidian";
import {AudiobookPluginSettings} from "../settings";
import {MetadataProviderFactory} from "../services/MetadataProviderFactory";
import {FileCreator} from "../services/FileCreator";
import {AudiobookInputModal} from "../ui/AudiobookInputModal";
import {CacheService} from "../services/cache/CacheService";

/**
 * Handler for audiobook-related commands
 */
export class AudiobookCommands {
	private providerFactory: MetadataProviderFactory;
	private fileCreator: FileCreator;

	constructor(
		private app: App,
		private settings: AudiobookPluginSettings,
		private cacheService: CacheService
	) {
		this.providerFactory = new MetadataProviderFactory(settings, cacheService);
		this.fileCreator = new FileCreator(app, settings);
	}

	/**
	 * Command: Add audiobook from URL
	 */
	async addFromUrl() {
		// Open modal with URL tab
		const provider = this.providerFactory.getProvider();
		
		const modal = new AudiobookInputModal(
			this.app,
			provider,
			this.settings.offlineMode,
			(metadata) => {
				if (metadata) {
					void this.fileCreator.createAudiobookFile(metadata);
				}
			},
			'url'
		);
		
		modal.open();
	}

	/**
	 * Command: Add audiobook from search
	 */
	async addFromSearch() {
		if (this.settings.offlineMode) {
			new Notice('Search is not available in offline mode');
			return;
		}

		const provider = this.providerFactory.getProvider();
		
		const modal = new AudiobookInputModal(
			this.app,
			provider,
			this.settings.offlineMode,
			(metadata) => {
				if (metadata) {
					void this.fileCreator.createAudiobookFile(metadata);
				}
			},
			'search'
		);
		
		modal.open();
	}

	/**
	 * Command: Add audiobook from ID (ASIN/ISBN)
	 */
	async addFromId() {
		if (this.settings.offlineMode) {
			new Notice('ID lookup is not available in offline mode');
			return;
		}

		const provider = this.providerFactory.getProvider();
		
		const modal = new AudiobookInputModal(
			this.app,
			provider,
			this.settings.offlineMode,
			(metadata) => {
				if (metadata) {
					void this.fileCreator.createAudiobookFile(metadata);
				}
			},
			'id'
		);
		
		modal.open();
	}

	/**
	 * Command: Refresh metadata for current file
	 */
	async refreshMetadata() {
		if (this.settings.offlineMode) {
			new Notice('Refresh is not available in offline mode');
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active file');
			return;
		}

		// Check if file is in audiobooks folder
		if (!activeFile.path.startsWith(this.settings.defaultOutputFolder)) {
			new Notice('Current file is not in the audiobooks folder');
			return;
		}

		try {
			// Read frontmatter to get source URL or ID
			const content = await this.app.vault.read(activeFile);
			const sourceUrl = this.extractFrontmatterField(content, 'source_url');
			const asin = this.extractFrontmatterField(content, 'asin');
			const isbn = this.extractFrontmatterField(content, 'isbn');

			const provider = this.providerFactory.getProvider();
			let metadata = null;

			if (sourceUrl) {
				metadata = await provider.fetchByUrl(sourceUrl);
			} else if (asin) {
				metadata = await provider.fetchById(asin);
			} else if (isbn) {
				metadata = await provider.fetchById(isbn);
			}

			if (metadata) {
				await this.fileCreator.updateAudiobookFile(activeFile, metadata);
			} else {
				new Notice('Could not refresh metadata - no source information found');
			}
		} catch (error) {
			console.error('Error refreshing metadata:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error refreshing metadata: ${errorMessage}`);
		}
	}

	/**
	 * Command: Clear cache
	 */
	async clearCache() {
		try {
			const count = await this.cacheService.cleanup();
			new Notice(`Cleared ${count} cached item(s)`);
		} catch (error) {
			console.error('Error clearing cache:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error clearing cache: ${errorMessage}`);
		}
	}

	/**
	 * Extract field from YAML frontmatter
	 */
	private extractFrontmatterField(content: string, field: string): string | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch || !frontmatterMatch[1]) return null;

		const frontmatter = frontmatterMatch[1];
		const fieldMatch = frontmatter.match(new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm'));
		
		return fieldMatch && fieldMatch[1] ? fieldMatch[1].trim() : null;
	}

	/**
	 * Update settings and refresh dependencies
	 */
	updateSettings(settings: AudiobookPluginSettings) {
		this.settings = settings;
		this.providerFactory.updateSettings(settings);
		this.fileCreator.updateSettings(settings);
	}
}
