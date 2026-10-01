// WAV generation helpers for demo audio tracks (mono, 22050 Hz, 16-bit PCM)

const fs = await import('node:fs/promises');
const path = await import('node:path');

const SAMPLE_RATE = 22050;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8; // 2

async function generateWav(freq, durationSec, outPath) {
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const dataSize = totalSamples * BYTES_PER_SAMPLE; // 2 bytes per sample for mono
  const totalFileSize = 44 + dataSize;

  const byteRate = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE; // 44100
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE; // 2

  // Build full file buffer (header + PCM data)
  const header = Buffer.alloc(totalFileSize);

  // RIFF chunk ID
  header.write('RIFF', 0);
  // RIFF chunk size = 36 + dataSize (total minus the first 8 bytes: RIFF ID + chunkSize)
  header.writeUInt32LE(36 + dataSize, 4);
  // RIFF format
  header.write('WAVE', 8);

  // fmt subchunk starting at offset 12
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk1Size = 16 for PCM
  header.writeUInt16LE(1, 20); // audioFormat = 1 (PCM)
  header.writeUInt16LE(CHANNELS, 22); // numChannels
  header.writeUInt32LE(SAMPLE_RATE, 24); // sampleRate
  header.writeUInt32LE(byteRate, 28); // byteRate
  header.writeUInt16LE(blockAlign, 32); // blockAlign
  header.writeUInt16LE(BITS_PER_SAMPLE, 34); // bitsPerSample

  // data subchunk starting at offset 36
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40); // subchunk2Size

  // Fill PCM data starting at offset 44
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const sample = Math.sin(2 * Math.PI * freq * t);
    const pcm = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
    const offset = 44 + i * BYTES_PER_SAMPLE;
    header.writeInt16LE(pcm, offset);
  }

  await fs.writeFile(outPath, header);
  console.log(`✓ Generado ${path.basename(outPath)} (${freq} Hz, ${durationSec}s)`);
}

// Generate 8 demo tracks with distinct frequencies
(async () => {
  await fs.mkdir('public/audio', { recursive: true });

  const frequencies = [220, 330, 440, 550, 660, 770, 880, 990];
  const duration = 10; // seconds per track

  for (let i = 0; i < frequencies.length; i++) {
    const outPath = path.join('public/audio', `track_${String(i + 1).padStart(2, '0')}.wav`);
    await generateWav(frequencies[i], duration, outPath);
  }

  console.log('\n✅ Audio demo generado en public/audio/');

  // Generate seed catalog JSON
  const genres = ['Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'Folk', 'Blues', 'R&B', 'Country'];
  const artists = [];
  for (let a = 0; a < 8; a++) {
    artists.push({
      id: `artist_${String(a + 1).padStart(2, '0')}`,
      name: `Artista ${String.fromCharCode(65 + a)}`,
      country: ['España', 'Estados Unidos', 'Reino Unido', 'Alemania', 'Francia'][a % 5],
      bio: `Biografía del artista ${a + 1}...`,
    });
  }
  const albums = [];
  let albId = 1;
  for (let a = 0; a < artists.length; a++) {
    const nAlbums = 1 + (a % 2);
    for (let j = 0; j < nAlbums; j++) {
      albums.push({
        id: `album_${String(albId).padStart(2, '0')}`,
        title: `Álbum ${String(albId)} - ${artists[a].name}`,
        artistId: artists[a].id,
        releaseYear: 2018 + a,
        genre: genres[Math.floor(Math.random() * genres.length)],
      });
      albId++;
    }
  }
  const tracks = [];
  for (let t = 0; t < 50; t++) {
    const artistIdx = t % artists.length;
    const albumIdx = Math.floor(t / artists.length) % albums.length;
    tracks.push({
      id: `track_${String(t + 1).padStart(2, '0')}`,
      title: `Canción ${String.fromCharCode(65 + t)}`,
      durationMs: 180000 + Math.floor(Math.random() * 120000),
      artistId: artists[artistIdx].id,
      albumId: albumIdx >= 0 ? albums[albumIdx].id : null,
      genre: genres[Math.floor(Math.random() * genres.length)],
      explicit: false,
      streamUrl: null,
    });
  }
  const seed = {
    genres,
    artists,
    albums,
    tracks,
    metrics: {
      totalTracks: tracks.length,
      totalArtists: artists.length,
      totalAlbums: albums.length,
      generatedAt: new Date().toISOString(),
    },
  };

  await fs.writeFile('public/catalog/seed.json', JSON.stringify(seed, null, 2));
  console.log('✅ Catálogo de semilla generado en public/catalog/seed.json');
})();