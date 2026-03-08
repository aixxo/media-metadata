import {App, TFile} from "obsidian";
import {AudiobookPluginSettings, CustomFrontmatterField} from "../settings";
import {getSortedCustomFields} from "../utils/TypeGuards";

/**
 * Result of a batch update operation on a single file
 */
export interface BatchUpdateResult {
	file: TFile;
	success: boolean;
	fieldsAdded: number;
	error?: string;
}

/**
 * Service for batch updating existing audiobook files with custom frontmatter fields
 */
export class BatchUpdateService {
	constructor(
		private app: App,
		private settings: AudiobookPluginSettings
	) {}

	/**
	 * Get all markdown files in the default output folder
	 */
	async getAllAudiobookFiles(): Promise<TFile[]> {
		const folder = this.settings.defaultOutputFolder;
		const folderObj = this.app.vault.getAbstractFileByPath(folder);
		
		if (!folderObj || !(folderObj instanceof TFile)) {
			// Get all files in folder
			const allFiles = this.app.vault.getMarkdownFiles();
			return allFiles.filter(file => file.path.startsWith(folder + '/'));
		}
		
		return [];
	}

	/**
	 * Get all markdown files that have audiobook frontmatter (subtype: audiobook)
	 */
	async getAudiobookFiles(): Promise<TFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const audiobookFiles: TFile[] = [];

		for (const file of allFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.subtype === 'audiobook') {
				audiobookFiles.push(file);
			}
		}

		return audiobookFiles;
	}

	/**
	 * Update a single file with custom frontmatter fields
	 * Only adds missing fields, does not overwrite existing ones
	 */
	async updateFile(file: TFile): Promise<BatchUpdateResult> {
		try {
			const content = await this.app.vault.read(file);
			const { frontmatter, body, hasFrontmatter } = this.parseFrontmatter(content);

			if (!hasFrontmatter) {
				return {
					file,
					success: false,
					fieldsAdded: 0,
					error: 'No frontmatter found'
				};
			}

			let fieldsAdded = 0;
			const sortedFields = getSortedCustomFields(this.settings.customFrontmatterFields);

			// Check which fields need to be added
			/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
			sortedFields.forEach((field: CustomFrontmatterField) => {
				const key = field.key.trim();
				if (!key) return;

				// Only add if field doesn't exist
				if (!(key in frontmatter)) {
					frontmatter[key] = this.formatFieldValue(field.value, field.type);
					fieldsAdded++;
				}
			});
			/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

			if (fieldsAdded === 0) {
				return {
					file,
					success: true,
					fieldsAdded: 0
				};
			}

			// Rebuild file content with updated frontmatter
			const newContent = this.rebuildContent(frontmatter, body);
			await this.app.vault.modify(file, newContent);

			return {
				file,
				success: true,
				fieldsAdded
			};
		} catch (error) {
			return {
				file,
				success: false,
				fieldsAdded: 0,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Update multiple files with progress callback
	 */
	async updateFiles(
		files: TFile[],
		onProgress?: (current: number, total: number, filename: string) => void
	): Promise<BatchUpdateResult[]> {
		const results: BatchUpdateResult[] = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			
			if (!file) continue;
			
			if (onProgress) {
				onProgress(i + 1, files.length, file.name);
			}

			const result = await this.updateFile(file);
			results.push(result);
		}

		return results;
	}

	/**
	 * Parse frontmatter from file content
	 */
	private parseFrontmatter(content: string): {
		frontmatter: Record<string, unknown>;
		body: string;
		hasFrontmatter: boolean;
	} {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (!match || !match[1] || match[2] === undefined) {
			return {
				frontmatter: {},
				body: content,
				hasFrontmatter: false
			};
		}

		const frontmatterText = match[1];
		const body = match[2];
		const frontmatter: Record<string, unknown> = {};

		// Simple YAML parsing (key: value pairs)
		const lines = frontmatterText.split('\n');
		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex === -1) continue;

			const key = line.substring(0, colonIndex).trim();
			let value: string | number | boolean = line.substring(colonIndex + 1).trim();

			// Remove quotes if present
			if (value.startsWith('"') && value.endsWith('"')) {
				value = value.substring(1, value.length - 1);
			}

			// Try to parse as number or boolean
			if (value === 'true') {
				value = true;
			} else if (value === 'false') {
				value = false;
			} else if (!isNaN(Number(value)) && value !== '') {
				value = Number(value);
			}

			frontmatter[key] = value;
		}

		return {
			frontmatter,
			body,
			hasFrontmatter: true
		};
	}

	/**
	 * Rebuild file content with updated frontmatter
	 */
	private rebuildContent(frontmatter: Record<string, unknown>, body: string): string {
		const lines: string[] = ['---'];

		// Determine position for custom fields
		/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
		const customFieldKeys = new Set(
			getSortedCustomFields(this.settings.customFrontmatterFields).map((f: CustomFrontmatterField) => f.key.trim())
		);
		/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

		// Add fields at start if configured
		if (this.settings.customFieldsPosition === 'start') {
			/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
			getSortedCustomFields(this.settings.customFrontmatterFields).forEach((field: CustomFrontmatterField) => {
				const key = field.key.trim();
				if (key && key in frontmatter) {
					lines.push(this.formatFrontmatterLine(key, frontmatter[key]));
					delete frontmatter[key]; // Remove so we don't add it again
				}
			});
			/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
		}

		// Add all other fields
		for (const [key, value] of Object.entries(frontmatter)) {
			if (!customFieldKeys.has(key)) {
				lines.push(this.formatFrontmatterLine(key, value));
			}
		}

		if (this.settings.customFieldsPosition === 'end') {
			/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
			getSortedCustomFields(this.settings.customFrontmatterFields).forEach((field: CustomFrontmatterField) => {
				const key = field.key.trim();
				if (key && key in frontmatter) {
					lines.push(this.formatFrontmatterLine(key, frontmatter[key]));
				}
			});
			/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
		}

		lines.push('---');
		return lines.join('\n') + '\n' + body;
	}

	/**
	 * Format a frontmatter line (key: value)
	 */
	private formatFrontmatterLine(key: string, value: unknown): string {
		if (typeof value === 'string') {
			// Escape and quote strings
			const escaped = value.replace(/"/g, '\\"');
			return `${key}: "${escaped}"`;
		} else if (typeof value === 'number' || typeof value === 'boolean') {
			return `${key}: ${value}`;
		} else if (Array.isArray(value)) {
			// Handle arrays (keep simplified for now)
			return `${key}: [${value.join(', ')}]`;
		} else {
			return `${key}: "${String(value)}"`;
		}
	}

	/**
	 * Format field value based on type
	 */
	private formatFieldValue(value: string, type: string): string | number | boolean {
		if (type === 'number') {
			const numValue = parseFloat(value);
			return isNaN(numValue) ? 0 : numValue;
		} else if (type === 'boolean') {
			const lowercaseValue = value.toLowerCase().trim();
			return lowercaseValue === 'true' || 
				   lowercaseValue === 'yes' || 
				   lowercaseValue === '1';
		}
		return value;
	}
}
