import {App, PluginSettingTab, Setting} from "obsidian";
import AudiobookMetadataPlugin from "./main";
import {BatchUpdateModal} from "./ui/BatchUpdateModal";

export type ApiProvider = "audible" | "googlebooks" | "openlibrary" | "itunes";
export type AudibleCountry = "de" | "uk" | "us";
export type CoverStorage = "local" | "url";
export type CustomFieldType = "string" | "number" | "boolean";
export type CustomFieldsPosition = "start" | "end";

/**
 * Interface for custom frontmatter fields
 */
export interface CustomFrontmatterField {
	key: string;
	value: string;
	type: CustomFieldType;
	order: number;
}

export interface AudiobookPluginSettings {
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
}

export const DEFAULT_SETTINGS: AudiobookPluginSettings = {
	defaultOutputFolder: 'Audiobooks',
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
	customFieldsPosition: 'end'
}

export class AudiobookSettingTab extends PluginSettingTab {
	plugin: AudiobookMetadataPlugin;

	constructor(app: App, plugin: AudiobookMetadataPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		;

		// Output Folder
		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Default folder for audiobook metadata files')
			.addText(text => text
				.setPlaceholder('Audiobooks')
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
				this.renderCustomFieldRow(tbody, field, index);
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
				.setDesc('Apply custom fields to existing audiobook files')
				.addButton(button => button
					.setButtonText('Apply to existing files')
					.onClick(() => {
						const modal = new BatchUpdateModal(this.app, this.plugin.settings);
						modal.open();
					}));
		}
	}

	private renderCustomFieldRow(tbody: HTMLTableSectionElement, field: CustomFrontmatterField, index: number): void {
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
				const fields = this.plugin.settings.customFrontmatterFields;
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
		if (index < this.plugin.settings.customFrontmatterFields.length - 1) {
			const downButton = actionsCell.createEl('button', {text: '↓', title: 'Move down'});
			downButton.addEventListener('click', () => void (async () => {
				const fields = this.plugin.settings.customFrontmatterFields;
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
			const fields = this.plugin.settings.customFrontmatterFields;
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
