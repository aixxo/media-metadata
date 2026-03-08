import {App, Notice, TFile} from "obsidian";
import {AudiobookMetadata} from "../models/AudiobookMetadata";
import {MarkdownGenerator} from "./MarkdownGenerator";
import {ImageDownloadService} from "./ImageDownloadService";
import {AudiobookPluginSettings} from "../settings";

/**
 * Service for creating audiobook markdown files in the vault
 */
export class FileCreator {
	private markdownGenerator: MarkdownGenerator;
	private imageDownloadService: ImageDownloadService;

	constructor(
		private app: App,
		private settings: AudiobookPluginSettings
	) {
		this.markdownGenerator = new MarkdownGenerator(settings);
		this.imageDownloadService = new ImageDownloadService(app, settings);
	}

	/**
	 * Create a new audiobook markdown file with metadata
	 */
	async createAudiobookFile(metadata: AudiobookMetadata): Promise<TFile | null> {
		try {
			// Generate filename
			const filename = this.markdownGenerator.generateFilename(metadata);

			// Ensure target folder exists
			await this.ensureFolderExists(this.settings.defaultOutputFolder);

			// Full path
			const filepath = `${this.settings.defaultOutputFolder}/${filename}`;

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(filepath);
			if (existingFile instanceof TFile) {
				new Notice(`File "${filename}" already exists. Opening instead.`);
				await this.app.workspace.getLeaf().openFile(existingFile);
				return existingFile;
			}

			// Download cover if enabled
			if (this.settings.coverStorage === 'local' && metadata.coverUrl) {
				const localPath = await this.imageDownloadService.downloadCover(
					metadata.coverUrl,
					metadata.title,
					metadata.author?.[0]
				);
				if (localPath) {
					metadata.coverLocalPath = localPath;
				}
			}

			// Generate markdown content
			const content = this.markdownGenerator.generateMarkdown(metadata, true);

			// Create file
			const file = await this.app.vault.create(filepath, content);

			new Notice(`Created audiobook file: ${filename}`);

			// Open the file
			await this.app.workspace.getLeaf().openFile(file);

			return file;
		} catch (error) {
			console.error('Error creating audiobook file:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to create audiobook file: ${errorMessage}`);
			return null;
		}
	}

	/**
	 * Update existing audiobook file with new metadata
	 */
	async updateAudiobookFile(file: TFile, metadata: AudiobookMetadata): Promise<boolean> {
		try {
			// Download cover if enabled
			if (this.settings.coverStorage === 'local' && metadata.coverUrl) {
				const localPath = await this.imageDownloadService.downloadCover(
					metadata.coverUrl,
					metadata.title,
					metadata.author?.[0]
				);
				if (localPath) {
					metadata.coverLocalPath = localPath;
				}
			}

			// Generate new content
			const content = this.markdownGenerator.generateMarkdown(metadata, true);

			// Update file
			await this.app.vault.modify(file, content);

			new Notice(`Updated audiobook metadata: ${file.name}`);

			return true;
		} catch (error) {
			console.error('Error updating audiobook file:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to update audiobook file: ${errorMessage}`);
			return false;
		}
	}

	/**
	 * Ensure folder exists, create if necessary
	 */
	private async ensureFolderExists(folderPath: string): Promise<void> {
		const folders = folderPath.split('/').filter(f => f);
		let currentPath = '';

		for (const folder of folders) {
			currentPath = currentPath ? `${currentPath}/${folder}` : folder;
			
			const existingFolder = this.app.vault.getAbstractFileByPath(currentPath);
			if (!existingFolder) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}

	/**
	 * Update settings reference
	 */
	updateSettings(settings: AudiobookPluginSettings) {
		this.settings = settings;
		this.imageDownloadService.updateSettings(settings);
	}
}
