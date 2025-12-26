import librosa
import numpy as np
import soundfile as sf

def process_audio(input_file, output_file):
    """
    Process audio file: load, analyze, and perform basic operations
    
    Args:
        input_file: Path to input audio file
        output_file: Path to save processed audio
    """
    
    # 1. Load audio file
    # sr=None preserves original sample rate, or specify like sr=22050
    audio, sample_rate = librosa.load(input_file, sr=None)
    
    print(f"Sample rate: {sample_rate} Hz")
    print(f"Duration: {librosa.get_duration(y=audio, sr=sample_rate):.2f} seconds")
    print(f"Audio shape: {audio.shape}")
    
    # 2. Trim silence from beginning and end
    # top_db: threshold in dB below reference to consider as silence
    audio_trimmed, _ = librosa.effects.trim(audio, top_db=20)
    print(f"Trimmed duration: {librosa.get_duration(y=audio_trimmed, sr=sample_rate):.2f} seconds")
    
    # 3. Remove silent intervals in the middle
    intervals = librosa.effects.split(audio_trimmed, top_db=20)
    audio_no_silence = np.concatenate([audio_trimmed[start:end] for start, end in intervals])
    
    # 4. Normalize audio (prevent clipping, maintain consistent volume)
    audio_normalized = librosa.util.normalize(audio_no_silence)
    
    # 5. Apply pre-emphasis filter (enhances high frequencies)
    audio_preemphasized = librosa.effects.preemphasis(audio_normalized)
    
    # 6. Save processed audio
    sf.write(output_file, audio_preemphasized, sample_rate)
    print(f"Processed audio saved to: {output_file}")
    
    return audio_preemphasized, sample_rate


def advanced_audio_analysis(audio, sample_rate):
    """
    Perform advanced audio analysis
    """
    
    # Spectral analysis
    spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sample_rate)[0]
    spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sample_rate)[0]
    
    # Zero crossing rate (useful for voice activity detection)
    zcr = librosa.feature.zero_crossing_rate(audio)[0]
    
    # MFCCs (Mel-frequency cepstral coefficients) - for voice analysis
    mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=13)
    
    # Tempo and beat detection
    tempo, beats = librosa.beat.beat_track(y=audio, sr=sample_rate)
    
    print(f"\nAudio Analysis:")
    print(f"Tempo: {tempo:.2f} BPM")
    print(f"Mean spectral centroid: {np.mean(spectral_centroids):.2f} Hz")
    print(f"Mean zero crossing rate: {np.mean(zcr):.4f}")
    
    return {
        'spectral_centroids': spectral_centroids,
        'spectral_rolloff': spectral_rolloff,
        'zcr': zcr,
        'mfccs': mfccs,
        'tempo': tempo,
        'beats': beats
    }

def remove_silence_advanced(input_file, output_file, top_db=20, frame_length=2048, hop_length=512):
    """
    Advanced silence removal with configurable parameters
    """
    audio, sr = librosa.load(input_file, sr=None)
    
    # Split audio into non-silent intervals
    intervals = librosa.effects.split(
        audio, 
        top_db=top_db,
        frame_length=frame_length,
        hop_length=hop_length
    )
    
    # Concatenate non-silent parts
    audio_cleaned = np.concatenate([audio[start:end] for start, end in intervals])
    
    # Normalize
    audio_cleaned = librosa.util.normalize(audio_cleaned)
    
    # Save
    sf.write(output_file, audio_cleaned, sr)
    
    original_duration = librosa.get_duration(y=audio, sr=sr)
    cleaned_duration = librosa.get_duration(y=audio_cleaned, sr=sr)
    
    print(f"Original duration: {original_duration:.2f}s")
    print(f"Cleaned duration: {cleaned_duration:.2f}s")
    print(f"Removed: {original_duration - cleaned_duration:.2f}s ({(1 - cleaned_duration/original_duration)*100:.1f}%)")
    
    return audio_cleaned, sr

# Example usage
if __name__ == "__main__":
    # Basic processing
    processed_audio, sr = process_audio("input.wav", "output_processed.wav")
    
    # Advanced analysis
    analysis = advanced_audio_analysis(processed_audio, sr)
    
    # Advanced silence removal
    cleaned_audio, sr = remove_silence_advanced(
        "input.wav", 
        "output_no_silence.wav",
        top_db=25  # Adjust threshold as needed
    )
