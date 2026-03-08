import {App, requestUrl} from "obsidian";
import {AudiobookPluginSettings} from "../settings";

/**
 * Service for downloading and storing audiobook cover images
 */
export class ImageDownloadService {
	constructor(
		private app: App,
		private settings: AudiobookPluginSettings
	) {}

	/**
	 * Download cover image and save to vault
	 * @returns Local path to the saved image, or null if failed
	 */
	async downloadCover(
		coverUrl: string,
		title: string,
		author?: string
	): Promise<string | null> {
		if (!coverUrl || this.settings.coverStorage !== 'local') {
			return null;
		}

		try {
			// Sanitize filename
			let filename = title;
			if (author) {
				filename = `${author} - ${filename}`;
			}
			filename = this.sanitizeFilename(filename);

			// Get file extension from URL
			const extension = this.getImageExtension(coverUrl);
			filename = `${filename}${extension}`;

			// Ensure covers folder exists
			const coversFolder = `${this.settings.defaultOutputFolder}/_covers`;
			await this.ensureFolderExists(coversFolder);

			// Full path
			const filepath = `${coversFolder}/${filename}`;

			// Check if already exists
			const existingFile = this.app.vault.getAbstractFileByPath(filepath);
			if (existingFile) {
				return filepath;
			}

			// Download image
			const response = await requestUrl({
				url: coverUrl,
				method: 'GET',
			});

			if (response.status !== 200) {
				console.error('Failed to download cover:', response.status);
				return null;
			}

			// Save to vault
			await this.app.vault.createBinary(filepath, response.arrayBuffer);

			return filepath;
		} catch (error) {
			console.error('Error downloading cover image:', error);
			return null;
		}
	}

	/**
	 * Sanitize filename for vault storage
	 */
	private sanitizeFilename(name: string): string {
		return name
			.replace(/[\\/:*?"<>|]/g, '-')  // Replace illegal characters
			.replace(/\s+/g, '_')            // Replace spaces with underscore
			.replace(/\.{2,}/g, '.')         // Collapse multiple dots
			.trim()
			.substring(0, 200);              // Limit length
	}

	/**
	 * Extract image extension from URL
	 */
	private getImageExtension(url: string): string {
		// Try to get from URL
		const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
		if (match && match[1]) {
			return `.${match[1].toLowerCase()}`;
		}

		// Default to jpg
		return '.jpg';
	}

	/**
	 * Ensure folder exists
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
	}
}
