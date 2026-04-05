import {App, MarkdownPostProcessorContext, TFile} from "obsidian";

/**
 * Interface for series card data parsed from code block / frontmatter
 */
export interface SeriesCardData {
	title?: string;
	overview?: string;
	status?: string;
	network?: string;
	firstAired?: string;
	totalSeasons?: number;
	totalEpisodes?: number;
	language?: string;
	rating?: number;
	genre?: string;
	creator?: string;
	cover?: string;
	imdbId?: string;
	tmdbId?: string;
	tvmazeId?: string;
	url?: string;
	linkedFile?: string;
}

/**
 * Renderer for TV series media cards in markdown
 */
export class SeriesCardRenderer {
	constructor(private app: App) {}

	/**
	 * Parse YAML-like content from a series code block
	 */
	parseCodeBlock(source: string): SeriesCardData {
		const data: SeriesCardData = {};
		const lines = source.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;

			// Support bare wikilinks: [[Note Name]]
			const bareWikilink = trimmed.match(/^\[\[([^\]]+)\]\]$/);
			if (bareWikilink && bareWikilink[1]) {
				data.linkedFile = bareWikilink[1];
				continue;
			}

			const colonIndex = trimmed.indexOf(':');
			if (colonIndex === -1) continue;

			const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
			let value = trimmed.substring(colonIndex + 1).trim();

			// Remove surrounding quotes
			if ((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))) {
				value = value.substring(1, value.length - 1);
			}

			switch (key) {
				case 'file':
					data.linkedFile = value.replace(/^\[\[(.+)\]\]$/, '$1');
					break;
				case 'title': data.title = value; break;
				case 'overview': data.overview = value; break;
				case 'status': data.status = value; break;
				case 'network': data.network = value; break;
				case 'first_aired': data.firstAired = value; break;
				case 'total_seasons': data.totalSeasons = parseInt(value, 10) || undefined; break;
				case 'total_episodes': data.totalEpisodes = parseInt(value, 10) || undefined; break;
				case 'language': data.language = value; break;
				case 'rating': data.rating = parseFloat(value) || undefined; break;
				case 'genre': data.genre = value; break;
				case 'creator': data.creator = value; break;
				case 'cover': data.cover = value; break;
				case 'imdb_id': data.imdbId = value; break;
				case 'tmdb_id': data.tmdbId = value; break;
				case 'tvmaze_id': data.tvmazeId = value; break;
				case 'source_url': data.url = value; break;
			}
		}

		return data;
	}

	/**
	 * Render series card in the markdown preview
	 */
	async render(el: HTMLElement, codeBlockData: SeriesCardData, ctx: MarkdownPostProcessorContext): Promise<void> {
		el.empty();

		const {linkedFile, ...codeBlockOverrides} = codeBlockData;
		const baseData = linkedFile
			? this.extractFromLinkedFile(linkedFile)
			: this.extractFromFrontmatter(ctx);

		const data: SeriesCardData = {...baseData, ...codeBlockOverrides};

		if (!data.title && !data.cover) return;

		const card = el.createDiv({cls: 'media-card series-card'});

		// Cover section
		if (data.cover) {
			const coverSection = card.createDiv({cls: 'media-cover-section'});
			let coverSrc = this.extractCoverPath(data.cover);

			if (!coverSrc.startsWith('http://') && !coverSrc.startsWith('https://')) {
				try {
					coverSrc = this.app.vault.adapter.getResourcePath(coverSrc);
				} catch (error) {
					console.error('[SeriesCardRenderer] Error resolving cover path:', error);
				}
			}

			coverSection.createEl('img', {
				cls: 'media-cover',
				attr: {src: coverSrc, alt: data.title ?? 'Series cover'}
			});
		}

		// Info section
		const infoSection = card.createDiv({cls: 'media-info'});

		if (data.title) {
			infoSection.createEl('h3', {cls: 'media-title', text: data.title});
		}

		// Status badge
		if (data.status) {
			const statusDiv = infoSection.createDiv({cls: 'media-meta-item'});
			const isContinuing = data.status.toLowerCase().includes('running') ||
				data.status.toLowerCase().includes('continuing') ||
				data.status.toLowerCase().includes('in production');
			statusDiv.createSpan({
				cls: `series-status-badge ${isContinuing ? 'series-status-running' : 'series-status-ended'}`,
				text: data.status
			});
		}

		if (data.network) {
			const div = infoSection.createDiv({cls: 'media-meta-item'});
			div.createSpan({cls: 'media-meta-icon', text: '📺'});
			div.createSpan({cls: 'media-meta-text', text: data.network});
		}

		if (data.firstAired) {
			const div = infoSection.createDiv({cls: 'media-meta-item'});
			div.createSpan({cls: 'media-meta-icon', text: '📅'});
			div.createSpan({cls: 'media-meta-text', text: data.firstAired});
		}

		if (data.totalSeasons !== undefined || data.totalEpisodes !== undefined) {
			const div = infoSection.createDiv({cls: 'media-meta-item'});
			div.createSpan({cls: 'media-meta-icon', text: '🎬'});
			const parts: string[] = [];
			if (data.totalSeasons !== undefined) parts.push(`${data.totalSeasons} season${data.totalSeasons !== 1 ? 's' : ''}`);
			if (data.totalEpisodes !== undefined) parts.push(`${data.totalEpisodes} episodes`);
			div.createSpan({cls: 'media-meta-text', text: parts.join(' · ')});
		}

		if (data.creator) {
			const div = infoSection.createDiv({cls: 'media-meta-item'});
			div.createSpan({cls: 'media-meta-icon', text: '✍️'});
			div.createSpan({cls: 'media-meta-text', text: data.creator});
		}

		// Rating
		if (data.rating !== undefined) {
			const ratingDiv = infoSection.createDiv({cls: 'media-rating'});
			const starsSpan = ratingDiv.createSpan({cls: 'media-stars'});
			starsSpan.style.setProperty('--rating-pct', `${(data.rating / 10) * 100}%`);
			ratingDiv.createSpan({cls: 'media-rating-value', text: ` ${data.rating.toFixed(1)}`});
		}

		// Genre tags
		if (data.genre) {
			const genreContainer = infoSection.createDiv({cls: 'media-genre-container'});
			data.genre.split(',').map(g => g.trim()).forEach(genre => {
				genreContainer.createSpan({cls: 'media-genre-tag', text: genre});
			});
		}
	}

	// ──────────────────────────────────────────────────────────────
	// Private helpers
	// ──────────────────────────────────────────────────────────────

	private extractCoverPath(coverValue: string): string {
		if (!coverValue) return '';
		const wikilinkMatch = coverValue.match(/\[\[([^\]]+)\]\]/);
		if (wikilinkMatch && wikilinkMatch[1]) return wikilinkMatch[1];
		return coverValue;
	}

	private extractFromFrontmatter(ctx: MarkdownPostProcessorContext): SeriesCardData {
		const data: SeriesCardData = {};
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!file || !(file instanceof TFile)) return data;

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) return data;

		return this.frontmatterToCardData(cache.frontmatter);
	}

	private extractFromLinkedFile(linkPath: string): SeriesCardData {
		const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, '');
		if (!file || !(file instanceof TFile)) {
			return {title: `⚠️ File not found: "${linkPath}"`};
		}
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return {title: `⚠️ No frontmatter in: "${linkPath}"`};
		}
		return this.frontmatterToCardData(cache.frontmatter);
	}

	private frontmatterToCardData(fm: Record<string, unknown>): SeriesCardData {
		const data: SeriesCardData = {};
		const str = (v: unknown): string => String(v as string | number | boolean);

		if (fm.title) data.title = str(fm.title);
		if (fm.overview) data.overview = str(fm.overview);
		if (fm.status) data.status = str(fm.status);
		if (fm.network) data.network = str(fm.network);
		if (fm.first_aired) data.firstAired = str(fm.first_aired);
		if (fm.total_seasons !== undefined) data.totalSeasons = Number(fm.total_seasons);
		if (fm.total_episodes !== undefined) data.totalEpisodes = Number(fm.total_episodes);
		if (fm.language) data.language = str(fm.language);
		if (fm.rating !== undefined) data.rating = Number(fm.rating);
		if (fm.creator) {
			data.creator = Array.isArray(fm.creator) ? (fm.creator as string[]).join(', ') : str(fm.creator);
		}
		if (fm.genre) {
			data.genre = Array.isArray(fm.genre) ? (fm.genre as string[]).join(', ') : str(fm.genre);
		}
		if (fm.cover) {
			data.cover = this.extractCoverPath(str(fm.cover));
		} else if (fm.coverUrl) {
			data.cover = this.extractCoverPath(str(fm.coverUrl));
		} else if (fm.coverLocalPath) {
			data.cover = this.extractCoverPath(str(fm.coverLocalPath));
		}
		if (fm.imdb_id) data.imdbId = str(fm.imdb_id);
		if (fm.tmdb_id) data.tmdbId = str(fm.tmdb_id);
		if (fm.tvmaze_id) data.tvmazeId = str(fm.tvmaze_id);
		if (fm.source_url) data.url = str(fm.source_url);

		return data;
	}

}
