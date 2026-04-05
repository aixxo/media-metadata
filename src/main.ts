import {Plugin, Notice} from 'obsidian';
import {DEFAULT_SETTINGS, DEFAULT_SERIES_SETTINGS, MediaPluginSettings, MediaSettingTab} from "./settings";
import {MediaCardRenderer} from "./ui/MediaCardRenderer";
import {MediaCommands} from "./commands/MediaCommands";
import {SeriesCardRenderer} from "./ui/SeriesCardRenderer";
import {SeriesCommands} from "./commands/SeriesCommands";
import {CacheService, CacheData} from "./services/cache/CacheService";
import {CacheCleanup} from "./services/cache/CacheCleanup";

export default class MediaMetadataPlugin extends Plugin {
	settings: MediaPluginSettings;
	private cardRenderer: MediaCardRenderer;
	private commands: MediaCommands;
	private seriesCardRenderer: SeriesCardRenderer;
	private seriesCommands: SeriesCommands;
	private cacheService: CacheService;
	private cacheCleanup: CacheCleanup;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.cacheService = new CacheService(
			this.settings.cacheDurationHours,
			async () => {
				const data = await this.loadData() as { cache?: CacheData } | null;
				return data?.cache ?? null;
			},
			async (cacheData) => {
				const existingData = (await this.loadData() as Record<string, unknown> | null) || {};
				existingData.cache = cacheData;
				await this.saveData(existingData);
			}
		);
		await this.cacheService.initialize();

		this.cacheCleanup = new CacheCleanup(this.cacheService);
		this.cacheCleanup.start((intervalId) => this.registerInterval(intervalId));

		this.cardRenderer = new MediaCardRenderer(this.app);
		this.commands = new MediaCommands(this.app, this.settings, this.cacheService);

		this.seriesCardRenderer = new SeriesCardRenderer(this.app);
		this.seriesCommands = new SeriesCommands(this.app, this.settings.series, this.cacheService);

		// Register markdown code block processor
		this.registerMarkdownCodeBlockProcessor('media', async (source, el, ctx) => {
			const data = this.cardRenderer.parseCodeBlock(source);
			await this.cardRenderer.render(el, data, ctx);
		});

		// Backward compatibility: also register old 'audiobook' tag
		this.registerMarkdownCodeBlockProcessor('audiobook', async (source, el, ctx) => {
			const data = this.cardRenderer.parseCodeBlock(source);
			await this.cardRenderer.render(el, data, ctx);
		});

		// Register series code block processor
		this.registerMarkdownCodeBlockProcessor('series', async (source, el, ctx) => {
			const data = this.seriesCardRenderer.parseCodeBlock(source);
			await this.seriesCardRenderer.render(el, data, ctx);
		});

		// Register commands
		this.addCommand({
			id: 'audiobook-add-from-url',
			name: 'Add audiobook from URL',
			callback: async () => {
				try {
					await this.commands.addFromUrl();
				} catch (error) {
					console.error('Error in addFromUrl:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to open media modal: ${errorMessage}`);
				}
			}
		});

		this.addCommand({
			id: 'audiobook-add-from-search',
			name: 'Search and add audiobook',
			callback: async () => {
				try {
					await this.commands.addFromSearch();
				} catch (error) {
					console.error('Error in addFromSearch:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to open media modal: ${errorMessage}`);
				}
			}
		});

		this.addCommand({
			id: 'audiobook-add-from-id',
			name: 'Add audiobook from identifier',
			callback: async () => {
				try {
					await this.commands.addFromId();
				} catch (error) {
					console.error('Error in addFromId:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to open media modal: ${errorMessage}`);
				}
			}
		});

		this.addCommand({
			id: 'audiobook-refresh-metadata',
			name: 'Refresh audiobook metadata',
			callback: async () => {
				try {
					await this.commands.refreshMetadata();
				} catch (error) {
					console.error('Error in refreshMetadata:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to refresh metadata: ${errorMessage}`);
				}
			}
		});

		this.addCommand({
			id: 'clear-cache',
			name: 'Clear metadata cache',
			callback: () => {
				try {
					void this.commands.clearCache();
				} catch (error) {
					console.error('Error in clearCache:', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to clear cache: ${errorMessage}`);
				}
			}
		});

		// Series commands
		this.addCommand({
			id: 'series-add-from-search',
			name: 'Search and add series',
			callback: async () => {
				try {
					await this.seriesCommands.addFromSearch();
				} catch (error) {
					console.error('Error in addFromSearch (series):', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to open series modal: ${errorMessage}`);
				}
			}
		});

		this.addCommand({
			id: 'series-add-from-id',
			name: 'Add series from identifier',
			callback: async () => {
				try {
					await this.seriesCommands.addFromId();
				} catch (error) {
					console.error('Error in addFromId (series):', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to open series modal: ${errorMessage}`);
				}
			}
		});

		this.addCommand({
			id: 'series-add-manually',
			name: 'Add series manually',
			callback: async () => {
				try {
					await this.seriesCommands.addManually();
				} catch (error) {
					console.error('Error in addManually (series):', error);
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					new Notice(`Failed to open series modal: ${errorMessage}`);
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new MediaSettingTab(this.app, this));
	}

	onunload() {
		// Cleanup handled by registerInterval
	}

	async loadSettings() {
		const saved = await this.loadData() as Partial<MediaPluginSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		// Deep-merge series settings so new keys always have defaults
		this.settings.series = Object.assign({}, DEFAULT_SERIES_SETTINGS, saved?.series);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update commands with new settings
		if (this.commands) {
			this.commands.updateSettings(this.settings);
		}
	}
}
