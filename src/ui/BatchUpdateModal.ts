import {App, Modal, Notice, Setting, TFile} from "obsidian";
import {BatchUpdateService, BatchUpdateResult} from "../services/BatchUpdateService";
import {MediaPluginSettings, CustomFrontmatterField} from "../settings";
import {getSortedCustomFields} from "../utils/TypeGuards";

/**
 * Modal for batch updating existing audiobook files with custom frontmatter fields
 */
export class BatchUpdateModal extends Modal {
	private batchService: BatchUpdateService;
	private settings: MediaPluginSettings;
	private files: TFile[] = [];
	private selectedFiles: Set<TFile> = new Set();
	private isProcessing: boolean = false;

	constructor(app: App, settings: MediaPluginSettings) {
		super(app);
		this.settings = settings;
		this.batchService = new BatchUpdateService(app, settings);
	}

	async onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: 'Batch update custom fields'});

		// Info text
		const infoDiv = contentEl.createDiv({cls: 'batch-update-info'});
		const sortedFields = getSortedCustomFields(this.settings.customFrontmatterFields);
		infoDiv.createEl('p', {
			text: `This will add the following ${sortedFields.length} custom field(s) to selected files:`
		});

		const fieldsList = infoDiv.createEl('ul');
		sortedFields.forEach((field: CustomFrontmatterField) => {
			if (field.key.trim()) {
				fieldsList.createEl('li', {
					text: `${field.key}: ${field.value} (${field.type})`
				});
			}
		});

		infoDiv.createEl('p', {
			text: 'Only fields that do not already exist in the file will be added.',
			cls: 'batch-update-note'
		});

		// Load files
		contentEl.createEl('p', {text: 'Loading media files...'});
		
		try {
			this.files = await this.batchService.getAllMediaFiles();
			
			if (this.files.length === 0) {
				contentEl.empty();
				contentEl.createEl('h2', {text: 'Batch update custom fields'});
				contentEl.createEl('p', {text: 'No media files found in vault.'});
				contentEl.createEl('p', {
					text: 'Files must have "subtype: audiobook" in their frontmatter to be detected.',
					cls: 'setting-item-description'
				});
				return;
			}

			// Rebuild UI
			contentEl.empty();
			this.buildUI();
		} catch (error) {
			contentEl.empty();
			contentEl.createEl('h2', {text: 'Error'});
			contentEl.createEl('p', {
				text: `Failed to load files: ${error instanceof Error ? error.message : String(error)}`
			});
		}
	}

	private buildUI() {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: 'Batch update custom fields'});

		// Summary
		const summaryDiv = contentEl.createDiv({cls: 'batch-update-summary'});
		summaryDiv.createEl('p', {
			text: `Found ${this.files.length} media file(s). Select files to update:`
		});

		// Select all/none buttons
		const buttonContainer = contentEl.createDiv({cls: 'batch-update-buttons'});
		
		new Setting(buttonContainer)
			.addButton(button => button
				.setButtonText('Select all')
				.onClick(() => {
					this.selectedFiles = new Set(this.files);
					this.buildUI(); // Refresh to show checkboxes
				}))
			.addButton(button => button
				.setButtonText('Deselect all')
				.onClick(() => {
					this.selectedFiles.clear();
					this.buildUI(); // Refresh to show checkboxes
				}));

		// File list with checkboxes
		const fileListContainer = contentEl.createDiv({cls: 'batch-update-file-list'});
		
		for (const file of this.files) {
			const fileItem = fileListContainer.createDiv({cls: 'batch-update-file-item'});
			
			const checkbox = fileItem.createEl('input', {
				type: 'checkbox'
			});
			checkbox.checked = this.selectedFiles.has(file);
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedFiles.add(file);
				} else {
					this.selectedFiles.delete(file);
				}
			});

			fileItem.createEl('span', {
				text: file.path,
				cls: 'batch-update-file-path'
			});
		}

		// Action buttons
		const actionContainer = contentEl.createDiv({cls: 'batch-update-actions'});
		
		new Setting(actionContainer)
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()))
			.addButton(button => button
				.setButtonText(`Update ${this.selectedFiles.size} File(s)`)
				.setCta()
				.setDisabled(this.selectedFiles.size === 0 || this.isProcessing)
				.onClick(() => void this.performUpdate()));
	}

	private async performUpdate() {
		if (this.isProcessing) return;
		this.isProcessing = true;

		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: 'Updating files...'});

		const progressDiv = contentEl.createDiv({cls: 'batch-update-progress'});
		const progressText = progressDiv.createEl('p', {text: 'Starting...'});
		const progressBar = progressDiv.createDiv({cls: 'batch-update-progress-bar'});
		const progressFill = progressBar.createDiv({cls: 'batch-update-progress-fill'});

		const selectedFilesArray = Array.from(this.selectedFiles);
		
		try {
			const results = await this.batchService.updateFiles(
				selectedFilesArray,
				(current, total, filename) => {
					const percentage = Math.round((current / total) * 100);
					progressText.textContent = `Processing ${current} of ${total}: ${filename}`;
					progressFill.style.width = `${percentage}%`;
				}
			);

			// Show results
			contentEl.empty();
			this.showResults(results);
		} catch (error) {
			contentEl.empty();
			contentEl.createEl('h2', {text: 'Error'});
			contentEl.createEl('p', {
				text: `Update failed: ${error instanceof Error ? error.message : String(error)}`
			});
			
			new Setting(contentEl)
				.addButton(button => button
					.setButtonText('Close')
					.onClick(() => this.close()));
		} finally {
			this.isProcessing = false;
		}
	}

	private showResults(results: BatchUpdateResult[]) {
		const {contentEl} = this;
		contentEl.empty();

		contentEl.createEl('h2', {text: 'Update complete'});

		const successCount = results.filter(r => r.success).length;
		const failureCount = results.filter(r => !r.success).length;
		const totalFieldsAdded = results.reduce((sum, r) => sum + r.fieldsAdded, 0);

		const summaryDiv = contentEl.createDiv({cls: 'batch-update-summary'});
		summaryDiv.createEl('p', {text: `✓ ${successCount} file(s) updated successfully`});
		if (failureCount > 0) {
			summaryDiv.createEl('p', {
				text: `✗ ${failureCount} file(s) failed`,
				cls: 'batch-update-error'
			});
		}
		summaryDiv.createEl('p', {text: `Added ${totalFieldsAdded} field(s) in total`});

		// Detailed results
		const resultsContainer = contentEl.createDiv({cls: 'batch-update-results'});
		
		for (const result of results) {
			const resultItem = resultsContainer.createDiv({
				cls: result.success ? 'batch-update-result-success' : 'batch-update-result-error'
			});

			const icon = result.success ? '✓' : '✗';
			const status = result.success 
				? `${icon} ${result.file.name} (${result.fieldsAdded} field(s) added)`
				: `${icon} ${result.file.name} - ${result.error}`;

			resultItem.createEl('span', {text: status});
		}

		// Close button
		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Close')
				.setCta()
				.onClick(() => {
					new Notice(`Updated ${successCount} file(s) with ${totalFieldsAdded} custom field(s)`);
					this.close();
				}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
