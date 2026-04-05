import {App, MarkdownPostProcessorContext, TFile} from "obsidian";

/**
 * Interface for media card data parsed from code block
 */
export interface MediaCardData {
	title?: string;
	author?: string;
	narrator?: string;
	duration?: string;
	publisher?: string;
	genre?: string;
	rating?: number;
	cover?: string;
	series?: string;
	publishedDate?: string;
	language?: string;
	subtitle?: string;
	description?: string;
	seriesPosition?: string;
	isbn?: string;
	asin?: string;
	url?: string;
	linkedFile?: string;  // Path to another note to read frontmatter from
}

/**
 * Renderer for media cards in markdown
 */
export class MediaCardRenderer {
	constructor(private app: App) {}
	
	/**
	 * Extract cover path from various formats (including wikilinks)
	 */
	private extractCoverPath(coverValue: string): string {
		if (!coverValue) return '';
		
		// Remove wikilink format [[image.jpg]] -> image.jpg
		const wikilinkMatch = coverValue.match(/\[\[([^\]]+)\]\]/);
		if (wikilinkMatch && wikilinkMatch[1]) {
			return wikilinkMatch[1];
		}
		
		return coverValue;
	}
	
	/**
	 * Extract audiobook data from file frontmatter
	 */
	private extractFromFrontmatter(ctx: MarkdownPostProcessorContext): MediaCardData {
		const data: MediaCardData = {};
		
		// Get the file from the context
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!file || !(file instanceof TFile)) {
			return data;
		}
		
		// Get cached metadata
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache || !cache.frontmatter) {
			return data;
		}
		
		const fm = cache.frontmatter;
		
		// Map frontmatter fields to MediaCardData
		if (fm.title) data.title = String(fm.title);
		if (fm.subtitle) data.subtitle = String(fm.subtitle);
		
		// Handle author (can be string or array)
		if (fm.author) {
			if (Array.isArray(fm.author)) {
				data.author = fm.author.join(', ');
			} else {
				data.author = String(fm.author);
			}
		}
		
		// Handle narrator (can be string or array)
		if (fm.narrator) {
			if (Array.isArray(fm.narrator)) {
				data.narrator = fm.narrator.join(', ');
			} else {
				data.narrator = String(fm.narrator);
			}
		}
		
		if (fm.duration) data.duration = String(fm.duration);
		if (fm.publisher) data.publisher = String(fm.publisher);
		if (fm.published) data.publishedDate = String(fm.published);
		if (fm.language) data.language = String(fm.language);
		if (fm.description) data.description = String(fm.description);
		
		// Handle genre (can be string or array)
		if (fm.genre) {
			if (Array.isArray(fm.genre)) {
				data.genre = fm.genre.join(', ');
			} else {
				data.genre = String(fm.genre);
			}
		}
		
		// Handle series
		if (fm.series) data.series = String(fm.series);
		if (fm.seriesPosition) data.seriesPosition = String(fm.seriesPosition);
		
		// Handle rating
		if (fm.rating !== undefined) {
			data.rating = typeof fm.rating === 'number' ? fm.rating : parseFloat(String(fm.rating));
		}
		
		// Handle cover - check multiple possible field names
		if (fm.cover) {
			data.cover = this.extractCoverPath(String(fm.cover));
		} else if (fm.coverUrl) {
			data.cover = this.extractCoverPath(String(fm.coverUrl));
		} else if (fm.coverLocalPath) {
			data.cover = this.extractCoverPath(String(fm.coverLocalPath));
		}
		
		// Additional identifiers
		if (fm.isbn) data.isbn = String(fm.isbn);
		if (fm.isbn13) data.isbn = String(fm.isbn13);
		if (fm.asin) data.asin = String(fm.asin);
		if (fm.url) data.url = String(fm.url);
		
		return data;
	}
	
	/**
	 * Extract audiobook data from a linked note's frontmatter
	 */
	private extractFromLinkedFile(linkPath: string): MediaCardData {
		const data: MediaCardData = {};

		const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
		if (!file || !(file instanceof TFile)) {
			return { title: `⚠️ File not found: "${linkPath}"` };
		}

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache || !cache.frontmatter) {
			return { title: `⚠️ No frontmatter in: "${linkPath}"` };
		}

		const fm = cache.frontmatter;

		if (fm.title) data.title = String(fm.title);
		if (fm.subtitle) data.subtitle = String(fm.subtitle);

		if (fm.author) {
			data.author = Array.isArray(fm.author) ? fm.author.join(', ') : String(fm.author);
		}
		if (fm.narrator) {
			data.narrator = Array.isArray(fm.narrator) ? fm.narrator.join(', ') : String(fm.narrator);
		}

		if (fm.duration) data.duration = String(fm.duration);
		if (fm.publisher) data.publisher = String(fm.publisher);
		if (fm.published) data.publishedDate = String(fm.published);
		if (fm.language) data.language = String(fm.language);
		if (fm.description) data.description = String(fm.description);

		if (fm.genre) {
			data.genre = Array.isArray(fm.genre) ? fm.genre.join(', ') : String(fm.genre);
		}

		if (fm.series) data.series = String(fm.series);
		if (fm.seriesPosition) data.seriesPosition = String(fm.seriesPosition);

		if (fm.rating !== undefined) {
			data.rating = typeof fm.rating === 'number' ? fm.rating : parseFloat(String(fm.rating));
		}

		if (fm.cover) {
			data.cover = this.extractCoverPath(String(fm.cover));
		} else if (fm.coverUrl) {
			data.cover = this.extractCoverPath(String(fm.coverUrl));
		} else if (fm.coverLocalPath) {
			data.cover = this.extractCoverPath(String(fm.coverLocalPath));
		}

		if (fm.isbn) data.isbn = String(fm.isbn);
		if (fm.isbn13) data.isbn = String(fm.isbn13);
		if (fm.asin) data.asin = String(fm.asin);
		if (fm.url) data.url = String(fm.url);

		return data;
	}

	/**
	 * Parse YAML-like content from audiobook code block
	 */
	parseCodeBlock(source: string): MediaCardData {
		const data: MediaCardData = {};
		const lines = source.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			// Support bare wikilinks: [[Note Name]] without key prefix
			const bareWikilink = trimmed.match(/^\[\[([^\]]+)\]\]$/);
			if (bareWikilink && bareWikilink[1]) {
				data.linkedFile = bareWikilink[1];
				continue;
			}

			const colonIndex = trimmed.indexOf(':');
			if (colonIndex === -1) continue;

			const key = trimmed.substring(0, colonIndex).trim();
			let value = trimmed.substring(colonIndex + 1).trim();

			// Remove quotes
			if ((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))) {
				value = value.substring(1, value.length - 1);
			}

			// Map to interface properties
			switch (key.toLowerCase()) {
				case 'file':
					// Support wikilink [[Note]] and plain path
					data.linkedFile = value.replace(/^\[\[(.+)\]\]$/, '$1');
					break;
				case 'title':
					data.title = value;
					break;
				case 'author':
					data.author = value;
					break;
				case 'narrator':
					data.narrator = value;
					break;
				case 'duration':
					data.duration = value;
					break;
				case 'publisher':
					data.publisher = value;
					break;
				case 'genre':
					data.genre = value;
					break;
				case 'rating':
					data.rating = parseFloat(value);
					break;
				case 'cover':
					data.cover = value;
					break;
				case 'series':
					data.series = value;
					break;
			}
		}

		return data;
	}

	/**
	 * Render audiobook card in the markdown preview
	 */
	async render(el: HTMLElement, codeBlockData: MediaCardData, ctx: MarkdownPostProcessorContext): Promise<void> {
		el.empty();

		// Determine base data source: linked file or current file's frontmatter
		const { linkedFile, ...codeBlockOverrides } = codeBlockData;
		const baseData = linkedFile
			? this.extractFromLinkedFile(linkedFile)
			: this.extractFromFrontmatter(ctx);

		// Merge base data with code block overrides (code block always wins)
		const data: MediaCardData = {
			...baseData,
			...codeBlockOverrides
		};
		
		// If no data at all, don't render anything
		if (!data.title && !data.author && !data.cover) {
			return;
		}

		// Create card container
		const card = el.createDiv({cls: 'media-card'});

		// Cover section
		if (data.cover) {
			const coverSection = card.createDiv({cls: 'media-cover-section'});
			
			// Resolve local path to resource path
			let coverSrc = data.cover;
			if (!data.cover.startsWith('http://') && !data.cover.startsWith('https://')) {
				// Local file - use Obsidian's resource path
				try {
					coverSrc = this.app.vault.adapter.getResourcePath(data.cover);
				} catch (error) {
					console.error('Error resolving cover path:', error);
				}
			}
			
		coverSection.createEl('img', {
			cls: 'media-cover',
			attr: {
				src: coverSrc,
				alt: data.title || 'Media cover'
			}
		});
	}

	// Info section
	const infoSection = card.createDiv({cls: 'media-info'});

	// Title
	if (data.title) {
		infoSection.createEl('h3', {
			cls: 'media-title',
			text: data.title
		});
	}

	// Author
	if (data.author) {
		const authorDiv = infoSection.createDiv({cls: 'media-meta-item'});
		authorDiv.createSpan({cls: 'media-meta-icon', text: '✍️'});
		authorDiv.createSpan({cls: 'media-meta-text', text: data.author});
	}

	// Narrator
		if (data.narrator) {
			const narratorDiv = infoSection.createDiv({cls: 'media-meta-item'});
			narratorDiv.createSpan({cls: 'media-meta-icon', text: '🎙️'});
			narratorDiv.createSpan({cls: 'media-meta-text', text: data.narrator});
		}

		// Duration
		if (data.duration) {
			const durationDiv = infoSection.createDiv({cls: 'media-meta-item'});
			durationDiv.createSpan({cls: 'media-meta-icon', text: '⏱️'});
			durationDiv.createSpan({cls: 'media-meta-text', text: data.duration});
		}

		// Publisher
		if (data.publisher) {
			const publisherDiv = infoSection.createDiv({cls: 'media-meta-item'});
			publisherDiv.createSpan({cls: 'media-meta-icon', text: '📚'});
			publisherDiv.createSpan({cls: 'media-meta-text', text: data.publisher});
		}

		// Rating
		if (data.rating !== undefined) {
			const ratingDiv = infoSection.createDiv({cls: 'media-rating'});
			const stars = this.renderStars(data.rating);
			ratingDiv.createSpan({cls: 'media-stars', text: stars});
			ratingDiv.createSpan({
				cls: 'media-rating-value',
				text: ` ${data.rating.toFixed(1)}`
			});
		}

		// Genre tags
		if (data.genre) {
			const genreContainer = infoSection.createDiv({cls: 'media-genre-container'});
			const genres = data.genre.split(',').map(g => g.trim());
			genres.forEach(genre => {
				genreContainer.createSpan({
					cls: 'media-genre-tag',
					text: genre
				});
			});
		}

		// Series
		if (data.series) {
			const seriesDiv = infoSection.createDiv({cls: 'media-series'});
			seriesDiv.createSpan({cls: 'media-meta-icon', text: '📖'});
			seriesDiv.createSpan({cls: 'media-series-text', text: data.series});
		}
	}

	/**
	 * Render star rating (★★★★☆)
	 */
	private renderStars(rating: number): string {
		const fullStars = Math.floor(rating);
		const halfStar = rating % 1 >= 0.5;
		const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

		let stars = '★'.repeat(fullStars);
		if (halfStar) stars += '⯨';
		stars += '☆'.repeat(emptyStars);

		return stars;
	}
}
