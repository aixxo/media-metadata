import {AudiobookMetadata} from "../models/AudiobookMetadata";
import {MediaPluginSettings, CustomFrontmatterField} from "../settings";
import {getSortedCustomFields} from "../utils/TypeGuards";

/**
 * Service for generating markdown files from audiobook metadata
 */
export class MarkdownGenerator {
	constructor(private settings: MediaPluginSettings) {}

	/**
	 * Generate complete markdown content with frontmatter and audiobook code block
	 */
	generateMarkdown(metadata: AudiobookMetadata, useFrontmatter: boolean = true): string {
		let content = '';

		if (useFrontmatter) {
			content += this.generateFrontmatter(metadata);
			content += '\n';
		}

		content += this.generateBody(metadata);

		return content;
	}

	/**
	 * Generate YAML frontmatter from metadata
	 */
	private generateFrontmatter(metadata: AudiobookMetadata): string {
		const lines: string[] = ['---'];

		// Add custom fields at start if configured
		if (this.settings.customFieldsPosition === 'start') {
			const customLines = this.generateCustomFrontmatter();
			if (customLines.length > 0) {
				lines.push(...customLines);
			}
		}

		// Basic information
		lines.push(`title: "${this.escapeYaml(metadata.title)}"`);
		if (metadata.subtitle) {
			lines.push(`subtitle: "${this.escapeYaml(metadata.subtitle)}"`);
		}

		// Authors
		if (metadata.author && metadata.author.length > 0) {
			if (metadata.author.length === 1 && metadata.author[0]) {
				lines.push(`author: "${this.escapeYaml(metadata.author[0])}"`);
			} else {
				lines.push('author:');
				metadata.author.forEach(author => {
					lines.push(`  - "${this.escapeYaml(author)}"`);
				});
			}
		}

		// Narrators (audiobook-specific)
		if (metadata.narrator && metadata.narrator.length > 0) {
			if (metadata.narrator.length === 1 && metadata.narrator[0]) {
				lines.push(`narrator: "${this.escapeYaml(metadata.narrator[0])}"`);
			} else {
				lines.push('narrator:');
				metadata.narrator.forEach(narrator => {
					lines.push(`  - "${this.escapeYaml(narrator)}"`);
				});
			}
		}

		// Publication details
		if (metadata.publisher) {
			lines.push(`publisher: "${this.escapeYaml(metadata.publisher)}"`);
		}
		if (metadata.publishedDate) {
			lines.push(`published: "${metadata.publishedDate}"`);
		}
		if (metadata.language) {
			lines.push(`language: "${metadata.language}"`);
		}

		// Duration (audiobook-specific)
		if (metadata.duration) {
			lines.push(`duration: "${metadata.duration}"`);
		}

		// Type/Subtype (for Obsidian Bases filtering)
		lines.push('type: "book"');
		lines.push('subtype: "audiobook"');

		// Genres/Categories
		if (metadata.genre && metadata.genre.length > 0) {
			lines.push('genre:');
			metadata.genre.forEach(genre => {
				lines.push(`  - "${this.escapeYaml(genre)}"`);
			});
		}

		// Series information
		if (metadata.series) {
			lines.push(`series: "${this.escapeYaml(metadata.series)}"`);
			if (metadata.seriesPosition) {
				lines.push(`series_position: "${metadata.seriesPosition}"`);
			}
		}

		// Rating
		if (metadata.rating !== undefined) {
			lines.push(`rating: ${metadata.rating}`);
		}
		if (metadata.ratingCount !== undefined) {
			lines.push(`rating_count: ${metadata.ratingCount}`);
		}

		// Cover (formatted for Obsidian Bases card view)
		if (metadata.coverLocalPath) {
			// Local path as wikilink for Obsidian Bases compatibility
			lines.push(`cover: "[[${metadata.coverLocalPath}]]"`);
		} else if (metadata.coverUrl) {
			// External URL remains as-is
			lines.push(`cover: "${metadata.coverUrl}"`);
		}

		// Identifiers
		if (metadata.isbn) {
			lines.push(`isbn: "${metadata.isbn}"`);
		}
		if (metadata.isbn13) {
			lines.push(`isbn13: "${metadata.isbn13}"`);
		}
		if (metadata.asin) {
			lines.push(`asin: "${metadata.asin}"`);
		}

		// Provider and URL
		lines.push(`provider: "${metadata.provider}"`);
		if (metadata.url) {
			lines.push(`source_url: "${metadata.url}"`);
		}

		// Metadata
		if (metadata.retrievedAt) {
			lines.push(`retrieved_at: "${metadata.retrievedAt}"`);
		}

		// Add custom fields at end if configured
		if (this.settings.customFieldsPosition === 'end') {
			const customLines = this.generateCustomFrontmatter();
			if (customLines.length > 0) {
				lines.push(...customLines);
			}
		}

		lines.push('---');
		return lines.join('\n');
	}

	/**
	 * Generate markdown body content
	 */
	private generateBody(metadata: AudiobookMetadata): string {
		const sections: string[] = [];

		// Title Header
		sections.push(`# ${metadata.title}`);
		if (metadata.subtitle) {
			sections.push(`*${metadata.subtitle}*`);
		}
		sections.push('');

		// Media card code block
		sections.push(this.generateMediaCodeBlock(metadata));
		sections.push('');

		// Description
		if (metadata.description) {
			sections.push('## Description');
			sections.push('');
			sections.push(metadata.description);
			sections.push('');
		}

		// Notes section (empty, for user to fill)
		sections.push('## Notes');
		sections.push('');
		sections.push('<!-- Add your notes here -->');
		sections.push('');

		return sections.join('\n');
	}

	/**
	 * Generate media code block for rendering
	 * Since metadata is now in frontmatter, this creates a minimal trigger block
	 */
	private generateMediaCodeBlock(metadata: AudiobookMetadata): string {
		const lines: string[] = ['```audiobook'];
		lines.push('# Card renders from frontmatter');
		lines.push('# You can override individual fields here if needed');
		lines.push('```');
		return lines.join('\n');
	}

	/**
	 * Escape special characters for YAML
	 */
	private escapeYaml(str: string): string {
		return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
	}

	/**
	 * Generate custom frontmatter fields from settings
	 */
	private generateCustomFrontmatter(): string[] {
		const lines: string[] = [];

		// Sort fields by order
		const sortedFields = getSortedCustomFields(this.settings.customFrontmatterFields);

		sortedFields.forEach((field: CustomFrontmatterField) => {
			// Skip fields with empty keys
			if (!field.key.trim()) {
				return;
			}

			const key = field.key.trim();
			const value = field.value;

			// Format value based on type
			let formattedValue: string;
			if (field.type === 'string') {
				formattedValue = `"${this.escapeYaml(value)}"`;
			} else if (field.type === 'number') {
				// Parse as number, fallback to 0 if invalid
				const numValue = parseFloat(value);
				formattedValue = isNaN(numValue) ? '0' : numValue.toString();
			} else if (field.type === 'boolean') {
				// Parse as boolean (case-insensitive true/false, yes/no, 1/0)
				const lowercaseValue = value.toLowerCase().trim();
				const boolValue = lowercaseValue === 'true' || 
								  lowercaseValue === 'yes' || 
								  lowercaseValue === '1';
				formattedValue = boolValue.toString();
			} else {
				// Default to string
				formattedValue = `"${this.escapeYaml(value)}"`;
			}

			lines.push(`${key}: ${formattedValue}`);
		});

		return lines;
	}

	/**
	 * Generate a safe filename from title
	 */
	generateFilename(metadata: AudiobookMetadata): string {
		let filename = metadata.title;

		// Add author if available
		if (metadata.author && metadata.author.length > 0) {
			filename = `${metadata.author[0]} - ${filename}`;
		}

		// Sanitize filename
		filename = filename
			.replace(/[\\/:*?"<>|]/g, '-')  // Replace illegal characters
			.replace(/\s+/g, ' ')            // Collapse multiple spaces
			.trim();

		return `${filename}.md`;
	}
}
