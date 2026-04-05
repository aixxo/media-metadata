import {App, Notice, TFile} from "obsidian";
import {MediaMetadata} from "../models/AudiobookMetadata";
import {MarkdownGenerator} from "./MarkdownGenerator";
import {ImageDownloadService} from "./ImageDownloadService";
import {MediaPluginSettings} from "../settings";

/**
 * Service for creating media markdown files in the vault
 */
export class AudiobookFileCreator {
	private markdownGenerator: MarkdownGenerator;
	private imageDownloadService: ImageDownloadService;

	constructor(
		private app: App,
		private settings: MediaPluginSettings
	) {
		this.markdownGenerator = new MarkdownGenerator(settings);
		this.imageDownloadService = new ImageDownloadService(app, settings);
	}

	/**
	 * Create a new audiobook markdown file with metadata
	 */
	async createMediaFile(metadata: MediaMetadata): Promise<TFile | null> {
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

			new Notice(`Created media file: ${filename}`);

			// Open the file
			await this.app.workspace.getLeaf().openFile(file);

			return file;
		} catch (error) {
			console.error('Error creating media file:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to create media file: ${errorMessage}`);
			return null;
		}
	}

	/**
	 * Update existing media file with new metadata
	 */
	async updateMediaFile(file: TFile, metadata: MediaMetadata): Promise<boolean> {
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

			new Notice(`Updated media metadata: ${file.name}`);

			return true;
		} catch (error) {
			console.error('Error updating media file:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to update media file: ${errorMessage}`);
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
	updateSettings(settings: MediaPluginSettings) {
		this.settings = settings;
		this.imageDownloadService.updateSettings(settings);
	}
}
