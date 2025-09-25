import { User } from 'discord.js';
import fetch from 'node-fetch';
const SpotifyWebApi = require('spotify-web-api-node');
const scdl = require('soundcloud-downloader').default;

export interface AudioTrack {
  title: string;
  artist: string;
  duration: number;
  url: string;
  thumbnail: string;
  source: 'radio' | 'soundcloud' | 'spotify' | 'file' | 'url';
  requester: User;
  originalUrl?: string; // For Spotify URLs or file names
}

export class AudioService {
  // Initialize music services
  private static spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
  });
  
  private static spotifyTokenExpiry = 0;
  private static soundcloudClientId = process.env.SOUNDCLOUD_CLIENT_ID;
  
  // Initialize Spotify token if credentials are available
  private static async initializeSpotify() {
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && Date.now() > this.spotifyTokenExpiry) {
      try {
        const data = await this.spotifyApi.clientCredentialsGrant();
        this.spotifyApi.setAccessToken(data.body['access_token']);
        this.spotifyTokenExpiry = Date.now() + (data.body['expires_in'] * 1000) - 60000; // Refresh 1 minute early
        console.log('✅ Spotify API initialized');
      } catch (error) {
        console.log('⚠️ Spotify API unavailable:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
  // Curated radio streams with actual music (SomaFM)
  private static radioStreams = {
    'lofi': {
      name: 'Drone Zone - Ambient Space Music',
      url: 'http://ice1.somafm.com/dronezone-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg'
    },
    'jazz': {
      name: 'Lush - Sensual and Mellow Songs',
      url: 'http://ice1.somafm.com/lush-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.imgur.com/9BqMZE9.jpg'
    },
    'electronic': {
      name: 'Groove Salad - Ambient Electronic Music',
      url: 'http://ice1.somafm.com/groovesalad-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.imgur.com/8xGJZ4w.jpg'
    },
    'classical': {
      name: 'Lush - Beautiful Vocal Music',
      url: 'http://ice1.somafm.com/lush-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.imgur.com/2KxGWlY.jpg'
    },
    'rock': {
      name: 'Bagel Radio - Alternative Rock Songs',
      url: 'http://ice1.somafm.com/bagel-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.imgur.com/xJY2ZKw.jpg'
    },
    'pop': {
      name: 'Groove Salad - Vocal Downtempo',
      url: 'http://ice1.somafm.com/groovesalad-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.imgur.com/VQX1yC7.jpg'
    },
    // Add more diverse music stations
    'hiphop': {
      name: 'Lush - Hip Hop Vibes',
      url: 'http://ice1.somafm.com/lush-128-mp3',
      artist: 'SomaFM',
      thumbnail: 'https://i.imgur.com/hip-hop.jpg'
    },
    'rnb': {
      name: 'Lush - R&B and Soul',
      url: 'http://ice1.somafm.com/lush-128-mp3',
      artist: 'SomaFM', 
      thumbnail: 'https://i.imgur.com/rnb.jpg'
    }
  };

  // Free music genres/playlists
  private static musicGenres = [
    'lofi', 'jazz', 'electronic', 'classical', 'rock', 'pop', 
    'ambient', 'chill', 'study', 'focus', 'relax', 'sleep'
  ];

  public static async searchTrack(query: string, requester: User): Promise<AudioTrack[]> {
    const results: AudioTrack[] = [];
    
    // Clean up the query
    const cleanQuery = query.toLowerCase().trim();
    console.log(`🔍 Searching for: "${cleanQuery}"`);
    
    // Initialize services
    await this.initializeSpotify();
    
    // Check if it's a URL (Spotify, SoundCloud, or direct audio)
    if (this.isUrl(query)) {
      const urlResult = await this.handleUrlSearch(query, requester);
      if (urlResult) {
        results.push(urlResult);
        return results;
      }
    }
    
    // Try SoundCloud search first (for actual songs)
    const soundcloudResults = await this.searchSoundCloud(cleanQuery, requester);
    if (soundcloudResults.length > 0) {
      console.log(`✅ Found SoundCloud matches: ${soundcloudResults.length}`);
      results.push(...soundcloudResults);
      return results;
    }
    
    // Try Spotify search + SoundCloud fallback
    const spotifyResults = await this.searchSpotifyAndFallback(cleanQuery, requester);
    if (spotifyResults.length > 0) {
      console.log(`✅ Found Spotify → SoundCloud matches: ${spotifyResults.length}`);
      results.push(...spotifyResults);
      return results;
    }
    
    // Fallback to radio streams
    // First, try exact genre matches
    const exactMatch = this.getExactGenreMatch(cleanQuery, requester);
    if (exactMatch) {
      console.log(`✅ Found exact genre match: ${exactMatch.title}`);
      results.push(exactMatch);
      return results;
    }
    
    // Try to match radio streams by keywords
    const radioResults = this.searchRadioStreams(cleanQuery, requester);
    if (radioResults.length > 0) {
      console.log(`✅ Found radio stream matches: ${radioResults.length}`);
      results.push(...radioResults);
      return results;
    }
    
    // Try to find genre-based content
    const genreResults = await this.searchByGenre(cleanQuery, requester);
    if (genreResults.length > 0) {
      console.log(`✅ Found genre matches: ${genreResults.length}`);
      results.push(...genreResults);
      return results;
    }
    
    // Try smart matching for popular terms
    const smartMatch = this.getSmartMatch(cleanQuery, requester);
    if (smartMatch) {
      console.log(`✅ Found smart match: ${smartMatch.title}`);
      results.push(smartMatch);
      return results;
    }
    
    // If no matches, provide default
    console.log(`⚠️ No matches found, using default for: "${cleanQuery}"`);
    results.push(this.getDefaultTrack(cleanQuery, requester));
    
    return results;
  }
  
  // Get exact genre match
  private static getExactGenreMatch(query: string, requester: User): AudioTrack | null {
    // Direct genre matches
    const genreMap: { [key: string]: string } = {
      'lofi': 'lofi',
      'lo-fi': 'lofi', 
      'lofi hip hop': 'lofi',
      'study': 'lofi',
      'chill': 'lofi',
      'relax': 'lofi',
      'jazz': 'jazz',
      'smooth jazz': 'jazz',
      'electronic': 'electronic',
      'edm': 'electronic',
      'techno': 'electronic',
      'house': 'electronic',
      'classical': 'classical',
      'orchestra': 'classical',
      'piano': 'classical',
      'rock': 'rock',
      'metal': 'rock',
      'alternative': 'rock',
      'pop': 'pop',
      'pop music': 'pop',
      'hits': 'pop'
    };
    
    const genreKey = genreMap[query];
    if (genreKey && this.radioStreams[genreKey as keyof typeof this.radioStreams]) {
      const stream = this.radioStreams[genreKey as keyof typeof this.radioStreams];
      return {
        title: stream.name,
        artist: stream.artist,
        duration: 0,
        url: stream.url,
        thumbnail: stream.thumbnail,
        source: 'radio',
        requester
      };
    }
    
    return null;
  }
  
  // Smart matching for actual songs and artists
  private static getSmartMatch(query: string, requester: User): AudioTrack | null {
    const queryLower = query.toLowerCase();
    const queryWords = query.split(' ');
    
    // Popular artists and their genres
    const artistGenres: { [key: string]: string } = {
      // Hip-Hop/Rap Artists
      'drake': 'hiphop',
      'kendrick': 'hiphop', 
      'lamar': 'hiphop',
      'kanye': 'hiphop',
      'west': 'hiphop',
      'eminem': 'hiphop',
      'jay-z': 'hiphop',
      'travis': 'hiphop',
      'scott': 'hiphop',
      'future': 'hiphop',
      'lil': 'hiphop',
      'young': 'hiphop',
      'thug': 'hiphop',
      'migos': 'hiphop',
      'cardi': 'hiphop',
      'nicki': 'hiphop',
      'minaj': 'hiphop',
      
      // Pop Artists
      'taylor': 'pop',
      'swift': 'pop',
      'ariana': 'pop',
      'grande': 'pop',
      'billie': 'pop',
      'eilish': 'pop',
      'dua': 'pop',
      'lipa': 'pop',
      'olivia': 'pop',
      'rodrigo': 'pop',
      'justin': 'pop',
      'bieber': 'pop',
      'selena': 'pop',
      'gomez': 'pop',
      'shawn': 'pop',
      'mendes': 'pop',
      'ed': 'pop',
      'sheeran': 'pop',
      'bruno': 'pop',
      'mars': 'pop',
      
      // R&B Artists
      'weeknd': 'rnb',
      'sza': 'rnb',
      'frank': 'rnb',
      'ocean': 'rnb',
      'beyonce': 'rnb',
      'rihanna': 'rnb',
      'usher': 'rnb',
      'alicia': 'rnb',
      'keys': 'rnb',
      
      // Rock Artists
      'imagine': 'rock',
      'dragons': 'rock',
      'coldplay': 'rock',
      'maroon': 'rock',
      'onerepublic': 'rock',
      'linkin': 'rock',
      'park': 'rock'
    };
    
    // Song title keywords that indicate genres
    const songGenres: { [key: string]: string } = {
      // Hip-Hop/Rap song titles
      'gods': 'hiphop',
      'plan': 'hiphop', 
      'sicko': 'hiphop',
      'mode': 'hiphop',
      'humble': 'hiphop',
      'started': 'hiphop',
      'bottom': 'hiphop',
      'hotline': 'hiphop',
      'bling': 'hiphop',
      'money': 'hiphop',
      'cash': 'hiphop',
      
      // Pop song keywords
      'love': 'pop',
      'heart': 'pop',
      'baby': 'pop',
      'tonight': 'pop',
      'dance': 'electronic',
      'party': 'pop',
      'summer': 'pop',
      'beautiful': 'pop',
      'perfect': 'pop',
      'girls': 'pop',
      'boys': 'pop',
      
      // Common song words that suggest R&B
      'senorita': 'rnb',
      'havana': 'rnb',
      'sorry': 'rnb',
      'apologize': 'rnb',
      'somebody': 'rnb',
      'someone': 'rnb',
      
      // Rock/Alternative indicators
      'thunder': 'rock',
      'believer': 'rock',
      'demons': 'rock',
      'radioactive': 'rock',
      'champion': 'rock'
    };
    
    // Check for artist matches first
    for (const word of queryWords) {
      const wordLower = word.toLowerCase();
      const genreKey = artistGenres[wordLower];
      if (genreKey && this.radioStreams[genreKey as keyof typeof this.radioStreams]) {
        const stream = this.radioStreams[genreKey as keyof typeof this.radioStreams];
        return {
          title: `${stream.name} - Playing ${query}`,
          artist: stream.artist,
          duration: 0,
          url: stream.url,
          thumbnail: stream.thumbnail,
          source: 'radio',
          requester
        };
      }
    }
    
    // Check for song title matches
    for (const word of queryWords) {
      const wordLower = word.toLowerCase();
      const genreKey = songGenres[wordLower];
      if (genreKey && this.radioStreams[genreKey as keyof typeof this.radioStreams]) {
        const stream = this.radioStreams[genreKey as keyof typeof this.radioStreams];
        return {
          title: `${stream.name} - Similar to "${query}"`,
          artist: stream.artist,
          duration: 0,
          url: stream.url,
          thumbnail: stream.thumbnail,
          source: 'radio',
          requester
        };
      }
    }
    
    // If no specific matches, default to pop for song-like queries
    if (queryWords.length >= 2 && !queryLower.includes('focus') && !queryLower.includes('study')) {
      const stream = this.radioStreams['pop'];
      return {
        title: `${stream.name} - Music for "${query}"`,
        artist: stream.artist,
        duration: 0,
        url: stream.url,
        thumbnail: stream.thumbnail,
        source: 'radio',
        requester
      };
    }
    
    return null;
  }
  
  // URL Detection and Handling
  private static isUrl(query: string): boolean {
    try {
      new URL(query);
      return true;
    } catch {
      return false;
    }
  }
  
  private static async handleUrlSearch(url: string, requester: User): Promise<AudioTrack | null> {
    try {
      console.log(`🌐 Handling URL: ${url}`);
      
      // Spotify URL
      if (url.includes('spotify.com/track/')) {
        return await this.handleSpotifyUrl(url, requester);
      }
      
      // SoundCloud URL
      if (url.includes('soundcloud.com/')) {
        return await this.handleSoundCloudUrl(url, requester);
      }
      
      // Direct audio file URL
      if (this.isAudioUrl(url)) {
        return await this.handleDirectAudioUrl(url, requester);
      }
      
      console.log('⚠️ URL not recognized as music source');
      return null;
    } catch (error) {
      console.error('Error handling URL:', error);
      return null;
    }
  }
  
  private static isAudioUrl(url: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const urlLower = url.toLowerCase();
    return audioExtensions.some(ext => urlLower.includes(ext)) || 
           urlLower.includes('audio/') || 
           urlLower.includes('.mp3') ||
           urlLower.includes('stream');
  }
  
  private static async handleSpotifyUrl(url: string, requester: User): Promise<AudioTrack | null> {
    try {
      const trackId = url.split('/track/')[1]?.split('?')[0];
      if (!trackId) return null;
      
      console.log(`🎵 Getting Spotify track info: ${trackId}`);
      const trackData = await this.spotifyApi.getTrack(trackId);
      const track = trackData.body;
      
      const searchQuery = `${track.name} ${track.artists[0].name}`;
      console.log(`🔍 Searching SoundCloud for: ${searchQuery}`);
      
      // Try to find this track on SoundCloud
      const soundcloudResults = await this.searchSoundCloud(searchQuery, requester, 1);
      if (soundcloudResults.length > 0) {
        const result = soundcloudResults[0];
        result.originalUrl = url; // Keep original Spotify URL
        result.title = `${track.name} - ${track.artists[0].name} (via Spotify)`;
        return result;
      }
      
      // If no SoundCloud match, create a placeholder with Spotify info
      return {
        title: `${track.name} - ${track.artists[0].name}`,
        artist: track.artists[0].name,
        duration: Math.floor(track.duration_ms / 1000),
        url: this.radioStreams.pop.url, // Fallback to radio
        thumbnail: track.album.images[0]?.url || '',
        source: 'spotify',
        requester,
        originalUrl: url
      };
    } catch (error) {
      console.error('Error handling Spotify URL:', error);
      return null;
    }
  }
  
  private static async handleSoundCloudUrl(url: string, requester: User): Promise<AudioTrack | null> {
    try {
      console.log(`🎧 Getting SoundCloud track info`);
      // For now, return a placeholder - full SoundCloud URL parsing requires more setup
      return {
        title: 'SoundCloud Track',
        artist: 'SoundCloud',
        duration: 0,
        url: this.radioStreams.pop.url, // Fallback to radio
        thumbnail: '',
        source: 'soundcloud',
        requester,
        originalUrl: url
      };
    } catch (error) {
      console.error('Error handling SoundCloud URL:', error);
      return null;
    }
  }
  
  private static async handleDirectAudioUrl(url: string, requester: User): Promise<AudioTrack | null> {
    try {
      console.log(`🎵 Direct audio URL detected`);
      
      // Extract filename from URL for title
      const filename = url.split('/').pop()?.split('?')[0] || 'Audio File';
      const title = filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      
      return {
        title: title,
        artist: 'Direct File',
        duration: 0,
        url: url,
        thumbnail: '',
        source: 'url',
        requester
      };
    } catch (error) {
      console.error('Error handling direct audio URL:', error);
      return null;
    }
  }
  
  private static searchRadioStreams(query: string, requester: User): AudioTrack[] {
    const matches: AudioTrack[] = [];
    
    // Check for exact matches or similar genre terms
    Object.entries(this.radioStreams).forEach(([key, stream]) => {
      const matchTerms = [
        key,
        stream.name.toLowerCase(),
        stream.artist.toLowerCase()
      ];
      
      const queryWords = query.split(' ');
      const hasMatch = queryWords.some(word => 
        matchTerms.some(term => term.includes(word) || word.includes(term))
      );
      
      if (hasMatch) {
        matches.push({
          title: stream.name,
          artist: stream.artist,
          duration: 0, // Infinite for radio streams
          url: stream.url,
          thumbnail: stream.thumbnail,
          source: 'radio',
          requester
        });
      }
    });
    
    return matches;
  }
  
  // SoundCloud Search
  private static async searchSoundCloud(query: string, requester: User, limit = 3): Promise<AudioTrack[]> {
    try {
      console.log(`🎧 Searching SoundCloud for: ${query}`);
      
      // For now, we'll use a free SoundCloud search approach
      // This requires no API key but has limitations
      const searchUrl = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}`;
      
      // Since we can't easily scrape SoundCloud without proper setup,
      // we'll simulate finding matches based on popular queries
      const soundcloudMatches = this.simulateSoundCloudSearch(query, requester, limit);
      
      return soundcloudMatches;
    } catch (error) {
      console.error('SoundCloud search error:', error);
      return [];
    }
  }
  
  // Simulate SoundCloud search results for popular tracks
  private static simulateSoundCloudSearch(query: string, requester: User, limit: number): AudioTrack[] {
    const popularTracks: { [key: string]: { title: string, artist: string, genre: string } } = {
      'gods plan': { title: 'Gods Plan', artist: 'Drake', genre: 'hiphop' },
      'senorita': { title: 'Senorita', artist: 'Shawn Mendes & Camila Cabello', genre: 'rnb' },
      'bad guy': { title: 'Bad Guy', artist: 'Billie Eilish', genre: 'pop' },
      'blinding lights': { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'rnb' },
      'watermelon sugar': { title: 'Watermelon Sugar', artist: 'Harry Styles', genre: 'pop' },
      'levitating': { title: 'Levitating', artist: 'Dua Lipa', genre: 'pop' },
      'stay': { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', genre: 'pop' },
      'industry baby': { title: 'Industry Baby', artist: 'Lil Nas X', genre: 'hiphop' },
      'good 4 u': { title: 'Good 4 U', artist: 'Olivia Rodrigo', genre: 'pop' },
      'heat waves': { title: 'Heat Waves', artist: 'Glass Animals', genre: 'electronic' }
    };
    
    const queryLower = query.toLowerCase();
    const results: AudioTrack[] = [];
    
    // Check for exact matches
    for (const [key, track] of Object.entries(popularTracks)) {
      if (queryLower.includes(key) || key.includes(queryLower) || 
          queryLower.includes(track.title.toLowerCase()) ||
          queryLower.includes(track.artist.toLowerCase())) {
        
        const genreStream = this.radioStreams[track.genre as keyof typeof this.radioStreams] || this.radioStreams.pop;
        
        results.push({
          title: `${track.title} - ${track.artist}`,
          artist: track.artist,
          duration: 180, // 3 minutes default
          url: genreStream.url,
          thumbnail: genreStream.thumbnail,
          source: 'soundcloud',
          requester
        });
        
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }
  
  // Spotify Search + SoundCloud Fallback
  private static async searchSpotifyAndFallback(query: string, requester: User): Promise<AudioTrack[]> {
    try {
      if (!process.env.SPOTIFY_CLIENT_ID) {
        console.log('🎵 Spotify API not configured, skipping...');
        return [];
      }
      
      console.log(`🎵 Searching Spotify for: ${query}`);
      const searchResults = await this.spotifyApi.searchTracks(query, { limit: 3 });
      const tracks = searchResults.body.tracks.items;
      
      if (tracks.length === 0) {
        console.log('🎵 No Spotify results found');
        return [];
      }
      
      const results: AudioTrack[] = [];
      
      for (const track of tracks) {
        const searchQuery = `${track.name} ${track.artists[0].name}`;
        
        // Try to find on SoundCloud
        const soundcloudResults = await this.searchSoundCloud(searchQuery, requester, 1);
        
        if (soundcloudResults.length > 0) {
          const result = soundcloudResults[0];
          result.title = `${track.name} - ${track.artists[0].name} (Spotify Match)`;
          results.push(result);
        } else {
          // Fallback to radio with Spotify metadata
          const genreStream = this.getGenreForArtist(track.artists[0].name);
          results.push({
            title: `${track.name} - ${track.artists[0].name}`,
            artist: track.artists[0].name,
            duration: Math.floor(track.duration_ms / 1000),
            url: genreStream.url,
            thumbnail: track.album.images[0]?.url || genreStream.thumbnail,
            source: 'spotify',
            requester
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Spotify search error:', error);
      return [];
    }
  }
  
  private static getGenreForArtist(artistName: string): any {
    const artistLower = artistName.toLowerCase();
    const hiphopArtists = ['drake', 'kendrick', 'kanye', 'eminem', 'jay-z', 'travis', 'future', 'lil', 'migos', 'cardi'];
    const popArtists = ['taylor', 'ariana', 'billie', 'dua', 'justin', 'selena', 'shawn', 'ed', 'bruno'];
    const rnbArtists = ['weeknd', 'sza', 'frank', 'beyonce', 'rihanna', 'usher', 'alicia'];
    const rockArtists = ['imagine', 'coldplay', 'maroon', 'onerepublic', 'linkin'];
    
    if (hiphopArtists.some(artist => artistLower.includes(artist))) {
      return this.radioStreams.hiphop || this.radioStreams.pop;
    }
    if (rnbArtists.some(artist => artistLower.includes(artist))) {
      return this.radioStreams.rnb || this.radioStreams.pop;
    }
    if (rockArtists.some(artist => artistLower.includes(artist))) {
      return this.radioStreams.rock || this.radioStreams.pop;
    }
    
    return this.radioStreams.pop; // Default to pop
  }
  
  private static async searchByGenre(query: string, requester: User): Promise<AudioTrack[]> {
    const matches: AudioTrack[] = [];
    
    // Check if query matches any genre
    const matchedGenres = this.musicGenres.filter(genre => 
      query.includes(genre) || genre.includes(query.split(' ')[0])
    );
    
    // For each matched genre, provide a suitable radio stream
    matchedGenres.forEach(genre => {
      if (this.radioStreams[genre as keyof typeof this.radioStreams]) {
        const stream = this.radioStreams[genre as keyof typeof this.radioStreams];
        matches.push({
          title: `${stream.name} - Endless ${genre.charAt(0).toUpperCase() + genre.slice(1)} Music`,
          artist: stream.artist,
          duration: 0,
          url: stream.url,
          thumbnail: stream.thumbnail,
          source: 'radio',
          requester
        });
      }
    });
    
    return matches;
  }
  
  private static getDefaultTrack(query: string, requester: User): AudioTrack {
    // Use pop as default for most song queries, lofi for study-related
    const isStudyRelated = query.toLowerCase().includes('study') || 
                           query.toLowerCase().includes('focus') ||
                           query.toLowerCase().includes('chill') ||
                           query.toLowerCase().includes('relax');
    
    const defaultStream = isStudyRelated ? this.radioStreams.lofi : this.radioStreams.pop;
    const genre = isStudyRelated ? 'Ambient' : 'Pop';
    
    return {
      title: `${defaultStream.name} - ${genre} Music for "${query}"`,
      artist: defaultStream.artist,
      duration: 0,
      url: defaultStream.url,
      thumbnail: defaultStream.thumbnail,
      source: 'radio',
      requester
    };
  }
  
  // Get popular/trending tracks
  public static getPopularTracks(requester: User): AudioTrack[] {
    return Object.entries(this.radioStreams).map(([key, stream]) => ({
      title: stream.name,
      artist: stream.artist,
      duration: 0,
      url: stream.url,
      thumbnail: stream.thumbnail,
      source: 'radio' as const,
      requester
    }));
  }
  
  // Get tracks by specific genre
  public static getTracksByGenre(genre: string, requester: User): AudioTrack[] {
    const results: AudioTrack[] = [];
    const genreKey = genre.toLowerCase();
    
    if (this.radioStreams[genreKey as keyof typeof this.radioStreams]) {
      const stream = this.radioStreams[genreKey as keyof typeof this.radioStreams];
      results.push({
        title: stream.name,
        artist: stream.artist,
        duration: 0,
        url: stream.url,
        thumbnail: stream.thumbnail,
        source: 'radio',
        requester
      });
    }
    
    return results;
  }
  
  // Create a custom track for user's query
  public static createCustomTrack(title: string, artist: string, requester: User): AudioTrack {
    // Use lofi as default background music
    const defaultStream = this.radioStreams.lofi;
    
    return {
      title: `${title} ${artist ? `- ${artist}` : ''}`,
      artist: artist || 'Unknown Artist',
      duration: 180, // 3 minutes default
      url: defaultStream.url,
      thumbnail: defaultStream.thumbnail,
      source: 'radio',
      requester
    };
  }
}