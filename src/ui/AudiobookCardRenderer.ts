import {App, MarkdownPostProcessorContext} from "obsidian";

/**
 * Interface for audiobook card data parsed from code block
 */
export interface AudiobookCardData {
	title?: string;
	author?: string;
	narrator?: string;
	duration?: string;
	publisher?: string;
	genre?: string;
	rating?: number;
	cover?: string;
	series?: string;
}

/**
 * Renderer for audiobook media cards in markdown
 */
export class AudiobookCardRenderer {
	constructor(private app: App) {}
	/**
	 * Parse YAML-like content from audiobook code block
	 */
	parseCodeBlock(source: string): AudiobookCardData {
		const data: AudiobookCardData = {};
		const lines = source.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

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
	async render(el: HTMLElement, data: AudiobookCardData, ctx: MarkdownPostProcessorContext): Promise<void> {
		el.empty();

		// Create card container
		const card = el.createDiv({cls: 'audiobook-card'});

		// Cover section
		if (data.cover) {
			const coverSection = card.createDiv({cls: 'audiobook-cover-section'});
			
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
			cls: 'audiobook-cover',
			attr: {
				src: coverSrc,
				alt: data.title || 'Audiobook cover'
			}
		});
	}

	// Info section
	const infoSection = card.createDiv({cls: 'audiobook-info'});

	// Title
	if (data.title) {
		infoSection.createEl('h3', {
			cls: 'audiobook-title',
			text: data.title
		});
	}

	// Author
	if (data.author) {
		const authorDiv = infoSection.createDiv({cls: 'audiobook-meta-item'});
		authorDiv.createSpan({cls: 'audiobook-meta-icon', text: '✍️'});
		authorDiv.createSpan({cls: 'audiobook-meta-text', text: data.author});
	}

	// Narrator
		if (data.narrator) {
			const narratorDiv = infoSection.createDiv({cls: 'audiobook-meta-item'});
			narratorDiv.createSpan({cls: 'audiobook-meta-icon', text: '🎙️'});
			narratorDiv.createSpan({cls: 'audiobook-meta-text', text: data.narrator});
		}

		// Duration
		if (data.duration) {
			const durationDiv = infoSection.createDiv({cls: 'audiobook-meta-item'});
			durationDiv.createSpan({cls: 'audiobook-meta-icon', text: '⏱️'});
			durationDiv.createSpan({cls: 'audiobook-meta-text', text: data.duration});
		}

		// Publisher
		if (data.publisher) {
			const publisherDiv = infoSection.createDiv({cls: 'audiobook-meta-item'});
			publisherDiv.createSpan({cls: 'audiobook-meta-icon', text: '📚'});
			publisherDiv.createSpan({cls: 'audiobook-meta-text', text: data.publisher});
		}

		// Rating
		if (data.rating !== undefined) {
			const ratingDiv = infoSection.createDiv({cls: 'audiobook-rating'});
			const stars = this.renderStars(data.rating);
			ratingDiv.createSpan({cls: 'audiobook-stars', text: stars});
			ratingDiv.createSpan({
				cls: 'audiobook-rating-value',
				text: ` ${data.rating.toFixed(1)}`
			});
		}

		// Genre tags
		if (data.genre) {
			const genreContainer = infoSection.createDiv({cls: 'audiobook-genre-container'});
			const genres = data.genre.split(',').map(g => g.trim());
			genres.forEach(genre => {
				genreContainer.createSpan({
					cls: 'audiobook-genre-tag',
					text: genre
				});
			});
		}

		// Series
		if (data.series) {
			const seriesDiv = infoSection.createDiv({cls: 'audiobook-series'});
			seriesDiv.createSpan({cls: 'audiobook-meta-icon', text: '📖'});
			seriesDiv.createSpan({cls: 'audiobook-series-text', text: data.series});
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
