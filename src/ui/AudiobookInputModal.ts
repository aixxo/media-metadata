import {App, Modal, Notice, Setting} from "obsidian";
import {MediaMetadata} from "../models/AudiobookMetadata";
import {IMetadataProvider} from "../services/IMetadataProvider";

/**
 * Modal for media input with multiple tabs
 */
export class AudiobookInputModal extends Modal {
	private activeTab: 'url' | 'search' | 'id' | 'manual' = 'url';
	private initialTab: 'url' | 'search' | 'id' | 'manual';
	private tabContentContainer: HTMLElement;
	
	// Tab content containers
	private urlTabContent: HTMLElement;
	private searchTabContent: HTMLElement;
	private idTabContent: HTMLElement;
	private manualTabContent: HTMLElement;

	// Tab elements for switching
	private urlTabEl: HTMLElement;
	private searchTabEl: HTMLElement;
	private idTabEl: HTMLElement;
	private manualTabEl: HTMLElement;

	// Callback
	private onSubmit: (metadata: MediaMetadata | null) => void;

	constructor(
		app: App,
		private provider: IMetadataProvider,
		private offlineMode: boolean,
		onSubmit: (metadata: MediaMetadata | null) => void,
		initialTab: 'url' | 'search' | 'id' | 'manual' = 'url'
	) {
		super(app);
		this.onSubmit = onSubmit;
		this.initialTab = offlineMode ? 'manual' : initialTab;
		this.activeTab = this.initialTab;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		
		contentEl.createEl('h2', {text: 'Add media metadata'});

		// Create tabs
		this.createTabs(contentEl);

		// Create tab content containers
		this.tabContentContainer = contentEl.createDiv({cls: 'audiobook-input-content'});
		
		this.urlTabContent = this.tabContentContainer.createDiv({cls: 'audiobook-tab-content'});
		this.searchTabContent = this.tabContentContainer.createDiv({cls: 'audiobook-tab-content', attr: {style: 'display: none;'}});
		this.idTabContent = this.tabContentContainer.createDiv({cls: 'audiobook-tab-content', attr: {style: 'display: none;'}});
		this.manualTabContent = this.tabContentContainer.createDiv({cls: 'audiobook-tab-content', attr: {style: 'display: none;'}});

		// Build tab content
		this.buildUrlTab();
		this.buildSearchTab();
		this.buildIdTab();
		this.buildManualTab();
		
		// Switch to initial tab
		if (this.initialTab === 'search' && this.searchTabEl) {
			this.switchTab('search', this.searchTabEl);
		} else if (this.initialTab === 'id' && this.idTabEl) {
			this.switchTab('id', this.idTabEl);
		} else if (this.initialTab === 'manual' && this.manualTabEl) {
			this.switchTab('manual', this.manualTabEl);
		}
	}

	/**
	 * Create tab navigation
	 */
	private createTabs(container: HTMLElement) {
		const tabContainer = container.createDiv({cls: 'audiobook-tabs'});

		this.urlTabEl = tabContainer.createDiv({cls: 'audiobook-tab audiobook-tab-active', text: 'URL'});
		this.searchTabEl = tabContainer.createDiv({cls: 'audiobook-tab', text: 'Search'});
		this.idTabEl = tabContainer.createDiv({cls: 'audiobook-tab', text: 'ID'});
		this.manualTabEl = tabContainer.createDiv({cls: 'audiobook-tab', text: 'Manual'});

		this.urlTabEl.addEventListener('click', () => this.switchTab('url', this.urlTabEl));
		this.searchTabEl.addEventListener('click', () => this.switchTab('search', this.searchTabEl));
		this.idTabEl.addEventListener('click', () => this.switchTab('id', this.idTabEl));
		this.manualTabEl.addEventListener('click', () => this.switchTab('manual', this.manualTabEl));

		// Disable API tabs in offline mode
		if (this.offlineMode) {
			this.urlTabEl.addClass('audiobook-tab-disabled');
			this.searchTabEl.addClass('audiobook-tab-disabled');
			this.idTabEl.addClass('audiobook-tab-disabled');
		}
	}

	/**
	 * Switch active tab
	 */
	private switchTab(tab: 'url' | 'search' | 'id' | 'manual', tabEl: HTMLElement) {
		if (this.offlineMode && tab !== 'manual') {
			new Notice('Online features disabled in offline mode');
			return;
		}

		this.activeTab = tab;

		// Update tab styling
		this.tabContentContainer.parentElement?.querySelectorAll('.audiobook-tab').forEach(t => {
			t.removeClass('audiobook-tab-active');
		});
		tabEl.addClass('audiobook-tab-active');

		// Show/hide content
		this.urlTabContent.style.display = tab === 'url' ? 'block' : 'none';
		this.searchTabContent.style.display = tab === 'search' ? 'block' : 'none';
		this.idTabContent.style.display = tab === 'id' ? 'block' : 'none';
		this.manualTabContent.style.display = tab === 'manual' ? 'block' : 'none';
	}

	/**
	 * Build URL input tab
	 */
	private buildUrlTab() {
		let urlInput = '';

		new Setting(this.urlTabContent)
			.setName('Media URL')
			.setDesc('Enter a URL from any supported provider')
			.addText(text => {
				text.setPlaceholder('https://www.audible.com/pd/...');
				text.onChange(value => urlInput = value);
				
				// Add Enter key listener
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						if (!urlInput) {
							new Notice('Please enter a URL');
							return;
						}
						void this.fetchByUrl(urlInput);
					}
				});
			});

		new Setting(this.urlTabContent)
			.addButton(btn => {
				btn.setButtonText('Fetch metadata')
					.setCta()
					.onClick(async () => {
						if (!urlInput) {
							new Notice('Please enter a URL');
							return;
						}
						await this.fetchByUrl(urlInput);
					});
			});
	}

	/**
	 * Build search tab
	 */
	private buildSearchTab() {
		let searchQuery = '';
		const resultsContainer = this.searchTabContent.createDiv({cls: 'audiobook-search-results'});

		new Setting(this.searchTabContent)
			.setName('Search')
			.setDesc('Search for media by title, author, or keyword')
			.addText(text => {
				text.setPlaceholder('Title or author');
				text.onChange(value => searchQuery = value);
				
				// Add Enter key listener
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						if (!searchQuery) {
							new Notice('Please enter a search query');
							return;
						}
						void this.searchAudiobooks(searchQuery, resultsContainer);
					}
				});
			});

		new Setting(this.searchTabContent)
			.addButton(btn => {
				btn.setButtonText('Search')
					.setCta()
					.onClick(async () => {
						if (!searchQuery) {
							new Notice('Please enter a search query');
							return;
						}
						await this.searchAudiobooks(searchQuery, resultsContainer);
					});
			});
	}

	/**
	 * Build ID input tab
	 */
	private buildIdTab() {
		let idInput = '';

		new Setting(this.idTabContent)
			.setName('Media ID')
			.setDesc('Enter a book identifier from any provider')
			.addText(text => {
			text.setPlaceholder('B07XYZ123');
				text.onChange(value => idInput = value);
				
				// Add Enter key listener
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						if (!idInput) {
							new Notice('Please enter an ID');
							return;
						}
						void this.fetchById(idInput);
					}
				});
			});

		new Setting(this.idTabContent)
			.addButton(btn => {
				btn.setButtonText('Fetch metadata')
					.setCta()
					.onClick(async () => {
						if (!idInput) {
							new Notice('Please enter an ID');
							return;
						}
						await this.fetchById(idInput);
					});
			});
	}

	/**
	 * Build manual entry tab
	 */
	private buildManualTab() {
		const metadata: Partial<MediaMetadata> = {
			provider: 'manual'
		};

		// Helper function to submit manual entry
		const submitManualEntry = () => {
			if (!metadata.title) {
				new Notice('Title is required');
				return;
			}
			this.onSubmit(metadata as MediaMetadata);
			this.close();
		};

		// Helper function to add Enter key listener
		const addEnterListener = (textComponent: { inputEl: HTMLInputElement }) => {
			textComponent.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
				if (event.key === 'Enter') {
					submitManualEntry();
				}
			});
		};

		new Setting(this.manualTabContent)
			.setName('Title')
			.addText(text => {
				text.setPlaceholder('Media title');
				text.onChange(value => metadata.title = value);
				addEnterListener(text);
			});

		new Setting(this.manualTabContent)
			.setName('Author(s)')
			.setDesc('Separate multiple authors with commas')
			.addText(text => {
				text.setPlaceholder('Author name');
				text.onChange(value => {
					metadata.author = value.split(',').map(a => a.trim()).filter(a => a);
				});
				addEnterListener(text);
			});

		new Setting(this.manualTabContent)
			.setName('Narrator(s)')
			.setDesc('Separate multiple narrators with commas')
			.addText(text => {
				text.setPlaceholder('Narrator name');
				text.onChange(value => {
					metadata.narrator = value.split(',').map(n => n.trim()).filter(n => n);
				});
				addEnterListener(text);
			});

		new Setting(this.manualTabContent)
			.setName('Duration')
			.addText(text => {
				text.setPlaceholder('10h 30m');
				text.onChange(value => metadata.duration = value);
				addEnterListener(text);
			});

		new Setting(this.manualTabContent)
			.setName('Publisher')
			.addText(text => {
				text.setPlaceholder('Publisher name');
				text.onChange(value => metadata.publisher = value);
				addEnterListener(text);
			});

		new Setting(this.manualTabContent)
			.setName('Cover URL')
			.addText(text => {
				text.setPlaceholder('Cover URL');
				text.onChange(value => metadata.coverUrl = value);
				addEnterListener(text);
			});

		new Setting(this.manualTabContent)
			.addButton(btn => {
				btn.setButtonText('Create')
					.setCta()
					.onClick(submitManualEntry);
			});
	}

	/**
	 * Fetch metadata by URL
	 */
	private async fetchByUrl(url: string) {
		try {
			const metadata = await this.provider.fetchByUrl(url);
			if (metadata) {
				this.onSubmit(metadata);
				this.close();
			} else {
				new Notice('Could not fetch metadata from URL');
			}
		} catch (error) {
			console.error('Error fetching by URL:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error: ${errorMessage}`);
		}
	}

	/**
	 * Fetch metadata by ID
	 */
	private async fetchById(id: string, fallback?: MediaMetadata) {
		try {
			const metadata = (await this.provider.fetchById(id)) ?? fallback ?? null;
			if (metadata) {
				this.onSubmit(metadata);
				this.close();
			} else {
				new Notice('Could not fetch metadata for ID');
			}
		} catch (error) {
			console.error('Error fetching by ID:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error: ${errorMessage}`);
		}
	}

	/**
	 * Search for audiobooks
	 */
	private async searchAudiobooks(query: string, container: HTMLElement) {
		container.empty();
		
		try {
			const results = await this.provider.search(query);
			
			if (results.length === 0) {
				container.createDiv({text: 'No results found', cls: 'audiobook-search-empty'});
				return;
			}

			results.forEach(result => {
				const resultItem = container.createDiv({cls: 'audiobook-search-item'});
				const metadata = result.metadata;
				
				if (metadata.coverUrl) {
					resultItem.createEl('img', {
						cls: 'audiobook-search-thumbnail',
						attr: {src: metadata.coverUrl, alt: metadata.title}
					});
				}

				const infoDiv = resultItem.createDiv({cls: 'audiobook-search-info'});
				infoDiv.createEl('strong', {text: metadata.title});
				if (metadata.author && metadata.author.length > 0) {
					infoDiv.createDiv({text: metadata.author.join(', '), cls: 'audiobook-search-author'});
				}

				const selectBtn = resultItem.createEl('button', {text: 'Select', cls: 'mod-cta'});
				selectBtn.addEventListener('click', () => {
					void this.fetchById(metadata.id, metadata);
				});
			});
		} catch (error) {
			console.error('Error searching:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Search error: ${errorMessage}`);
		}
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
