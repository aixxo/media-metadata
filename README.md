# Audiobook Metadata Plugin for Obsidian

An Obsidian Community Plugin for retrieving and managing audiobook metadata with support for multiple providers.

## ⚠️ Disclaimer

**IMPORTANT:** This plugin was created using AI (GitHub Copilot). Please note:

- **Create a complete backup of your vault before using**
- **Use at your own risk**
- The plugin is in active development and may contain bugs
- Test the plugin in a test vault first before using it productively

## Features

### 📚 Multi-Provider Support
- **Audible** (fully implemented - DE, UK, US)
- **Google Books API** (fully implemented)
- **Open Library** (Placeholder, in development)
- **iTunes/Apple Books** (Placeholder, in development)

### 🎯 Flexible Data Input
- **URL Import**: Directly from provider URLs
- **Search**: Search by title, author, or keyword
- **ID Import**: Via ASIN, ISBN, or provider-specific IDs
- **Manual Entry**: Offline mode for manual data entry

### 🎨 Markdown Integration
- **YAML Frontmatter**: Structured metadata in frontmatter
- **Audiobook Cards**: Visual representation with cover, rating, genres
- **Custom Code Blocks**: Use `audiobook` code blocks for visual cards

### ⚡ Performance Features
- **Rate Limiting**: Configurable (1-20 requests/minute, default: 5)
- **Intelligent Cache**: TTL-based with automatic cleanup (1-168h, default: 24h)
- **Persistent Storage**: Cache survives Obsidian restarts

### 🖼️ Cover Management
- **Local Storage**: Covers as files in vault (default)
- **URL Mode**: Use external URLs without download
- **Automatic Organization**: Covers in `_covers/` subfolder

### 🛠️ Configurable
- **Output Folder**: Selectable target folder (default: "Audiobooks")
- **Offline Mode**: Work without API access
- **Provider Selection**: Switch between different data sources
- **Audible Region**: Choose between DE, UK, US

## Installation

### Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder: `<Vault>/.obsidian/plugins/audiobook-metadata/`
3. Copy the three files into this folder
4. Restart Obsidian or reload plugins
5. Enable the plugin in **Settings → Community Plugins**

### From Community Store (planned)
1. Open **Settings → Community Plugins → Browse**
2. Search for "Audiobook Metadata"
3. Click **Install** and then **Enable**

## Usage

### Commands

All commands are available via the Command Palette (Ctrl/Cmd + P):

| Command | Description | Shortcut |
|---------|-------------|----------|
| **Add audiobook from URL** | Fetch metadata from a provider URL | - |
| **Search and add audiobook** | Search for and add audiobooks | - |
| **Add audiobook from ID (ASIN/ISBN)** | Import directly via ID | - |
| **Refresh audiobook metadata** | Update metadata for current file | - |
| **Clear audiobook metadata cache** | Manually clear cache | - |

### Audiobook Cards in Markdown

Insert a visual audiobook card by creating an `audiobook` code block:

````markdown
```audiobook
title: "Der Name des Windes"
author: "Patrick Rothfuss"
narrator: "Rufus Beck"
duration: "27h 52m"
publisher: "Knaur Hörverlag"
genre: "Fantasy, Epos"
rating: 4.5
cover: "Audiobooks/_covers/Patrick_Rothfuss_-_Der_Name_des_Windes.jpg"
series: "Die Königsmörder-Chronik - Buch 1"
```
````

**The card automatically renders with:**
- 📷 Cover image (if available)
- 📖 Title and author
- 🎙️ Narrator
- ⏱️ Duration
- 📚 Publisher
- ⭐ Star rating with numeric value
- 🏷️ Genre tags (pill-style)
- 📕 Series information (if applicable)

### Example: Complete Audiobook

After importing via command "Add audiobook from URL", the plugin automatically creates a file like:

```markdown
---
title: "Der Name des Windes"
subtitle: "Die Königsmörder-Chronik - Erster Tag"
author: "Patrick Rothfuss"
narrator: "Rufus Beck"
publisher: "Knaur Hörverlag"
published: "2021-03-15"
language: "de"
duration: "27h 52m"
genre:
  - "Fantasy"
  - "Epos"
series: "Die Königsmörder-Chronik"
series_position: "1"
rating: 4.5
rating_count: 12543
cover: "Audiobooks/_covers/Patrick_Rothfuss_-_Der_Name_des_Windes.jpg"
isbn: "9783426522783"
asin: "B08XYZ123"
provider: "googlebooks"
source_url: "https://books.google.com/books?id=..."
retrieved_at: "2024-03-08T11:30:45.123Z"
---

# Der Name des Windes
*Die Königsmörder-Chronik - Erster Tag*

```audiobook
title: "Der Name des Windes"
author: "Patrick Rothfuss"
narrator: "Rufus Beck"
duration: "27h 52m"
publisher: "Knaur Hörverlag"
genre: "Fantasy, Epos"
rating: 4.5
cover: "Audiobooks/_covers/Patrick_Rothfuss_-_Der_Name_des_Windes.jpg"
series: "Die Königsmörder-Chronik - Buch 1"
```

## Description

[API description will be inserted here]

## Notes

<!-- Add your notes here -->
```

### Workflow Examples

#### 1. Import from Google Books URL
```
1. Copy the URL: https://books.google.com/books?id=abc123
2. Open Command Palette (Cmd/Ctrl + P)
3. Select "Add audiobook from URL"
4. "URL" tab is already active
5. Paste the URL → "Fetch Metadata"
6. File is automatically created and opened
```

#### 2. Search by Title
```
1. Command Palette → "Search and add audiobook"
2. Switch to "Search" tab
3. Enter: "Harry Potter"
4. Click "Search"
5. Select from search results
6. File is created
```

#### 3. Offline/Manual Entry
```
1. Enable "Offline Mode" in Settings
2. Command Palette → "Add audiobook from URL"
3. "Manual" tab is automatically selected
4. Fill in fields (title required)
5. Click "Create"
```

## Settings

### General Settings

**Default Output Folder**
- Default: `Audiobooks`
- Target folder for new audiobook files

### API Provider

**API Provider**
- **Audible** (Default): Audiobook-specific with complete metadata (narrator, series, etc.)
- **Google Books**: Ready to use, extensive library (but less audiobook data)
- **Open Library**: Free library, in development  
- **iTunes/Apple Books**: Apple ecosystem, in development

**Audible Country** (only visible when Audible is selected)
- DE: Germany
- UK: United Kingdom
- US: United States

**Offline Mode**
- Disabled (Default): All online features available
- Enabled: Manual entry only, no API calls

### Performance Settings

**Rate Limiting**
- **Enabled**: Protects against too many API requests (recommended)
- **Requests per Minute**: 1-20 (Default: 5)
  - Lower values = more conservative
  - Higher values = faster, but riskier
  - Per Provider: Separate rate limiter for each provider

**Caching**
- **Enabled**: Significantly reduces API calls (recommended)
- **Cache Duration (hours)**: 1-168 (Default: 24)
  - How long metadata stays in cache
  - Automatic cleanup every 24h
  - Manual deletion via command possible

### Cover Settings

**Cover Storage**
- **Local** (Default): Downloads to `<Output-Folder>/_covers/`
  - Works offline
  - No external dependencies
  - Uses vault storage
- **URL**: Uses external links
  - No download
  - Requires internet connection for display
  - Saves storage space

## Technical Details

### Project Structure

```
obsidian-book-metadata/
├── src/
│   ├── main.ts                           # Plugin Entry Point
│   ├── settings.ts                       # Settings UI & Types
│   ├── models/
│   │   └── AudiobookMetadata.ts         # Central Data Models
│   ├── services/
│   │   ├── IMetadataProvider.ts         # Provider Interface
│   │   ├── MetadataProviderFactory.ts   # Provider Management
│   │   ├── GoogleBooksApiService.ts     # Google Books ✓
│   │   ├── AudibleApiService.ts         # Placeholder
│   │   ├── OpenLibraryApiService.ts     # Placeholder
│   │   ├── ITunesApiService.ts          # Placeholder
│   │   ├── MarkdownGenerator.ts         # Frontmatter Generator
│   │   ├── FileCreator.ts               # Vault Operations
│   │   ├── ImageDownloadService.ts      # Cover Download
│   │   └── cache/
│   │       ├── CacheService.ts          # TTL Cache
│   │       └── CacheCleanup.ts          # Auto-Cleanup
│   ├── ui/
│   │   ├── AudiobookCardRenderer.ts     # Code Block Renderer
│   │   └── AudiobookInputModal.ts       # 4-Tab Modal
│   ├── commands/
│   │   └── AudiobookCommands.ts         # Command Handler
│   └── utils/
│       └── RateLimiter.ts               # Token-Bucket
├── styles.css                            # Plugin Styles
├── manifest.json                         # Plugin Manifest
├── main.js                               # Bundled Output
└── README.md                             # This File
```

### Architecture Principles

**Modular & Extensible**
- Interface-based providers (IMetadataProvider)
- Decorator pattern for rate limiting & caching
- Factory pattern for provider instantiation
- Easy addition of new providers

**Performance-Optimized**
- Token-bucket rate limiter for even API usage
- TTL-based cache with automatic invalidation
- Lazy loading of services
- Persistent cache survives plugin restarts

**Obsidian Best Practices**
- Native Settings API
- Safe Vault API usage
- Modal API for consistent UX
- Markdown Post Processor for code blocks
- Proper cleanup in onunload

### Data Model

```typescript
interface AudiobookMetadata {
  id: string;
  provider: string;
  
  // Basics
  title: string;
  subtitle?: string;
  author?: string[];
  narrator?: string[];
  
  // Details
  publisher?: string;
  publishedDate?: string;
  language?: string;
  duration?: string;
  description?: string;
  genre?: string[];
  
  // Series
  series?: string;
  seriesPosition?: string;
  
  // Ratings
  rating?: number;
  ratingCount?: number;
  
  // Cover
  coverUrl?: string;
  coverLocalPath?: string;
  
  // IDs
  isbn?: string;
  isbn13?: string;
  asin?: string;
  
  // Meta
  retrievedAt?: string;
  url?: string;
}
```

## Development

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/obsidian-audiobook-metadata.git
cd obsidian-audiobook-metadata

# Install dependencies
npm install

# Development build (with watch mode)
npm run dev

# Production build
npm run build

# Linting
npm run lint
```

### Testing in Vault

```bash
# Option 1: Symlink (recommended for development)
ln -s $(pwd) /path/to/vault/.obsidian/plugins/audiobook-metadata

# Option 2: Copy
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/audiobook-metadata/
```

After changes:
1. Reload plugin in Obsidian (Cmd/Ctrl + R in Developer Mode)
2. Or: Disable/enable plugin in Settings

### Adding a New Provider

1. **Create service** in `src/services/`
```typescript
export class MyProviderApiService implements IMetadataProvider {
  getProviderId(): string { return 'myprovider'; }
  
  supportsUrl(url: string): boolean {
    return url.includes('myprovider.com');
  }
  
  async fetchById(id: string): Promise<AudiobookMetadata | null> {
    // Implementation
  }
  
  // ... additional methods
}
```

2. **Extend factory** in `MetadataProviderFactory.ts`
```typescript
case 'myprovider':
  return new MyProviderApiService();
```

3. **Update settings** in `settings.ts`
```typescript
export type ApiProvider = "audible" | "googlebooks" | "openlibrary" | "itunes" | "myprovider";
```

## Troubleshooting

### Plugin doesn't load
- Check if all three files are present: `main.js`, `manifest.json`, `styles.css`
- Restart Obsidian
- Check the Developer Console (Cmd/Ctrl + Shift + I) for errors

### "No results found" during search
- Google Books API may not have any matches
- Try different search terms
- Check your internet connection
- Rate limit may be reached (wait 1 minute)

### Cover not displayed
- Check if cover was saved locally in `<Folder>/_covers/`
- In URL mode: Internet connection required
- Cover URL might be invalid
- Check file permissions in vault

### Cache issues
- Clear cache manually: Command "Clear audiobook metadata cache"
- Cache file: `.obsidian/plugins/audiobook-metadata/data.json`
- Reduce Cache Duration in Settings

## Known Limitations

1. **Audible API**
   - Uses Audnex API (third-party) for metadata
   - Official Audible API for search
   - Rate limits must be observed (hence rate limiter implemented)
   - Only DE, UK, US regions available

2. **Google Books API**
   - Not all books have audiobook-specific data (narrator, duration)
   - Rate limits apply (hence rate limiter implemented)
   - Some regions have restricted access

3. **Open Library/iTunes**
   - Currently placeholders only
   - Will be implemented in future versions

3. **Cover Download**
   - Only works with available cover URLs
   - Image quality depends on provider
   - No automatic scaling

4. **Offline Mode**
   - No API features available
   - Only manual entry possible
   - Cover URLs don't work

## Contributing

Contributions are welcome! 

### How to Contribute

1. **Bug Reports**: [GitHub Issues](https://github.com/aixxo/audiobook-metadata/issues)
2. **Feature Requests**: [GitHub Discussions](https://github.com/aixxo/audiobook-metadata/discussions)
3. **Pull Requests**:
   ```bash
   git checkout -b feature/AmazingFeature
   git commit -m 'Add AmazingFeature'
   git push origin feature/AmazingFeature
   ```
4. **Documentation**: Improvements to README, code comments
5. **Testing**: Test new features, report bugs

### Code Style
- TypeScript with `strict: true`
- ESLint for code quality
- Comments in English in code
- User-facing strings in English (or localized)

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/aixxo/audiobook-metadata/issues)
- **Discussions**: [GitHub Discussions](https://github.com/aixxo/audiobook-metadata/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Obsidian Team** for the excellent plugin API and documentation
- **Google Books** for the free API
- **Community** for feedback, testing, and contributions
- **GitHub Copilot** for development support

## Changelog
### v0.3.0 (2026-03-08) - Support own frontmatter fields & batch update
- ✨ **Custom frontmatter fields**
  - Define any key-value pairs in settings
  - Automatically added to new audiobook files
  - Supports string, number, boolean types
- 🔄 **Batch update existing files**
    - Apply new custom fields to existing audiobook files

### v0.2.0 (2026-03-08) - Audible Integration
- ✨ **Audible API fully implemented**
  - ASIN-based search via Audnex API
  - URL import from Audible links
  - Text search via official Audible API
  - Multi-region support (DE, UK, US)
- 🎙️ **Audiobook-specific metadata**
  - Narrator information
  - Precise duration data
  - Series support (Primary & Secondary)
  - Genre filtering (true genres vs. tags)
- 🔧 **Data processing**
  - Automatic series position cleanup
  - Duration formatting (minutes → readable)
  - ASIN validation
- 🌍 **Region-specific URLs** for Audible.de/.co.uk/.com

### v0.1.0 (2026-03-08) - Initial Release
- ✨ Multi-provider architecture
- ✅ Google Books API fully implemented
- 🎨 Visual audiobook cards via code blocks
- 📝 Automatic frontmatter generation
- ⚡ Rate limiting & caching
- 🖼️ Cover download with local storage
- 🛠️ 4-tab input modal (URL/Search/ID/Manual)
- 📱 Offline mode
- 🎛️ Complete settings integration
- 🔧 5 commands for different workflows

---

**Version**: 0.3.0  
**Status**: Beta  
**Last Update**: March 8, 2024  
**Compatibility**: Obsidian 0.15.0+
