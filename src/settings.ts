import {App, PluginSettingTab, Setting} from "obsidian";
import MediaMetadataPlugin from "./main";
import {BatchUpdateModal} from "./ui/BatchUpdateModal";

export type ApiProvider = "audible" | "googlebooks" | "openlibrary" | "itunes";
export type AudibleCountry = "de" | "uk" | "us";
export type CoverStorage = "local" | "url";
export type CustomFieldType = "string" | "number" | "boolean";
export type CustomFieldsPosition = "start" | "end";

// Series-specific types
export type SeriesApiProvider = "tvmaze" | "tmdb";
export type SeriesEpisodeDetailLevel = "none" | "seasons-only" | "full";
export type SeriesFileMode = "single" | "per-season";

/**
 * Interface for custom frontmatter fields
 */
export interface CustomFrontmatterField {
	key: string;
	value: string;
	type: CustomFieldType;
	order: number;
}

export interface SeriesPluginSettings {
	seriesOutputFolder: string;
	seriesApiProvider: SeriesApiProvider;
	tmdbApiKey: string;
	tmdbLanguage: string;
	seriesEpisodeDetailLevel: SeriesEpisodeDetailLevel;
	seriesFileMode: SeriesFileMode;
	seriesCoverStorage: CoverStorage;
	seriesOfflineMode: boolean;
	seriesRateLimitEnabled: boolean;
	seriesRateLimitRequestsPerMinute: number;
	seriesCacheEnabled: boolean;
	seriesCacheDurationHours: number;
	seriesCustomFrontmatterFields: CustomFrontmatterField[];
	seriesCustomFieldsPosition: CustomFieldsPosition;
}

export interface MediaPluginSettings {
	defaultOutputFolder: string;
	apiProvider: ApiProvider;
	audibleCountry: AudibleCountry;
	offlineMode: boolean;
	coverStorage: CoverStorage;
	rateLimitEnabled: boolean;
	rateLimitRequestsPerMinute: number;
	cacheEnabled: boolean;
	cacheDurationHours: number;
	templateFormat: string;
	customFrontmatterFields: CustomFrontmatterField[];
	customFieldsPosition: CustomFieldsPosition;
	series: SeriesPluginSettings;
}

export const DEFAULT_SERIES_SETTINGS: SeriesPluginSettings = {
	seriesOutputFolder: 'Series',
	seriesApiProvider: 'tvmaze',
	tmdbApiKey: '',
	tmdbLanguage: 'de-DE',
	seriesEpisodeDetailLevel: 'full',
	seriesFileMode: 'single',
	seriesCoverStorage: 'local',
	seriesOfflineMode: false,
	seriesRateLimitEnabled: true,
	seriesRateLimitRequestsPerMinute: 5,
	seriesCacheEnabled: true,
	seriesCacheDurationHours: 24,
	seriesCustomFrontmatterFields: [],
	seriesCustomFieldsPosition: 'end',
};

export const DEFAULT_SETTINGS: MediaPluginSettings = {
	defaultOutputFolder: 'Media',
	apiProvider: 'audible',
	audibleCountry: 'de',
	offlineMode: false,
	coverStorage: 'local',
	rateLimitEnabled: true,
	rateLimitRequestsPerMinute: 5,
	cacheEnabled: true,
	cacheDurationHours: 24,
	templateFormat: '',
	customFrontmatterFields: [],
	customFieldsPosition: 'end',
	series: DEFAULT_SERIES_SETTINGS,
}

export class MediaSettingTab extends PluginSettingTab {
	plugin: MediaMetadataPlugin;
	activeTab: 'audiobooks' | 'series' = 'audiobooks';

	constructor(app: App, plugin: MediaMetadataPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// Tab bar
		const tabBar = containerEl.createDiv({cls: 'settings-tab-bar'});

		const audiobooksBtn = tabBar.createEl('button', {
			text: 'Audiobooks',
			cls: 'settings-tab-btn' + (this.activeTab === 'audiobooks' ? ' active' : '')
		});
		audiobooksBtn.addEventListener('click', () => {
			this.activeTab = 'audiobooks';
			this.display();
		});

		const seriesBtn = tabBar.createEl('button', {
			text: 'Series',
			cls: 'settings-tab-btn' + (this.activeTab === 'series' ? ' active' : '')
		});
		seriesBtn.addEventListener('click', () => {
			this.activeTab = 'series';
			this.display();
		});

		if (this.activeTab === 'audiobooks') {
			this.renderAudiobookSettings(containerEl);
		} else {
			this.renderSeriesSettings(containerEl);
		}
	}

	private renderAudiobookSettings(containerEl: HTMLElement): void {
		// Output Folder
		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Default folder for media metadata files')
			.addText(text => text
				.setPlaceholder('Media')
				.setValue(this.plugin.settings.defaultOutputFolder)
				.onChange(async (value) => {
					this.plugin.settings.defaultOutputFolder = value;
					await this.plugin.saveSettings();
				}));

		// Offline Mode
		new Setting(containerEl)
			.setName('Offline mode')
			.setDesc('Disable all API calls. All metadata must be entered manually.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.offlineMode)
				.onChange(async (value) => {
					this.plugin.settings.offlineMode = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide API-related settings
				}));

		if (!this.plugin.settings.offlineMode) {
			new Setting(containerEl).setName("API").setHeading();

			// API Provider
			new Setting(containerEl)
				.setName('API provider')
				.setDesc('Select which service to use for fetching metadata')
				.addDropdown(dropdown => dropdown
					.addOption('audible', 'Audible')
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.addOption('googlebooks', 'Google Books')
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.addOption('openlibrary', 'Open Library')
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.addOption('itunes', 'iTunes')
					.setValue(this.plugin.settings.apiProvider)
					.onChange(async (value: ApiProvider) => {
						this.plugin.settings.apiProvider = value;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide country setting
					}));

			// Audible Country (only shown when Audible is selected)
			if (this.plugin.settings.apiProvider === 'audible') {
				new Setting(containerEl)
					.setName('Audible country')
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setDesc('Select Audible marketplace')
					.addDropdown(dropdown => dropdown
						.addOption('de', 'Germany (audible.de)')
						// eslint-disable-next-line obsidianmd/ui/sentence-case
						.addOption('uk', 'United Kingdom (audible.co.uk)')
						// eslint-disable-next-line obsidianmd/ui/sentence-case
						.addOption('us', 'United States (audible.com)')
						.setValue(this.plugin.settings.audibleCountry)
						.onChange(async (value: AudibleCountry) => {
							this.plugin.settings.audibleCountry = value;
							await this.plugin.saveSettings();
						}));
			}

			// Rate Limiting
			new Setting(containerEl).setName("Rate limiting").setHeading();

			new Setting(containerEl)
				.setName('Enable rate limiting')
				.setDesc('Limit API requests to avoid being blocked')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.rateLimitEnabled)
					.onChange(async (value) => {
						this.plugin.settings.rateLimitEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (this.plugin.settings.rateLimitEnabled) {
				new Setting(containerEl)
					.setName('Requests per minute')
					.setDesc('Maximum number of API requests per minute (1-20)')
					.addSlider(slider => slider
						.setLimits(1, 20, 1)
						.setValue(this.plugin.settings.rateLimitRequestsPerMinute)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.rateLimitRequestsPerMinute = value;
							await this.plugin.saveSettings();
						}));
			}

			// Caching
			new Setting(containerEl).setName("Caching").setHeading();

			new Setting(containerEl)
				.setName('Enable caching')
				.setDesc('Cache metadata to reduce API calls and improve performance')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.cacheEnabled)
					.onChange(async (value) => {
						this.plugin.settings.cacheEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (this.plugin.settings.cacheEnabled) {
				new Setting(containerEl)
					.setName('Cache duration (hours)')
					.setDesc('How long to keep cached metadata (1-168 hours = 1 week)')
					.addSlider(slider => slider
						.setLimits(1, 168, 1)
						.setValue(this.plugin.settings.cacheDurationHours)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.cacheDurationHours = value;
							await this.plugin.saveSettings();
						}));
			}
		}

		// Cover Storage
		new Setting(containerEl).setName("Cover images").setHeading();

		new Setting(containerEl)
			.setName('Cover storage')
			.setDesc('Choose how to store cover images')
			.addDropdown(dropdown => dropdown
				.addOption('local', 'Local (download and store in plugin folder)')
				.addOption('url', 'URL (reference external image URL)')
				.setValue(this.plugin.settings.coverStorage)
				.onChange(async (value: CoverStorage) => {
					this.plugin.settings.coverStorage = value;
					await this.plugin.saveSettings();
				}));

		// Custom Frontmatter Fields
		new Setting(containerEl).setName("Custom frontmatter fields").setHeading();

		new Setting(containerEl)
			.setName('Field position')
			.setDesc('Where to place custom fields in the frontmatter')
			.addDropdown(dropdown => dropdown
				.addOption('start', 'At the start')
				.addOption('end', 'At the end')
				.setValue(this.plugin.settings.customFieldsPosition)
				.onChange(async (value: CustomFieldsPosition) => {
					this.plugin.settings.customFieldsPosition = value;
					await this.plugin.saveSettings();
				}));

		// Custom fields table
		const tableContainer = containerEl.createDiv({cls: 'custom-fields-table-container'});
		
		const table = tableContainer.createEl('table', {cls: 'custom-fields-table'});
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', {text: 'Key'});
		headerRow.createEl('th', {text: 'Value'});
		headerRow.createEl('th', {text: 'Type'});
		headerRow.createEl('th', {text: 'Actions'});

		const tbody = table.createEl('tbody');

		// Render existing fields
		this.plugin.settings.customFrontmatterFields
			.sort((a, b) => a.order - b.order)
			.forEach((field, index) => {
				this.renderCustomFieldRow(tbody, this.plugin.settings.customFrontmatterFields, field, index);
			});

		// Add field button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add custom field')
				.setCta()
				.onClick(async () => {
					const maxOrder = this.plugin.settings.customFrontmatterFields.length > 0
						? Math.max(...this.plugin.settings.customFrontmatterFields.map(f => f.order))
						: -1;
					
					this.plugin.settings.customFrontmatterFields.push({
						key: '',
						value: '',
						type: 'string',
						order: maxOrder + 1
					});
					await this.plugin.saveSettings();
					this.display(); // Refresh to show new field
				}));

		// Apply to existing files button
		if (this.plugin.settings.customFrontmatterFields.length > 0) {
			new Setting(containerEl)
				.setName('Batch update')
				.setDesc('Apply custom fields to existing media files')
				.addButton(button => button
					.setButtonText('Apply to existing files')
					.onClick(() => {
						const modal = new BatchUpdateModal(this.app, this.plugin.settings);
						modal.open();
					}));
		}
	}

	private renderSeriesSettings(containerEl: HTMLElement): void {
		const s = this.plugin.settings.series;

		new Setting(containerEl)
			.setName('Output folder')
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc('Default folder for TV series metadata files')
			.addText(text => text
				.setPlaceholder('Series')
				.setValue(s.seriesOutputFolder)
				.onChange(async (value) => {
					s.seriesOutputFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Offline mode')
			.setDesc('Disable all API calls for series. Metadata must be entered manually.')
			.addToggle(toggle => toggle
				.setValue(s.seriesOfflineMode)
				.onChange(async (value) => {
					s.seriesOfflineMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (!s.seriesOfflineMode) {
			new Setting(containerEl).setName('Series API').setHeading();

			new Setting(containerEl)
				.setName('API provider')
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setDesc('Service used for fetching TV series metadata')
				.addDropdown(dropdown => dropdown
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.addOption('tvmaze', 'TVMaze (free, no key required)')
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.addOption('tmdb', 'TMDB – The Movie Database (API key required)')
					.setValue(s.seriesApiProvider)
					.onChange(async (value: SeriesApiProvider) => {
						s.seriesApiProvider = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (s.seriesApiProvider === 'tmdb') {
				new Setting(containerEl)
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setName('TMDB API key')
					.setDesc('Your API key from themoviedb.org')
					.addText(text => text
						// eslint-disable-next-line obsidianmd/ui/sentence-case
						.setPlaceholder('Enter TMDB API key')
						.setValue(s.tmdbApiKey)
						.onChange(async (value) => {
							s.tmdbApiKey = value;
							await this.plugin.saveSettings();
						}));

				new Setting(containerEl)
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setName('TMDB language')
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setDesc('Language for TMDB responses in BCP 47 format (e.g. de-DE, en-US, fr-FR). Falls back to English if translation is unavailable.')
					.addText(text => text
						// eslint-disable-next-line obsidianmd/ui/sentence-case
						.setPlaceholder('de-DE')
						.setValue(s.tmdbLanguage)
						.onChange(async (value) => {
							s.tmdbLanguage = value.trim() || 'de-DE';
							await this.plugin.saveSettings();
						}));
			}

			new Setting(containerEl).setName('Series rate limiting').setHeading();

			new Setting(containerEl)
				.setName('Enable rate limiting')
				.setDesc('Limit API requests for series lookups')
				.addToggle(toggle => toggle
					.setValue(s.seriesRateLimitEnabled)
					.onChange(async (value) => {
						s.seriesRateLimitEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (s.seriesRateLimitEnabled) {
				new Setting(containerEl)
					.setName('Requests per minute')
					.setDesc('Maximum number of API requests per minute (1-20)')
					.addSlider(slider => slider
						.setLimits(1, 20, 1)
						.setValue(s.seriesRateLimitRequestsPerMinute)
						.setDynamicTooltip()
						.onChange(async (value) => {
							s.seriesRateLimitRequestsPerMinute = value;
							await this.plugin.saveSettings();
						}));
			}

			new Setting(containerEl).setName('Series caching').setHeading();

			new Setting(containerEl)
				.setName('Enable caching')
				.setDesc('Cache series metadata to reduce API calls')
				.addToggle(toggle => toggle
					.setValue(s.seriesCacheEnabled)
					.onChange(async (value) => {
						s.seriesCacheEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}));

			if (s.seriesCacheEnabled) {
				new Setting(containerEl)
					.setName('Cache duration (hours)')
					.setDesc('How long to keep cached series metadata (1-168 hours)')
					.addSlider(slider => slider
						.setLimits(1, 168, 1)
						.setValue(s.seriesCacheDurationHours)
						.setDynamicTooltip()
						.onChange(async (value) => {
							s.seriesCacheDurationHours = value;
							await this.plugin.saveSettings();
						}));
			}
		}

		new Setting(containerEl).setName('Series output').setHeading();

		new Setting(containerEl)
			.setName('Cover storage')
			.setDesc('How to store series cover images')
			.addDropdown(dropdown => dropdown
				.addOption('local', 'Local (download and store in vault)')
				.addOption('url', 'URL (reference external image URL)')
				.setValue(s.seriesCoverStorage)
				.onChange(async (value: CoverStorage) => {
					s.seriesCoverStorage = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('File mode')
			.setDesc('How many files to create per series')
			.addDropdown(dropdown => dropdown
				.addOption('single', 'Single file (all seasons in one file)')

				.addOption('per-season', 'Per season (main file + one file per season)')
				.setValue(s.seriesFileMode)
				.onChange(async (value: SeriesFileMode) => {
					s.seriesFileMode = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Episode detail level')
			.setDesc('How much episode information to include in the output')
			.addDropdown(dropdown => dropdown
				.addOption('full', 'Full (episode list per season)')

				.addOption('seasons-only', 'Seasons only (no episode list)')
				.addOption('none', 'None (no season/episode section)')
				.setValue(s.seriesEpisodeDetailLevel)
				.onChange(async (value: SeriesEpisodeDetailLevel) => {
					s.seriesEpisodeDetailLevel = value;
					await this.plugin.saveSettings();
				}));

		// Series custom frontmatter fields
		new Setting(containerEl).setName('Series custom frontmatter fields').setHeading();

		new Setting(containerEl)
			.setName('Field position')
			.setDesc('Where to place custom fields in the series frontmatter')
			.addDropdown(dropdown => dropdown
				.addOption('start', 'At the start')
				.addOption('end', 'At the end')
				.setValue(s.seriesCustomFieldsPosition)
				.onChange(async (value: CustomFieldsPosition) => {
					s.seriesCustomFieldsPosition = value;
					await this.plugin.saveSettings();
				}));

		const seriesTableContainer = containerEl.createDiv({cls: 'custom-fields-table-container'});
		const seriesTable = seriesTableContainer.createEl('table', {cls: 'custom-fields-table'});
		const seriesThead = seriesTable.createEl('thead');
		const seriesHeaderRow = seriesThead.createEl('tr');
		seriesHeaderRow.createEl('th', {text: 'Key'});
		seriesHeaderRow.createEl('th', {text: 'Value'});
		seriesHeaderRow.createEl('th', {text: 'Type'});
		seriesHeaderRow.createEl('th', {text: 'Actions'});

		const seriesTbody = seriesTable.createEl('tbody');

		s.seriesCustomFrontmatterFields
			.sort((a, b) => a.order - b.order)
			.forEach((field, index) => {
				this.renderCustomFieldRow(seriesTbody, s.seriesCustomFrontmatterFields, field, index);
			});

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add custom field')
				.setCta()
				.onClick(async () => {
					const maxOrder = s.seriesCustomFrontmatterFields.length > 0
						? Math.max(...s.seriesCustomFrontmatterFields.map(f => f.order))
						: -1;
					s.seriesCustomFrontmatterFields.push({
						key: '',
						value: '',
						type: 'string',
						order: maxOrder + 1
					});
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private renderCustomFieldRow(tbody: HTMLTableSectionElement, fields: CustomFrontmatterField[], field: CustomFrontmatterField, index: number): void {
		const row = tbody.createEl('tr');

		// Key column
		const keyCell = row.createEl('td');
		const keyInput = keyCell.createEl('input', {
			type: 'text',
			value: field.key,
			placeholder: 'field-name'
		});
		keyInput.addEventListener('change', () => void (async () => {
			field.key = keyInput.value;
			await this.plugin.saveSettings();
		})());

		// Value column
		const valueCell = row.createEl('td');
		const valueInput = valueCell.createEl('input', {
			type: 'text',
			value: field.value,
			placeholder: 'default value'
		});
		valueInput.addEventListener('change', () => void (async () => {
			field.value = valueInput.value;
			await this.plugin.saveSettings();
		})());

		// Type column
		const typeCell = row.createEl('td');
		const typeSelect = typeCell.createEl('select');
		['string', 'number', 'boolean'].forEach(type => {
			const option = typeSelect.createEl('option', {
				value: type,
				text: type.charAt(0).toUpperCase() + type.slice(1)
			});
			if (field.type === type) {
				option.selected = true;
			}
		});
		typeSelect.addEventListener('change', () => void (async () => {
			field.type = typeSelect.value as CustomFieldType;
			await this.plugin.saveSettings();
		})());

		// Actions column
		const actionsCell = row.createEl('td', {cls: 'custom-fields-actions'});
		
		// Move up button
		if (index > 0) {
			const upButton = actionsCell.createEl('button', {text: '↑', title: 'Move up'});
			upButton.addEventListener('click', () => void (async () => {
				const prevField = fields.find(f => f.order === field.order - 1);
				if (prevField) {
					const tempOrder = field.order;
					field.order = prevField.order;
					prevField.order = tempOrder;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show reordered fields
				}
			})());
		}

		// Move down button
			if (index < fields.length - 1) {
				const downButton = actionsCell.createEl('button', {text: '↓', title: 'Move down'});
				downButton.addEventListener('click', () => void (async () => {
				const nextField = fields.find(f => f.order === field.order + 1);
				if (nextField) {
					const tempOrder = field.order;
					field.order = nextField.order;
					nextField.order = tempOrder;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show reordered fields
				}
			})());
		}

		// Delete button
		const deleteButton = actionsCell.createEl('button', {text: '✕', title: 'Delete', cls: 'custom-fields-delete'});
		deleteButton.addEventListener('click', () => void (async () => {
			const fieldIndex = fields.indexOf(field);
			if (fieldIndex > -1) {
				fields.splice(fieldIndex, 1);
				// Reorder remaining fields
				fields.forEach((f, i) => f.order = i);
				await this.plugin.saveSettings();
				this.display(); // Refresh to remove deleted field
			}
		})());
	}
}
